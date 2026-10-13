import katex from "katex";
import { describe, expect, it } from "vitest";
import { displayOrder, TRUTH_STYLE, truthSymbol } from "./convention";
import { evaluate, type Formula, FormulaError, formatFormula, formulaToTex, MAX_VARIABLES, parseFormula, variablesOf } from "./formula";
import { assignments, classify, equivalent, finalColumn, truthTable } from "./truth-table";

const show = (text: string) => formatFormula(parseFormula(text));
/** Columna final como texto, en orden canónico (VV, VF, FV, FF). */
const column = (text: string) => finalColumn(truthTable(parseFormula(text))).map((v) => (v ? "V" : "F")).join("");

describe("leer fórmulas", () => {
  it("acepta símbolos, ASCII y palabras para el mismo conector", () => {
    for (const text of ["p ∧ q", "p & q", "p && q", "p ^ q", "p y q", "p and q"]) expect(show(text)).toBe("p ∧ q");
    for (const text of ["p ∨ q", "p | q", "p || q", "p o q", "p v q", "p or q"]) expect(show(text)).toBe("p ∨ q");
    for (const text of ["p → q", "p -> q", "p => q", "p ⇒ q"]) expect(show(text)).toBe("p → q");
    for (const text of ["p ↔ q", "p <-> q", "p <=> q", "p ⇔ q"]) expect(show(text)).toBe("p ↔ q");
    for (const text of ["p ⊕ q", "p xor q", "p ⊻ q"]) expect(show(text)).toBe("p ⊕ q");
    for (const text of ["¬p", "~p", "!p", "no p", "not p"]) expect(show(text)).toBe("¬p");
    expect(show("V ∧ F")).toBe("V ∧ F");
    expect(show("1 ∨ 0")).toBe("V ∨ F");
    expect(show("  p∧q ")).toBe("p ∧ q");
  });

  it("`y`, `o` y `v` son variables donde va una variable y conectores donde va un conector", () => {
    expect(show("y ∧ o")).toBe("y ∧ o");
    expect(show("v v v")).toBe("v ∨ v");
    expect(show("o o y")).toBe("o ∨ y");
    expect(variablesOf(parseFormula("p v q"))).toEqual(["p", "q"]);
  });

  it("precedencia: ¬ · ∧ · ∨ · → · ↔", () => {
    expect(parseFormula("¬p ∧ q")).toEqual(parseFormula("(¬p) ∧ q"));
    expect(parseFormula("p ∨ q ∧ r")).toEqual(parseFormula("p ∨ (q ∧ r)"));
    expect(parseFormula("p ∧ q → r ∨ s")).toEqual(parseFormula("(p ∧ q) → (r ∨ s)"));
    expect(parseFormula("p → q ↔ ¬q → ¬p")).toEqual(parseFormula("(p → q) ↔ ((¬q) → (¬p))"));
    expect(parseFormula("¬¬p")).toEqual({ kind: "not", arg: { kind: "not", arg: { kind: "var", name: "p" } } });
  });

  it("→ asocia a la derecha; ∧, ∨ y ↔, a la izquierda", () => {
    expect(parseFormula("p → q → r")).toEqual(parseFormula("p → (q → r)"));
    expect(parseFormula("p ∧ q ∧ r")).toEqual(parseFormula("(p ∧ q) ∧ r"));
    expect(parseFormula("p ↔ q ↔ r")).toEqual(parseFormula("(p ↔ q) ↔ r"));
    expect(column("p → q → r")).not.toBe(column("(p → q) → r"));
  });

  it.each([
    ["", /vacía/],
    ["   ", /vacía/],
    ["p ∧", /termina antes de tiempo/],
    ["(p ∧ q", /Falta cerrar un paréntesis/],
    ["p ∧ q)", /Sobra un paréntesis de cierre/],
    ["p q", /Falta un conector antes de «q»/],
    ["p ¬q", /Falta un conector antes de «¬»/],
    ["∧ p", /No esperaba «∧» aquí/],
    ["p ∧ ∨ q", /No esperaba «∨» aquí/],
    ["()", /No esperaba «\)» aquí/],
    ["pq", /No conozco «pq»/],
    ["P ∧ Q", /No conozco «P»\. Las variables son de una letra minúscula/],
    ["p # q", /No conozco el símbolo «#»/],
    ["p - q", /No conozco el símbolo «-»/],
    ["a ∧ b ∧ c ∧ d ∧ e ∧ f ∧ g", /Son 7 variables; el máximo es 6/],
  ])("rechaza %j con un mensaje claro", (text, reason) => {
    expect(() => parseFormula(text)).toThrow(FormulaError);
    expect(() => parseFormula(text)).toThrow(reason);
  });

  it("el máximo de variables sí se acepta", () => {
    expect(variablesOf(parseFormula("a ∧ b ∧ c ∧ d ∧ e ∧ f"))).toHaveLength(MAX_VARIABLES);
  });
});

