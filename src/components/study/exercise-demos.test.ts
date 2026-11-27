import { describe, expect, it } from "vitest";
import { exerciseTextFields } from "@/content/core/exercise-text";
import { resolveVisual } from "@/content/core/visuals";
import { renderRichText } from "@/content/rich-text";
import { parseExercise } from "@/content/schema";
import { type Answer, checkAnswer } from "@/engine/answers/check";
import { formatSet } from "@/engine/answers/sets";
import { neighbors } from "@/engine/graph";
import { EXERCISE_DEMOS } from "./exercise-demos";
import { toggled } from "./exercise-types";

/*
 * Las muestras de `/estilo` no son contenido, pero se ven igual que un ejercicio real: deben pasar
 * el mismo esquema (que comprueba la tabla con el intérprete), dibujarse con KaTeX estricto y tener
 * la respuesta correcta, comprobada aquí por otra vía.
 */

const official = (ex: (typeof EXERCISE_DEMOS)[number]["exercise"]): Answer => {
  switch (ex.tipo) {
    case "seleccion_multiple":
      return { kind: "choices", indexes: ex.correctas };
    case "tabla_verdad":
      return { kind: "truth", values: ex.respuesta.map((v) => v === "V") };
    case "conjunto":
      return { kind: "text", value: formatSet(ex.respuesta) };
    default:
      throw new Error(`tipo sin muestra: ${ex.tipo}`);
  }
};

describe("muestras de ejercicios de /estilo", () => {
  it.each(EXERCISE_DEMOS.map((d) => [d.label, d.exercise] as const))("%s: pasa el esquema, se dibuja y su respuesta oficial sale correcta", (_label, ex) => {
    const { unitKey: _unit, subjectId: _subject, ...raw } = ex;
    const parsed = parseExercise(raw);
    expect(parsed.ok, parsed.ok ? "" : JSON.stringify(parsed.issues)).toBe(true);
    for (const field of exerciseTextFields(ex)) expect(() => renderRichText(field.text, { inline: field.inline }), field.field).not.toThrow();
    expect(checkAnswer(ex, official(ex))).toEqual({ status: "correct" });
  });

  it("las respuestas son las de cada pregunta (comprobadas por otra vía)", () => {
    const [primes, table, roots, graph, floor] = EXERCISE_DEMOS.map((d) => d.exercise);
    const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);
    if (primes?.tipo === "seleccion_multiple") expect([2, 9, 11, 15].flatMap((n, i) => (isPrime(n) ? [i] : []))).toEqual(primes.correctas);
    // (p → q) ∧ ¬q, fila por fila (VV, VF, FV, FF), escrita a mano.
    if (table?.tipo === "tabla_verdad") expect([[true, true], [true, false], [false, true], [false, false]].map(([p, q]) => ((!p || q) && !q ? "V" : "F"))).toEqual(table.respuesta);
    if (roots?.tipo === "conjunto") expect(roots.respuesta.map(Number).every((x) => x * x === 4)).toBe(true);
    if (graph?.tipo === "conjunto" && graph.visual) {
      const resolved = resolveVisual(graph.visual);
      expect(resolved.ok && resolved.visual.id === "grafo" ? neighbors(resolved.visual.graph, "a") : null).toEqual(graph.respuesta);
    }
    if (floor?.tipo === "seleccion_multiple") {
      const values = [-1, 0.5, 2, 3];
      expect(values.flatMap((x, i) => (Math.floor(x - 1e-9) !== Math.floor(x) ? [i] : []))).toEqual(floor.correctas);
    }
  });

  it("marcar y desmarcar deja los índices ordenados y sin repetir", () => {
    expect(toggled([], 2)).toEqual([2]);
    expect(toggled([2], 0)).toEqual([0, 2]);
    expect(toggled([0, 2], 2)).toEqual([0]);
  });
});
