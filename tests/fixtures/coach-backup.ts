/**
 * Respaldo de prueba para el MCP del coach. Mete cadenas marcadoras en todo texto libre
 * (respuestas, notas del cuaderno, reportes, fantasmas) para comprobar que ninguna herramienta
 * las devuelve.
 */

export const MARKERS = {
  answer: "MARCA-RESPUESTA-7f3a",
  lastAnswer: "MARCA-ULTIMA-RESPUESTA-91c2",
  note: "MARCA-NOTA-CUADERNO-4b8e",
  report: "MARCA-REPORTE-2d6f",
  ghost: "MARCA-FANTASMA-e05a",
} as const;

const V = 2;

export interface FixtureIds {
  /** Ejercicios reales de una unidad de Cálculo (para que el catálogo los conozca). */
  readonly calc: readonly string[];
  readonly calcUnit: string;
}

export function buildCoachBackup(ids: FixtureIds, now: number): Record<string, unknown> {
  const at = (daysAgo: number, h = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };
  const dayOf = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [a, b, c] = ids.calc;
  return {
    app: "cortex",
    format: 1,
    schemaVersion: V,
    exportedAt: new Date(now).toISOString(),
    appVersion: "0.0.0",
    tables: {
      profile: [
        {
          id: 1,
          xpTotal: 640,
          level: 4,
          currentStreak: 3,
          maxStreak: 8,
          streakFreezes: 1,
          lastStudyDay: dayOf(at(0)),
          streakRepair: null,
          league: { division: 1, weekKey: null },
          cosmetics: { frames: [], frame: null, badges: [] },
          preferences: { sound: false, theme: "system", healthyMode: false },
          schemaVersion: V,
        },
      ],
      unitProgress: [
        { unitKey: ids.calcUnit, subjectId: "calculo", status: "practiced", bestBoss: 0.7, bossAttempts: 1, lessonDone: true, bossPassed: false, lastActivity: at(1), schemaVersion: V },
      ],
      attempts: [
        { id: 1, exerciseId: a, at: at(1), correct: true, timeMs: 30_000, confidence: 2, answer: MARKERS.answer, sessionId: 1, mode: "practice", hintsUsed: 0, xp: 8, schemaVersion: V },
        { id: 2, exerciseId: b, at: at(1, 11), correct: false, timeMs: 50_000, confidence: 3, answer: MARKERS.answer, sessionId: 1, mode: "practice", hintsUsed: 1, xp: 0, schemaVersion: V },
        { id: 3, exerciseId: c, at: at(0), correct: true, timeMs: 40_000, confidence: 2, answer: MARKERS.answer, sessionId: 2, mode: "exam", hintsUsed: 0, xp: 12, schemaVersion: V },
        { id: 4, exerciseId: b, at: at(0, 11), correct: false, timeMs: 60_000, confidence: 1, answer: MARKERS.answer, sessionId: 2, mode: "exam", hintsUsed: 0, xp: 0, schemaVersion: V },
      ],
      cards: [
        { exerciseId: b, due: at(0), stability: 1.2, difficulty: 6, elapsedDays: 1, scheduledDays: 1, learningSteps: 0, reps: 3, lapses: 2, state: 3, lastReview: at(1), longOk: false, schemaVersion: V },
      ],
      sessions: [
        { id: 1, startedAt: at(1), endedAt: at(1, 12), xpEarned: 8, kind: "daily", schemaVersion: V },
        { id: 2, startedAt: at(0), endedAt: at(0, 12), xpEarned: 12, kind: "exam", schemaVersion: V },
      ],
      missions: [],
      records: [{ key: "best:exam:calculo", value: 50, at: at(0), schemaVersion: V }],
      ghosts: [{ context: `boss:${ids.calcUnit}`, events: [{ text: MARKERS.ghost }], schemaVersion: V }],
      achievements: [],
      gymResults: [{ id: 1, game: "nback", domain: "memoria", level: 3, score: 12, at: at(1), schemaVersion: V }],
      mistakes: [
        { exerciseId: b, misses: 2, lastAnswer: MARKERS.lastAnswer, note: MARKERS.note, lastAt: at(0), illusion: true, fixedAt: null, schemaVersion: V },
      ],
      reports: [{ id: 1, exerciseId: a, comment: MARKERS.report, createdAt: at(1), schemaVersion: V }],
      days: [
        { day: dayOf(at(1)), xp: 8, answered: 2, correct: 1, reviews: 1, reviewsCorrect: 1, activeMs: 15 * 60_000, schemaVersion: V },
        { day: dayOf(at(0)), xp: 12, answered: 2, correct: 1, reviews: 0, reviewsCorrect: 0, activeMs: 25 * 60_000, schemaVersion: V },
      ],
    },
  };
}
