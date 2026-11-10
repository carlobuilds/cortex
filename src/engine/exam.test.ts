import { describe, expect, it } from "vitest";
import { apportion, waveSizes } from "./boss";
import { CONFIG } from "./config";
import {
  answerExam,
  currentExamQuestion,
  difficultyBand,
  type ExamCandidate,
  examResult,
  type ExamRules,
  examTimeLeftMs,
  handInExam,
  planExam,
  skipExam,
  startExam,
  timeoutExam,
} from "./exam";
import { createRng } from "./rng";

const RULES: ExamRules = { questions: 9, secondsPerQuestion: 60, mix: [0.3, 0.4, 0.3], passRatio: 0.6, maxLong: 1 };

/** `units` unidades con `per` ejercicios cada una, dificultades 1..5 en ciclo; el 1.º de cada unidad es largo si `long`. */
function pool(units: number, per: number, long = false): ExamCandidate[] {
  return Array.from({ length: units }, (_, u) =>
    Array.from({ length: per }, (_, i) => ({
      id: `u${u + 1}-${i + 1}`,
      unitKey: `m/u${u + 1}`,
      difficulty: (i % 5) + 1,
      concepts: [`c${u + 1}`, ...(i % 2 ? ["comun"] : [])],
      long: long && i === 0,
    })),
  ).flat();
}

const keys = (n: number) => Array.from({ length: n }, (_, i) => `m/u${i + 1}`);
const ok = { correct: true, answer: "x", timeMs: 1000, confidence: 2 as const };
const bad = { ...ok, correct: false };

describe("reparto", () => {
  it("apportion reparte con mayor residuo y los jefes siguen igual", () => {
    expect(apportion(10, [0.3, 0.4, 0.3])).toEqual([3, 4, 3]);
    expect(apportion(7, [0.3, 0.4, 0.3])).toEqual([2, 3, 2]);
    expect(apportion(0, [0.5, 0.5])).toEqual([0, 0]);
    for (const n of [1, 5, 6, 7, 13]) expect(waveSizes(n)).toEqual(apportion(n, CONFIG.boss.waves));
  });

  it("bandas de dificultad", () => {
    expect([1, 2, 3, 4, 5].map(difficultyBand)).toEqual([0, 0, 1, 2, 2]);
  });
});

describe("planExam", () => {
  it("trae `questions` preguntas, sin repetir, repartidas entre las unidades y de fácil a difícil", () => {
    const plan = planExam(pool(3, 10), keys(3), createRng(7), RULES);
    const ids = plan.questions.map((q) => q.exerciseId);
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    const perUnit = keys(3).map((k) => plan.questions.filter((q) => q.unitKey === k).length);
    expect(perUnit).toEqual([3, 3, 3]);
    const diffs = plan.questions.map((q) => q.difficulty);
    expect(diffs).toEqual([...diffs].sort((a, b) => a - b));
    expect(plan.timeLimitMs).toBe(9 * 60 * 1000);
    expect(plan.passRatio).toBe(0.6);
  });

  it("respeta la mezcla de dificultad cuando hay de dónde escoger", () => {
    const plan = planExam(pool(2, 20), keys(2), createRng(3), { ...RULES, questions: 10 });
    const bands = [0, 1, 2].map((b) => plan.questions.filter((q) => difficultyBand(q.difficulty) === b).length);
    expect(bands).toEqual(apportion(10, RULES.mix));
  });

  it("solo usa las unidades elegidas y omite las que no tienen nada", () => {
    const plan = planExam(pool(3, 10), ["m/u2", "m/vacia"], createRng(1), RULES);
    expect(plan.unitKeys).toEqual(["m/u2"]);
    expect(plan.questions.every((q) => q.unitKey === "m/u2")).toBe(true);
  });

  it("con pocas preguntas disponibles trae todas, y nunca más de `maxLong` largas", () => {
    const plan = planExam(pool(2, 3, true), keys(2), createRng(5), { ...RULES, questions: 50 });
    // 6 ejercicios, 2 largos: entran los 4 cortos y 1 largo.
    expect(plan.questions).toHaveLength(5);
    expect(plan.questions.filter((q) => q.exerciseId.endsWith("-1"))).toHaveLength(1);
  });

  it("es reproducible con la misma semilla y cambia con otra", () => {
    const a = planExam(pool(3, 10), keys(3), createRng(42), RULES);
    const b = planExam(pool(3, 10), keys(3), createRng(42), RULES);
    const c = planExam(pool(3, 10), keys(3), createRng(43), RULES);
    expect(a).toEqual(b);
    expect(a.questions.map((q) => q.exerciseId)).not.toEqual(c.questions.map((q) => q.exerciseId));
  });

  it("sin unidades o sin ejercicios: examen vacío que termina al empezar", () => {
    const plan = planExam([], keys(2), createRng(1), RULES);
    expect(plan.questions).toEqual([]);
    const run = startExam(plan, 0);
    expect(run.status).toBe("finished");
    expect(examResult(run).passed).toBe(false);
  });
});

