import { apportion } from "./boss";
import { CONFIG } from "./config";
import { type Rng, shuffle } from "./rng";

/**
 * Simulacro de examen (docs/01, Fase 3): preguntas de las unidades que elijas, repartidas entre
 * ellas y por dificultad, con tiempo total, sin vidas, sin pistas y **sin retroalimentación hasta
 * el final**. Puedes saltar una pregunta (vuelve al final de la fila) o entregar antes. El
 * resultado se desglosa por unidad y por concepto. Puro: la interfaz y la base viven aparte.
 */

export interface ExamRules {
  readonly questions: number;
  readonly secondsPerQuestion: number;
  /** Fácil (1–2) / medio (3) / difícil (4–5). */
  readonly mix: readonly number[];
  readonly passRatio: number;
  readonly maxLong: number;
}

/** Un ejercicio que puede entrar al simulacro (la interfaz ya quitó lo que no se puede jugar). */
export interface ExamCandidate {
  readonly id: string;
  readonly unitKey: string;
  readonly difficulty: number;
  readonly concepts: readonly string[];
  /** Ejercicio largo de código: entra como mucho `maxLong`. */
  readonly long: boolean;
}

export interface ExamQuestion {
  readonly exerciseId: string;
  readonly unitKey: string;
  readonly difficulty: number;
  readonly concepts: readonly string[];
}

export interface ExamPlan {
  readonly questions: readonly ExamQuestion[];
  /** Unidades con al menos una pregunta posible, en el orden de la materia. */
  readonly unitKeys: readonly string[];
  readonly timeLimitMs: number;
  readonly passRatio: number;
}

/** Banda de dificultad: 0 fácil (1–2), 1 medio (3), 2 difícil (4–5). */
export function difficultyBand(difficulty: number): 0 | 1 | 2 {
  if (difficulty <= 2) return 0;
  return difficulty === 3 ? 1 : 2;
}

/**
 * Arma el simulacro. Toma por turnos una pregunta de cada unidad (así ninguna se queda fuera) y,
 * dentro de la unidad, la de la banda de dificultad que más le falta a la mezcla. Después ordena
 * de fácil a difícil, como un examen que va subiendo.
 */
export function planExam(candidates: readonly ExamCandidate[], unitKeys: readonly string[], rng: Rng, rules: ExamRules = CONFIG.exam): ExamPlan {
  const chosen = new Set(unitKeys);
  // Sin repetidos (por id) y solo de las unidades elegidas.
  const unique = [...new Map(candidates.filter((c) => chosen.has(c.unitKey)).map((c) => [c.id, c])).values()];
  const pool = shuffle(rng, unique);
  const units = unitKeys.filter((key) => pool.some((c) => c.unitKey === key));
  const byUnit = new Map(units.map((key) => [key, pool.filter((c) => c.unitKey === key)]));

  const available = pool.filter((c) => !c.long).length + Math.min(rules.maxLong, pool.filter((c) => c.long).length);
  const n = Math.max(0, Math.min(rules.questions, available));
  const targets = apportion(n, rules.mix);
  const perBand = [0, 0, 0];
  let longs = 0;
  const picked: ExamCandidate[] = [];

  // Empieza en una unidad al azar: si `n` no se reparte exacto, no siempre gana la primera.
  let turn = units.length ? Math.floor(rng() * units.length) : 0;
  let idle = 0;
  while (picked.length < n && idle < units.length) {
    const key = units[turn % units.length] ?? "";
    turn++;
    const options = (byUnit.get(key) ?? []).filter((c) => !c.long || longs < rules.maxLong);
    if (!options.length) {
      idle++;
      continue;
    }
    idle = 0;
    // La banda con más faltante; en empate, la primera del orden barajado.
    const need = (c: ExamCandidate) => (targets[difficultyBand(c.difficulty)] ?? 0) - (perBand[difficultyBand(c.difficulty)] ?? 0);
    const best = options.reduce((a, b) => (need(b) > need(a) ? b : a));
    picked.push(best);
    byUnit.set(
      key,
      (byUnit.get(key) ?? []).filter((c) => c.id !== best.id),
    );
    perBand[difficultyBand(best.difficulty)] = (perBand[difficultyBand(best.difficulty)] ?? 0) + 1;
    if (best.long) longs++;
  }

  // `sort` es estable: dentro de la misma dificultad queda el orden barajado.
  const questions = picked
    .sort((a, b) => a.difficulty - b.difficulty)
    .map((c): ExamQuestion => ({ exerciseId: c.id, unitKey: c.unitKey, difficulty: c.difficulty, concepts: c.concepts }));
  return { questions, unitKeys: units, timeLimitMs: questions.length * rules.secondsPerQuestion * 1000, passRatio: rules.passRatio };
}

// ---------------------------------------------------------------- el examen en curso
export interface ExamAnswer {
  readonly exerciseId: string;
  readonly correct: boolean;
  /** Lo que escribió el usuario (para el cuaderno de errores). */
  readonly answer: string;
  readonly timeMs: number;
  readonly confidence: 1 | 2 | 3 | null;
  /** Cuándo la contestó (ms). */
  readonly at: number;
}

