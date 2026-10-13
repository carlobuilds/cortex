import { describe, expect, it } from "vitest";
import type { Exercise } from "@/content/schema";
import { checkAnswer } from "./check";
import { closeEnough, compileExpression, evaluateNumber, ExpressionError } from "./math";
import { symbolicMatch } from "./symbolic";
import { blankMatches, normalizeOutput, normalizeText } from "./text";

const common = { id: "calc-01-001", dificultad: 2, conceptos: ["c"], enunciado: "e", explicacion: "x" } as const;
const ex = (e: Record<string, unknown>): Exercise => ({ ...common, ...e }) as unknown as Exercise;

describe("números", () => {
  it("entiende decimales, fracciones, coma decimal y constantes", () => {
    expect(evaluateNumber("0.5")).toBe(0.5);
    expect(evaluateNumber(".5")).toBe(0.5);
    expect(evaluateNumber("1/2")).toBe(0.5);
    expect(evaluateNumber("0,5")).toBe(0.5);
    expect(evaluateNumber("-3,25")).toBe(-3.25);
    expect(evaluateNumber("sqrt(2)/2")).toBeCloseTo(Math.SQRT1_2);
    expect(evaluateNumber("pi/4")).toBeCloseTo(Math.PI / 4);
    expect(evaluateNumber("2**3")).toBe(8);
    expect(evaluateNumber(" −4 ")).toBe(-4);
  });

  it("una función con dos argumentos conserva sus paréntesis (logaritmo con base)", () => {
    // Antes el normalizador la reescribía como `log((8, 2))` y no se podía interpretar.
    expect(evaluateNumber("log(8, 2)")).toBeCloseTo(3);
    expect(compileExpression("log(x, 2)", ["x"]).evaluate({ x: 32 })).toBeCloseTo(5);
    expect(evaluateNumber("sin^2(pi/2)")).toBeCloseTo(1);
    expect(evaluateNumber("ln 1")).toBe(0);
  });

  it("una función cuyo nombre empieza como otra no se confunde con ella (log10, log2, sech)", () => {
    // Antes `log10(100)` se leía como `log(10)·(100)` = 230.26 y `sech(0)` fallaba con «variable h».
    expect(evaluateNumber("log10(100)")).toBeCloseTo(2);
    expect(evaluateNumber("log10 100")).toBeCloseTo(2);
    expect(evaluateNumber("log2(8)")).toBeCloseTo(3);
    expect(evaluateNumber("log(100, 10)")).toBeCloseTo(2);
    expect(evaluateNumber("log 2")).toBeCloseTo(Math.LN2);
    expect(evaluateNumber("sech(0)")).toBe(1);
    expect(evaluateNumber("csch(1)")).toBeCloseTo(1 / Math.sinh(1));
    expect(evaluateNumber("coth(1)")).toBeCloseTo(1 / Math.tanh(1));
    expect(evaluateNumber("sec(0)")).toBe(1);
    expect(compileExpression("sin 2x", ["x"]).evaluate({ x: 1 })).toBeCloseTo(Math.sin(2));
  });

  it("entiende los nombres que se usan en clase: sen, arcsen, arctan, binomial y C(n, k)", () => {
    expect(evaluateNumber("sen(pi/2)")).toBeCloseTo(1);
    expect(evaluateNumber("sen pi")).toBeCloseTo(0);
    expect(evaluateNumber("arcsen(1)")).toBeCloseTo(Math.PI / 2);
    expect(evaluateNumber("arcsin(1)")).toBeCloseTo(Math.PI / 2);
    expect(evaluateNumber("arccos(1)")).toBeCloseTo(0);
    expect(evaluateNumber("arctan(1)")).toBeCloseTo(Math.PI / 4);
    expect(evaluateNumber("arctg(1)")).toBeCloseTo(Math.PI / 4);
    expect(evaluateNumber("senh(0)")).toBe(0);
    expect(evaluateNumber("asinh(0)")).toBe(0);
    expect(evaluateNumber("sech(0)")).toBe(1);
    expect(evaluateNumber("binomial(5, 2)")).toBe(10);
    expect(evaluateNumber("combinations(5, 2)")).toBe(10);
    expect(evaluateNumber("C(5,2)")).toBe(10);
    expect(evaluateNumber("C(5, 2) * P(4, 2)")).toBe(120);
    expect(evaluateNumber("permutations(5, 2)")).toBe(20);
    expect(evaluateNumber("mod(17, 5)")).toBe(2);
    expect(evaluateNumber("gcd(12, 18)")).toBe(6);
    expect(evaluateNumber("lcm(4, 6)")).toBe(12);
    expect(evaluateNumber("max(2, 7) - min(2, 7)")).toBe(5);
    // Con un solo argumento, C(...) sigue siendo una multiplicación por la constante C.
    expect(compileExpression("C(x+1)", ["C", "x"]).evaluate({ C: 3, x: 1 })).toBe(6);
  });

  it("el infinito se puede escribir de varias formas", () => {
    for (const text of ["oo", "∞", "inf", "Inf", "infinito", "Infinity", "+∞"]) expect(evaluateNumber(text)).toBe(Infinity);
    for (const text of ["-oo", "-∞", "−∞", "-inf", "-infinito"]) expect(evaluateNumber(text)).toBe(-Infinity);
    expect(checkAnswer(ex({ tipo: "numerico", respuesta: "oo", verificar: { sympy: "x" } }), { kind: "text", value: "∞" })).toEqual({ status: "correct" });
    expect(checkAnswer(ex({ tipo: "numerico", respuesta: "-oo", verificar: { sympy: "x" } }), { kind: "text", value: "infinito" }).status).toBe("wrong");
  });

  it("un entero grande se compara exacto: el de al lado no pasa", () => {
    // Antes, con 10⁹ o más, el margen relativo de 1e-9 pasaba de 1 y se aceptaba el entero vecino.
    expect(closeEnough(1e12 + 1, 1e12, 0)).toBe(false);
    expect(closeEnough(3628800 + 1, 3628800, 0)).toBe(false);
    expect(closeEnough(1e12, 1e12, 0)).toBe(true);
    // Un resultado calculado con decimales (un cociente de factoriales) sigue pasando.
    expect(closeEnough(380.00000000000006, 380, 0)).toBe(true);
    expect(evaluateNumber("factorial(20)/factorial(18)")).toBeCloseTo(380, 6);
    expect(checkAnswer(ex({ tipo: "numerico", respuesta: 380, verificar: { sympy: "x" } }), { kind: "text", value: "20!/18!" })).toEqual({ status: "correct" });
    // Con tolerancia declarada o con un decimal esperado, la regla de siempre.
    expect(closeEnough(1e12 + 1, 1e12, 2)).toBe(true);
    expect(closeEnough(0.3333333333, 1 / 3, 0)).toBe(true);
  });

  it("si la respuesta oficial no se puede leer, no truena: pide reportarlo", () => {
    const r = checkAnswer(ex({ tipo: "numerico", respuesta: "raro(3)", verificar: { sympy: "x" } }), { kind: "text", value: "3" });
    expect(r.status).toBe("invalid");
    expect(r.status === "invalid" && r.message).toMatch(/Repórtalo/);
  });

  it("rechaza variables y funciones desconocidas con mensaje", () => {
    expect(() => evaluateNumber("x+1")).toThrow(ExpressionError);
    expect(() => evaluateNumber("import(1)")).toThrow(ExpressionError);
    expect(() => evaluateNumber("derivative(1)")).toThrow(ExpressionError);
    expect(() => evaluateNumber("1 +")).toThrow(ExpressionError);
    expect(() => compileExpression("")).toThrow(/vacía/);
  });

  it("usa la misma tolerancia que verify_content.py", () => {
    expect(closeEnough(0.33333, 1 / 3, 0)).toBe(false);
    expect(closeEnough(0.3333333333, 1 / 3, 0)).toBe(true); // 1e-9 relativo, como Python
    expect(closeEnough(0.333, 1 / 3, 0.001)).toBe(true);
    expect(closeEnough(3 + 1e-12, 3, 0)).toBe(true);
    expect(closeEnough(Infinity, Infinity, 0)).toBe(true);
  });
});

