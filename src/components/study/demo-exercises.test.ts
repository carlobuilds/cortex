import { describe, expect, it } from "vitest";
import { resolveVisual } from "@/content/core/visuals";
import { parseExercise } from "@/content/schema";
import { type Answer, checkAnswer } from "@/engine/answers/check";
import { evaluateNumber } from "@/engine/answers/math";
import { formatSet } from "@/engine/answers/sets";
import { degree } from "@/engine/graph";
import { DEMO_EXERCISES, DEMO_GRAPH, DEMO_PRIMES, DEMO_ROOTS } from "./demo-exercises";

/*
 * Los ejemplos de `/estilo` cumplen las mismas reglas que el contenido (esquema de docs/05 y
 * verificador de la app) y cada respuesta se comprueba además por otra vía, sin reusar la respuesta.
 */

const strip = <T extends object>(ex: T) => {
  const { unitKey: _u, subjectId: _s, ...rest } = ex as T & { unitKey: string; subjectId: string };
  return rest;
};

const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);

describe("ejercicios de ejemplo de /estilo", () => {
  it.each(DEMO_EXERCISES.map((e) => [e.id, e] as const))("%s pasa el esquema del contenido", (_id, ex) => {
    const parsed = parseExercise(strip(ex));
    expect(parsed.ok ? [] : parsed.issues.map((i) => i.message)).toEqual([]);
  });

  it("la respuesta oficial de cada uno sale correcta en el verificador de la app", () => {
    for (const ex of DEMO_EXERCISES) {
      const answer: Answer | null =
        ex.tipo === "seleccion_multiple"
          ? { kind: "choices", indexes: ex.correctas }
          : ex.tipo === "conjunto"
            ? { kind: "text", value: formatSet(ex.respuesta) }
            : ex.tipo === "tabla_verdad"
              ? { kind: "truth", values: ex.respuesta.map((v) => v === "V") }
              : null;
      expect(answer, `${ex.id}: tipo sin respuesta en la prueba`).not.toBeNull();
      if (answer) expect(checkAnswer(ex, answer), ex.id).toEqual({ status: "correct" });
    }
  });

  it("cada respuesta se comprueba por otra vía", () => {
    const [primes, graph, roots] = [DEMO_PRIMES, DEMO_GRAPH, DEMO_ROOTS];
    // Primos: se prueba la divisibilidad de cada opción.
    const values = primes.opciones.map((o) => Number(o.replaceAll("$", "")));
    expect(values.flatMap((n, i) => (isPrime(n) ? [i] : []))).toEqual([...primes.correctas]);
    // Grado 3: se cuenta en el grafo que dibuja el visual.
    const resolved = resolveVisual(graph.visual);
    expect(resolved.ok).toBe(true);
    if (resolved.ok && resolved.visual.id === "grafo") {
      const g = resolved.visual.graph;
      const names = graph.opciones.map((o) => o.replaceAll("$", ""));
      expect(names.flatMap((v, i) => (degree(g, v).out === 3 ? [i] : []))).toEqual([...graph.correctas]);
    }
    // Raíces: cada una anula el polinomio y son dos distintas (un polinomio de grado 2 no tiene más).
    const xs = roots.respuesta.map((r) => evaluateNumber(r));
    for (const x of xs) expect(2 * x ** 2 + 3 * x - 2).toBeCloseTo(0, 12);
    expect(new Set(xs).size).toBe(2);
  });
});
