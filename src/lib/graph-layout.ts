/**
 * Layout por capas del mapa de maestría (ADR-020), sin dependencias: cada concepto va en la capa
 * de su camino de prerrequisitos más largo, y dentro de la capa se ordena para cruzar pocas aristas.
 */

export interface GraphNodeInput {
  readonly id: string;
  /** Solo cuentan los que también están en el grafo; los demás se ignoran. */
  readonly prerequisites: readonly string[];
}

export interface LaidOutNode {
  readonly id: string;
  /** Columna (0 = sin prerrequisitos dentro del grafo). */
  readonly layer: number;
  /** Fila dentro de su columna. */
  readonly row: number;
}

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
}

export interface Layout {
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly GraphEdge[];
  readonly layers: number;
  readonly rows: number;
}

/**
 * Clave para ordenar un nodo dentro de su columna (menor = más arriba).
 *
 * TODO(Carlo): ¿qué quieres ver primero en cada columna? Hoy: el baricentro (promedio de las filas
 * de sus vecinos ya acomodados), que junta lo relacionado y cruza menos aristas; a igual baricentro
 * manda el orden del temario (`inputIndex`). Alternativas: solo el temario (`return inputIndex`,
 * más predecible pero con más cruces) o poner primero lo que te falta practicar (necesitarías el
 * estado de maestría aquí). Cambiar esto no rompe las pruebas de forma, solo la de cruces.
 */
export function orderKey(barycenter: number | null, currentRow: number, inputIndex: number): [number, number] {
  return [barycenter ?? currentRow, inputIndex];
}

export function layeredLayout(input: readonly GraphNodeInput[]): Layout {
  const index = new Map(input.map((n, i) => [n.id, i]));
  const edges: GraphEdge[] = input.flatMap((n) => n.prerequisites.filter((p) => index.has(p) && p !== n.id).map((p) => ({ from: p, to: n.id })));
  const preds = new Map<string, string[]>(input.map((n) => [n.id, []]));
  const succs = new Map<string, string[]>(input.map((n) => [n.id, []]));
  for (const e of edges) {
    preds.get(e.to)?.push(e.from);
    succs.get(e.from)?.push(e.to);
  }

  // Capa = camino de prerrequisitos más largo; un ciclo (contenido mal escrito) no cuelga: se corta.
  const layerOf = new Map<string, number>();
  const visiting = new Set<string>();
  const layer = (id: string): number => {
    const known = layerOf.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const ps = preds.get(id) ?? [];
    const l = ps.length ? 1 + Math.max(...ps.map(layer)) : 0;
    visiting.delete(id);
    layerOf.set(id, l);
    return l;
  };
  input.forEach((n) => layer(n.id));
  const layers = input.length ? Math.max(...layerOf.values()) + 1 : 0;
  const columns: string[][] = Array.from({ length: layers }, () => []);
  for (const n of input) columns[layerOf.get(n.id) ?? 0]?.push(n.id);

  const rowOf = new Map<string, number>();
  const commit = () => columns.forEach((col) => col.forEach((id, r) => rowOf.set(id, r)));
  commit();
  const sortColumn = (col: string[], neighbours: (id: string) => readonly string[]) => {
    const keyed = col.map((id) => {
      const ns = neighbours(id).filter((n) => rowOf.has(n));
      const bary = ns.length ? ns.reduce((s, n) => s + (rowOf.get(n) ?? 0), 0) / ns.length : null;
      return { id, key: orderKey(bary, rowOf.get(id) ?? 0, index.get(id) ?? 0) };
    });
    keyed.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1]);
    col.splice(0, col.length, ...keyed.map((k) => k.id));
    col.forEach((id, r) => rowOf.set(id, r));
  };
  // Barrido abajo (por prerrequisitos), arriba (por lo que desbloquea) y abajo otra vez.
  for (let l = 1; l < layers; l++) sortColumn(columns[l] ?? [], (id) => preds.get(id) ?? []);
  for (let l = layers - 2; l >= 0; l--) sortColumn(columns[l] ?? [], (id) => succs.get(id) ?? []);
  for (let l = 1; l < layers; l++) sortColumn(columns[l] ?? [], (id) => preds.get(id) ?? []);

  return {
    nodes: input.map((n) => ({ id: n.id, layer: layerOf.get(n.id) ?? 0, row: rowOf.get(n.id) ?? 0 })),
    edges,
    layers,
    rows: Math.max(0, ...columns.map((c) => c.length)),
  };
}

/** Cruces de aristas entre columnas vecinas (para medir el orden). */
export function crossings(layout: Layout): number {
  const at = new Map(layout.nodes.map((n) => [n.id, n]));
  const spans = layout.edges.map((e) => ({ a: at.get(e.from), b: at.get(e.to) })).filter((s) => s.a && s.b && (s.b.layer ?? 0) - (s.a.layer ?? 0) === 1);
  let n = 0;
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const s = spans[i];
      const t = spans[j];
      if (!s?.a || !s.b || !t?.a || !t.b || s.a.layer !== t.a.layer) continue;
      if ((s.a.row - t.a.row) * (s.b.row - t.b.row) < 0) n++;
    }
  }
  return n;
}