export type ExamEndReason = "complete" | "time" | "handed-in";

export interface ExamRun {
  readonly plan: ExamPlan;
  /** Preguntas por contestar; la primera es la que se ve. Saltar manda la actual al final. */
  readonly pending: readonly string[];
  readonly answers: readonly ExamAnswer[];
  readonly startedAt: number;
  readonly status: "playing" | "finished";
  readonly endedAt: number | null;
  readonly endReason: ExamEndReason | null;
}

export function startExam(plan: ExamPlan, now: number): ExamRun {
  const pending = plan.questions.map((q) => q.exerciseId);
  return {
    plan,
    pending,
    answers: [],
    startedAt: now,
    status: pending.length ? "playing" : "finished",
    endedAt: pending.length ? null : now,
    endReason: pending.length ? null : "complete",
  };
}

export function currentExamQuestion(run: ExamRun): ExamQuestion | null {
  if (run.status !== "playing") return null;
  return run.plan.questions.find((q) => q.exerciseId === run.pending[0]) ?? null;
}

export function examTimeLeftMs(run: ExamRun, now: number): number {
  return Math.max(0, run.plan.timeLimitMs - ((run.endedAt ?? now) - run.startedAt));
}

function end(run: ExamRun, now: number, reason: ExamEndReason): ExamRun {
  return { ...run, status: "finished", endedAt: now, endReason: reason };
}

/** Guarda la respuesta de la pregunta actual. Si ya se había acabado el tiempo, no cuenta y el examen termina. */
export function answerExam(run: ExamRun, answer: Omit<ExamAnswer, "exerciseId" | "at">, now: number): ExamRun {
  const id = run.pending[0];
  if (run.status !== "playing" || id === undefined) return run;
  if (now - run.startedAt > run.plan.timeLimitMs) return end(run, now, "time");
  const next: ExamRun = { ...run, pending: run.pending.slice(1), answers: [...run.answers, { ...answer, exerciseId: id, at: now }] };
  return next.pending.length ? next : end(next, now, "complete");
}

/** Deja la actual para después (al final de la fila). Con una sola pendiente no cambia nada. */
export function skipExam(run: ExamRun): ExamRun {
  if (run.status !== "playing" || run.pending.length < 2) return run;
  const [first, ...rest] = run.pending;
  return first === undefined ? run : { ...run, pending: [...rest, first] };
}

export function timeoutExam(run: ExamRun, now: number): ExamRun {
  return run.status === "playing" ? end(run, now, "time") : run;
}

/** Entregar antes de tiempo: lo que no contestaste cuenta como no contestado. */
export function handInExam(run: ExamRun, now: number): ExamRun {
  return run.status === "playing" ? end(run, now, "handed-in") : run;
}

// ---------------------------------------------------------------- resultado
export interface ExamTally {
  readonly key: string;
  readonly correct: number;
  readonly total: number;
}

export interface ExamResult {
  readonly correct: number;
  readonly total: number;
  /** Aciertos / preguntas del examen (las no contestadas cuentan como error). */
  readonly score: number;
  readonly passed: boolean;
  /** Por unidad, en el orden de la materia. */
  readonly byUnit: readonly ExamTally[];
  /** Por concepto, del más débil al más fuerte. */
  readonly byConcept: readonly ExamTally[];
  readonly failed: readonly string[];
  readonly unanswered: readonly string[];
}

export function examResult(run: ExamRun): ExamResult {
  const answered = new Map(run.answers.map((a) => [a.exerciseId, a.correct]));
  const total = run.plan.questions.length;
  const correct = run.answers.filter((a) => a.correct).length;
  const score = total ? correct / total : 0;

  const tally = (keyOf: (q: ExamQuestion) => readonly string[]) => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const q of run.plan.questions) {
      for (const key of keyOf(q)) {
        const t = map.get(key) ?? { correct: 0, total: 0 };
        map.set(key, { correct: t.correct + (answered.get(q.exerciseId) ? 1 : 0), total: t.total + 1 });
      }
    }
    return [...map].map(([key, t]) => ({ key, ...t }));
  };

  const byUnit = tally((q) => [q.unitKey]).sort((a, b) => run.plan.unitKeys.indexOf(a.key) - run.plan.unitKeys.indexOf(b.key));
  // El más débil primero; en empate, el que tuvo más preguntas (la evidencia más fuerte) y luego por nombre.
  const byConcept = tally((q) => q.concepts).sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total || a.key.localeCompare(b.key));

  return {
    correct,
    total,
    score,
    passed: total > 0 && score >= run.plan.passRatio - 1e-9,
    byUnit,
    byConcept,
    failed: run.answers.filter((a) => !a.correct).map((a) => a.exerciseId),
    unanswered: run.plan.questions.filter((q) => !answered.has(q.exerciseId)).map((q) => q.exerciseId),
  };
}
