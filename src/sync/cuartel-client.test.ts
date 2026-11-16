import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openCortexDb } from "@/db/db";
import { freshIdb } from "@/db/test-utils";
import type { DayRecord } from "@/db/types";
import { emptyDay } from "@/engine/day";
import { createStudyPusher } from "./cuartel-client";
import { CUARTEL_LAST_KEY, CUARTEL_SYNC_KEY, parsePushResult, readLastPush } from "./cuartel-status";
import { pushStudySummary } from "./study-push";

afterEach(() => vi.unstubAllEnvs());

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime();
function memStorage(on = true): Storage {
  const m = new Map<string, string>(on ? [[CUARTEL_SYNC_KEY, "1"]] : []);
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  } as Storage;
}
const rec = (day: string, o: Partial<DayRecord> = {}): DayRecord => ({ ...emptyDay(day), schemaVersion: 2, ...o });

function harness(on = true, fetchImpl?: () => Promise<Response>) {
  const timers: (() => void)[] = [];
  const clock = { t: NOW };
  const storage = memStorage(on);
  const fetchMock = vi.fn(fetchImpl ?? (async () => Response.json({ sent: true, status: 200 })));
  const pusher = createStudyPusher({
    readDays: async () => [rec("2026-10-10", { answered: 3, correct: 2 })],
    fetch: fetchMock as unknown as typeof fetch,
    now: () => clock.t,
    storage,
    setTimer: (fn) => void timers.push(fn),
  });
  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  };
  return { timers, clock, storage, fetchMock, pusher, flush };
}

describe("createStudyPusher", () => {
  it("apagado: nunca llama fetch ni programa", async () => {
    const h = harness(false);
    h.pusher.request();
    await h.flush();
    expect(h.timers).toHaveLength(0);
    expect(h.fetchMock).not.toHaveBeenCalled();
  });
  it("envía con la forma esperada y guarda el último estado", async () => {
    const h = harness();
    h.pusher.request();
    h.pusher.request();
    expect(h.timers).toHaveLength(1);
    h.timers.shift()?.();
    await h.flush();
    const [url, init] = h.fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/cuartel");
    expect(init.headers).toEqual({ "content-type": "application/json", "x-cortex-cuartel": "1" });
    expect(JSON.parse(init.body as string)).toEqual({
      v: 1,
      days: [{ day: "2026-10-10", activeMs: 0, answered: 3, correct: 2, reviews: 0, lessons: 0, minimumMet: false }],
    });
    expect(readLastPush(h.storage)).toEqual({ sent: true, status: 200, at: NOW });
  });
  it("varios cierres seguidos dan exactamente 2 envíos", async () => {
    let release: (r: Response) => void = () => {};
    const h = harness(true, () => new Promise<Response>((r) => (release = r)));
    h.pusher.request();
    h.timers.shift()?.();
    await h.flush();
    for (let i = 0; i < 5; i++) h.pusher.request();
    expect(h.timers).toHaveLength(0);
    release(Response.json({ sent: true, status: 200 }));
    await h.flush();
    expect(h.timers).toHaveLength(1);
    h.clock.t += 20_000;
    h.timers.shift()?.();
    await h.flush();
    release(Response.json({ sent: true, status: 200 }));
    await h.flush();
    expect(h.fetchMock).toHaveBeenCalledTimes(2);
    expect(h.timers).toHaveLength(0);
  });
  it("respuesta malformada o fetch roto: sin respuesta", async () => {
    for (const impl of [async () => new Response("<html>"), async () => Response.json({ sent: true, status: 200, reason: "libre" }), async () => { throw new TypeError("x"); }]) {
      const h = harness(true, impl);
      h.pusher.request();
      h.timers.shift()?.();
      await h.flush();
      expect(readLastPush(h.storage)).toEqual({ sent: false, status: null, reason: "sin respuesta", at: NOW });
    }
  });
  it("sin días no llama fetch", async () => {
    const h = harness();
    const p = createStudyPusher({ readDays: async () => [rec("2026-10-10")], fetch: h.fetchMock as unknown as typeof fetch, now: () => NOW, storage: h.storage, setTimer: (fn) => fn() });
    p.request();
    await h.flush();
    expect(h.fetchMock).not.toHaveBeenCalled();
    expect(readLastPush(h.storage)?.reason).toBe("sin días");
  });
  it("si lo apagan antes de ejecutar, no envía", async () => {
    const h = harness();
    h.pusher.request();
    h.storage.removeItem(CUARTEL_SYNC_KEY);
    h.timers.shift()?.();
    await h.flush();
    expect(h.fetchMock).not.toHaveBeenCalled();
  });
});

