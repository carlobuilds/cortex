/**
 * Geometría numérica de los visuales de Cálculo (docs/01, Fase 3). Pura: recibe funciones y devuelve
 * números; quien dibuja decide cómo se ve. Todo lo que se muestra al usuario sale de evaluar `f`,
 * así que los valores son aproximaciones honestas, no respuestas escritas a mano.
 */

export type Point = readonly [x: number, y: number];
export type Interval = readonly [min: number, max: number];
export type Fn = (x: number) => number;

/**
 * Donde la curva se corta: un salto, un hueco o una asíntota. `left`/`right` son los valores a cada
 * lado y `value` es `f(x)` justo ahí (`NaN` si no existe): con eso se decide qué punto va relleno.
 */
export interface CurveBreak {
  readonly x: number;
  readonly left: number;
  readonly right: number;
  readonly value: number;
}

export interface Curve {
  /** Tramos continuos, cada uno con al menos dos puntos. */
  readonly pieces: readonly (readonly Point[])[];
  readonly breaks: readonly CurveBreak[];
}

const SAMPLES = 240;
/** Un tramo es candidato a salto si su cambio es este múltiplo del cambio típico entre muestras. */
const CANDIDATE_FACTOR = 10;
/** Tras bisecar: si el cambio no se redujo a menos de esta fracción, es un salto (no una pendiente fuerte). */
const JUMP_SHARE = 0.5;
const BISECTIONS = 30;

