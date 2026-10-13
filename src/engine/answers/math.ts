import { all, create, type FactoryFunctionMap, type MathNode } from "mathjs/number";

/**
 * Evaluación de expresiones para los verificadores (ADR-007). Se usa la versión `number` de
 * mathjs (sin complejos ni BigNumber): `sqrt(-1)` da `NaN` y ese punto se descarta.
 *
 * Por seguridad y para dar errores claros, solo se aceptan funciones de una lista blanca y
 * símbolos que sean variables declaradas o constantes conocidas.
 */
// `all` siempre existe en la versión number; sus tipos lo marcan opcional.
const math = create(all as FactoryFunctionMap, {});

const FUNCTIONS = new Set([
  "sqrt", "cbrt", "abs", "exp", "log", "log10", "log2", "ln",
  "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "sech", "csch", "coth", "asinh", "acosh", "atanh",
  "floor", "ceil", "round", "sign", "factorial", "nthRoot", "pow",
  // Matemáticas discretas: conteo y aritmética entera.
  "combinations", "permutations", "mod", "gcd", "lcm", "min", "max",
]);
const CONSTANTS: Readonly<Record<string, number>> = { pi: Math.PI, e: Math.E, E: Math.E, Infinity, oo: Infinity };

/**
 * Otros nombres para lo mismo, como se escribe en clase: `sen` y las inversas con `arc`, y las
 * combinaciones como `binomial(n, k)`. Se cambian al nombre que entiende mathjs antes de interpretar.
 */
