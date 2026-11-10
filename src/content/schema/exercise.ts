import { VISUAL_PARAMS } from "@/content/core/lesson-api";
import { resolveVisual } from "@/content/core/visuals";
import { elementKey, SetError } from "@/engine/answers/sets";
import { FormulaError, parseFormula } from "@/engine/logic/formula";
import { finalColumn, truthTable } from "@/engine/logic/truth-table";
import { exerciseId, kebab, nonEmptyText, numberOrExpr, unitKey, z } from "./common";

export const EXERCISE_TYPES = [
  "opcion_multiple",
  "numerico",
  "simbolico",
  "completar",
  "ordenar",
  "codigo",
  "predecir_salida",
  "autoevaluacion",
  "depurar",
  "parsons",
  "rastreo_memoria",
  // Fase 3
  "tabla_verdad",
  "conjunto",
  "seleccion_multiple",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Cómo se verifica la respuesta (docs/05, "Sobre `verificar`"). */
export const verifySchema = z.union(
  [
    z.strictObject({ sympy: nonEmptyText }),
    z.strictObject({ python: nonEmptyText }),
    z.strictObject({ revision: z.literal("manual") }),
  ],
  { error: "verificar debe ser { sympy: ... }, { python: ... } o { revision: manual }" },
);
export type Verify = z.infer<typeof verifySchema>;

/**
 * Visuales que pueden acompañar a un enunciado: solo los que se dibujan fijos. Los demás (un
 * límite, una tabla de verdad) dicen su conclusión y regalarían la respuesta.
 */
export const EXERCISE_VISUALS = ["grafica", "grafo"] as const;

const VISUAL_KEYS: readonly string[] = ["id", ...VISUAL_PARAMS];

/** `visual: { id, ... }` con los mismos parámetros de texto que `<Visual>` en una lección (docs/05). */
const exerciseVisual = z.record(z.string(), z.string({ error: "los parámetros de un visual van entre comillas (son texto)" })).superRefine((props, ctx) => {
  const unknown = Object.keys(props).filter((key) => !VISUAL_KEYS.includes(key));
  if (unknown.length) {
    ctx.addIssue({ code: "custom", message: `visual no tiene '${unknown[0]}' (usa: ${VISUAL_KEYS.join(", ")})` });
    return;
  }
  if (!(EXERCISE_VISUALS as readonly string[]).includes(props.id ?? "")) {
    ctx.addIssue({ code: "custom", path: ["id"], message: `en un ejercicio el visual debe ser ${EXERCISE_VISUALS.join(" o ")}` });
    return;
  }
  const resolved = resolveVisual(props);
  if (!resolved.ok) for (const problem of resolved.problems) ctx.addIssue({ code: "custom", message: problem });
});

/** Campos comunes a todos los tipos. */
const common = {
  id: exerciseId,
  dificultad: z.number().int().min(1).max(5),
  conceptos: z.array(kebab).min(1, "conceptos vacío"),
  enunciado: nonEmptyText,
  explicacion: nonEmptyText,
  pistas: z.array(nonEmptyText).optional(),
  tarjeta: z.boolean().optional(),
  tiempo_estimado_s: z.number().positive().optional(),
  verificar: verifySchema.optional(),
  visual: exerciseVisual.optional(),
  retirado: z.literal(false).optional(),
};

/**
 * Texto que la app muestra o compara tal cual: va entre comillas en el YAML. Un número sin
 * comillas perdería su forma (`3.0` → 3) y ya no coincidiría con lo que verificó Python.
 */
const displayText = z.string({ error: "escribe este valor entre comillas (texto exacto, p. ej. \"3.0\")" });
const uniqueAsText = (items: readonly string[]) => new Set(items).size === items.length;

const multipleChoice = z
  .strictObject({
    ...common,
    tipo: z.literal("opcion_multiple"),
    opciones: z.array(displayText).min(2, "opciones inválidas: se necesitan al menos 2"),
    correcta: z.number().int().nonnegative(),
    valores: z.array(numberOrExpr).optional(),
  })
  .superRefine((ex, ctx) => {
    if (ex.correcta >= ex.opciones.length) {
      ctx.addIssue({ code: "custom", path: ["correcta"], message: "'correcta' fuera de rango" });
    }
    if (!uniqueAsText(ex.opciones)) {
      ctx.addIssue({ code: "custom", path: ["opciones"], message: "opciones repetidas" });
    }
    if (ex.valores && ex.valores.length !== ex.opciones.length) {
      ctx.addIssue({
        code: "custom",
        path: ["valores"],
        message: "'valores' debe tener la misma longitud que 'opciones'",
      });
    }
  });

const numeric = z.strictObject({
  ...common,
  tipo: z.literal("numerico"),
  respuesta: numberOrExpr,
  tolerancia: z.number().nonnegative().optional(),
  verificar: verifySchema,
});

/** Dónde toma la app sus puntos de prueba al comparar una respuesta simbólica (docs/05). */
const sampling = z
  .strictObject({
    desde: z.number(),
    hasta: z.number(),
    /** Solo valores enteros: para fórmulas en `n` como `(-1)^n` o `n!`. */
    enteros: z.boolean().optional(),
  })
  .refine((m) => m.desde < m.hasta, { path: ["hasta"], message: "'desde' debe ser menor que 'hasta'" });

const symbolic = z.strictObject({
  ...common,
  tipo: z.literal("simbolico"),
  respuesta: z.union([nonEmptyText, z.number()]),
  variables: z.array(nonEmptyText).optional(),
  /** Antiderivadas: se acepta cualquier expresión que difiera de `respuesta` en una constante. */
  salvo_constante: z.boolean().optional(),
  muestreo: sampling.optional(),
  verificar: z.strictObject({ sympy: nonEmptyText }),
});

const fillBlanks = z
  .strictObject({
    ...common,
    tipo: z.literal("completar"),
    texto: nonEmptyText,
    respuestas: z.array(displayText),
  })
  .superRefine((ex, ctx) => {
    const blanks = ex.texto.split("___").length - 1;
    if (blanks === 0 || blanks !== ex.respuestas.length) {
      ctx.addIssue({
        code: "custom",
        path: ["respuestas"],
        message: `huecos (${blanks}) != respuestas (${ex.respuestas.length})`,
      });
    }
  });

const ordering = z
  .strictObject({
    ...common,
    tipo: z.literal("ordenar"),
    elementos: z.array(displayText),
  })
  .superRefine((ex, ctx) => {
    if (ex.elementos.length < 3 || !uniqueAsText(ex.elementos)) {
      ctx.addIssue({ code: "custom", path: ["elementos"], message: "ordenar requiere ≥3 elementos únicos" });
    }
  });

/** `oculto: true` = la app no muestra la prueba (solo si pasó o no). */
const pythonTest = z.strictObject({
  expr: nonEmptyText,
  esperado: z.json(),
  tolerancia: z.number().nonnegative().optional(),
  oculto: z.boolean().optional(),
});
const cTest = z.strictObject({
  entrada: z.string().optional(),
  salida: displayText,
  oculto: z.boolean().optional(),
});

const lineCount = (code: string) => code.replace(/\n+$/, "").split("\n").length;

const codePython = z.strictObject({
  ...common,
  tipo: z.literal("codigo"),
  lenguaje: z.literal("python"),
  plantilla: z.string(),
  solucion: nonEmptyText,
  tests: z.array(pythonTest).min(1),
});
const codeC = z.strictObject({
  ...common,
  tipo: z.literal("codigo"),
  lenguaje: z.literal("c"),
  plantilla: z.string(),
  solucion: nonEmptyText,
  tests: z.array(cTest).min(1),
});

/** Debug Dojo (Fase 2): encuentra la línea con el error y corrígela hasta pasar las pruebas. */
const lineNumber = z.number().int().positive();
const bugLines = z.union([lineNumber, z.array(lineNumber).min(1)]);
const debugCommon = {
  ...common,
  tipo: z.literal("depurar"),
  /** Código con el error (lo que ve el usuario). */
  codigo: nonEmptyText,
  /** Línea(s) 1-based donde está el error: las únicas que cambia la solución. */
  linea_bug: bugLines,
  solucion: nonEmptyText,
};
const checkBugLines = (ex: { codigo: string; linea_bug: number | number[] }, ctx: z.RefinementCtx) => {
  const n = lineCount(ex.codigo);
  for (const l of Array.isArray(ex.linea_bug) ? ex.linea_bug : [ex.linea_bug]) {
    if (l > n) ctx.addIssue({ code: "custom", path: ["linea_bug"], message: `linea_bug ${l} fuera del código (${n} líneas)` });
  }
};
const debugPython = z.strictObject({ ...debugCommon, lenguaje: z.literal("python"), tests: z.array(pythonTest).min(1) }).superRefine(checkBugLines);
const debugC = z.strictObject({ ...debugCommon, lenguaje: z.literal("c"), tests: z.array(cTest).min(1) }).superRefine(checkBugLines);

/** Problema de Parsons (Fase 2): ordenar líneas de código (y su sangría en Python). */
const parsonsCommon = {
  ...common,
  tipo: z.literal("parsons"),
  /** Líneas en el orden correcto; en Python con su sangría (múltiplos de 4 espacios). */
  lineas: z.array(displayText).min(3, "parsons requiere ≥3 líneas"),
  /** Líneas que sobran (no van en la solución). */
  distractores: z.array(displayText).optional(),
};
const checkParsons = (ex: { lenguaje: string; lineas: string[]; distractores?: string[] | undefined }, ctx: z.RefinementCtx) => {
  const lines = new Set(ex.lineas.map((l) => l.trim()));
  for (const d of ex.distractores ?? []) {
    if (lines.has(d.trim())) ctx.addIssue({ code: "custom", path: ["distractores"], message: `el distractor «${d.trim()}» también está en las líneas` });
  }
  if (ex.lenguaje === "python") {
    ex.lineas.forEach((l, i) => {
      const indent = l.length - l.trimStart().length;
      if (indent % 4 !== 0 || l.trimStart().startsWith("\t")) {
        ctx.addIssue({ code: "custom", path: ["lineas", i], message: "en Python la sangría va en múltiplos de 4 espacios" });
      }
    });
  }
};
const parsonsPython = z.strictObject({ ...parsonsCommon, lenguaje: z.literal("python"), tests: z.array(pythonTest).min(1).optional() }).superRefine(checkParsons);
const parsonsC = z.strictObject({ ...parsonsCommon, lenguaje: z.literal("c"), tests: z.array(cTest).min(1).optional() }).superRefine(checkParsons);

/** Formatos de printf con salida determinista (sin %p: las direcciones cambian en cada corrida). */
export const TRACE_FORMAT_RE = /^%(?:\.\d+)?(?:d|i|u|c|s|f|g|x|ld|lu|lf|zu)$/;
const traceFormat = z.string().regex(TRACE_FORMAT_RE, "formato de printf no permitido (usa %d, %c, %s, %f, %.2f, %ld, %zu...; nunca %p)");
const traceCell = z.strictObject({
  nombre: nonEmptyText,
  /** Lo que se dibuja (p. ej. "5", "'a'", "→ a", "basura"). */
  valor: displayText,
  /** Si se da, verify_content.py imprime `expr` con `formato` tras la línea del paso y lo compara con `valor`. */
  expr: nonEmptyText.optional(),
  formato: traceFormat.optional(),
});
const traceStep = z
  .strictObject({
    /** Línea 1-based que se acaba de ejecutar. */
    linea: lineNumber,
    nota: nonEmptyText.optional(),
    pila: z.array(traceCell),
    heap: z.array(traceCell).optional(),
    pregunta: nonEmptyText.optional(),
    respuesta: displayText.optional(),
    expr: nonEmptyText.optional(),
    formato: traceFormat.optional(),
    /** Si la línea corre varias veces (un ciclo), cuál de sus ejecuciones (1 = la primera). */
    vez: z.number().int().positive().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.pregunta && (p.respuesta === undefined || !p.expr || !p.formato)) {
      ctx.addIssue({ code: "custom", path: ["pregunta"], message: "una pregunta requiere 'respuesta', 'expr' y 'formato'" });
    }
    for (const [i, c] of [...p.pila, ...(p.heap ?? [])].entries()) {
      if (Boolean(c.expr) !== Boolean(c.formato)) ctx.addIssue({ code: "custom", path: ["pila", i], message: "'expr' y 'formato' van juntos" });
    }
  });
