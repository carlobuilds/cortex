import { describe, expect, it } from "vitest";
import { openCortexDb } from "@/db/db";
import { emptyDayRecord } from "@/db/defaults";
import { freshIdb } from "@/db/test-utils";
import { CUARTEL_SYNC_PATH, syncStudyToCuartel } from "./cuartel-sync";

const NOW = new Date(2026, 10, 16, 21, 30).getTime(); // 16 nov 2026, hora local

function recorder(fail?: Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (fail) throw fail;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return { calls, f };
}

describe("envío desde el navegador", () => {
  it("manda solo los días de la ventana, con 7 campos, a la ruta local", async () => {
    const db = await openCortexDb(freshIdb());
    await db.days.bulkPut([
      { ...emptyDayRecord("2026-11-16"), answered: 40, correct: 31, reviews: 12, lessons: 1, activeMs: 2_130_000, minimumMet: true, xp: 999, bossesWon: 1 },
      { ...emptyDayRecord("2026-11-14"), answered: 5, correct: 5 },
      { ...emptyDayRecord("2026-11-09"), answered: 9 }, // fuera de la ventana de 7 días
    ]);
    const { calls, f } = recorder();
    await syncStudyToCuartel(db, () => NOW, f);
    expect(calls).toHaveLength(1);
    const [c] = calls;
    expect(c?.url).toBe(CUARTEL_SYNC_PATH);
    expect(c?.init.method).toBe("POST");
    expect(c?.init.keepalive).toBe(true);
    expect((c?.init.headers as Record<string, string>)["x-cortex-sync"]).toBe("1");
    const body = JSON.parse(String(c?.init.body)) as { days: Record<string, unknown>[] };
    expect(Object.keys(body)).toEqual(["days"]);
    expect(body.days.map((d) => d.day)).toEqual(["2026-11-14", "2026-11-16"]);
    for (const d of body.days) expect(Object.keys(d).sort()).toEqual(["activeMs", "answered", "correct", "day", "lessons", "minimumMet", "reviews"]);
    expect(body.days[1]).toEqual({ day: "2026-11-16", activeMs: 2_130_000, answered: 40, correct: 31, reviews: 12, lessons: 1, minimumMet: true });
    db.close();
  });

  it("sin días no manda nada; si la red falla, no lanza", async () => {
    const db = await openCortexDb(freshIdb());
    const empty = recorder();
    await syncStudyToCuartel(db, () => NOW, empty.f);
    expect(empty.calls).toHaveLength(0);
    await db.days.put({ ...emptyDayRecord("2026-11-16"), answered: 1 });
    const broken = recorder(new TypeError("Failed to fetch"));
    await expect(syncStudyToCuartel(db, () => NOW, broken.f)).resolves.toBeUndefined();
    expect(broken.calls).toHaveLength(1);
    db.close();
  });

  it("dos cierres seguidos: un envío en curso y uno más al terminar (no se apilan)", async () => {
    const db = await openCortexDb(freshIdb());
    await db.days.put({ ...emptyDayRecord("2026-11-16"), answered: 1 });
    const { calls, f } = recorder();
    const a = syncStudyToCuartel(db, () => NOW, f);
    void syncStudyToCuartel(db, () => NOW, f);
    void syncStudyToCuartel(db, () => NOW, f);
    await a;
    expect(calls).toHaveLength(2);
    db.close();
  });
});
