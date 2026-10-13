import { createRng, type Rng } from "../rng";
import { compileExpression, type CompiledExpression } from "./math";

/**
 * Equivalencia simbólica por evaluación numérica (ADR-007): se evalúan ambas expresiones en
 * puntos aleatorios del dominio (saltando singularidades y valores fuera de dominio) y se
 * comparan con tolerancia relativa. La comprobación fuerte con sympy ya la hizo
 * verify_content.py al escribir el ejercicio.
 */

const REQUIRED_POINTS = 6;
const MAX_TRIALS = 80;
const REL_TOL = 1e-6;
const ABS_TOL = 1e-8;

/** Rangos alternados: mixto, positivo (para raíces y logaritmos) y cercano a 0. */
const RANGES: readonly (readonly [number, number])[] = [
  [-3, 3],
  [0.1, 3.5],
  [-1, 1],
  [1, 6],
];

/** Dónde se toman los puntos de prueba cuando los rangos de arriba no sirven (docs/05, `muestreo`). */
export interface Sampling {
  readonly from: number;
  readonly to: number;
  /** Solo enteros: para fórmulas en `n` como `(-1)^n` o `n!`, que entre enteros no existen. */
  readonly integers?: boolean;
}

export interface MatchOptions {
  /** Antiderivadas: vale cualquier expresión que difiera de la oficial en una constante. */
  readonly uptoConstant?: boolean;
  readonly sampling?: Sampling;
}

/** Nombre reservado para la constante de integración: `x^2 + C` se acepta donde la oficial es `x^2`. */
export const INTEGRATION_CONSTANT = "C";

function samplePoint(rng: Rng, variables: readonly string[], trial: number, sampling?: Sampling): Record<string, number> {
  const [lo, hi] = sampling ? [sampling.from, sampling.to] : (RANGES[trial % RANGES.length] ?? [-3, 3]);
  const scope: Record<string, number> = {};
  for (const v of variables) {
    scope[v] = sampling?.integers ? Math.floor(lo) + Math.floor(rng() * (Math.floor(hi) - Math.floor(lo) + 1)) : lo + (hi - lo) * rng();
  }
  return scope;
}

export type Equivalence = "equivalent" | "different" | "undetermined";

export function equivalent(a: CompiledExpression, b: CompiledExpression, options: MatchOptions = {}, seed = 12345): Equivalence {
  // La constante de integración no se muestrea: es el mismo número en todos los puntos.
  const variables = [...new Set([...a.variables, ...b.variables])].filter((v) => !(options.uptoConstant && v === INTEGRATION_CONSTANT));
  const rng = createRng(seed);
  let valid = 0;
  /** Diferencia en el primer punto válido; con `uptoConstant`, las demás deben ser iguales a ella. */
  let offset: number | null = null;
  for (let trial = 0; trial < MAX_TRIALS && valid < REQUIRED_POINTS; trial++) {
    const scope = samplePoint(rng, variables, trial, options.sampling);
    if (options.uptoConstant) scope[INTEGRATION_CONSTANT] = 0;
    let va: number;
    let vb: number;
    try {
      va = a.evaluate(scope);
      vb = b.evaluate(scope);
    } catch {
      continue;
    }
    if (!Number.isFinite(va) || !Number.isFinite(vb) || Math.abs(va) > 1e9) continue;
    if (options.uptoConstant) {
      offset ??= va - vb;
      vb += offset;
    }
    if (Math.abs(va - vb) > Math.max(ABS_TOL, REL_TOL * Math.max(Math.abs(va), Math.abs(vb)))) return "different";
    valid++;
    // Sin variables basta un punto.
    if (variables.length === 0) return "equivalent";
  }
  return valid >= REQUIRED_POINTS ? "equivalent" : "undetermined";
}

/** Compara la expresión del usuario con la oficial. Lanza `ExpressionError` si la del usuario no se entiende. */
export function symbolicMatch(user: string, expected: string | number, variables?: readonly string[], options: MatchOptions = {}): Equivalence {
  const exp = compileExpression(String(expected));
  const extra = options.uptoConstant ? [INTEGRATION_CONSTANT] : [];
  const allowed = variables && variables.length ? [...new Set([...variables, ...exp.variables, ...extra])] : exp.variables.length ? null : extra;
  const usr = compileExpression(user, allowed);
  return equivalent(usr, exp, options);
}