const ALIASES: readonly (readonly [RegExp, string])[] = [
  [/\barc(?:sen|sin)(h?)\b/g, "asin$1"],
  [/\barccos(h?)\b/g, "acos$1"],
  [/\barct(?:an|g)(h?)\b/g, "atan$1"],
  [/\bsen(h?)\b/g, "sin$1"],
  [/\btg\b/g, "tan"],
  [/\bbinomial\(/g, "combinations("],
  [/\b(?:inf|infinito)\b/gi, "Infinity"],
];

/** `C(n, k)` y `P(n, k)`: combinaciones y permutaciones. Con un solo argumento, `C(x+1)` sigue siendo `C·(x+1)`. */
const COUNTING = /\b([CP])\(\s*([^(),]+?)\s*,\s*([^(),]+?)\s*\)/g;

/**
 * `sin x`, `sin^2 x`, `sin ^2(x+1)`, `ln x`... (la función va seguida de un argumento sin paréntesis propios).
 * El orden importa: un nombre va antes que su prefijo (`log10` antes que `log`, `sech` antes que
 * `sec`). Si no, `log10(100)` se leía como `log(10)·(100)` y daba 230.26 en vez de 2, sin avisar.
 */
const FN_NO_PARENS = /\b(log10|log2|sinh|cosh|tanh|sech|csch|coth|asinh|acosh|atanh|asin|acos|atan|sin|cos|tan|sec|csc|cot|ln|log|exp)\s*(?:\^\s*(\d+|\([^()]*\)))?\s*(?=[a-zA-Z0-9.(])((?:\d+(?:\.\d+)?)?[a-zA-Z]\w*|\d+(?:\.\d+)?|\([^()]*\))/g;

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

/** Traduce la sintaxis de sympy y de la escritura común a la de mathjs. */
export function normalizeExpression(input: string): string {
  const aliased = ALIASES.reduce((text, [pattern, name]) => text.replace(pattern, name), input.normalize("NFKC"));
  return aliased
    .replace(COUNTING, (_m, kind: string, n: string, k: string) => `${kind === "C" ? "combinations" : "permutations"}(${n}, ${k})`)
    .replace(/\*\*/g, "^")
    .replace(/[−–]/g, "-")
    .replace(/[·×⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/∞/g, "Infinity")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*([a-zA-Z0-9.]+)/g, "sqrt($1)")
    .replace(/\bAbs\(/g, "abs(")
    // Valor absoluto con barras: |x| → abs(x) (MathLive y la escritura a mano lo usan).
    .replace(/\|([^|]+)\|/g, "abs($1)")
    // Funciones sin paréntesis o con potencia antes del argumento: `sin x`, `sin ^2x`, `ln x`.
    // Si el argumento ya trae paréntesis se deja igual: envolverlo otra vez rompería `log(x, 2)`.
    .replace(FN_NO_PARENS, (_m, fn: string, pow: string | undefined, arg: string) => `${fn}${arg.startsWith("(") ? arg : `(${arg})`}${pow ? `^${pow}` : ""}`)
    .replace(/\bln\(/g, "log(")
    // `x(x+1)` es multiplicación implícita, no una llamada (mathjs lo leería como función `x`).
    .replace(/([a-zA-Z_][a-zA-Z_0-9]*)\s*\(/g, (m, id: string) => (FUNCTIONS.has(id) ? m : `${id}*(`))
    .trim();
}

export interface CompiledExpression {
  readonly variables: readonly string[];
  evaluate(scope: Readonly<Record<string, number>>): number;
}

/** Compila una expresión validando funciones y símbolos. `allowed` = variables permitidas (`null` = cualquiera). */
export function compileExpression(input: string, allowed: readonly string[] | null = null): CompiledExpression {
  const source = normalizeExpression(input);
  if (!source) throw new ExpressionError("La respuesta está vacía.");
  let node: MathNode;
  try {
    node = math.parse(source);
  } catch {
    throw new ExpressionError("No entendí la expresión. Revisa paréntesis y operadores.");
  }
  const variables = new Set<string>();
  node.traverse((n, path) => {
    if (n.type === "FunctionNode") {
      const name = (n as unknown as { fn: { name?: string } }).fn.name ?? "";
      if (!FUNCTIONS.has(name)) throw new ExpressionError(`No conozco la función «${name}».`);
    } else if (n.type === "SymbolNode" && path !== "fn") {
      const name = (n as unknown as { name: string }).name;
      if (name in CONSTANTS) return;
      if (allowed && !allowed.includes(name)) throw new ExpressionError(`No esperaba la variable «${name}».`);
      variables.add(name);
    } else if (!["OperatorNode", "ConstantNode", "ParenthesisNode", "SymbolNode"].includes(n.type)) {
      throw new ExpressionError("Usa solo números, variables, operaciones y funciones.");
    }
  });
  const code = node.compile();
  return {
    variables: [...variables].sort(),
    evaluate(scope) {
      const value: unknown = code.evaluate({ ...CONSTANTS, ...scope });
      return typeof value === "number" ? value : Number.NaN;
    },
  };
}

/**
 * La expresión en LaTeX, para mostrarla con KaTeX (`"(x^2-1)/(x-1)"` → `\frac{x^{2}-1}{x-1}`).
 * Lanza `ExpressionError` con las mismas reglas que `compileExpression`.
 */
export function toTex(input: string, allowed: readonly string[] | null = null): string {
  compileExpression(input, allowed);
  return math
    .parse(normalizeExpression(input))
    .toTex({ parenthesis: "auto", implicit: "hide" })
    // Un número por algo se escribe pegado (`2x`, no `2·x` ni `2 x`); entre números el punto se queda.
    .replace(/~/g, "")
    .replace(/(\d)\\cdot\s*(?!\d)/g, "$1")
    .trim();
}

/** Valor numérico de una expresión sin variables (`"1/3"`, `"sqrt(2)/2"`, `"0,5"`). */
export function evaluateNumber(input: string | number): number {
  if (typeof input === "number") return input;
  const text = input.trim();
  // Coma decimal: "0,5" o "-3,25" (solo si es un número simple, para no romper `log(x, 2)`).
  const decimalComma = /^[-+]?\d+,\d+$/.test(text) ? text.replace(",", ".") : text;
  const compiled = compileExpression(decimalComma, []);
  return compiled.evaluate({});
}

/** Con un entero esperado y sin tolerancia, nunca se acepta un error de medio entero o más (ver `closeEnough`). */
const INTEGER_SLACK = 0.49;

/**
 * Misma regla que `close()` de verify_content.py: tolerancia absoluta o relativa mínima de 1e-9.
 * Excepción: si se espera un entero y la tolerancia es 0, el margen relativo se topa por debajo de
 * 0.5. Sin el tope, con una respuesta de 10⁹ o más (un conteo, un factorial) el margen pasaría de 1
 * y se daría por buena la respuesta de al lado.
 */
export function closeEnough(got: number, expected: number, tolerance: number): boolean {
  if (expected === Infinity || expected === -Infinity) return got === expected;
  const relative = 1e-9 * Math.max(1, Math.abs(expected));
  const slack = tolerance === 0 && Number.isInteger(expected) ? Math.min(relative, INTEGER_SLACK) : Math.max(tolerance, relative);
  return Math.abs(got - expected) <= slack;
}