describe("escribir fórmulas", () => {
  it.each([
    ["(p → q) ∧ ¬q", "(p → q) ∧ ¬q"],
    ["((p)) ∧ (q)", "p ∧ q"],
    ["(p ∧ q) ∧ r", "p ∧ q ∧ r"],
    ["p ∧ (q ∧ r)", "p ∧ (q ∧ r)"],
    ["p → (q → r)", "p → (q → r)"],
    ["p → q → r", "p → (q → r)"],
    ["(p → q) → r", "(p → q) → r"],
    ["¬(p ∧ q)", "¬(p ∧ q)"],
    ["¬(¬p)", "¬¬p"],
    ["(p ∨ q) ⊕ r", "(p ∨ q) ⊕ r"],
    ["p ∨ (q ⊕ r)", "p ∨ (q ⊕ r)"],
    ["(p ∧ q) ∨ r", "(p ∧ q) ∨ r"],
    ["p ∧ q ∨ r", "(p ∧ q) ∨ r"],
    ["p → q ↔ ¬q → ¬p", "(p → q) ↔ (¬q → ¬p)"],
    ["p ↔ q ↔ r", "p ↔ q ↔ r"],
    ["p ∧ (q ∨ r)", "p ∧ (q ∨ r)"],
    ["(p ↔ q) → r", "(p ↔ q) → r"],
  ])("%s se escribe %s", (input, expected) => {
    expect(show(input)).toBe(expected);
  });

  it("leer lo escrito da la misma fórmula (con cualquier anidamiento)", () => {
    const vars: Formula[] = ["p", "q", "r"].map((name) => ({ kind: "var", name }));
    const kinds = ["and", "or", "xor", "implies", "iff"] as const;
    let pool: Formula[] = [...vars, { kind: "not", arg: vars[0] as Formula }];
    // Dos rondas combinando todo con todo: cubre cada par de conectores en cada lado.
    for (let round = 0; round < 2; round++) {
      const next: Formula[] = [];
      for (const left of pool.slice(0, 12)) for (const right of pool.slice(0, 12)) for (const kind of kinds) next.push({ kind, left, right });
      pool = [...next.filter((_, i) => i % 7 === 0), ...next.slice(0, 5).map((arg): Formula => ({ kind: "not", arg }))];
    }
    expect(pool.length).toBeGreaterThan(50);
    for (const f of pool) expect(parseFormula(formatFormula(f)), formatFormula(f)).toEqual(f);
  });

  it("el LaTeX se dibuja en KaTeX estricto", () => {
    expect(formulaToTex(parseFormula("(p → q) ∧ ¬q"))).toBe("(p \\to q) \\land \\neg q");
    expect(formulaToTex(parseFormula("p ∧ q ∨ r"))).toBe("(p \\land q) \\lor r");
    for (const text of ["(p → q) ∧ ¬q", "p ↔ q ⊕ r", "¬(p ∨ V) → F", "p ∧ q ∨ r"]) {
      expect(() => katex.renderToString(formulaToTex(parseFormula(text)), { throwOnError: true, strict: "error" }), text).not.toThrow();
    }
  });
});

