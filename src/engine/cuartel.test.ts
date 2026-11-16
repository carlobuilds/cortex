import { describe, expect, it } from "vitest";
import { emptyDayRecord } from "@/db/defaults";
import { CUARTEL_LIMITS, ingestBody, isRealDay, localSyncBodySchema, studyDayFrom, studyDaysFrom, studyDaySchema, syncWindow } from "./cuartel";

const FIELDS = ["activeMs", "answered", "correct", "day", "lessons", "minimumMet", "reviews"];

const full = () => ({
  ...emptyDayRecord("2026-11-16"),
  xp: 900,
  answered: 40,
  correct: 31,
  reviews: 12,
  reviewsCorrect: 10,
  lessons: 1,
  bossesWon: 2,
  activeMs: 2_130_000,
  minimumMet: true,
  chestOpened: true,
  sessionDone: true,
});

describe("proyección de un día para Cuartel", () => {
  it("saca exactamente los 7 campos, aunque reciba el DayRecord entero", () => {
    const d = studyDayFrom(full());
    expect(Object.keys(d).sort()).toEqual(FIELDS);
    expect(d).toEqual({ day: "2026-11-16", activeMs: 2_130_000, answered: 40, correct: 31, reviews: 12, lessons: 1, minimumMet: true });
    expect(JSON.stringify(d)).not.toMatch(/xp|bossesWon|chest|schemaVersion|combo/);
  });

  it("no deja pasar campos ajenos ni aunque vengan de más", () => {
    const sneaky = { ...full(), note: "mi respuesta", answer: "42" };
    expect(Object.keys(studyDayFrom(sneaky)).sort()).toEqual(FIELDS);
  });

  it("deja enteros en el rango del contrato", () => {
    const d = studyDayFrom({ day: "2026-11-16", activeMs: 99_999_999.7, answered: 20_000, correct: 30_000, reviews: -3, lessons: 5000.4, minimumMet: true });
    expect(d).toEqual({ day: "2026-11-16", activeMs: CUARTEL_LIMITS.activeMs, answered: 10_000, correct: 10_000, reviews: 0, lessons: 1000, minimumMet: true });
    const r = studyDayFrom({ day: "2026-11-16", activeMs: 1234.5, answered: 3, correct: 7, reviews: 9, lessons: Number.NaN, minimumMet: false });
    expect(r).toEqual({ day: "2026-11-16", activeMs: 1235, answered: 3, correct: 3, reviews: 3, lessons: 0, minimumMet: false });
    for (const v of Object.values(r)) if (typeof v === "number") expect(Number.isInteger(v)).toBe(true);
    expect(studyDaySchema.safeParse(r).success).toBe(true);
  });

  it("minimumMet solo es true si es exactamente true", () => {
    expect(studyDayFrom({ ...full(), minimumMet: 1 as unknown as boolean }).minimumMet).toBe(false);
  });
});

describe("qué días se mandan", () => {
  it("la ventana es hoy y los 6 anteriores, aunque cruce de mes o año", () => {
    expect(syncWindow("2026-11-16")).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"]);
    expect(syncWindow("2027-01-02")[0]).toBe("2026-12-27");
    expect(syncWindow("2026-11-16", 1)).toEqual(["2026-11-16"]);
  });

  it("salta huecos, días inválidos y repetidos", () => {
    const a = { ...full(), day: "2026-11-15" };
    const b = { ...full(), day: "2026-02-30" };
    const days = studyDaysFrom([undefined, a, null, b, a, full()]);
    expect(days.map((d) => d.day)).toEqual(["2026-11-15", "2026-11-16"]);
    expect(localSyncBodySchema.safeParse({ days }).success).toBe(true);
  });

  it("valida fechas reales", () => {
    expect(isRealDay("2026-11-16")).toBe(true);
    expect(isRealDay("2028-02-29")).toBe(true);
    expect(isRealDay("2026-02-29")).toBe(false);
    expect(isRealDay("2026-1-01")).toBe(false);
    expect(isRealDay("2026-11-16T00:00")).toBe(false);
  });

  it("el cuerpo para Cuartel es v1, cortex-local y solo días", () => {
    const body = ingestBody(studyDaysFrom([full()]));
    expect(Object.keys(body).sort()).toEqual(["days", "source", "v"]);
    expect(body.v).toBe(1);
    expect(body.source).toBe("cortex-local");
    expect(Buffer.byteLength(JSON.stringify(ingestBody(Array.from({ length: 60 }, () => studyDayFrom(full()))))) <= CUARTEL_LIMITS.bodyBytes).toBe(true);
  });
});

describe("esquema estricto de lo que llega a la ruta local", () => {
  const day = studyDayFrom(full());
  it("rechaza campos de más, arriba o dentro de un día", () => {
    expect(localSyncBodySchema.safeParse({ days: [{ ...day, xp: 3 }] }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [day], token: "x" }).success).toBe(false);
  });
  it("rechaza repetidos, vacíos, más de 60, fuera de rango y correct > answered", () => {
    expect(localSyncBodySchema.safeParse({ days: [day, day] }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [] }).success).toBe(false);
    const many = Array.from({ length: 61 }, (_, i) => ({ ...day, day: syncWindow("2026-11-16", 61)[i] }));
    expect(localSyncBodySchema.safeParse({ days: many }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [{ ...day, activeMs: 86_400_001 }] }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [{ ...day, answered: 1.5 }] }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [{ ...day, correct: 41 }] }).success).toBe(false);
    expect(localSyncBodySchema.safeParse({ days: [{ ...day, reviews: 41 }] }).success).toBe(false);
  });
});