describe("error local", () => {
  const LOCAL = { sent: false, status: null, reason: "error local", at: NOW };
  it("si readDays lanza, deja «error local» y no un «recibió» viejo", async () => {
    const storage = memStorage();
    storage.setItem(CUARTEL_LAST_KEY, JSON.stringify({ sent: true, status: 200, at: 1 }));
    const fetchMock = vi.fn();
    const timers: (() => void)[] = [];
    const p = createStudyPusher({ readDays: async () => { throw new Error("idb"); }, fetch: fetchMock as unknown as typeof fetch, now: () => NOW, storage, setTimer: (fn) => void timers.push(fn) });
    p.request();
    timers.shift()?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(readLastPush(storage)).toEqual(LOCAL);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("si requestStudyPush no logra crear el empujador, con interruptor prendido", async () => {
    for (const on of [true, false]) {
      vi.resetModules();
      const store = memStorage(on);
      let calls = 0;
      vi.doMock("./cuartel-status", async (orig: () => Promise<Record<string, unknown>>) => {
        const real = await orig();
        return {
          ...real,
          browserStorage: () => {
            if (++calls === 1) throw new Error("storage");
            return store;
          },
        };
      });
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      const { requestStudyPush } = await import("./cuartel-client");
      const { readLastPush: read } = await import("./cuartel-status");
      requestStudyPush({} as never);
      expect(read(store)).toEqual(on ? LOCAL : null);
      vi.doUnmock("./cuartel-status");
      vi.restoreAllMocks();
    }
  });
  it("study-push: si falla el import del cliente, escribe «error local» solo con el interruptor prendido", async () => {
    for (const on of [true, false]) {
      vi.resetModules();
      const store = memStorage(on);
      vi.stubGlobal("localStorage", store);
      vi.doMock("./cuartel-client", () => {
        throw new Error("no carga");
      });
      vi.spyOn(Date, "now").mockReturnValue(NOW);
      const { pushStudySummary: push } = await import("./study-push");
      const { readLastPush: read } = await import("./cuartel-status");
      push({} as never);
      await new Promise((r) => setTimeout(r, 20));
      expect(read(store)).toEqual(on ? LOCAL : null);
      vi.doUnmock("./cuartel-client");
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});

describe("pushStudySummary y estado", () => {
  it("en la PWA no hace nada", async () => {
    vi.stubEnv("NEXT_PUBLIC_CORTEX_PWA", "1");
    const spy = vi.spyOn(globalThis, "fetch");
    pushStudySummary({} as never);
    await new Promise((r) => setTimeout(r, 10));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("parsePushResult rechaza cadenas libres", () => {
    expect(parsePushResult({ sent: false, status: null, reason: "red" })).not.toBeNull();
    expect(parsePushResult({ sent: false, status: null, reason: "token cu_xxx" })).toBeNull();
    expect(parsePushResult({ sent: "si", status: 1 })).toBeNull();
    expect(readLastPush(memStorage())).toBeNull();
  });
  it("readLastPush valida lo guardado", () => {
    const s = memStorage();
    s.setItem(CUARTEL_LAST_KEY, JSON.stringify({ sent: true, status: 200, reason: "inventada", at: 1 }));
    expect(readLastPush(s)).toBeNull();
  });
});

describe("consulta between con Dexie real", () => {
  it("lee solo la ventana", async () => {
    const db = await openCortexDb(freshIdb());
    await db.days.bulkPut(["2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"].map((d) => rec(d, { answered: 1 })));
    const rows = await db.days.where("day").between("2026-10-04", "2026-10-10", true, true).toArray();
    expect(rows.map((r) => r.day)).toEqual(["2026-10-04", "2026-10-10"]);
    db.close();
    expect(Dexie).toBeDefined();
  });
});

describe("marcadores y rutas", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const n of readdirSync(dir)) {
      if (n === "node_modules" || n === ".next" || n === "__pycache__") continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }
  it("ningún archivo nombra la ruta vieja del token", () => {
    const needle = ".cuartel/" + "token";
    const hits = ["src", "mcp", "scripts"].flatMap((d) => walk(join(process.cwd(), d))).filter((f) => readFileSync(f, "utf8").includes(needle));
    expect(hits).toEqual([]);
  });
  it("los módulos isomórficos no llevan marcadores", () => {
    const marks = ["/api/" + "cuartel", "cortex-" + "token", "personalos." + "carlogarza.dev", "api/ingest/" + "study"];
    for (const f of ["cuartel-status.ts", "study-push.ts"]) {
      const text = readFileSync(join(process.cwd(), "src/sync", f), "utf8");
      for (const m of marks) expect(text, `${f} contiene ${m}`).not.toContain(m);
    }
  });
});
