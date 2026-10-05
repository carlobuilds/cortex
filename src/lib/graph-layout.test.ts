import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { crossings, layeredLayout } from "./graph-layout";

const node = (id: string, ...prerequisites: string[]) => ({ id, prerequisites });

describe("layout del mapa", () => {
  it("cadena: una capa por paso", () => {
    const l = layeredLayout([node("a"), node("b", "a"), node("c", "b")]);
    expect(l.nodes.map((n) => [n.id, n.layer])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
    expect(l.edges).toEqual([
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ]);
    expect(l.layers).toBe(3);
  });

  it("la capa es el camino más largo (rombo + atajo)", () => {
    const l = layeredLayout([node("a"), node("b", "a"), node("c", "a"), node("d", "b", "c", "a")]);
    expect(Object.fromEntries(l.nodes.map((n) => [n.id, n.layer]))).toEqual({ a: 0, b: 1, c: 1, d: 2 });
    expect(l.rows).toBe(2);
  });

  it("prerrequisitos fuera del grafo se ignoran y un ciclo no cuelga", () => {
    expect(layeredLayout([node("a", "fuera"), node("b", "a")]).edges).toEqual([{ from: "a", to: "b" }]);
    const cyc = layeredLayout([node("x", "y"), node("y", "x")]);
    expect(cyc.nodes).toHaveLength(2);
  });

  it("el baricentro deshace un cruce que el orden de entrada tendría", () => {
    // Entrada: B antes que A en la capa 1, pero B depende del de abajo y A del de arriba.
    const l = layeredLayout([node("arriba"), node("abajo"), node("B", "abajo"), node("A", "arriba")]);
    expect(crossings(l)).toBe(0);
  });

  it("las filas de cada columna no se repiten", () => {
    const l = layeredLayout([node("a"), node("b"), node("c", "a"), node("d", "a"), node("e", "b")]);
    const seen = new Set(l.nodes.map((n) => `${n.layer}:${n.row}`));
    expect(seen.size).toBe(l.nodes.length);
  });

  it("los conceptos reales de programación se acomodan sin ciclos y con pocos cruces", () => {
    const yaml = parse(readFileSync("content/programacion/conceptos.yaml", "utf8")) as { conceptos: { id: string; prerequisitos: string[] }[] };
    const l = layeredLayout(yaml.conceptos.map((c) => node(c.id, ...c.prerequisitos)));
    expect(l.nodes).toHaveLength(yaml.conceptos.length);
    for (const e of l.edges) {
      const from = l.nodes.find((n) => n.id === e.from);
      const to = l.nodes.find((n) => n.id === e.to);
      expect((to?.layer ?? 0) > (from?.layer ?? 0)).toBe(true);
    }
    // Con el baricentro, menos de la mitad de las aristas entre columnas vecinas se cruzan.
    expect(crossings(l)).toBeLessThan(edgesBetweenNeighbourLayers(l) / 2);
  });
});

function edgesBetweenNeighbourLayers(l: ReturnType<typeof layeredLayout>): number {
  const at = new Map(l.nodes.map((n) => [n.id, n.layer]));
  return l.edges.filter((e) => (at.get(e.to) ?? 0) - (at.get(e.from) ?? 0) === 1).length;
}
