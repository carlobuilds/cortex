import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Formula, formatFormula, parseFormula } from "../../src/engine/logic/formula";
import { finalColumn, truthTable } from "../../src/engine/logic/truth-table";
import { createRng, pick, randInt, type Rng } from "../../src/engine/rng";
import { findPython, PYTHON_ENV } from "../../scripts/lib/find-python";

/*
 * Tablas de verdad: la app (src/engine/logic) y verify_content.py tienen intérpretes escritos por
 * separado. Esta prueba les da las mismas fórmulas, escritas con símbolos, ASCII y palabras, y exige
 * la misma columna fila por fila. Si alguien cambia la precedencia o un símbolo en un lado y no en
 * el otro, falla aquí antes de que un ejercicio se califique distinto de como se verificó.
 */

const VARS = ["p", "q", "r", "s"];
const KINDS = ["and", "or", "xor", "implies", "iff"] as const;

function randomFormula(rng: Rng, depth: number): Formula {
  if (depth === 0 || rng() < 0.25) {
    return rng() < 0.08 ? { kind: "const", value: rng() < 0.5 } : { kind: "var", name: pick(rng, VARS) };
  }
  if (rng() < 0.25) return { kind: "not", arg: randomFormula(rng, depth - 1) };
  return { kind: pick(rng, KINDS), left: randomFormula(rng, depth - 1), right: randomFormula(rng, depth - 1) };
}

/** Otras formas de escribir lo mismo que acepta docs/05. */
const SPELLINGS: Readonly<Record<string, readonly string[]>> = {
  "¬": ["¬", "~", "!", "no "],
  "∧": ["∧", "&", "&&", "^", "y", "and"],
  "∨": ["∨", "|", "||", "o", "v", "or"],
  "⊕": ["⊕", "⊻", "xor"],
  "→": ["→", "->", "=>", "⇒"],
  "↔": ["↔", "<->", "<=>", "⇔"],
};

function respell(rng: Rng, text: string): string {
  return [...text].map((ch) => (SPELLINGS[ch] ? ` ${pick(rng, SPELLINGS[ch] ?? [ch])} ` : ch)).join("");
}

describe("tablas de verdad: app ↔ verify_content.py", () => {
  it("dan la misma columna en 300 fórmulas aleatorias, con cualquier notación", () => {
    const rng = createRng(20261127);
    const cases: { text: string; column: string }[] = [];
    // Casos a mano: asociatividad de →, letras que son conector, constantes.
    for (const text of ["p -> q -> r", "p v q", "v y p", "o o o", "p ∧ V", "1 & p", "p ⊕ q ∨ r", "no p o q"]) {
      cases.push({ text, column: "" });
    }
    while (cases.length < 300) {
      const f = randomFormula(rng, randInt(rng, 1, 4));
      // La mitad, sin ningún paréntesis: es otra fórmula, pero ambos lados la leen del mismo texto y
      // así se prueba la precedencia y la asociatividad.
      const text = rng() < 0.5 ? formatFormula(f) : formatFormula(f).replace(/[()]/g, "");
      cases.push({ text: respell(rng, text), column: "" });
    }
    for (const c of cases) c.column = finalColumn(truthTable(parseFormula(c.text))).map((b) => (b ? "V" : "F")).join("");

    const py = findPython();
    if (!py.ok) throw new Error("esta prueba necesita Python 3.11+ con sympy y PyYAML");
    const script = [
      "import json, sys",
      `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "scripts"))})`,
      "import verify_content as v",
      "out = [''.join('V' if b else 'F' for b in v.truth_column(t)) for t in json.load(sys.stdin)]",
      "print(json.dumps(out))",
    ].join("\n");
    const run = spawnSync(py.python.command, [...py.python.args, "-c", script], {
      input: JSON.stringify(cases.map((c) => c.text)),
      env: { ...process.env, ...PYTHON_ENV },
      encoding: "utf8",
      windowsHide: true,
    });
    expect(run.status, run.stderr).toBe(0);
    const columns = JSON.parse(run.stdout) as string[];
    expect(columns).toHaveLength(cases.length);
    const mismatches = cases.flatMap((c, i) => (c.column === columns[i] ? [] : [`${c.text}: app ${c.column}, Python ${columns[i]}`]));
    expect(mismatches).toEqual([]);
  });
});
