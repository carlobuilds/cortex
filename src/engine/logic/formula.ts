/**
 * Fórmulas de lógica proposicional (docs/01, Fase 3): se leen de texto, se evalúan y se vuelven a
 * escribir. Puro, sin dependencias: el simulador de tablas de verdad y el tipo de ejercicio
 * `tabla_verdad` usan este mismo intérprete.
 *
 * Precedencia, de más fuerte a más débil: ¬ · ∧ · ∨ y ⊕ · → · ↔ (la de Rosen; ⊕ va con ∨).
 * `→` asocia a la derecha (`p → q → r` es `p → (q → r)`); los demás, a la izquierda.
 */

export type BinaryKind = "and" | "or" | "xor" | "implies" | "iff";

export type Formula =
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "const"; readonly value: boolean }
  | { readonly kind: "not"; readonly arg: Formula }
  | { readonly kind: BinaryKind; readonly left: Formula; readonly right: Formula };

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

/** Más variables que esto no caben en una tabla que alguien pueda leer (2⁶ = 64 filas). */
export const MAX_VARIABLES = 6;

type Token =
  | { readonly type: "var"; readonly name: string }
  | { readonly type: "const"; readonly value: boolean }
  | { readonly type: "not" }
  | { readonly type: "binary"; readonly kind: BinaryKind }
  | { readonly type: "open" }
  | { readonly type: "close" };

/** Símbolos de cada conector, del más largo al más corto (`<->` antes que `->`, `&&` antes que `&`). */
const SYMBOLS: readonly (readonly [string, Token])[] = [
  ["<->", { type: "binary", kind: "iff" }],
  ["<=>", { type: "binary", kind: "iff" }],
  ["->", { type: "binary", kind: "implies" }],
  ["=>", { type: "binary", kind: "implies" }],
  ["&&", { type: "binary", kind: "and" }],
  ["||", { type: "binary", kind: "or" }],
  ["↔", { type: "binary", kind: "iff" }],
  ["⇔", { type: "binary", kind: "iff" }],
  ["→", { type: "binary", kind: "implies" }],
  ["⇒", { type: "binary", kind: "implies" }],
  ["∧", { type: "binary", kind: "and" }],
  ["&", { type: "binary", kind: "and" }],
  ["^", { type: "binary", kind: "and" }],
  ["∨", { type: "binary", kind: "or" }],
  ["|", { type: "binary", kind: "or" }],
  ["⊕", { type: "binary", kind: "xor" }],
  ["⊻", { type: "binary", kind: "xor" }],
  ["¬", { type: "not" }],
  ["~", { type: "not" }],
  ["!", { type: "not" }],
  ["(", { type: "open" }],
  [")", { type: "close" }],
  ["⊤", { type: "const", value: true }],
  ["⊥", { type: "const", value: false }],
  ["1", { type: "const", value: true }],
  ["0", { type: "const", value: false }],
];

/** Palabras que valen como conector. Las de una letra (`y`, `o`, `v`) solo cuentan donde se espera un conector. */
const WORDS: Readonly<Record<string, Token>> = {
  no: { type: "not" },
  not: { type: "not" },
  and: { type: "binary", kind: "and" },
  or: { type: "binary", kind: "or" },
  xor: { type: "binary", kind: "xor" },
};
const LETTER_CONNECTIVES: Readonly<Record<string, BinaryKind>> = { y: "and", o: "or", v: "or" };

function tokenize(input: string): Token[] {
  const text = input.normalize("NFKC");
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? "";
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const symbol = SYMBOLS.find(([s]) => text.startsWith(s, i));
    if (symbol) {
      tokens.push(symbol[1]);
      i += symbol[0].length;
      continue;
    }
    const word = /^[A-Za-z]+/.exec(text.slice(i))?.[0];
    if (!word) throw new FormulaError(`No conozco el símbolo «${ch}».`);
    i += word.length;
    if (word === "V" || word === "F") tokens.push({ type: "const", value: word === "V" });
    else if (word.length === 1 && word === word.toLowerCase()) tokens.push({ type: "var", name: word });
    else {
      const known = WORDS[word.toLowerCase()];
      if (!known) throw new FormulaError(`No conozco «${word}». Las variables son de una letra minúscula (p, q, r…).`);
      tokens.push(known);
    }
  }
  return tokens;
}

/** De menor a mayor fuerza. Cada nivel se resuelve con los operandos del nivel siguiente. */
const LEVELS: readonly (readonly BinaryKind[])[] = [["iff"], ["implies"], ["or", "xor"], ["and"]];

const describe = (token: Token | undefined): string => {
  if (!token) return "el final";
  switch (token.type) {
    case "var":
      return `«${token.name}»`;
    case "const":
      return token.value ? "«V»" : "«F»";
    case "not":
      return "«¬»";
    case "binary":
      return `«${SIGN[token.kind]}»`;
    case "open":
      return "«(»";
    case "close":
      return "«)»";
  }
};