const memoryTrace = z
  .strictObject({
    ...common,
    tipo: z.literal("rastreo_memoria"),
    lenguaje: z.literal("c"),
    codigo: nonEmptyText,
    pasos: z.array(traceStep).min(2, "rastreo requiere ≥2 pasos"),
  })
  .superRefine((ex, ctx) => {
    const n = lineCount(ex.codigo);
    ex.pasos.forEach((p, i) => {
      if (p.linea > n) ctx.addIssue({ code: "custom", path: ["pasos", i, "linea"], message: `línea ${p.linea} fuera del código (${n} líneas)` });
    });
    if (!ex.pasos.some((p) => p.pregunta)) ctx.addIssue({ code: "custom", path: ["pasos"], message: "rastreo requiere al menos una pregunta" });
  });

const predictOutput = z.strictObject({
  ...common,
  tipo: z.literal("predecir_salida"),
  lenguaje: z.literal("python"),
  codigo: nonEmptyText,
  respuesta: displayText,
});

const selfAssessment = z.strictObject({
  ...common,
  tipo: z.literal("autoevaluacion"),
  rubrica: z.array(nonEmptyText).min(1, "requiere 'rubrica'"),
  respuesta_modelo: nonEmptyText,
});

const truthValue = z.enum(["V", "F"], { error: 'cada valor de la tabla es "V" o "F"' });

