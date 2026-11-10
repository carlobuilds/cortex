import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findPython, PYTHON_ENV } from "../../scripts/lib/find-python";
import { FormulaError, parseFormula, variablesOf } from "../../src/engine/logic/formula";
import { finalColumn, truthTable } from "../../src/engine/logic/truth-table";

/*
 * Dos intérpretes de lógica: el de la app (`src/engine/logic/`, que dibuja el simulador y califica
 * `tabla_verdad`) y el de `verify_content.py` (que lee la misma gramática y deja que sympy.logic
 * evalúe). Si un día se separan, una respuesta que la app marca correcta fallaría en content:check
 * o al revés. Este corpus cubre cada símbolo, cada palabra, la precedencia, la asociatividad y los
 * errores.
 */

const VALID = [
  "p",
  "V",
  "F",
  "¬p",
  "p ∧ q",
  "p ∨ q",
  "p ⊕ q",
  "p → q",
  "p ↔ q",
  "(p → q) ∧ ¬q",
  "p → q → r",
  "(p → q) → r",
  "p ↔ q ↔ r",
  "p ⊕ q ⊕ r",
  "p ∧ q ∨ r",
  "p ∨ q ∧ r",
  "¬p ∨ q → r ↔ s",
  "~(p & q) <-> ~p | ~q",
  "p -> q => r",
  "p <=> q",
  "p && q || !r",
  "p ^ q",
  "p ⊻ q",
  "p ⇒ q ⇔ r",
  "not p or q",
  "no p and q",
  "p xor q",
  "p y q",
  "p o q",
  "p v q",
  "v o y",
  "o y v",
  "q ∧ F",
  "p ∨ ⊤",
  "p ∧ ⊥",
  "1 → p",
  "p ∧ 0",
  "¬¬p",
  "((p))",
  "(p ∧ q) ∨ (¬p ∧ ¬q)",
  "p ∧ q ∧ r ∧ s ∧ t ∧ u",
  "(a → b) ∧ (b → c) → (a → c)",
  "p ∨ ¬p",
  "p ∧ ¬p",
  "ｐ ∧ ｑ", // ancho completo: NFKC lo vuelve ASCII en ambos lados
];

const INVALID = ["", "   ", "p q", "(p", "p)", "pq", "p ∧", "∧ p", "P ∧ q", "p ∧ q ∧ r ∧ s ∧ t ∧ u ∧ w", "p # q", "()"];

interface PyResult {
  readonly formula: string;
  readonly ok: boolean;
  readonly variables?: string[];
  readonly column?: boolean[];
  readonly error?: string;
}

const PY_SNIPPET = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("vc", sys.argv[1])
vc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vc)
out = []
for f in json.loads(sys.stdin.read()):
    try:
        _, names = vc.parse_logic(f)
        out.append({"formula": f, "ok": True, "variables": names, "column": vc.logic_column(f)})
    except vc.LogicError as e:
        out.append({"formula": f, "ok": False, "error": str(e)})
print(json.dumps(out, ensure_ascii=False))
`;

function runPython(formulas: readonly string[]): PyResult[] {
  const py = findPython();
  if (!py.ok) throw new Error("la paridad de lógica necesita Python 3.11+ con sympy");
  const { command, args } = py.python;
  const result = spawnSync(command, [...args, "-c", PY_SNIPPET, join(process.cwd(), "scripts", "verify_content.py")], {
    input: JSON.stringify(formulas),
    encoding: "utf8",
    env: { ...process.env, ...PYTHON_ENV },
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`Python falló: ${result.stderr}`);
  return JSON.parse(result.stdout) as PyResult[];
}

function runApp(formula: string): { ok: true; variables: string[]; column: boolean[] } | { ok: false } {
  try {
    const parsed = parseFormula(formula);
    return { ok: true, variables: variablesOf(parsed), column: [...finalColumn(truthTable(parsed))] };
  } catch (e) {
    if (e instanceof FormulaError) return { ok: false };
    throw e;
  }
}

describe("paridad de lógica: app ↔ verify_content.py", () => {
  const python = runPython([...VALID, ...INVALID]);
  const byFormula = new Map(python.map((r) => [r.formula, r]));

  it.each(VALID)("«%s» da la misma tabla", (formula) => {
    const app = runApp(formula);
    const py = byFormula.get(formula);
    expect(app.ok, "la app no la leyó").toBe(true);
    expect(py?.ok, `Python no la leyó: ${py?.error}`).toBe(true);
    if (app.ok) {
      expect(py?.variables).toEqual(app.variables);
      expect(py?.column).toEqual(app.column);
    }
  });

  it.each(INVALID)("«%s» es inválida en ambos", (formula) => {
    expect(runApp(formula).ok).toBe(false);
    expect(byFormula.get(formula)?.ok).toBe(false);
  });

  it("el corpus no es trivial: hay tautologías, contradicciones y contingencias", () => {
    const columns = VALID.map((f) => runApp(f)).flatMap((r) => (r.ok ? [r.column] : []));
    expect(columns.some((c) => c.every(Boolean))).toBe(true);
    expect(columns.some((c) => c.every((v) => !v))).toBe(true);
    expect(columns.some((c) => c.some(Boolean) && c.some((v) => !v))).toBe(true);
  });
});
