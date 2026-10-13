import { type Assignment, evaluate, type Formula, formatFormula, variablesOf } from "./formula";

/**
 * Tablas de verdad. El orden de las filas es **canónico y fijo** (el de la mayoría de los libros:
 * todas verdaderas primero; la primera variable es la que cambia más despacio). Las respuestas de
 * los ejercicios `tabla_verdad` se guardan en este orden; cómo se muestran es cosa de `convention.ts`.
 */

export interface TruthColumn {
  readonly formula: Formula;
  /** La subfórmula escrita con símbolos; sirve de encabezado. */
  readonly label: string;
  readonly values: readonly boolean[];
}

export interface TruthTable {
  readonly variables: readonly string[];
  /** Una asignación por fila, en orden canónico. */
  readonly rows: readonly Assignment[];
  /** Subfórmulas de adentro hacia afuera, sin repetir; la última es la fórmula completa. */
  readonly columns: readonly TruthColumn[];
}

/** Las 2ⁿ asignaciones en orden canónico: para (p, q) son VV, VF, FV, FF. */
export function assignments(variables: readonly string[]): Assignment[] {
  const n = variables.length;
  return Array.from({ length: 2 ** n }, (_, row) =>
    Object.fromEntries(variables.map((name, j) => [name, ((row >> (n - 1 - j)) & 1) === 0])),
  );
}

/** Subfórmulas compuestas en el orden en que se calculan a mano (de adentro hacia afuera), sin repetir. */
function subformulas(formula: Formula): Formula[] {
  const seen = new Map<string, Formula>();
  const walk = (f: Formula) => {
    if (f.kind === "var" || f.kind === "const") return;
    if (f.kind === "not") walk(f.arg);
    else {
      walk(f.left);
      walk(f.right);
    }
    const key = formatFormula(f);
    if (!seen.has(key)) seen.set(key, f);
  };
  walk(formula);
  return [...seen.values()];
}

export function truthTable(formula: Formula): TruthTable {
  const variables = variablesOf(formula);
  const rows = assignments(variables);
  const parts = subformulas(formula);
  // Una fórmula que es solo una variable o una constante también necesita su columna final.
  const all = parts.length ? parts : [formula];
  const columns = all.map((f) => ({ formula: f, label: formatFormula(f), values: rows.map((row) => evaluate(f, row)) }));
  return { variables, rows, columns };
}

/** La columna final: el valor de la fórmula completa en cada fila. */
export function finalColumn(table: TruthTable): readonly boolean[] {
  return table.columns.at(-1)?.values ?? [];
}

export type FormulaClass = "tautology" | "contradiction" | "contingency";

/** Tautología (siempre verdadera), contradicción (siempre falsa) o contingencia (depende). */
export function classify(formula: Formula): FormulaClass {
  const values = finalColumn(truthTable(formula));
  if (values.every(Boolean)) return "tautology";
  return values.some(Boolean) ? "contingency" : "contradiction";
}

/** ¿Dos fórmulas valen lo mismo en todas las asignaciones de sus variables (las de ambas)? */
export function equivalent(a: Formula, b: Formula): boolean {
  const variables = [...new Set([...variablesOf(a), ...variablesOf(b)])].sort();
  return assignments(variables).every((row) => evaluate(a, row) === evaluate(b, row));
}
