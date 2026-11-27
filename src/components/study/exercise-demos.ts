import type { CatalogExercise } from "@/content/core/study-catalog";

/**
 * Ejercicios de muestra de los tipos de la Fase 3 para `/estilo` (catálogo del sistema visual). No
 * son contenido: no entran a ninguna materia ni se guardan. `exercise-demos.test.ts` los valida con
 * el mismo esquema que `content/` y exige que su respuesta oficial salga correcta.
 */

const base = { unitKey: "demo/00-tipos", subjectId: "demo", conceptos: ["demo"] };

export const EXERCISE_DEMOS: readonly { readonly label: string; readonly exercise: CatalogExercise }[] = [
  {
    label: "Selección múltiple",
    exercise: {
      ...base,
      id: "demo-00-001",
      tipo: "seleccion_multiple",
      dificultad: 1,
      enunciado: "¿Cuáles de estos números son primos?",
      opciones: ["$2$", "$9$", "$11$", "$15$"],
      correctas: [0, 2],
      verificar: { sympy: "[isprime(m) for m in [2, 9, 11, 15]]" },
      explicacion: "$2$ y $11$ solo se dividen entre $1$ y entre sí mismos; $9 = 3 \\cdot 3$ y $15 = 3 \\cdot 5$.",
    },
  },
  {
    label: "Tabla de verdad",
    exercise: {
      ...base,
      id: "demo-00-002",
      tipo: "tabla_verdad",
      dificultad: 2,
      enunciado: "Llena la tabla de verdad de $(p \\to q) \\land \\lnot q$.",
      formula: "(p → q) ∧ ¬q",
      respuesta: ["F", "F", "F", "V"],
      pistas: ["Calcula primero $p \\to q$: solo es falsa cuando $p$ es verdadera y $q$ falsa."],
      explicacion: "La conjunción exige las dos partes: $\\lnot q$ deja solo las filas con $q$ falsa, y de esas $p \\to q$ solo es verdadera cuando $p$ también es falsa.",
    },
  },
  {
    label: "Conjunto",
    exercise: {
      ...base,
      id: "demo-00-003",
      tipo: "conjunto",
      dificultad: 1,
      enunciado: "Escribe el conjunto de soluciones reales de $x^2 = 4$.",
      respuesta: ["-2", "2"],
      verificar: { sympy: "solve(x**2 - 4, x)" },
      explicacion: "$x^2 = 4$ tiene dos raíces: $x = 2$ y $x = -2$, porque $(-2)^2 = 4$.",
    },
  },
  {
    label: "Con un grafo",
    exercise: {
      ...base,
      id: "demo-00-004",
      tipo: "conjunto",
      dificultad: 2,
      enunciado: "¿Cuáles son los vecinos de $a$ en este grafo?",
      visual: { id: "grafo", vertices: "a, b, c, d, e", aristas: "a-b, b-c, c-d, d-e, e-a, a-c" },
      respuesta: ["b", "c", "e"],
      verificar: { revision: "manual" },
      explicacion: "Las aristas que tocan a $a$ son $\\{a, b\\}$, $\\{a, c\\}$ y $\\{e, a\\}$: sus vecinos son $b$, $c$ y $e$.",
    },
  },
  {
    label: "Con una gráfica",
    exercise: {
      ...base,
      id: "demo-00-005",
      tipo: "seleccion_multiple",
      dificultad: 2,
      enunciado: "Observa la gráfica de $\\lfloor x \\rfloor$. ¿En cuáles de estos valores de $x$ da un salto?",
      visual: { id: "grafica", f: "floor(x)", dominio: "-2.5, 3.5" },
      opciones: ["$x = -1$", "$x = 0.5$", "$x = 2$", "$x = 3$"],
      correctas: [0, 2, 3],
      explicacion: "El piso cambia de valor justo en cada entero y es constante entre dos enteros seguidos: salta en $-1$, $2$ y $3$, pero no en $0.5$.",
    },
  },
];
