import katex from "katex";
import { describe, expect, it } from "vitest";
import { toTex } from "@/engine/answers/math";
import { LESSON_API, VISUAL_PARAMS } from "./lesson-api";
import { describeVisual, formatNumber, resolveVisual, validateVisual, VISUAL_IDS, VISUALS } from "./visuals";

const ok = (props: Parameters<typeof resolveVisual>[0]) => {
  const r = resolveVisual(props);
  if (!r.ok) throw new Error(r.problems.join("; "));
  return r.visual;
};

describe("especificación de los visuales", () => {
  it("la API de <Visual> lleva `id` y exactamente los parámetros declarados", () => {
    expect(Object.keys(LESSON_API.Visual.props)).toEqual(["id", ...VISUAL_PARAMS]);
    expect(LESSON_API.Visual.props.id.required).toBe(true);
  });

  it("cada visual solo declara parámetros que existen", () => {
    for (const id of VISUAL_IDS) {
      const spec = VISUALS[id];
      for (const p of [...spec.required, ...spec.optional]) expect(VISUAL_PARAMS).toContain(p);
    }
  });

  it("resuelve los textos a números", () => {
    expect(ok({ id: "limite", f: "(x^2-1)/(x-1)", a: "1", dominio: "-2, 4" })).toEqual({
      id: "limite",
      f: "(x^2-1)/(x-1)",
      domain: [-2, 4],
      range: null,
      a: 1,
      n: null,
      title: null,
    });
    expect(ok({ id: "grafica", f: "sin(x)", dominio: "0, 2*pi", rango: "-1.5, 1.5", titulo: "Seno" })).toMatchObject({
      domain: [0, 2 * Math.PI],
      range: [-1.5, 1.5],
      title: "Seno",
    });
  });

  it("riemann usa 4 rectángulos si no se indica n", () => {
    expect(ok({ id: "riemann", f: "x^2", dominio: "0, 2" }).n).toBe(4);
    expect(ok({ id: "riemann", f: "x^2", dominio: "0, 2", n: "10" }).n).toBe(10);
  });

  it.each([
    [{ id: "grafico", f: "x", dominio: "0, 1" }, /no existe el visual «grafico» \(usa: grafica, limite, secante-tangente, riemann\)/],
    [{ id: "grafica", f: "x" }, /necesita 'dominio'/],
    [{ id: "limite", f: "x", dominio: "0, 2" }, /necesita 'a'/],
    [{ id: "grafica", f: "x", dominio: "0, 1", n: "3" }, /no usa 'n'/],
    [{ id: "grafica", f: "x*t", dominio: "0, 1" }, /f: No esperaba la variable «t»/],
    [{ id: "grafica", f: "x +", dominio: "0, 1" }, /f: No entendí la expresión/],
    // Un nombre que no es función se lee como variable por un paréntesis: nunca llega a ejecutarse nada.
    [{ id: "grafica", f: "import(x)", dominio: "0, 1" }, /f: No esperaba la variable «import»/],
    [{ id: "grafica", f: "evaluate(\"1\")", dominio: "0, 1" }, /f: /],
    [{ id: "grafica", f: "x", dominio: "3, -3" }, /dominio debe ser "min, max"/],
    [{ id: "grafica", f: "x", dominio: "0" }, /dominio debe ser "min, max"/],
    [{ id: "grafica", f: "x", dominio: "0, 1, 2" }, /dominio debe ser "min, max"/],
    [{ id: "grafica", f: "x", dominio: "0, 1", rango: "2, 2" }, /rango debe ser "min, max"/],
    [{ id: "limite", f: "x", a: "5", dominio: "0, 2" }, /a = 5 debe quedar dentro del dominio/],
    [{ id: "limite", f: "x", a: "0", dominio: "0, 2" }, /debe quedar dentro del dominio/],
    [{ id: "limite", f: "x", a: "dos", dominio: "0, 2" }, /a debe ser un número/],
    [{ id: "riemann", f: "x", dominio: "0, 2", n: "2.5" }, /n debe ser un entero de 1 a 100/],
    [{ id: "riemann", f: "x", dominio: "0, 2", n: "0" }, /n debe ser un entero de 1 a 100/],
    [{ id: "riemann", f: "x", dominio: "0, 2", n: "500" }, /n debe ser un entero de 1 a 100/],
    [{ id: "grafica", f: "sqrt(x)", dominio: "-3, -1" }, /f no tiene valores en ese dominio/],
    [{ id: "secante-tangente", f: "1/(x-1)", a: "1", dominio: "0, 2" }, /f no está definida en a = 1/],
    [{ id: "riemann", f: "1/x", dominio: "0, 2" }, /definida en todo el dominio/],
  ] as const)("rechaza %j", (props, reason) => {
    expect(validateVisual(props).join("; ")).toMatch(reason);
  });

  it("en un límite la función puede no existir en `a` (es el caso interesante)", () => {
    expect(validateVisual({ id: "limite", f: "(x^2-9)/(x-3)", a: "3", dominio: "0, 6" })).toEqual([]);
  });
});