/**
 * Tabla de verdad (Fase 3): el usuario llena la columna de la fórmula. `respuesta` va en el orden
 * canónico de `engine/logic/truth-table.ts` (para p y q: VV, VF, FV, FF), sea cual sea el orden en
 * que la app la muestre. Aquí se comprueba contra el intérprete de la app; `verify_content.py` la
 * vuelve a calcular con sympy.
 */
const truthTableExercise = z
  .strictObject({
    ...common,
    tipo: z.literal("tabla_verdad"),
    formula: nonEmptyText,
    respuesta: z.array(truthValue).min(1),
  })
  .superRefine((ex, ctx) => {
    let column: readonly boolean[];
    try {
      column = finalColumn(truthTable(parseFormula(ex.formula)));
    } catch (e) {
      ctx.addIssue({ code: "custom", path: ["formula"], message: e instanceof FormulaError ? e.message : "no entendí la fórmula" });
      return;
    }
    if (ex.respuesta.length !== column.length) {
      ctx.addIssue({ code: "custom", path: ["respuesta"], message: `la tabla tiene ${column.length} filas y la respuesta trae ${ex.respuesta.length}` });
      return;
    }
    const wrong = column.findIndex((value, i) => (value ? "V" : "F") !== ex.respuesta[i]);
    if (wrong >= 0) {
      ctx.addIssue({ code: "custom", path: ["respuesta", wrong], message: `la fila ${wrong + 1} vale ${column[wrong] ? "V" : "F"} según la fórmula` });
    }
  });