/** `f(x)` si es un número finito; `NaN` si no existe, es infinito o `f` lanza. */
export function safeValue(f: Fn, x: number): number {
  try {
    const y = f(x);
    return Number.isFinite(y) ? y : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

/** El corte se reporta en un x "limpio" (1, no 0.99999999997) para poder preguntar cuánto vale `f` justo ahí. */
function breakAt(f: Fn, x: number, left: number, right: number): CurveBreak {
  const clean = Number(x.toFixed(9));
  return { x: clean, left, right, value: safeValue(f, clean) };
}

/** Busca un salto entre dos muestras vecinas: una función continua, por empinada que sea, cambia cada vez menos al acercar los puntos. */
function findBreak(f: Fn, x0: number, y0: number, x1: number, y1: number): CurveBreak | null {
  const initial = Math.abs(y1 - y0);
  let lo = x0;
  let yLo = y0;
  let hi = x1;
  let yHi = y1;
  for (let i = 0; i < BISECTIONS; i++) {
    const mid = (lo + hi) / 2;
    const yMid = safeValue(f, mid);
    if (Number.isNaN(yMid)) return breakAt(f, mid, yLo, yHi);
    if (Math.abs(yMid - yLo) >= Math.abs(yHi - yMid)) {
      hi = mid;
      yHi = yMid;
    } else {
      lo = mid;
      yLo = yMid;
    }
  }
  return Math.abs(yHi - yLo) > JUMP_SHARE * initial ? breakAt(f, (lo + hi) / 2, yLo, yHi) : null;
}

/**
 * Puntos donde se evalúa: una malla pareja más los múltiplos de 1/2 del dominio, que es donde suelen
 * estar los huecos de los ejemplos (0/0 en x = 1, sen(x)/x en 0). Son exactos en coma flotante, así
 * que ahí `f` da `NaN` de verdad; sin ellos, un hueco entre dos muestras no se vería.
 * Los múltiplos de π/2 no sirven para esto: no son exactos y `tan` da ahí un número enorme, no `NaN`.
 */
function sampleGrid([a, b]: Interval, samples: number): number[] {
  const xs = new Set<number>();
  const add = (x: number) => xs.add(Number(x.toFixed(10)));
  for (let i = 0; i <= samples; i++) add(a + ((b - a) * i) / samples);
  const first = Math.ceil(a * 2);
  const last = Math.floor(b * 2);
  if (last - first <= 2 * samples) for (let k = first; k <= last; k++) add(k / 2);
  return [...xs].filter((x) => x >= a && x <= b).sort((p, q) => p - q);
}

const median = (values: readonly number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** Muestrea `f` en el dominio y la parte en tramos continuos (no une los dos lados de un salto o una asíntota). */
export function sampleCurve(f: Fn, [a, b]: Interval, samples = SAMPLES): Curve {
  const xs = sampleGrid([a, b], samples);
  const ys = xs.map((x) => safeValue(f, x));
  const near = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  const steps: number[] = [];
  for (let i = 1; i < ys.length; i++) {
    const d = Math.abs((ys[i] ?? Number.NaN) - (ys[i - 1] ?? Number.NaN));
    if (!Number.isNaN(d)) steps.push(d);
  }
  const candidate = Math.max(CANDIDATE_FACTOR * median(steps), 1e-9);

  const pieces: Point[][] = [];
  const breaks: CurveBreak[] = [];
  let current: Point[] = [];
  const close = () => {
    if (current.length > 1) pieces.push(current);
    current = [];
  };
  xs.forEach((x, i) => {
    const y = ys[i] ?? Number.NaN;
    const last = current.at(-1);
    if (Number.isNaN(y)) {
      // Hueco en una muestra exacta (p. ej. 0/0 en x = 1): se mira pegado a cada lado para saber a qué
      // valor se acercaba (o si se disparaba, como 1/x en 0).
      const next = ys[i + 1] ?? Number.NaN;
      if (last && !Number.isNaN(next)) {
        const left = safeValue(f, x - near);
        const right = safeValue(f, x + near);
        breaks.push({ x, left: Number.isNaN(left) ? last[1] : left, right: Number.isNaN(right) ? next : right, value: Number.NaN });
      }
      close();
      return;
    }
    if (last && Math.abs(y - last[1]) > candidate) {
      const found = findBreak(f, last[0], last[1], x, y);
      if (found) {
        breaks.push(found);
        close();
      }
    }
    current.push([x, y]);
  });
  close();
  return { pieces, breaks };
}

/** Acota los valores que se salen mucho de la vista (cerca de una asíntota), para no dibujar coordenadas enormes. */
export function clampPieces(pieces: Curve["pieces"], [lo, hi]: Interval): Point[][] {
  const pad = hi - lo;
  return pieces.map((piece) => piece.map(([x, y]) => [x, Math.min(hi + pad, Math.max(lo - pad, y))] as const));
}

/** Rango vertical que deja ver la curva y el eje x; recorta lo que se dispara cerca de una asíntota. */
export function fitRange(curve: Curve): Interval {
  const ys = curve.pieces.flatMap((piece) => piece.map((p) => p[1])).sort((p, q) => p - q);
  if (!ys.length) return [-1, 1];
  const at = (share: number) => ys[Math.round(share * (ys.length - 1))] ?? 0;
  const min = ys[0] ?? 0;
  const max = ys.at(-1) ?? 0;
  let lo = at(0.02);
  let hi = at(0.98);
  // Sin valores disparados, el rango completo; con asíntotas, el 96 % central.
  if (max - min <= 3 * (hi - lo) || hi - lo < 1e-9) {
    lo = min;
    hi = max;
  }
  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);
  if (hi - lo < 1e-9) return [lo - 1, hi + 1];
  const pad = 0.08 * (hi - lo);
  return [lo - pad, hi + pad];
}

/** Pendiente de la secante entre `a` y `a + h`. */
export function secantSlope(f: Fn, a: number, h: number): number {
  return (safeValue(f, a + h) - safeValue(f, a)) / h;
}

/** Derivada numérica en `a` (diferencia centrada). */
export function derivativeAt(f: Fn, a: number): number {
  const h = 1e-5 * Math.max(1, Math.abs(a));
  return (safeValue(f, a + h) - safeValue(f, a - h)) / (2 * h);
}

export type RiemannRule = "left" | "right" | "mid";

export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly height: number;
}

/** Los `n` rectángulos de una suma de Riemann; la altura se toma en el extremo o el punto medio según la regla. */
export function riemannRects(f: Fn, [a, b]: Interval, n: number, rule: RiemannRule): Rect[] {
  const width = (b - a) / n;
  const offset = rule === "left" ? 0 : rule === "right" ? 1 : 0.5;
  return Array.from({ length: n }, (_, i) => {
    const x0 = a + i * width;
    return { x0, x1: x0 + width, height: safeValue(f, x0 + offset * width) };
  });
}

export function riemannSum(rects: readonly Rect[]): number {
  return rects.reduce((sum, r) => sum + r.height * (r.x1 - r.x0), 0);
}

/** Integral definida por la regla de Simpson compuesta (`n` par). */
export function integrate(f: Fn, [a, b]: Interval, n = 1024): number {
  const h = (b - a) / n;
  let sum = safeValue(f, a) + safeValue(f, b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * safeValue(f, a + i * h);
  return (sum * h) / 3;
}

export type Side = -1 | 1;

/** Distancias a `a` de la tabla de acercamiento (las de una tabla de libro; más cerca, la resta pierde cifras). */
export const APPROACH_STEPS: readonly number[] = [0.5, 0.1, 0.01, 0.001];

/** Puntos `[x, f(x)]` cada vez más cerca de `a` por un lado. */
export function approach(f: Fn, a: number, side: Side, steps: readonly number[] = APPROACH_STEPS): Point[] {
  return steps.map((h) => [a + side * h, safeValue(f, a + side * h)] as const);
}

export type LimitEstimate =
  | { readonly kind: "finite"; readonly value: number }
  | { readonly kind: "infinite"; readonly sign: 1 | -1 }
  | { readonly kind: "none" };

/** Siete distancias de 10⁻² a 10⁻⁵ (media década cada una): no caen todas en el mismo punto de una oscilación. */
const LIMIT_STEPS = Array.from({ length: 7 }, (_, k) => 10 ** (-2 - k / 2));
const LIMIT_TOLERANCE = 1e-3;

/**
 * Estimación numérica del límite lateral en `a`. Es evidencia, no demostración: la interfaz la
 * muestra con ≈ y junto a los valores reales de `f`.
 *  - finito: los últimos valores ya casi no cambian, o los cambios se encogen de forma geométrica
 *    (convergencia lenta como √x; se extrapola con Aitken);
 *  - infinito: crece sin cambiar de signo y los cambios no se encogen (incluye divergencia lenta como ln x);
 *  - ninguno: oscila o no existe cerca de `a`.
 */
export function estimateLimit(f: Fn, a: number, side: Side): LimitEstimate {
  const values = LIMIT_STEPS.map((h) => safeValue(f, a + side * h));
  if (values.some((v) => Number.isNaN(v))) return { kind: "none" };
  const diffs = values.slice(1).map((v, i) => Math.abs(v - (values[i] ?? 0)));
  const [v0 = 0, v1 = 0, v2 = 0] = values.slice(-3);
  const tail = diffs.slice(-4);

  if (diffs.slice(-2).every((d) => d <= LIMIT_TOLERANCE * Math.max(1, Math.abs(v2)))) return { kind: "finite", value: v2 };

  const shrinking = tail.every((d, i) => i === 0 || d < 0.95 * (tail[i - 1] ?? 0));
  if (shrinking) {
    const second = v2 - 2 * v1 + v0;
    if (second !== 0) return { kind: "finite", value: v2 - (v2 - v1) ** 2 / second };
  }

  const sign = Math.sign(v2);
  const sameSign = values.every((v) => Math.sign(v) === sign);
  const growing = values.every((v, i) => i === 0 || Math.abs(v) > Math.abs(values[i - 1] ?? 0));
  const steady = tail.every((d, i) => i === 0 || d >= 0.9 * (tail[i - 1] ?? 0));
  return sign !== 0 && sameSign && growing && steady ? { kind: "infinite", sign: sign > 0 ? 1 : -1 } : { kind: "none" };
}

/** ¿Los dos límites laterales son finitos y coinciden? Devuelve el valor común o `null`. */
export function twoSidedLimit(f: Fn, a: number): number | null {
  const left = estimateLimit(f, a, -1);
  const right = estimateLimit(f, a, 1);
  if (left.kind !== "finite" || right.kind !== "finite") return null;
  return Math.abs(left.value - right.value) <= LIMIT_TOLERANCE * Math.max(1, Math.abs(left.value)) ? (left.value + right.value) / 2 : null;
}
