import type { CatalogExercise } from "@/content/core/study-catalog";

/*
 * Ejemplos de los tipos de ejercicio de la Fase 3 para `/estilo` (`exercise-types-demo.tsx`). No son
 * contenido de una materia, pero cada respuesta es correcta: `demo-exercises.test.ts` los pasa por el
 * mismo esquema y el mismo verificador que el contenido, y comprueba cada respuesta por otra vía.
 */

type Demo<T extends CatalogExercise["tipo"]> = Extract<CatalogExercise, { tipo: T }>;

const base = () => ({ unitKey: "estilo/00-demo", subjectId: "estilo", conceptos: ["demo"] });

export const DEMO_PRIMES: Demo<"seleccion_multiple"> = {
  ...base(),
  id: "demo-00-001",
  tipo: "seleccion_multiple",
  dificultad: 1,
  enunciado: "¿Cuáles de estos números son primos?",
  opciones: ["$2$", "$4$", "$7$", "$9$"],
  correctas: [0, 2],
  explicacion: "$2$ y $7$ solo se dividen entre $1$ y entre sí mismos; $4 = 2 \\cdot 2$ y $9 = 3 \\cdot 3$.",
};

export const DEMO_GRAPH: Demo<"seleccion_multiple"> & { readonly visual: Record<string, string> } = {
  ...base(),
  id: "demo-00-002",
  tipo: "seleccion_multiple",
  dificultad: 2,
  enunciado: "En el grafo, ¿qué vértices tienen grado $3$?",
  opciones: ["$a$", "$b$", "$c$", "$d$", "$e$"],
  correctas: [0, 2],
  visual: { id: "grafo", vertices: "a, b, c, d, e", aristas: "a-b, b-c, c-d, d-e, e-a, a-c" },
  explicacion: "$a$ toca a $b$, $c$ y $e$; $c$ toca a $a$, $b$ y $d$. Los demás tienen grado $2$.",
};

export const DEMO_ROOTS: Demo<"conjunto"> = {
  ...base(),
  id: "demo-00-003",
  tipo: "conjunto",
  dificultad: 2,
  enunciado: "Escribe el conjunto de soluciones de $2x^2 + 3x - 2 = 0$.",
  respuesta: ["-2", "1/2"],
  verificar: { sympy: "set(solve(2*x**2 + 3*x - 2, x))" },
  explicacion: "$2x^2 + 3x - 2 = (2x - 1)(x + 2)$, así que $x = \\tfrac{1}{2}$ o $x = -2$.",
};

export const DEMO_TRUTH: Demo<"tabla_verdad"> = {
  ...base(),
  id: "demo-00-004",
  tipo: "tabla_verdad",
  dificultad: 2,
  enunciado: "Llena la tabla de verdad de $(p \\to q) \\land \\lnot q$.",
  formula: "(p → q) ∧ ¬q",
  respuesta: ["F", "F", "F", "V"],
  explicacion: "Solo es verdadera cuando $q$ es falsa y $p \\to q$ se cumple, es decir, cuando $p$ también es falsa.",
};

export const DEMO_EXERCISES: readonly CatalogExercise[] = [DEMO_PRIMES, DEMO_GRAPH, DEMO_ROOTS, DEMO_TRUTH];