describe("equivalencia simbólica", () => {
  it("acepta formas equivalentes", () => {
    expect(symbolicMatch("x+3", "x+3")).toBe("equivalent");
    expect(symbolicMatch("3 + x", "x+3")).toBe("equivalent");
    expect(symbolicMatch("(x^2-9)/(x-3)", "x+3")).toBe("equivalent");
    expect(symbolicMatch("2x(x+1)", "2*x**2 + 2*x")).toBe("equivalent");
    expect(symbolicMatch("sin(x)^2 + cos(x)^2 + x", "1 + x")).toBe("equivalent");
    expect(symbolicMatch("sqrt(x)*sqrt(x)", "x")).toBe("equivalent");
    expect(symbolicMatch("ln(e^x)", "x")).toBe("equivalent");
    expect(symbolicMatch("x·y", "x*y", ["x", "y"])).toBe("equivalent");
  });

  it("entiende lo que escribe MathLive (ascii-math) y la escritura común", () => {
    expect(symbolicMatch("sin ^2x+cos ^2x+x+2", "x+3")).toBe("equivalent");
    expect(symbolicMatch("|x|", "Abs(x)")).toBe("equivalent");
    expect(symbolicMatch("sqrt(x) * sqrt(x)+3", "x+3")).toBe("equivalent");
    expect(symbolicMatch("2pi x", "2*pi*x")).toBe("equivalent");
    expect(symbolicMatch("e^x", "exp(x)")).toBe("equivalent");
    expect(symbolicMatch("ln x + sin(x)", "log(x) + sin(x)")).toBe("equivalent");
    expect(symbolicMatch("sin^2(x+1)", "sin(x+1)**2")).toBe("equivalent");
    expect(symbolicMatch("(x^2-9)/(x-3)", "x+3")).toBe("equivalent");
  });

  it("rechaza formas distintas", () => {
    expect(symbolicMatch("x-3", "x+3")).toBe("different");
    expect(symbolicMatch("x^2", "2*x")).toBe("different");
    expect(symbolicMatch("y+3", "x+3")).toBe("different");
  });

  it("no acepta variables cuando la respuesta es constante", () => {
    expect(() => symbolicMatch("x", "1")).toThrow(/variable/);
  });

  it("antiderivadas: con `uptoConstant` vale cualquier constante, escrita o no", () => {
    const upto = { uptoConstant: true };
    expect(symbolicMatch("x^3/3", "x**3/3", undefined, upto)).toBe("equivalent");
    expect(symbolicMatch("x^3/3 + C", "x**3/3", undefined, upto)).toBe("equivalent");
    expect(symbolicMatch("x^3/3 + 7", "x**3/3", undefined, upto)).toBe("equivalent");
    expect(symbolicMatch("C + x^3/3 - 2", "x**3/3", undefined, upto)).toBe("equivalent");
    // Dos antiderivadas que se ven distintas pero difieren en una constante: sen² y −cos²/… (identidad).
    expect(symbolicMatch("sin(x)^2/2", "-cos(x)**2/2", undefined, upto)).toBe("equivalent");
    expect(symbolicMatch("ln(2x)", "log(x)", undefined, upto)).toBe("equivalent");
    // Lo que no difiere en una constante sigue mal, y la constante no puede multiplicar.
    expect(symbolicMatch("x^3", "x**3/3", undefined, upto)).toBe("different");
    expect(symbolicMatch("x^3/3 + x", "x**3/3", undefined, upto)).toBe("different");
    // Sin la opción, la constante no se regala.
    expect(symbolicMatch("x^3/3 + 7", "x**3/3")).toBe("different");
    expect(() => symbolicMatch("x^3/3 + C", "x**3/3", ["x"])).toThrow(/No esperaba la variable «C»/);
  });

  it("muestreo: puntos donde la expresión existe, o solo enteros para fórmulas en n", () => {
    // ln(x − 7) no existe en los rangos de prueba habituales (todos por debajo de 6).
    expect(symbolicMatch("ln(x-7)", "log(x-7)")).toBe("undetermined");
    expect(symbolicMatch("ln(x-7)", "log(x-7)", undefined, { sampling: { from: 8, to: 20 } })).toBe("equivalent");
    expect(symbolicMatch("ln(x-6)", "log(x-7)", undefined, { sampling: { from: 8, to: 20 } })).toBe("different");
    // (−1)^n solo es un número real cuando n es entero.
    expect(symbolicMatch("(-1)^n", "(-1)**n")).toBe("undetermined");
    const integers = { sampling: { from: 0, to: 12, integers: true } };
    expect(symbolicMatch("(-1)^n", "(-1)**n", undefined, integers)).toBe("equivalent");
    expect(symbolicMatch("(-1)^(n+2)", "(-1)**n", undefined, integers)).toBe("equivalent");
    expect(symbolicMatch("(-1)^(n+1)", "(-1)**n", undefined, integers)).toBe("different");
    expect(symbolicMatch("n(n+1)/2", "binomial(n+1, 2)", undefined, { sampling: { from: 1, to: 15, integers: true } })).toBe("equivalent");
  });

  it("checkAnswer pasa `salvo_constante` y `muestreo` del ejercicio", () => {
    const antiderivative = ex({ tipo: "simbolico", respuesta: "x**2", salvo_constante: true, verificar: { sympy: "integrate(2*x, x)" } });
    expect(checkAnswer(antiderivative, { kind: "text", value: "x^2 + C" })).toEqual({ status: "correct" });
    expect(checkAnswer(antiderivative, { kind: "text", value: "x^2 - 4" })).toEqual({ status: "correct" });
    expect(checkAnswer(antiderivative, { kind: "text", value: "2x" }).status).toBe("wrong");
    const closedForm = ex({ tipo: "simbolico", respuesta: "2**n - 1", muestreo: { desde: 0, hasta: 10, enteros: true }, verificar: { sympy: "x" } });
    expect(checkAnswer(closedForm, { kind: "text", value: "2^n - 1" })).toEqual({ status: "correct" });
    expect(checkAnswer(closedForm, { kind: "text", value: "2^n" }).status).toBe("wrong");
  });
});

