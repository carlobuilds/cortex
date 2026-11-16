import { CONFIG } from "./config";
import { addDays, dayKey, weekStart } from "./dates";
import { baseline } from "./league";
import type { ExerciseFacts } from "./skill-profile";

/**
 * Métricas semanales del coach (ADR-026). Solo agregados: nunca textos de respuestas, notas,
 * reportes ni tinta. Puro: las tablas del respaldo entran como tipos estructurales.
 */

export interface CoachAttempt {
  readonly exerciseId: string;
  readonly at: number;
  readonly correct: boolean;
  readonly confidence: 1 | 2 | 3 | null;
  readonly sessionId: number | null;
  readonly mode?: string | null;
}

export interface CoachCard {
  readonly exerciseId: string;
  readonly lapses: number;
  readonly due: number;
}

export interface CoachDay {
  readonly day: string;
  readonly xp: number;
  readonly answered: number;
  readonly correct: number;
  readonly reviews: number;
  readonly reviewsCorrect: number;
  readonly activeMs: number;
}

export interface CoachSession {
  readonly id?: number;
  readonly startedAt: number;
  readonly kind: string;
  readonly unitKey?: string;
}

export interface CoachGymResult {
  readonly game: string;
  readonly domain: string;
  readonly level: number;
  readonly at: number;
}

export interface CoachProfile {
  readonly level: number;
  readonly xpTotal: number;
  readonly currentStreak: number;
  readonly maxStreak: number;
}

export interface CoachInput {
  readonly profile: CoachProfile | null;
  readonly attempts: readonly CoachAttempt[];
  readonly cards: readonly CoachCard[];
  readonly days: readonly CoachDay[];
  readonly sessions: readonly CoachSession[];
  readonly gymResults: readonly CoachGymResult[];
}

/** Ventana para los conceptos débiles: las 4 semanas que terminan el domingo de la semana. */
export const WEAK_WINDOW_DAYS = 28;
export const WEAK_TOP = 5;

const ratio = (part: number, total: number): number | null => (total ? part / total : null);

export interface ScoredSession {
  readonly sessionId: number;
  readonly day: string;
  readonly subjectId: string | null;
  readonly unitKey: string | null;
  readonly answered: number;
  readonly correct: number;
  /** Aciertos / respondidas (0–1). En simulacros lo no contestado no se guarda: puede sobrestimar. */
  readonly score: number | null;
}