/** Lee una fórmula. Lanza `FormulaError` con un mensaje para quien la escribió. */
export function parseFormula(input: string): Formula {
  const tokens = tokenize(input);
  if (!tokens.length) throw new FormulaError("La fórmula está vacía.");
  let pos = 0;
  const peek = () => tokens[pos];

  /** Conector binario en esta posición; aquí una `y`, `o` o `v` sueltas se leen como conector. */
  const binaryHere = (): BinaryKind | null => {
    const t = peek();
    if (t?.type === "binary") return t.kind;
    if (t?.type === "var") return LETTER_CONNECTIVES[t.name] ?? null;
    return null;
  };

  const atom = (): Formula => {
    const t = peek();
    pos++;
    if (!t) throw new FormulaError("La fórmula termina antes de tiempo: falta una variable o un paréntesis.");
    switch (t.type) {
      case "var":
        return { kind: "var", name: t.name };
      case "const":
        return { kind: "const", value: t.value };
      case "not":
        return { kind: "not", arg: atom() };
      case "open": {
        const inner = level(0);
        if (peek()?.type !== "close") throw new FormulaError("Falta cerrar un paréntesis.");
        pos++;
        return inner;
      }
      default:
        throw new FormulaError(`No esperaba ${describe(t)} aquí: falta una variable antes.`);
    }
  };

  const level = (n: number): Formula => {
    const kinds = LEVELS[n];
    if (!kinds) return atom();
    let left = level(n + 1);
    for (let kind = binaryHere(); kind && kinds.includes(kind); kind = binaryHere()) {
      pos++;
      // `→` asocia a la derecha: su lado derecho vuelve a leer este mismo nivel.
      const right = kind === "implies" ? level(n) : level(n + 1);
      left = { kind, left, right };
    }
    return left;
  };

  const formula = level(0);
  const rest = peek();
  if (rest) {
    if (rest.type === "close") throw new FormulaError("Sobra un paréntesis de cierre.");
    throw new FormulaError(`Falta un conector antes de ${describe(rest)}.`);
  }
  const count = variablesOf(formula).length;
  if (count > MAX_VARIABLES) throw new FormulaError(`Son ${count} variables; el máximo es ${MAX_VARIABLES}.`);
  return formula;
}

/** Variables de la fórmula, en orden alfabético. */
export function variablesOf(formula: Formula): string[] {
  const names = new Set<string>();
  const walk = (f: Formula) => {
    if (f.kind === "var") names.add(f.name);
    else if (f.kind === "not") walk(f.arg);
    else if (f.kind !== "const") {
      walk(f.left);
      walk(f.right);
    }
  };
  walk(formula);
  return [...names].sort();
}

export type Assignment = Readonly<Record<string, boolean>>;

export function evaluate(formula: Formula, values: Assignment): boolean {
  switch (formula.kind) {
    case "var": {
      const value = values[formula.name];
      if (value === undefined) throw new FormulaError(`Falta el valor de «${formula.name}».`);
      return value;
    }
    case "const":
      return formula.value;
    case "not":
      return !evaluate(formula.arg, values);
    case "and":
      return evaluate(formula.left, values) && evaluate(formula.right, values);
    case "or":
      return evaluate(formula.left, values) || evaluate(formula.right, values);
    case "xor":
      return evaluate(formula.left, values) !== evaluate(formula.right, values);
    case "implies":
      return !evaluate(formula.left, values) || evaluate(formula.right, values);
    case "iff":
      return evaluate(formula.left, values) === evaluate(formula.right, values);
  }
}

const SIGN: Readonly<Record<BinaryKind, string>> = { and: "∧", or: "∨", xor: "⊕", implies: "→", iff: "↔" };
const TEX: Readonly<Record<BinaryKind, string>> = { and: "\\land", or: "\\lor", xor: "\\oplus", implies: "\\to", iff: "\\leftrightarrow" };
/** Conectores donde agrupar de un modo u otro da lo mismo: una cadena `p ∧ q ∧ r` se lee sin paréntesis. */
const ASSOCIATIVE: ReadonlySet<BinaryKind> = new Set(["and", "or", "xor", "iff"]);

interface Notation {
  readonly not: string;
  readonly binary: (kind: BinaryKind) => string;
  readonly constant: (value: boolean) => string;
}

const isBinary = (f: Formula): f is Extract<Formula, { left: Formula }> => f.kind !== "var" && f.kind !== "const" && f.kind !== "not";

/**
 * Escribe como en los libros: paréntesis siempre que se mezclan conectores (no hay que saberse la
 * precedencia para leerla) y solo se omiten en cadenas del mismo conector asociativo. Lo que se
 * escribe vuelve a leerse como la misma fórmula.
 */
function write(formula: Formula, n: Notation): string {
  if (formula.kind === "var") return formula.name;
  if (formula.kind === "const") return n.constant(formula.value);
  if (formula.kind === "not") return `${n.not}${isBinary(formula.arg) ? `(${write(formula.arg, n)})` : write(formula.arg, n)}`;
  const side = (child: Formula, isLeft: boolean) => {
    const chain = isLeft && child.kind === formula.kind && ASSOCIATIVE.has(formula.kind);
    return isBinary(child) && !chain ? `(${write(child, n)})` : write(child, n);
  };
  return `${side(formula.left, true)} ${n.binary(formula.kind)} ${side(formula.right, false)}`;
}

/** La fórmula con símbolos y paréntesis donde se mezclan conectores: `(p → q) ∧ ¬q`. Volver a leerla da la misma fórmula. */
export function formatFormula(formula: Formula): string {
  return write(formula, { not: "¬", binary: (k) => SIGN[k], constant: (v) => (v ? "V" : "F") });
}

/** La fórmula en LaTeX, para KaTeX. */
export function formulaToTex(formula: Formula): string {
  return write(formula, { not: "\\neg ", binary: (k) => TEX[k], constant: (v) => (v ? "\\mathrm{V}" : "\\mathrm{F}") });
}