describe("texto", () => {
  it("normaliza acentos, mayúsculas, espacios y comillas", () => {
    expect(normalizeText("  Factorízá ")).toBe("factoriza");
    expect(normalizeText("`//`")).toBe("//");
    expect(blankMatches("CANCELA", "cancela")).toBe(true);
    expect(blankMatches("2.0", "2")).toBe(true);
    expect(blankMatches("1/2", "0.5")).toBe(true);
    expect(blankMatches("%", "//")).toBe(false);
  });

  it("compara salidas como verify_content.py (strip)", () => {
    expect(normalizeOutput("555\r\n15  \n\n")).toBe("555\n15");
    expect(normalizeOutput("  3\n")).toBe("3");
    expect(normalizeOutput("a\n b")).toBe("a\n b");
  });
});

describe("checkAnswer", () => {
  it("opción múltiple", () => {
    const e = ex({ tipo: "opcion_multiple", opciones: ["1", "3"], correcta: 1 });
    expect(checkAnswer(e, { kind: "choice", index: 1 }).status).toBe("correct");
    expect(checkAnswer(e, { kind: "choice", index: 0 })).toEqual({ status: "wrong", expected: "3" });
  });

  it("numérico con tolerancia y respuesta escrita como expresión", () => {
    const e = ex({ tipo: "numerico", respuesta: 0.5, tolerancia: 0.001, verificar: { sympy: "1/2" } });
    expect(checkAnswer(e, { kind: "text", value: "1/2" }).status).toBe("correct");
    expect(checkAnswer(e, { kind: "text", value: "0.4999" }).status).toBe("correct");
    expect(checkAnswer(e, { kind: "text", value: "0.6" }).status).toBe("wrong");
    expect(checkAnswer(e, { kind: "text", value: "abc" }).status).toBe("invalid");
    const third = ex({ tipo: "numerico", respuesta: "1/3", verificar: { sympy: "Rational(1,3)" } });
    expect(checkAnswer(third, { kind: "text", value: "1/3" }).status).toBe("correct");
    expect(checkAnswer(third, { kind: "text", value: "0.333" }).status).toBe("wrong");
  });

  it("simbólico", () => {
    const e = ex({ tipo: "simbolico", respuesta: "x+3", verificar: { sympy: "x+3" } });
    expect(checkAnswer(e, { kind: "text", value: "3+x" }).status).toBe("correct");
    expect(checkAnswer(e, { kind: "text", value: "3x" }).status).toBe("wrong");
    expect(checkAnswer(e, { kind: "text", value: "3+" }).status).toBe("invalid");
  });

  it("completar, ordenar, predecir y autoevaluación", () => {
    const c = ex({ tipo: "completar", texto: "a ___ b ___", respuestas: ["factoriza", "cancela"] });
    expect(checkAnswer(c, { kind: "blanks", values: ["Factoriza", "cancela "] }).status).toBe("correct");
    expect(checkAnswer(c, { kind: "blanks", values: ["factoriza", ""] }).status).toBe("invalid");
    expect(checkAnswer(c, { kind: "blanks", values: ["x", "y"] }).status).toBe("wrong");

    const o = ex({ tipo: "ordenar", elementos: ["a", "b", "c"] });
    expect(checkAnswer(o, { kind: "order", items: ["a", "b", "c"] }).status).toBe("correct");
    expect(checkAnswer(o, { kind: "order", items: ["b", "a", "c"] }).status).toBe("wrong");

    const p = ex({ tipo: "predecir_salida", lenguaje: "python", codigo: "print(1)", respuesta: "555\n15" });
    expect(checkAnswer(p, { kind: "text", value: "555\n15\n" }).status).toBe("correct");
    expect(checkAnswer(p, { kind: "text", value: "555 15" }).status).toBe("wrong");

    const s = ex({ tipo: "autoevaluacion", rubrica: ["a", "b", "c"], respuesta_modelo: "m" });
    expect(checkAnswer(s, { kind: "self", text: "mi idea", met: [true, true, true] }).status).toBe("correct");
    expect(checkAnswer(s, { kind: "self", text: "mi idea", met: [true, true, false] }).status).toBe("wrong");
    expect(checkAnswer(s, { kind: "self", text: " ", met: [true, true, true] }).status).toBe("invalid");
  });

  it("no acepta una respuesta del tipo equivocado", () => {
    const e = ex({ tipo: "opcion_multiple", opciones: ["1", "3"], correcta: 1 });
    expect(checkAnswer(e, { kind: "text", value: "3" }).status).toBe("invalid");
  });
});