/** Conjunto (Fase 3): elementos sin orden; un elemento es un número, un par `(a, b)` o un texto. */
const setExercise = z
  .strictObject({
    ...common,
    tipo: z.literal("conjunto"),
    respuesta: z.array(displayText),
    verificar: verifySchema,
  })
  .superRefine((ex, ctx) => {
    const keys = new Set<string>();
    ex.respuesta.forEach((element, i) => {
      try {
        const key = elementKey(element);
        if (keys.has(key)) ctx.addIssue({ code: "custom", path: ["respuesta", i], message: `el elemento «${element}» está repetido` });
        keys.add(key);
      } catch (e) {
        ctx.addIssue({ code: "custom", path: ["respuesta", i], message: e instanceof SetError ? e.message : "elemento inválido" });
      }
    });
  });

/** Selección múltiple (Fase 3): varias opciones correctas; hay que marcarlas todas y solo esas. */
const multipleSelect = z
  .strictObject({
    ...common,
    tipo: z.literal("seleccion_multiple"),
    opciones: z.array(displayText).min(2, "opciones inválidas: se necesitan al menos 2"),
    correctas: z.array(z.number().int().nonnegative()).min(1, "'correctas' necesita al menos una opción"),
  })
  .superRefine((ex, ctx) => {
    if (!uniqueAsText(ex.opciones)) ctx.addIssue({ code: "custom", path: ["opciones"], message: "opciones repetidas" });
    if (new Set(ex.correctas).size !== ex.correctas.length) ctx.addIssue({ code: "custom", path: ["correctas"], message: "'correctas' tiene índices repetidos" });
    if (ex.correctas.some((i) => i >= ex.opciones.length)) ctx.addIssue({ code: "custom", path: ["correctas"], message: "'correctas' fuera de rango" });
  });