/** Puntaje de cada sesión de un tipo (`exam` = simulacro, `boss` = jefe) a partir de sus intentos. */
export function scoredSessions(input: CoachInput, exercises: Readonly<Record<string, ExerciseFacts>>, kind: "exam" | "boss"): ScoredSession[] {
  const byId = new Map<number, { answered: number; correct: number; subjects: Map<string, number> }>();
  for (const s of input.sessions) if (s.kind === kind && s.id !== undefined) byId.set(s.id, { answered: 0, correct: 0, subjects: new Map() });
  for (const a of input.attempts) {
    if (a.sessionId === null) continue;
    const t = byId.get(a.sessionId);
    if (!t) continue;
    t.answered++;
    if (a.correct) t.correct++;
    const subject = exercises[a.exerciseId]?.subjectId;
    if (subject) t.subjects.set(subject, (t.subjects.get(subject) ?? 0) + 1);
  }
  return input.sessions
    .filter((s) => s.kind === kind && s.id !== undefined)
    .map((s) => {
      const t = byId.get(s.id as number)!;
      const subjectId = [...t.subjects.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { sessionId: s.id as number, day: dayKey(s.startedAt), subjectId, unitKey: s.unitKey ?? null, answered: t.answered, correct: t.correct, score: ratio(t.correct, t.answered) };
    })
    .filter((s) => s.answered > 0)
    .sort((a, b) => a.day.localeCompare(b.day) || a.sessionId - b.sessionId);
}

export interface WeakConcept {
  readonly subjectId: string;
  readonly conceptId: string;
  readonly name: string;
  readonly attempts: number;
  readonly wrong: number;
  readonly accuracy: number | null;
  /** Lapsos FSRS acumulados de sus tarjetas (histórico). */
  readonly lapses: number;
}

export interface WeeklyMetrics {
  readonly week: { readonly start: string; readonly end: string };
  readonly profile: CoachProfile | null;
  readonly studyDays: number;
  readonly minutes: number;
  readonly xp: number;
  /** Promedio de XP de las 4 semanas anteriores con historia (liga personal), o `null`. */
  readonly xpBaseline: number | null;
  readonly answered: number;
  readonly correct: number;
  readonly accuracy: number | null;
  readonly reviews: { readonly done: number; readonly correct: number; readonly retention: number | null; readonly target: number };
  /** Acierto por nivel de confianza marcado antes de ver el resultado. */
  readonly calibration: readonly { readonly confidence: 1 | 2 | 3; readonly attempts: number; readonly accuracy: number | null }[];
  /** Fallos con confianza 3: «ilusión de saber». */
  readonly illusion: { readonly count: number; readonly rate: number | null };
  readonly weakConcepts: readonly WeakConcept[];
  readonly bosses: readonly ScoredSession[];
  readonly exams: readonly ScoredSession[];
  readonly gym: readonly { readonly game: string; readonly domain: string; readonly plays: number; readonly lastLevel: number; readonly bestLevel: number }[];
  /** Tarjetas vencidas al momento de calcular. */
  readonly dueCards: number;
}

/**
 * Métricas de la semana (lunes a domingo) que contiene `anyDay`. `conceptNames` usa la clave
 * `materia/concepto`.
 */
export function weeklyMetrics(
  input: CoachInput,
  exercises: Readonly<Record<string, ExerciseFacts>>,
  conceptNames: Readonly<Record<string, string>>,
  anyDay: string,
  now: number,
): WeeklyMetrics {
  const start = weekStart(anyDay);
  const end = addDays(start, 6);
  const inWeek = (day: string) => day >= start && day <= end;

  const days = input.days.filter((d) => inWeek(d.day));
  const sum = (f: (d: CoachDay) => number) => days.reduce((s, d) => s + f(d), 0);
  const answered = sum((d) => d.answered);
  const correct = sum((d) => d.correct);
  const reviews = sum((d) => d.reviews);
  const reviewsCorrect = sum((d) => d.reviewsCorrect);

  const weekAttempts = input.attempts.filter((a) => inWeek(dayKey(a.at)));
  const calibration = ([1, 2, 3] as const).map((confidence) => {
    const xs = weekAttempts.filter((a) => a.confidence === confidence);
    return { confidence, attempts: xs.length, accuracy: ratio(xs.filter((a) => a.correct).length, xs.length) };
  });
  const sure = weekAttempts.filter((a) => a.confidence === 3);
  const illusionCount = sure.filter((a) => !a.correct).length;

  const weakFrom = addDays(end, -(WEAK_WINDOW_DAYS - 1));
  const tallies = new Map<string, { subjectId: string; conceptId: string; attempts: number; wrong: number; lapses: number }>();
  const tally = (subjectId: string, conceptId: string) => {
    const key = `${subjectId}/${conceptId}`;
    let t = tallies.get(key);
    if (!t) tallies.set(key, (t = { subjectId, conceptId, attempts: 0, wrong: 0, lapses: 0 }));
    return t;
  };
  for (const a of input.attempts) {
    const day = dayKey(a.at);
    if (day < weakFrom || day > end) continue;
    const ex = exercises[a.exerciseId];
    if (!ex) continue;
    for (const c of ex.conceptos) {
      const t = tally(ex.subjectId, c);
      t.attempts++;
      if (!a.correct) t.wrong++;
    }
  }
  for (const card of input.cards) {
    const ex = exercises[card.exerciseId];
    if (!ex || card.lapses === 0) continue;
    for (const c of ex.conceptos) tally(ex.subjectId, c).lapses += card.lapses;
  }
  const weakConcepts = [...tallies.values()]
    .filter((t) => t.wrong > 0 || t.lapses > 0)
    .sort((a, b) => b.wrong - a.wrong || b.lapses - a.lapses || a.conceptId.localeCompare(b.conceptId))
    .slice(0, WEAK_TOP)
    .map((t): WeakConcept => ({
      subjectId: t.subjectId,
      conceptId: t.conceptId,
      name: conceptNames[`${t.subjectId}/${t.conceptId}`] ?? t.conceptId,
      attempts: t.attempts,
      wrong: t.wrong,
      accuracy: ratio(t.attempts - t.wrong, t.attempts),
      lapses: t.lapses,
    }));

  const gymByGame = new Map<string, { game: string; domain: string; plays: number; lastLevel: number; lastAt: number; bestLevel: number }>();
  for (const g of input.gymResults) {
    if (!inWeek(dayKey(g.at))) continue;
    const prev = gymByGame.get(g.game);
    if (!prev) gymByGame.set(g.game, { game: g.game, domain: g.domain, plays: 1, lastLevel: g.level, lastAt: g.at, bestLevel: g.level });
    else {
      prev.plays++;
      prev.bestLevel = Math.max(prev.bestLevel, g.level);
      if (g.at >= prev.lastAt) {
        prev.lastAt = g.at;
        prev.lastLevel = g.level;
      }
    }
  }

  return {
    week: { start, end },
    profile: input.profile,
    studyDays: days.filter((d) => d.answered > 0).length,
    minutes: Math.round(sum((d) => d.activeMs) / 60_000),
    xp: sum((d) => d.xp),
    xpBaseline: baseline(input.days, start),
    answered,
    correct,
    accuracy: ratio(correct, answered),
    reviews: { done: reviews, correct: reviewsCorrect, retention: ratio(reviewsCorrect, reviews), target: CONFIG.srs.requestRetention },
    calibration,
    illusion: { count: illusionCount, rate: ratio(illusionCount, sure.length) },
    weakConcepts,
    bosses: scoredSessions(input, exercises, "boss").filter((s) => inWeek(s.day)),
    exams: scoredSessions(input, exercises, "exam").filter((s) => inWeek(s.day)),
    gym: [...gymByGame.values()].sort((a, b) => a.game.localeCompare(b.game)).map(({ lastAt: _lastAt, ...g }) => g),
    dueCards: input.cards.filter((c) => c.due <= now).length,
  };
}

export type WeeklyVerdict = "solida" | "ajustar" | "alerta" | "pendiente";

/**
 * Veredicto de la semana que usa el coach para fijar el tono del informe.
 *
 * TODO(Carlo): esta es tu definición de éxito, por eso la escribes tú (5–10 líneas). Decide los
 * umbrales con los campos de `metrics`, por ejemplo:
 *   - constancia: `studyDays` (la meta de docs/00 es ≥ 5 días por semana);
 *   - retención: `reviews.retention` contra `reviews.target` (docs/00 pide ≥ 0.85);
 *   - calibración: `illusion.rate` (fallos con confianza 3);
 *   - esfuerzo: `xp` contra `xpBaseline`.
 * Devuelve "solida" (vas bien, sigue igual), "ajustar" (algo concreto que corregir) o "alerta"
 * (riesgo para el parcial o el hábito). Mientras devuelva "pendiente", el coach dice que aún no
 * definiste tus umbrales y no inventa un veredicto.
 */
export function weeklyVerdict(metrics: WeeklyMetrics): WeeklyVerdict {
  void metrics;
  return "pendiente";
}