describe("texto de los visuales", () => {
  it("números cortos, sin ceros de relleno ni ruido de redondeo", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(100)).toBe("100");
    expect(formatNumber(-1.5)).toBe("−1.5");
    expect(formatNumber(-0.00001)).toBe("0");
    expect(formatNumber(2.66666667)).toBe("2.6667");
    expect(formatNumber(1.5, 2)).toBe("1.5");
    expect(formatNumber(120, 0)).toBe("120");
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(-Infinity)).toBe("−∞");
    expect(formatNumber(Number.NaN)).toBe("no existe");
  });

  it("la descripción dice qué función y dónde, con la fórmula en LaTeX", () => {
    expect(describeVisual(ok({ id: "grafica", f: "x^2", dominio: "-3, 3" }))).toBe("Gráfica de $f(x) = { x}^{2}$ entre $x = -3$ y $x = 3$.");
    expect(describeVisual(ok({ id: "limite", f: "(x^2-9)/(x-3)", a: "3", dominio: "0, 6" }))).toContain("cuando $x$ se acerca a $3$");
    expect(describeVisual(ok({ id: "secante-tangente", f: "x^2", a: "1", dominio: "-1, 3" }))).toContain("entre $x = 1$ y $x = 1 + h$");
    expect(describeVisual(ok({ id: "riemann", f: "x^2", dominio: "0, 2" }))).toContain("entre $x = 0$ y $x = 2$");
  });

  it.each([
    ["x^2", "{ x}^{2}"],
    ["2*x+1", "2x+1"],
    ["2x", "2 x"],
    ["(x^2-1)/(x-1)", "\\frac{{ x}^{2}-1}{ x-1}"],
    ["3*(x+1)", "3\\left( x+1\\right)"],
    ["2*3", "2\\cdot3"],
    ["sin(x)/x", "\\frac{\\sin\\left( x\\right)}{ x}"],
    ["ln(x)", "\\ln\\left( x\\right)"],
    ["|x|/x", "\\frac{\\left| x\\right|}{ x}"],
  ])("toTex(%s)", (input, expected) => {
    expect(toTex(input, ["x"])).toBe(expected);
  });

  it("lo que produce toTex se dibuja en KaTeX estricto (el mismo modo que las lecciones)", () => {
    const samples = ["x^2", "(x^2-9)/(x-3)", "sin(x)/x", "(1-cos(x))/x^2", "sqrt(x+3)", "exp(-x^2)", "e^x", "1/x", "abs(x)/x", "floor(x)", "tan(x)", "sec(x)^2", "log(x, 2)", "nthRoot(x, 3)", "x*sin(1/x)", "2*pi*x", "sign(x)", "cbrt(x)", "log10(x)"];
    for (const s of samples) {
      expect(() => katex.renderToString(toTex(s, ["x"]), { throwOnError: true, strict: "error" }), s).not.toThrow();
    }
  });

  it("toTex valida igual que el compilador de expresiones", () => {
    expect(() => toTex("x*t", ["x"])).toThrow(/No esperaba la variable «t»/);
  });
});
