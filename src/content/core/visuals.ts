import { compileExpression, evaluateNumber, ExpressionError, toTex } from "@/engine/answers/math";
import type { Edge, Graph } from "@/engine/graph";
import { FormulaError, formatFormula, formulaToTex, parseFormula } from "@/engine/logic/formula";
import { safeValue, type Interval } from "@/engine/plot";
import { VISUAL_PARAMS, type VisualParam } from "./lesson-api";

/**
 * Qué visuales existen y qué parámetros lleva cada uno (docs/05). Es dato puro: la guardia del
 * compilador valida con esto cada `<Visual>` (con su línea), y el componente recibe el visual ya
 * resuelto, así que en el navegador no queda nada por validar.
 */

interface VisualSpec {
  /** Etiqueta del bloque en la lección. */
  readonly label: string;
  readonly required: readonly VisualParam[];
  readonly optional: readonly VisualParam[];
}

export const VISUALS = {
  grafica: { label: "Gráfica", required: ["f", "dominio"], optional: ["rango", "titulo"] },
  limite: { label: "Acércate al límite", required: ["f", "a", "dominio"], optional: ["rango", "titulo"] },
  "secante-tangente": { label: "De la secante a la tangente", required: ["f", "a", "dominio"], optional: ["rango", "titulo"] },
  riemann: { label: "Área con rectángulos", required: ["f", "dominio"], optional: ["n", "rango", "titulo"] },
  "tabla-verdad": { label: "Tabla de verdad", required: ["formula"], optional: ["titulo"] },
  grafo: { label: "Grafo", required: ["vertices", "aristas"], optional: ["dirigido", "titulo"] },
} as const satisfies Record<string, VisualSpec>;

export type VisualId = keyof typeof VISUALS;
export const VISUAL_IDS = Object.keys(VISUALS) as VisualId[];

/** Lo que el autor escribe: `id` y parámetros, todos texto. */
export type VisualProps = Readonly<Partial<Record<VisualParam | "id", string>>>;

export type FunctionVisualId = "grafica" | "limite" | "secante-tangente" | "riemann";

/** Visual de una función de x, listo para dibujar. Solo textos y números: cruza del servidor al navegador tal cual. */
export interface FunctionVisual {
  readonly id: FunctionVisualId;
  readonly f: string;
  readonly domain: Interval;
  /** Rango vertical fijo, o `null` para ajustarlo a la curva. */
  readonly range: Interval | null;
  readonly a: number | null;
  readonly n: number | null;
  readonly title: string | null;
}

export interface TruthTableSpec {
  readonly id: "tabla-verdad";
  /** La fórmula ya leída y vuelta a escribir con símbolos (`(p → q) ∧ ¬q`). */
  readonly formula: string;
  readonly title: string | null;
}

export interface GraphSpec {
  readonly id: "grafo";
  readonly graph: Graph;
  readonly title: string | null;
}

export type ResolvedVisual = FunctionVisual | TruthTableSpec | GraphSpec;

export const RIEMANN_DEFAULT_N = 4;
export const RIEMANN_MAX_N = 100;
export const GRAPH_MAX_VERTICES = 12;

const isVisualId = (id: string): id is VisualId => Object.hasOwn(VISUALS, id);