describe("tablas de verdad", () => {
  it("las filas van en orden canónico: todas verdaderas primero", () => {
    expect(assignments(["p", "q"])).toEqual([
      { p: true, q: true },
      { p: true, q: false },
      { p: false, q: true },
      { p: false, q: false },
    ]);
    expect(assignments(["p", "q", "r"])).toHaveLength(8);
    expect(assignments(["p", "q", "r"])[3]).toEqual({ p: true, q: false, r: false });
    expect(assignments([])).toEqual([{}]);
  });

  // Tablas básicas de cada conector, escritas a mano (VV, VF, FV, FF).
  it.each([
    ["p ∧ q", "VFFF"],
    ["p ∨ q", "VVVF"],
    ["p ⊕ q", "FVVF"],
    ["p → q", "VFVV"],
    ["p ↔ q", "VFFV"],
    ["¬p", "FV"],
    ["p", "VF"],
    ["V", "V"],
    ["(p → q) ∧ ¬q", "FFFV"],
  ])("%s → %s", (text, expected) => {
    expect(column(text)).toBe(expected);
  });

  it("las columnas van de adentro hacia afuera, sin repetir, y la última es la fórmula", () => {
    const table = truthTable(parseFormula("(p → q) ∧ ¬q"));
    expect(table.variables).toEqual(["p", "q"]);
    expect(table.columns.map((c) => c.label)).toEqual(["p → q", "¬q", "(p → q) ∧ ¬q"]);
    expect(truthTable(parseFormula("(p ∧ q) ∨ (p ∧ q)")).columns.map((c) => c.label)).toEqual(["p ∧ q", "(p ∧ q) ∨ (p ∧ q)"]);
    expect(truthTable(parseFormula("p")).columns.map((c) => c.label)).toEqual(["p"]);
  });

  it("evaluar pide el valor de cada variable", () => {
    expect(evaluate(parseFormula("p → q"), { p: true, q: false })).toBe(false);
    expect(() => evaluate(parseFormula("p → q"), { p: true })).toThrow(/Falta el valor de «q»/);
  });

  it("clasifica tautologías, contradicciones y contingencias", () => {
    expect(classify(parseFormula("p ∨ ¬p"))).toBe("tautology");
    expect(classify(parseFormula("(p → q) ∧ p → q"))).toBe("tautology");
    expect(classify(parseFormula("p ∧ ¬p"))).toBe("contradiction");
    expect(classify(parseFormula("p → q"))).toBe("contingency");
  });

  it("equivalencias clásicas, también con variables distintas a cada lado", () => {
    const eq = (a: string, b: string) => equivalent(parseFormula(a), parseFormula(b));
    expect(eq("¬(p ∧ q)", "¬p ∨ ¬q")).toBe(true);
    expect(eq("¬(p ∨ q)", "¬p ∧ ¬q")).toBe(true);
    expect(eq("p → q", "¬p ∨ q")).toBe(true);
    expect(eq("p → q", "¬q → ¬p")).toBe(true);
    expect(eq("p → q", "q → p")).toBe(false);
    expect(eq("p ↔ q", "(p → q) ∧ (q → p)")).toBe(true);
    expect(eq("p ⊕ q", "¬(p ↔ q)")).toBe(true);
    expect(eq("p ∧ (q ∨ ¬q)", "p")).toBe(true);
    expect(eq("p", "q")).toBe(false);
  });
});

describe("convención para mostrar la tabla", () => {
  it("la convención elegida es válida: dos símbolos distintos y un orden conocido", () => {
    expect(TRUTH_STYLE.symbols).toHaveLength(2);
    expect(TRUTH_STYLE.symbols[0]).not.toBe(TRUTH_STYLE.symbols[1]);
    expect(TRUTH_STYLE.symbols.every((s) => s.trim().length > 0)).toBe(true);
    expect(["all-true", "all-false"]).toContain(TRUTH_STYLE.firstRow);
  });

  it("los símbolos y el orden de las filas salen del estilo, sin tocar la tabla canónica", () => {
    const binary = { symbols: ["1", "0"], firstRow: "all-false" } as const;
    expect(truthSymbol(true, binary)).toBe("1");
    expect(truthSymbol(false, binary)).toBe("0");
    expect(displayOrder(4, binary)).toEqual([3, 2, 1, 0]);
    expect(displayOrder(4, { symbols: ["V", "F"], firstRow: "all-true" })).toEqual([0, 1, 2, 3]);
    // Con filas al revés, (p, q) se lee 00, 01, 10, 11: contar en binario.
    const rows = assignments(["p", "q"]);
    expect(displayOrder(4, binary).map((i) => `${truthSymbol(rows[i]?.p ?? false, binary)}${truthSymbol(rows[i]?.q ?? false, binary)}`)).toEqual(["00", "01", "10", "11"]);
  });
});
