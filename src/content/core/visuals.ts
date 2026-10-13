import { compileExpression, evaluateNumber, ExpressionError, toTex } from "@/engine/answers/math";
import { safeValue, type Interval } from "@/engine/plot";
import { VISUAL_PARAMS, type VisualParam } from "./lesson-api";

/**
 * Qué visuales existen y qué parámetros lleva cada uno (docs/05). Es dato puro: la guardia del
 * compilador valida con esto cada `<Visual>` (con su línea), y el componente recibe el visual ya
 * resuelto a números, así que en el navegador no queda nada por validar.
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
} as const satisfies Record<string, VisualSpec>;

export type VisualId = keyof typeof VISUALS;
export const VISUAL_IDS = Object.keys(VISUALS) as VisualId[];

/** Lo que el autor escribe: `id` y parámetros, todos texto. */
export type VisualProps = Readonly<Partial<Record<VisualParam | "id", string>>>;

/** El visual listo para dibujar. Solo textos y números: cruza del servidor al navegador tal cual. */
export interface ResolvedVisual {
  readonly id: VisualId;
  readonly f: string;
  readonly domain: Interval;
  /** Rango vertical fijo, o `null` para ajustarlo a la curva. */
  readonly range: Interval | null;
  readonly a: number | null;
  readonly n: number | null;
  readonly title: string | null;
}

export const RIEMANN_DEFAULT_N = 4;
export const RIEMANN_MAX_N = 100;

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

export type VisualResult = { readonly ok: true; readonly visual: ResolvedVisual } | { readonly ok: false; readonly problems: readonly string[] };

/** Valida los parámetros de un `<Visual>` y los convierte a números. Los problemas van en español, para el autor. */
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
 * visual aunque la gráfica todavía no haya cargado, y es lo que lee un lector de pantalla.
 */
export function describeVisual(v: ResolvedVisual): string {
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
