import { describe, expect, it } from "vitest";
import {
  approach,
  clampPieces,
  derivativeAt,
  estimateLimit,
  fitRange,
  integrate,
  riemannRects,
  riemannSum,
  safeValue,
  sampleCurve,
  secantSlope,
  twoSidedLimit,
} from "./plot";

const square = (x: number) => x * x;
const hole = (x: number) => (x * x - 1) / (x - 1);
const sign = (x: number) => Math.abs(x) / x;

describe("muestreo de la curva", () => {
  it("una función continua sale en un solo tramo, sin cortes", () => {
    const curve = sampleCurve(square, [-3, 3]);
    expect(curve.pieces).toHaveLength(1);
    expect(curve.breaks).toEqual([]);
    expect(curve.pieces[0]?.[0]).toEqual([-3, 9]);
    expect(curve.pieces[0]?.at(-1)).toEqual([3, 9]);
  });

  it("una función empinada pero continua no se corta", () => {
    expect(sampleCurve(Math.exp, [-3, 6]).breaks).toEqual([]);
    expect(sampleCurve((x) => x ** 5, [-3, 3]).breaks).toEqual([]);
  });

  it("un hueco (0/0) corta la curva y los dos lados se acercan al mismo valor", () => {
    const curve = sampleCurve(hole, [-3, 3]);
    expect(curve.pieces).toHaveLength(2);
    expect(curve.breaks).toHaveLength(1);
    const b = curve.breaks[0];
    expect(b?.x).toBe(1);
    expect(b?.value).toBeNaN();
    expect(b?.left).toBeCloseTo(2, 5);
    expect(b?.right).toBeCloseTo(2, 5);
  });

  it("un salto corta la curva aunque no caiga en una muestra, con el valor de cada lado", () => {
    const curve = sampleCurve(Math.floor, [-0.5, 1.5]);
    expect(curve.breaks).toHaveLength(2);
    expect(curve.breaks[0]?.x).toBeCloseTo(0, 6);
    expect(curve.breaks[1]?.x).toBeCloseTo(1, 6);
    // En x = 1 la función vale 1: ese lado lleva el punto relleno y el otro, el hueco.
    expect(curve.breaks[1]).toEqual({ x: 1, left: 0, right: 1, value: 1 });
    expect(curve.pieces).toHaveLength(3);
  });

  it("un hueco se ve aunque no caiga en la malla pareja (los valores de libro siempre se evalúan)", () => {
    const curve = sampleCurve(hole, [-3, 3.1]);
    expect(curve.breaks).toHaveLength(1);
    expect(curve.breaks[0]?.x).toBe(1);
    expect(curve.breaks[0]?.value).toBeNaN();
    expect(curve.breaks[0]?.left).toBeCloseTo(2, 5);
    expect(curve.breaks[0]?.right).toBeCloseTo(2, 5);
  });

  it("una asíntota que cae justo en una muestra se reconoce por lo que pasa pegado a ella", () => {
    const b = sampleCurve((x) => 1 / x, [-2, 2]).breaks[0];
    expect(b?.x).toBe(0);
    expect(b?.left).toBeLessThan(-1e6);
    expect(b?.right).toBeGreaterThan(1e6);
  });

  it("tan(x) se corta en cada múltiplo impar de π/2", () => {
    const curve = sampleCurve(Math.tan, [-4, 4]);
    expect(curve.breaks.map((b) => Number(b.x.toFixed(3)))).toEqual([-1.571, 1.571]);
    expect(curve.pieces).toHaveLength(3);
  });

  it("acota lo que se sale mucho de la vista", () => {
    const clamped = clampPieces(sampleCurve((x) => 1 / x, [-2, 2]).pieces, [-5, 5]);
    const ys = clamped.flat().map((p) => p[1]);
    expect(Math.max(...ys)).toBe(15);
    expect(Math.min(...ys)).toBe(-15);
  });

  it("una asíntota vertical no se une con una línea de un lado al otro", () => {
    const curve = sampleCurve((x) => 1 / x, [-2.01, 2]);
    expect(curve.breaks).toHaveLength(1);
    expect(curve.breaks[0]?.x).toBeCloseTo(0, 6);
    expect(curve.pieces).toHaveLength(2);
    expect(curve.pieces[0]?.every((p) => p[1] < 0)).toBe(true);
    expect(curve.pieces[1]?.every((p) => p[1] > 0)).toBe(true);
  });

  it("donde la función no existe no hay puntos (√x con x < 0)", () => {
    const curve = sampleCurve(Math.sqrt, [-2, 2]);
    expect(curve.pieces).toHaveLength(1);
    expect(curve.pieces[0]?.[0]?.[0]).toBeCloseTo(0, 9);
  });

  it("una función que lanza cuenta como no definida", () => {
    expect(safeValue(() => {
      throw new Error("x");
    }, 1)).toBeNaN();
    expect(safeValue(() => Infinity, 1)).toBeNaN();
  });
});

describe("rango vertical", () => {
  it("incluye la curva completa y el eje x, con margen", () => {
    const [lo, hi] = fitRange(sampleCurve((x) => x * x + 2, [-2, 2]));
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(6);
    expect(hi).toBeLessThan(7);
  });

  it("recorta lo que se dispara cerca de una asíntota", () => {
    const [lo, hi] = fitRange(sampleCurve((x) => 1 / x, [-2.01, 2]));
    expect(hi).toBeLessThan(60);
    expect(lo).toBeGreaterThan(-60);
  });

  it("una constante o una curva vacía dan un rango con altura", () => {
    const [lo, hi] = fitRange(sampleCurve(() => 0, [-1, 1]));
    expect(hi - lo).toBeGreaterThan(1);
    expect(fitRange({ pieces: [], breaks: [] })).toEqual([-1, 1]);
  });
});