/** Un esquema por tipo; `codigo` se despacha además por `lenguaje`. */
export const exerciseSchemas = {
  opcion_multiple: multipleChoice,
  numerico: numeric,
  simbolico: symbolic,
  completar: fillBlanks,
  ordenar: ordering,
  codigo: z.discriminatedUnion("lenguaje", [codePython, codeC], { error: "lenguaje debe ser 'python' o 'c'" }),
  predecir_salida: predictOutput,
  autoevaluacion: selfAssessment,
  depurar: z.discriminatedUnion("lenguaje", [debugPython, debugC], { error: "lenguaje debe ser 'python' o 'c'" }),
  parsons: z.discriminatedUnion("lenguaje", [parsonsPython, parsonsC], { error: "lenguaje debe ser 'python' o 'c'" }),
  rastreo_memoria: memoryTrace,
  tabla_verdad: truthTableExercise,
  conjunto: setExercise,
  seleccion_multiple: multipleSelect,
} as const satisfies Record<ExerciseType, z.ZodType>;

/**
 * Ejercicio retirado (`retirado: true`): su id queda reservado para siempre y no se verifica
 * el resto (igual que verify_content.py). Solo se exige el id.
 */
export const retiredExerciseSchema = z.looseObject({
  id: exerciseId,
  retirado: z.literal(true),
});

export type MultipleChoiceExercise = z.infer<typeof multipleChoice>;
export type NumericExercise = z.infer<typeof numeric>;
export type SymbolicExercise = z.infer<typeof symbolic>;
export type FillBlanksExercise = z.infer<typeof fillBlanks>;
export type OrderingExercise = z.infer<typeof ordering>;
export type CodeExercise = z.infer<(typeof exerciseSchemas)["codigo"]>;
export type PredictOutputExercise = z.infer<typeof predictOutput>;
export type SelfAssessmentExercise = z.infer<typeof selfAssessment>;
export type DebugExercise = z.infer<(typeof exerciseSchemas)["depurar"]>;
export type ParsonsExercise = z.infer<(typeof exerciseSchemas)["parsons"]>;
export type MemoryTraceExercise = z.infer<typeof memoryTrace>;
export type TruthTableExercise = z.infer<typeof truthTableExercise>;
export type SetExercise = z.infer<typeof setExercise>;
export type MultipleSelectExercise = z.infer<typeof multipleSelect>;
export type TraceStep = z.infer<typeof traceStep>;
export type TraceCell = z.infer<typeof traceCell>;
export type PythonTest = z.infer<typeof pythonTest>;
export type CTest = z.infer<typeof cTest>;
export type Exercise =
  | MultipleChoiceExercise
  | NumericExercise
  | SymbolicExercise
  | FillBlanksExercise
  | OrderingExercise
  | CodeExercise
  | PredictOutputExercise
  | SelfAssessmentExercise
  | DebugExercise
  | ParsonsExercise
  | MemoryTraceExercise
  | TruthTableExercise
  | SetExercise
  | MultipleSelectExercise;
export type RetiredExercise = z.infer<typeof retiredExerciseSchema>;

/** Encabezado de `ejercicios.yaml`; cada ejercicio se valida aparte con `parseExercise`. */
export const exercisesFileSchema = z.strictObject({
  unidad: unitKey,
  ejercicios: z.array(z.unknown()),
});

export type ParsedExercise =
  | { ok: true; retired: false; exercise: Exercise }
  | { ok: true; retired: true; exercise: RetiredExercise }
  | { ok: false; issues: z.core.$ZodIssue[] };

const typeSchema = z.enum(EXERCISE_TYPES, {
  error: (iss) => (iss.input === undefined ? "falta 'tipo'" : `tipo desconocido '${String(iss.input)}'`),
});

/** Valida un ejercicio en dos tiempos (tipo y luego campos) para dar mensajes claros. */
export function parseExercise(raw: unknown): ParsedExercise {
  const retirado = typeof raw === "object" && raw !== null ? (raw as { retirado?: unknown }).retirado : undefined;
  if (retirado !== undefined && typeof retirado !== "boolean") {
    return {
      ok: false,
      issues: [{ code: "custom", path: ["retirado"], message: "retirado debe ser true (o quítalo)", input: retirado }],
    };
  }
  if (retirado === true) {
    const r = retiredExerciseSchema.safeParse(raw);
    return r.success ? { ok: true, retired: true, exercise: r.data } : { ok: false, issues: r.error.issues };
  }
  const head = z.looseObject({ tipo: typeSchema }).safeParse(raw);
  if (!head.success) return { ok: false, issues: head.error.issues };
  const r = exerciseSchemas[head.data.tipo].safeParse(raw);
  return r.success
    ? { ok: true, retired: false, exercise: r.data as Exercise }
    : { ok: false, issues: r.error.issues };
}