describe("el examen en curso", () => {
  const plan = planExam(pool(2, 5), keys(2), createRng(9), { ...RULES, questions: 4 });

  it("avanza sin decir si acertaste y termina al contestar la última", () => {
    let run = startExam(plan, 1000);
    const first = currentExamQuestion(run)?.exerciseId;
    run = answerExam(run, ok, 2000);
    expect(run.answers[0]).toMatchObject({ exerciseId: first, correct: true, at: 2000 });
    expect(currentExamQuestion(run)?.exerciseId).toBe(plan.questions[1]?.exerciseId);
    for (let i = 0; i < 3; i++) run = answerExam(run, bad, 3000 + i);
    expect(run.status).toBe("finished");
    expect(run.endReason).toBe("complete");
    expect(currentExamQuestion(run)).toBeNull();
  });

  it("saltar manda la actual al final de la fila; con una sola pendiente no cambia", () => {
    let run = startExam(plan, 0);
    const [a, b] = run.pending;
    run = skipExam(run);
    expect(run.pending[0]).toBe(b);
    expect(run.pending.at(-1)).toBe(a);
    for (let i = 0; i < 3; i++) run = answerExam(run, ok, 10);
    expect(run.pending).toEqual([a]);
    expect(skipExam(run)).toBe(run);
  });

  it("el tiempo se agota: la respuesta tardía no cuenta y lo pendiente queda sin contestar", () => {
    let run = startExam(plan, 0);
    run = answerExam(run, ok, 1000);
    expect(examTimeLeftMs(run, 1000)).toBe(plan.timeLimitMs - 1000);
    const late = answerExam(run, ok, plan.timeLimitMs + 1);
    expect(late.status).toBe("finished");
    expect(late.endReason).toBe("time");
    expect(late.answers).toHaveLength(1);
    expect(examTimeLeftMs(late, plan.timeLimitMs + 99_999)).toBe(0);
    const timed = timeoutExam(run, plan.timeLimitMs);
    expect(timed.endReason).toBe("time");
    expect(examResult(timed).unanswered).toHaveLength(3);
  });

  it("entregar antes termina el examen; ya terminado, nada lo cambia", () => {
    const run = handInExam(answerExam(startExam(plan, 0), ok, 5), 6);
    expect(run.endReason).toBe("handed-in");
    expect(answerExam(run, ok, 7)).toBe(run);
    expect(skipExam(run)).toBe(run);
    expect(timeoutExam(run, 8)).toBe(run);
  });
});

describe("examResult", () => {
  it("califica sobre el total, desglosa por unidad y pone primero el concepto más débil", () => {
    const plan = planExam(pool(2, 5), keys(2), createRng(9), { ...RULES, questions: 4, passRatio: 0.5 });
    let run = startExam(plan, 0);
    // Acierta todo lo de la unidad 1 y falla lo de la unidad 2; deja una sin contestar.
    while (run.pending.length > 1) {
      const q = currentExamQuestion(run);
      run = answerExam(run, q?.unitKey === "m/u1" ? ok : bad, 1);
    }
    const left = currentExamQuestion(run);
    run = handInExam(run, 2);
    const r = examResult(run);
    const u1 = plan.questions.filter((q) => q.unitKey === "m/u1").length;
    const u1Answered = u1 - (left?.unitKey === "m/u1" ? 1 : 0);
    expect(r.total).toBe(4);
    expect(r.correct).toBe(u1Answered);
    expect(r.score).toBe(u1Answered / 4);
    expect(r.passed).toBe(u1Answered / 4 >= 0.5);
    expect(r.unanswered).toEqual(left ? [left.exerciseId] : []);
    expect(r.failed.every((id) => id.startsWith("u2-"))).toBe(true);
    expect(r.byUnit.map((t) => t.key)).toEqual(plan.unitKeys);
    expect(r.byUnit.find((t) => t.key === "m/u1")).toEqual({ key: "m/u1", correct: u1Answered, total: u1 });
    const ratios = r.byConcept.map((t) => t.correct / t.total);
    expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
    expect(r.byConcept[0]?.key).toBe("c2");
  });

  it("aprueba justo en el mínimo", () => {
    const plan = planExam(pool(1, 5), keys(1), createRng(2), { ...RULES, questions: 5, passRatio: 0.6 });
    let run = startExam(plan, 0);
    for (const c of [true, true, true, false, false]) run = answerExam(run, { ...ok, correct: c }, 1);
    expect(examResult(run)).toMatchObject({ score: 0.6, passed: true });
  });
});

describe("reglas de CONFIG.exam", () => {
  it("son coherentes", () => {
    const { questions, secondsPerQuestion, mix, passRatio, maxLong } = CONFIG.exam;
    expect(Number.isInteger(questions) && questions > 0).toBe(true);
    expect(secondsPerQuestion).toBeGreaterThan(0);
    expect(mix).toHaveLength(3);
    expect(mix.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(passRatio > 0 && passRatio <= 1).toBe(true);
    expect(Number.isInteger(maxLong) && maxLong >= 0).toBe(true);
  });
});
