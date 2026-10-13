/**
 * Grafos simples para los visuales de Matemáticas discretas (docs/01, Fase 3). Puro: vértices con
 * nombre, aristas como pares y lo que se calcula de ellos (grados, vecinos, posiciones en círculo).
 */

export type Edge = readonly [from: string, to: string];

export interface Graph {
  readonly vertices: readonly string[];
  readonly edges: readonly Edge[];
  /** Dirigido: la arista `[a, b]` va de `a` a `b`. No dirigido: `[a, b]` y `[b, a]` son la misma. */
  readonly directed: boolean;
}

/** Vecinos de un vértice, en el orden de `vertices`. En un grafo dirigido, a los que apunta. */
export function neighbors(graph: Graph, vertex: string): string[] {
  const found = new Set<string>();
  for (const [from, to] of graph.edges) {
    if (from === vertex) found.add(to);
    else if (!graph.directed && to === vertex) found.add(from);
  }
  return graph.vertices.filter((v) => found.has(v));
}

/** Grado de salida y de entrada. En un grafo no dirigido son iguales: el grado. */
export function degree(graph: Graph, vertex: string): { readonly out: number; readonly in: number } {
  let out = 0;
  let into = 0;
  for (const [from, to] of graph.edges) {
    if (graph.directed) {
      if (from === vertex) out++;
      if (to === vertex) into++;
    } else if (from === vertex || to === vertex) {
      out++;
      into++;
    }
  }
  return { out, in: into };
}

/** Suma de los grados de todos los vértices (en un grafo no dirigido es el doble de las aristas). */
export function degreeSum(graph: Graph): number {
  return graph.vertices.reduce((sum, v) => sum + degree(graph, v).out, 0);
}

export interface Placed {
  readonly vertex: string;
  readonly x: number;
  readonly y: number;
}

/** Los vértices repartidos en un círculo, el primero arriba y en el sentido del reloj. */
export function circleLayout(vertices: readonly string[], center: readonly [number, number], radius: number): Placed[] {
  const n = vertices.length;
  return vertices.map((vertex, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
    // Redondeo: el mismo texto en el servidor y en el navegador (sin diferencias en la última cifra).
    return { vertex, x: Number((center[0] + radius * Math.cos(angle)).toFixed(2)), y: Number((center[1] + radius * Math.sin(angle)).toFixed(2)) };
  });
}
