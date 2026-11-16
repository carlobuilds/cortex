import { describe, expect, it } from "vitest";
import type { DayRecord } from "@/db/types";
import { emptyDay } from "@/engine/day";
import { browserBody, cuartelBody, parseStudyRequest, projectStudyDays } from "./study-summary";

const TODAY = "2026-10-10";
function row(day: string, extra: Partial<DayRecord> = {}): DayRecord {
  return { ...emptyDay(day), schemaVersion: 2, ...extra };
}
const good = { day: "2026-10-10", activeMs: 1000, answered: 5, correct: 4, reviews: 2, lessons: 1, minimumMet: true };

describe("projectStudyDays", () => {
  it("copia solo los 7 campos, aunque la fila traiga más y cadenas marcadoras", () => {
    const r = { ...row(TODAY, { answered: 3, correct: 2, activeMs: 10.6 }), nota: "SECRETO", xp: 99 } as DayRecord;
    const [d] = projectStudyDays([r], TODAY);
    expect(Object.keys(d ?? {}).sort()).toEqual(["activeMs", "answered", "correct", "day", "lessons", "minimumMet", "reviews"]);
    expect(d?.activeMs).toBe(11);
    expect(JSON.stringify(d)).not.toContain("SECRETO");
  });
  it("omite días vacíos y fuera de ventana, ordena y acota", () => {
    const out = projectStudyDays(
      [
        row("2026-10-10", { answered: 2, correct: 5, reviews: 9 }),
        row("2026-10-04", { lessons: 1 }),
        row("2026-10-03", { answered: 1 }),
        row("2026-10-11", { answered: 1 }),
        row("2026-10-09"),
        row("2026-10-08", { activeMs: Number.NaN, minimumMet: true }),
      ],
      TODAY,
    );
    expect(out.map((d) => d.day)).toEqual(["2026-10-04", "2026-10-08", "2026-10-10"]);
    expect(out[2]).toMatchObject({ answered: 2, correct: 2, reviews: 2 });
    expect(out[1]?.activeMs).toBe(0);
  });
});

describe("parseStudyRequest", () => {
  const ok = (v: unknown) => parseStudyRequest(v, TODAY).ok;
  it("acepta lo válido", () => {
    expect(ok({ v: 1, days: [good] })).toBe(true);
  });
  it.each([
    ["source", { v: 1, source: "x", days: [good] }],
    ["raíz extra", { v: 1, days: [good], x: 1 }],
    ["día extra", { v: 1, days: [{ ...good, xp: 1 }] }],
    ["0 días", { v: 1, days: [] }],
    ["8 días", { v: 1, days: Array.from({ length: 8 }, (_, i) => ({ ...good, day: `2026-10-0${i + 2}` })) }],
    ["repetidos", { v: 1, days: [good, good] }],
    ["correct > answered", { v: 1, days: [{ ...good, correct: 6 }] }],
    ["reviews > answered", { v: 1, days: [{ ...good, reviews: 6 }] }],
    ["decimales", { v: 1, days: [{ ...good, answered: 5.5 }] }],
    ["fecha falsa", { v: 1, days: [{ ...good, day: "2026-02-30" }] }],
    ["fecha rara", { v: 1, days: [{ ...good, day: "26-1-1" }] }],
    ["muy antigua", { v: 1, days: [{ ...good, day: "2026-10-02" }] }],
    ["futura", { v: 1, days: [{ ...good, day: "2026-10-12" }] }],
    ["v distinta", { v: 2, days: [good] }],
    ["null", null],
  ])("rechaza %s", (_n, v) => {
    expect(ok(v)).toBe(false);
  });
  it("cuerpos", () => {
    const r = parseStudyRequest({ v: 1, days: [good] }, TODAY);
    if (!r.ok) throw new Error("x");
    expect(browserBody(r.days)).toBe(JSON.stringify({ v: 1, days: [good] }));
    expect(cuartelBody(r.days)).toBe(JSON.stringify({ v: 1, source: "cortex-local", days: [good] }));
  });
});