describe("secante y derivada", () => {
  it("la pendiente de la secante de x² en 1 es 2 + h", () => {
    expect(secantSlope(square, 1, 1)).toBeCloseTo(3, 12);
    expect(secantSlope(square, 1, 0.5)).toBeCloseTo(2.5, 12);
    expect(secantSlope(square, 1, -0.5)).toBeCloseTo(1.5, 12);
  });

  it("la derivada numérica coincide con la exacta", () => {
    expect(derivativeAt(square, 1)).toBeCloseTo(2, 8);
    expect(derivativeAt(Math.sin, 0)).toBeCloseTo(1, 8);
    expect(derivativeAt(Math.exp, 2)).toBeCloseTo(Math.exp(2), 6);
    expect(derivativeAt((x) => x ** 3, 1000)).toBeCloseTo(3e6, 0);
  });
});

describe("sumas de Riemann", () => {
  // Para x² en [0, 2] con n = 4: izquierda 1.75, derecha 3.75, punto medio 2.625 (a mano).
  it.each([
    ["left", 1.75],
    ["right", 3.75],
    ["mid", 2.625],
  ] as const)("regla %s", (rule, expected) => {
    const rects = riemannRects(square, [0, 2], 4, rule);
    expect(rects).toHaveLength(4);
    expect(rects[0]?.x0).toBe(0);
    expect(rects.at(-1)?.x1).toBe(2);
    expect(riemannSum(rects)).toBeCloseTo(expected, 12);
  });

  it("con más rectángulos la suma se acerca a la integral", () => {
    const exact = 8 / 3;
    const error = (n: number) => Math.abs(riemannSum(riemannRects(square, [0, 2], n, "left")) - exact);
    expect(error(200)).toBeLessThan(error(20));
    expect(error(20)).toBeLessThan(error(4));
  });

  it("Simpson da la integral (exacta en polinomios de grado ≤ 3)", () => {
    expect(integrate(square, [0, 2])).toBeCloseTo(8 / 3, 12);
    expect(integrate(Math.sin, [0, Math.PI])).toBeCloseTo(2, 9);
    expect(integrate((x) => x ** 3 - x, [-1, 2])).toBeCloseTo(2.25, 12);
  });
});

describe("acercarse a un punto", () => {
  it("la tabla se acerca a `a` por el lado pedido", () => {
    const left = approach(hole, 1, -1);
    expect(left.map((p) => p[0])).toEqual([0.5, 0.9, 0.99, 0.999]);
    expect(left.at(-1)?.[1]).toBeCloseTo(1.999, 9);
    expect(approach(hole, 1, 1)[0]).toEqual([1.5, 2.5]);
  });

  it("límite finito en un hueco", () => {
    const l = estimateLimit(hole, 1, 1);
    expect(l.kind).toBe("finite");
    expect(l.kind === "finite" && l.value).toBeCloseTo(2, 4);
    expect(twoSidedLimit(hole, 1)).toBeCloseTo(2, 4);
  });

  it("límites notables: sen(x)/x → 1 y (1 − cos x)/x² → 1/2", () => {
    expect(twoSidedLimit((x) => Math.sin(x) / x, 0)).toBeCloseTo(1, 6);
    expect(twoSidedLimit((x) => (1 - Math.cos(x)) / x ** 2, 0)).toBeCloseTo(0.5, 5);
  });

  it("en un salto los laterales existen pero no coinciden", () => {
    expect(estimateLimit(sign, 0, -1)).toEqual({ kind: "finite", value: -1 });
    expect(estimateLimit(sign, 0, 1)).toEqual({ kind: "finite", value: 1 });
    expect(twoSidedLimit(sign, 0)).toBeNull();
  });

  it("límites infinitos, también cuando crecen despacio", () => {
    expect(estimateLimit((x) => 1 / x, 0, 1)).toEqual({ kind: "infinite", sign: 1 });
    expect(estimateLimit((x) => 1 / x, 0, -1)).toEqual({ kind: "infinite", sign: -1 });
    expect(estimateLimit((x) => 1 / x ** 2, 0, -1)).toEqual({ kind: "infinite", sign: 1 });
    expect(estimateLimit(Math.log, 0, 1)).toEqual({ kind: "infinite", sign: -1 });
    expect(twoSidedLimit((x) => 1 / x ** 2, 0)).toBeNull();
  });

  it("convergencia lenta (√x en 0⁺) se reconoce como finita", () => {
    const l = estimateLimit(Math.sqrt, 0, 1);
    expect(l.kind).toBe("finite");
    expect(l.kind === "finite" && Math.abs(l.value)).toBeLessThan(1e-3);
  });

  it("una oscilación no tiene límite; si se amortigua, sí", () => {
    expect(estimateLimit((x) => Math.sin(1 / x), 0, 1)).toEqual({ kind: "none" });
    expect(twoSidedLimit((x) => x * Math.sin(1 / x), 0)).toBeCloseTo(0, 3);
  });

  it("donde la función no existe no hay límite lateral", () => {
    expect(estimateLimit(Math.sqrt, 0, -1)).toEqual({ kind: "none" });
  });
});
