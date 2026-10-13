import { describe, expect, it } from "vitest";
import { circleLayout, degree, degreeSum, type Graph, neighbors } from "./graph";

// Un cuadrado a-b-c-d con una diagonal a-c.
const square: Graph = {
  vertices: ["a", "b", "c", "d"],
  edges: [
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "a"],
    ["a", "c"],
  ],
  directed: false,
};
const directed: Graph = { ...square, directed: true };

describe("grafos", () => {
  it("vecinos en un grafo no dirigido: cuenta la arista por los dos lados", () => {
    expect(neighbors(square, "a")).toEqual(["b", "c", "d"]);
    expect(neighbors(square, "b")).toEqual(["a", "c"]);
    expect(neighbors(square, "z")).toEqual([]);
  });

  it("vecinos en un grafo dirigido: solo a los que apunta", () => {
    expect(neighbors(directed, "a")).toEqual(["b", "c"]);
    expect(neighbors(directed, "d")).toEqual(["a"]);
  });

  it("grados", () => {
    expect(degree(square, "a")).toEqual({ out: 3, in: 3 });
    expect(degree(square, "b")).toEqual({ out: 2, in: 2 });
    expect(degree(directed, "a")).toEqual({ out: 2, in: 1 });
    expect(degree(directed, "c")).toEqual({ out: 1, in: 2 });
  });

  it("la suma de los grados es el doble de las aristas (no dirigido) o las aristas (dirigido)", () => {
    expect(degreeSum(square)).toBe(2 * square.edges.length);
    expect(degreeSum(directed)).toBe(directed.edges.length);
    expect(degreeSum({ vertices: ["a"], edges: [], directed: false })).toBe(0);
  });

  it("acomoda los vértices en círculo, el primero arriba, y es determinista", () => {
    const placed = circleLayout(["a", "b", "c", "d"], [100, 100], 50);
    expect(placed).toEqual([
      { vertex: "a", x: 100, y: 50 },
      { vertex: "b", x: 150, y: 100 },
      { vertex: "c", x: 100, y: 150 },
      { vertex: "d", x: 50, y: 100 },
    ]);
    expect(circleLayout(["a"], [10, 10], 5)).toEqual([{ vertex: "a", x: 10, y: 5 }]);
    expect(circleLayout([], [0, 0], 5)).toEqual([]);
  });
});
