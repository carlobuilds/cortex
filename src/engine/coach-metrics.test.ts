import { describe, expect, it } from "vitest";
import { type CoachInput, scoredSessions, weeklyMetrics, weeklyVerdict } from "./coach-metrics";
import { CONFIG } from "./config";
import type { ExerciseFacts } from "./skill-profile";

const at = (d: number, h = 10) => new Date(2026, 10, d, h).getTime(); // noviembre de 2026, hora local

const exercises: Record<string, ExerciseFacts> = {
  "calc-01-001": { subjectId: "calculo", unitKey: "calculo/01-limites", conceptos: ["limite"], dificultad: 2, tipo: "numerico" },
  "calc-01-002": { subjectId: "calculo", unitKey: "calculo/01-limites", conceptos: ["limite", "continuidad"], dificultad: 4, tipo: "simbolico" },
  "prog-01-001": { subjectId: "programacion", unitKey: "programacion/01-variables-y-tipos", conceptos: ["variables"], dificultad: 1, tipo: "codigo" },
};
const names = { "calculo/limite": "Límite", "calculo/continuidad": "Continuidad", "programacion/variables": "Variables" };

const day = (d: string, over: Partial<CoachInput["days"][number]> = {}) => ({
  day: d,
  xp: 0,
  answered: 0,
  correct: 0,
  reviews: 0,
  reviewsCorrect: 0,
  activeMs: 0,
  ...over,
});

const input: CoachInput = {
  profile: { level: 3, xpTotal: 420, currentStreak: 2, maxStreak: 6 },
  attempts: [
    { exerciseId: "calc-01-001", at: at(9), correct: true, confidence: 2, sessionId: 1 },
    { exerciseId: "calc-01-002", at: at(9, 11), correct: false, confidence: 3, sessionId: 1 },
    { exerciseId: "calc-01-002", at: at(11), correct: true, confidence: 3, sessionId: 2, mode: "exam" },
    { exerciseId: "calc-01-001", at: at(11, 11), correct: false, confidence: 1, sessionId: 2, mode: "exam" },
    { exerciseId: "prog-01-001", at: at(2), correct: false, confidence: null, sessionId: null }, // semana anterior
  ],
  cards: [
    { exerciseId: "calc-01-002", lapses: 2, due: at(9) },
    { exerciseId: "prog-01-001", lapses: 0, due: at(20) },
  ],
  days: [
    day("2026-11-02", { xp: 40, answered: 2, correct: 1 }),
    day("2026-11-09", { xp: 50, answered: 5, correct: 4, reviews: 4, reviewsCorrect: 3, activeMs: 20 * 60_000 }),
    day("2026-11-11", { xp: 30, answered: 3, correct: 3, activeMs: 10 * 60_000 }),
  ],
  sessions: [
    { id: 1, startedAt: at(9), kind: "daily" },
    { id: 2, startedAt: at(11), kind: "exam" },
  ],
  gymResults: [
    { game: "nback", domain: "memoria", level: 2, at: at(9) },
    { game: "nback", domain: "memoria", level: 3, at: at(11) },
  ],
};

describe("weeklyMetrics", () => {
  const m = weeklyMetrics(input, exercises, names, "2026-11-10", at(10, 12));

  it("usa la semana de lunes a domingo que contiene el día", () => {
    expect(m.week).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("suma constancia, minutos, XP y acierto desde los días", () => {
    expect(m.studyDays).toBe(2);
    expect(m.minutes).toBe(30);
    expect(m.xp).toBe(80);
    expect(m.xpBaseline).toBe(40);
    expect(m.accuracy).toBeCloseTo(7 / 8);
  });

  it("compara la retención real con el objetivo de FSRS", () => {
    expect(m.reviews).toEqual({ done: 4, correct: 3, retention: 0.75, target: CONFIG.srs.requestRetention });
  });

  it("detecta la ilusión de saber y calibra por confianza", () => {
    expect(m.illusion).toEqual({ count: 1, rate: 0.5 });
    expect(m.calibration.find((c) => c.confidence === 3)).toEqual({ confidence: 3, attempts: 2, accuracy: 0.5 });
  });

  it("ordena los conceptos débiles por errores y lapsos, con su nombre", () => {
    expect(m.weakConcepts[0]).toMatchObject({ subjectId: "calculo", conceptId: "limite", name: "Límite", wrong: 2, lapses: 2 });
    expect(m.weakConcepts.map((c) => c.conceptId)).toContain("variables"); // dentro de la ventana de 28 días
  });

  it("puntúa los simulacros de la semana y resume el gimnasio", () => {
    expect(m.exams).toEqual([{ sessionId: 2, day: "2026-11-11", subjectId: "calculo", unitKey: null, answered: 2, correct: 1, score: 0.5 }]);
    expect(m.gym).toEqual([{ game: "nback", domain: "memoria", plays: 2, lastLevel: 3, bestLevel: 3 }]);
    expect(m.dueCards).toBe(1);
  });

  it("no tiene campos de texto libre", () => {
    expect(JSON.stringify(m)).not.toMatch(/"(?:answer|lastAnswer|note|comment|events)":/);
  });
});

describe("scoredSessions", () => {
  it("ignora sesiones sin intentos", () => {
    const withEmpty: CoachInput = { ...input, sessions: [...input.sessions, { id: 9, startedAt: at(12), kind: "exam" }] };
    expect(scoredSessions(withEmpty, exercises, "exam").map((s) => s.sessionId)).toEqual([2]);
  });
});

describe("weeklyVerdict", () => {
  it("queda pendiente hasta que Carlo defina sus umbrales", () => {
    expect(weeklyVerdict(weeklyMetrics(input, exercises, names, "2026-11-10", at(10)))).toBe("pendiente");
  });
});