function parseNumber(text: string): number | null {
  try {
    const value = evaluateNumber(text);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** `"min, max"` con expresiones numéricas (`"0, 2*pi"`); la coma separa, así que los decimales van con punto. */
function parseInterval(text: string): Interval | null {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  [...text].forEach((ch, i) => {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  });
  parts.push(text.slice(start));
  if (parts.length !== 2) return null;
  const [lo, hi] = parts.map((p) => parseNumber(p));
  return lo !== null && lo !== undefined && hi !== null && hi !== undefined && lo < hi ? [lo, hi] : null;
}

type Resolved<T> = { readonly ok: true; readonly visual: T } | { readonly ok: false; readonly problems: readonly string[] };
export type VisualResult = Resolved<ResolvedVisual>;

function resolveFunction(id: FunctionVisualId, props: VisualProps): Resolved<FunctionVisual> {
  const problems: string[] = [];
  const f = props.f ?? "";
  let evaluate: ((x: number) => number) | null = null;
  try {
    const compiled = compileExpression(f, ["x"]);
    evaluate = (x) => compiled.evaluate({ x });
  } catch (e) {
    problems.push(`f: ${e instanceof ExpressionError ? e.message : "no entendí la expresión"} (la variable es x)`);
  }

  const domain = parseInterval(props.dominio ?? "");
  if (!domain) problems.push(`dominio debe ser "min, max" con min < max (p. ej. "-3, 3"; decimales con punto)`);

  let range: Interval | null = null;
  if (props.rango !== undefined) {
    range = parseInterval(props.rango);
    if (!range) problems.push(`rango debe ser "min, max" con min < max (p. ej. "-1, 9")`);
  }

  let a: number | null = null;
  if (props.a !== undefined) {
    a = parseNumber(props.a);
    if (a === null) problems.push("a debe ser un número");
    else if (domain && !(a > domain[0] && a < domain[1])) problems.push(`a = ${a} debe quedar dentro del dominio (sin tocar los extremos)`);
  }

  let n: number | null = null;
  if (props.n !== undefined) {
    n = parseNumber(props.n);
    if (n === null || !Number.isInteger(n) || n < 1 || n > RIEMANN_MAX_N) {
      problems.push(`n debe ser un entero de 1 a ${RIEMANN_MAX_N}`);
      n = null;
    }
  }

  if (evaluate && domain) {
    const [lo, hi] = domain;
    const g = evaluate;
    const defined = Array.from({ length: 41 }, (_, i) => safeValue(g, lo + ((hi - lo) * i) / 40)).some((y) => !Number.isNaN(y));
    if (!defined) problems.push("f no tiene valores en ese dominio");
    else if (id === "secante-tangente" && a !== null && Number.isNaN(safeValue(g, a))) problems.push(`f no está definida en a = ${a}: no hay punto donde apoyar la tangente`);
    else if (id === "riemann" && [lo, hi, (lo + hi) / 2].some((x) => Number.isNaN(safeValue(g, x)))) problems.push("f debe estar definida en todo el dominio para sumar rectángulos");
  }

  if (problems.length || !domain) return { ok: false, problems };
  return { ok: true, visual: { id, f, domain, range, a, n: id === "riemann" ? (n ?? RIEMANN_DEFAULT_N) : n, title: props.titulo ?? null } };
}

function resolveTruthTable(props: VisualProps): Resolved<TruthTableSpec> {
  try {
    return { ok: true, visual: { id: "tabla-verdad", formula: formatFormula(parseFormula(props.formula ?? "")), title: props.titulo ?? null } };
  } catch (e) {
    return { ok: false, problems: [`formula: ${e instanceof FormulaError ? e.message : "no entendí la fórmula"}`] };
  }
}

const VERTEX = /^[A-Za-z0-9]{1,3}$/;
const items = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

function resolveGraph(props: VisualProps): Resolved<GraphSpec> {
  const problems: string[] = [];
  const vertices = items(props.vertices ?? "");
  const bad = vertices.find((v) => !VERTEX.test(v));
  if (bad !== undefined) problems.push(`vertices: «${bad}» no es un nombre válido (de 1 a 3 letras o cifras, separados por comas)`);
  if (new Set(vertices).size !== vertices.length) problems.push("vertices: hay nombres repetidos");
  if (vertices.length < 2 || vertices.length > GRAPH_MAX_VERTICES) problems.push(`vertices: deben ser de 2 a ${GRAPH_MAX_VERTICES}`);

  let directed = false;
  if (props.dirigido !== undefined) {
    const value = props.dirigido.trim().toLowerCase();
    if (value === "si" || value === "sí") directed = true;
    else if (value !== "no") problems.push(`dirigido debe ser "si" o "no"`);
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const text of items(props.aristas ?? "")) {
    const ends = text.split("-").map((s) => s.trim());
    const [from, to] = ends;
    if (ends.length !== 2 || !from || !to) {
      problems.push(`aristas: «${text}» debe ser dos vértices unidos por un guion (p. ej. "a-b")`);
      continue;
    }
    const unknown = [from, to].find((v) => !vertices.includes(v));
    if (unknown !== undefined) {
      problems.push(`aristas: «${text}» usa el vértice «${unknown}», que no está en vertices`);
      continue;
    }
    if (from === to) {
      problems.push(`aristas: «${text}» une un vértice consigo mismo; los lazos no se dibujan`);
      continue;
    }
    const key = directed ? `${from}>${to}` : [from, to].sort().join("-");
    if (seen.has(key)) problems.push(`aristas: «${text}» está repetida`);
    seen.add(key);
    edges.push([from, to]);
  }

  if (problems.length) return { ok: false, problems };
  return { ok: true, visual: { id: "grafo", graph: { vertices, edges, directed }, title: props.titulo ?? null } };
}

/** Valida los parámetros de un `<Visual>` y los deja listos para dibujar. Los problemas van en español, para el autor. */
export function resolveVisual(props: VisualProps): VisualResult {
  const id = props.id ?? "";
  if (!isVisualId(id)) return { ok: false, problems: [`no existe el visual «${id}» (usa: ${VISUAL_IDS.join(", ")})`] };
  const spec: VisualSpec = VISUALS[id];
  const problems: string[] = [];
  for (const p of spec.required) if (props[p] === undefined) problems.push(`el visual «${id}» necesita '${p}'`);
  for (const p of VISUAL_PARAMS) {
    if (props[p] !== undefined && !spec.required.includes(p) && !spec.optional.includes(p)) problems.push(`el visual «${id}» no usa '${p}'`);
  }
  if (problems.length) return { ok: false, problems };
  if (id === "tabla-verdad") return resolveTruthTable(props);
  if (id === "grafo") return resolveGraph(props);
  return resolveFunction(id, props);
}

export function validateVisual(props: VisualProps): readonly string[] {
  const result = resolveVisual(props);
  return result.ok ? [] : result.problems;
}

/** Número corto para textos: sin ceros de relleno ni errores de redondeo (`0.30000000000000004` → `0.3`). */
export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "no existe" : value > 0 ? "∞" : "−∞";
  const fixed = value.toFixed(digits);
  const text = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
  return text === "-0" ? "0" : text.replace("-", "−");
}

const tex = (value: number) => formatNumber(value).replace("−", "-");

/**
 * Descripción en una frase (Markdown con fórmulas), dibujada en el servidor: dice qué muestra el
 * visual aunque el dibujo todavía no haya cargado, y es lo que lee un lector de pantalla.
 */
export function describeVisual(v: ResolvedVisual): string {
  if (v.id === "tabla-verdad") return `Tabla de verdad de $${formulaToTex(parseFormula(v.formula))}$. Puedes cambiar la fórmula y ver cómo cambia la tabla.`;
  if (v.id === "grafo") {
    const { vertices, edges, directed } = v.graph;
    const names = vertices.map((name) => `$${name}$`).join(", ");
    // Notación de conjuntos: una arista sin dirección es un par sin orden, {a, b}; con dirección, un par ordenado, (a, b).
    const lines = edges.map(([from, to]) => (directed ? `$(${from}, ${to})$` : `$\\{${from}, ${to}\\}$`)).join(", ");
    return `Grafo ${directed ? "dirigido " : ""}con vértices ${names}${edges.length ? ` y aristas ${lines}` : " y sin aristas"}.`;
  }
  const f = `$f(x) = ${toTex(v.f, ["x"])}$`;
  const [lo, hi] = v.domain;
  const between = `entre $x = ${tex(lo)}$ y $x = ${tex(hi)}$`;
  switch (v.id) {
    case "grafica":
      return `Gráfica de ${f} ${between}.`;
    case "limite":
      return `Qué le pasa a ${f} cuando $x$ se acerca a $${tex(v.a ?? 0)}$ por cada lado. Mueve el control para acercarte.`;
    case "secante-tangente":
      return `La secante de ${f} entre $x = ${tex(v.a ?? 0)}$ y $x = ${tex(v.a ?? 0)} + h$. Encoge $h$ y mira en qué recta se convierte.`;
    case "riemann":
      return `Rectángulos bajo ${f} ${between}. Sube $n$ y compara la suma con el área.`;
  }
}
