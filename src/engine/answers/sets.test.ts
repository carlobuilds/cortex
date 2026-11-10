import { describe, expect, it } from "vitest";
import { elementKey, formatSet, parseSet, sameSet, SetError, splitTopLevel } from "./sets";

describe("conjuntos como respuesta", () => {
  it("el orden y los repetidos no importan", () => {
    expect(sameSet("3, 1, 2", ["1", "2", "3"])).toBe(true);
    expect(sameSet("{1, 2, 3}", ["3", "2", "1"])).toBe(true);
    expect(sameSet("1, 1, 2, 3, 3", ["1", "2", "3"])).toBe(true);
    expect(sameSet(" 1 ,2,  3 ", ["1", "2", "3"])).toBe(true);
  });

  it("faltar o sobrar un elemento es otro conjunto", () => {
    expect(sameSet("1, 2", ["1", "2", "3"])).toBe(false);
    expect(sameSet("1, 2, 3, 4", ["1", "2", "3"])).toBe(false);
    expect(sameSet("1, 2, 4", ["1", "2", "3"])).toBe(false);
  });

  it("un número vale igual escrito de otra forma", () => {
    expect(sameSet("0.5, 2", ["1/2", "2"])).toBe(true);
    expect(sameSet("1/2, 4/2", ["0.5", "2"])).toBe(true);
    expect(sameSet("-1, sqrt(4)", ["2", "-1"])).toBe(true);
    expect(sameSet("0.1+0.2", ["0.3"])).toBe(true);
    expect(elementKey("2.0")).toBe(elementKey("2"));
  });

  it("pares ordenados: el orden de adentro sí importa", () => {
    expect(splitTopLevel("(1, 2), (3, 4)")).toEqual(["(1, 2)", "(3, 4)"]);
    expect(sameSet("(2, 3), (1, 2)", ["(1,2)", "(2,3)"])).toBe(true);
    expect(sameSet("(2, 1)", ["(1, 2)"])).toBe(false);
    expect(sameSet("(a, b), (b, a)", ["(a,b)", "(b,a)"])).toBe(true);
    expect(sameSet("(1/2, 2)", ["(0.5, 2)"])).toBe(true);
    // Un paréntesis con un solo componente es un número, no un par.
    expect(sameSet("(3)", ["3"])).toBe(true);
  });

  it("elementos de texto: los espacios no cuentan, las mayúsculas sí", () => {
    expect(sameSet("a, b, c", ["c", "b", "a"])).toBe(true);
    expect(sameSet("a b, c", ["ab", "c"])).toBe(true);
    expect(sameSet("A, b", ["a", "b"])).toBe(false);
  });

  it("el conjunto vacío", () => {
    for (const text of ["{}", "∅", "{ }", "vacío", "vacio", "Vacío", ""]) expect(parseSet(text)).toEqual([]);
    expect(sameSet("{}", [])).toBe(true);
    expect(sameSet("∅", [])).toBe(true);
    expect(sameSet("0", [])).toBe(false);
    expect(sameSet("{}", ["1"])).toBe(false);
  });

  it.each([
    ["1, , 2", /elemento vacío/],
    ["1, 2,", /elemento vacío/],
    ["(1, 2", /Falta cerrar un paréntesis/],
    ["1, 2)", /Sobra un paréntesis/],
    ["{1}, {2}", /las llaves solo van afuera/],
  ])("lo que no se puede leer se dice, no se califica: %j", (text, reason) => {
    expect(() => sameSet(text, ["1", "2"])).toThrow(SetError);
    expect(() => sameSet(text, ["1", "2"])).toThrow(reason);
  });

  it("se escribe con llaves, o ∅ si no tiene elementos", () => {
    expect(formatSet(["1", "2", "3"])).toBe("{1, 2, 3}");
    expect(formatSet(["(1, 2)"])).toBe("{(1, 2)}");
    expect(formatSet([])).toBe("∅");
  });
});
