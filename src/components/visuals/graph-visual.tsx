"use client";

import { useId, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { circleLayout, degree, degreeSum, type Graph, neighbors } from "@/engine/graph";

/*
 * Dibujo de un grafo (docs/01, Fase 3): vértices en círculo, SVG propio (no usa Mafs, así que llega
 * dibujado desde el servidor). Al elegir un vértice se resaltan sus aristas y se lee su grado.
 * Los colores salen de las clases `graph-*` de globals.css (tokens).
 */

const WIDTH = 320;
const HEIGHT = 240;
const RADIUS = 88;
const NODE = 16;

const list = (items: readonly string[]) => (items.length ? items.join(", ") : "ninguno");

export function GraphVisual({ graph }: { graph: Graph }) {
  const arrow = useId();
  const label = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const placed = circleLayout(graph.vertices, [WIDTH / 2, HEIGHT / 2], RADIUS);
  const at = (vertex: string) => placed.find((p) => p.vertex === vertex);
  const n = graph.vertices.length;
  const m = graph.edges.length;

  const summary = graph.directed
    ? `Grafo dirigido con ${n} vértices y ${m} ${m === 1 ? "arista" : "aristas"}.`
    : `Grafo con ${n} vértices y ${m} ${m === 1 ? "arista" : "aristas"}.`;

  let detail: string;
  if (selected === null) {
    detail = graph.directed
      ? `Cada arista sale de un vértice: los grados de salida suman ${degreeSum(graph)}, igual que las aristas. Elige un vértice para ver los suyos.`
      : `Los grados suman ${degreeSum(graph)} = 2 × ${m}: cada arista cuenta en sus dos extremos. Elige un vértice para ver su grado.`;
  } else {
    const d = degree(graph, selected);
    detail = graph.directed
      ? `De ${selected} salen ${d.out} y llegan ${d.in}. Apunta a: ${list(neighbors(graph, selected))}.`
      : `Grado de ${selected}: ${d.out}. Vecinos: ${list(neighbors(graph, selected))}.`;
  }

  return (
    <>
      <div className="plot-frame">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="graph-svg">
          {graph.directed ? (
            <defs>
              <marker id={arrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 z" className="graph-arrow" />
              </marker>
            </defs>
          ) : null}
          {graph.edges.map(([from, to]) => {
            const a = at(from);
            const b = at(to);
            if (!a || !b) return null;
            // La línea termina en el borde del círculo, para que la punta de la flecha no quede tapada.
            // Raíz y redondeo (no `Math.hypot`): el servidor y cada navegador deben escribir el mismo número.
            const length = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) || 1;
            const ux = (b.x - a.x) / length;
            const uy = (b.y - a.y) / length;
            const round = (value: number) => Number(value.toFixed(2));
            const active = selected !== null && (from === selected || (!graph.directed && to === selected));
            return (
              <line
                key={`${from}-${to}`}
                x1={round(a.x + ux * NODE)}
                y1={round(a.y + uy * NODE)}
                x2={round(b.x - ux * NODE)}
                y2={round(b.y - uy * NODE)}
                className="graph-edge"
                data-active={active}
                markerEnd={graph.directed ? `url(#${arrow})` : undefined}
              />
            );
          })}
          {placed.map((p) => (
            <g key={p.vertex} className="graph-node" data-active={p.vertex === selected}>
              <circle cx={p.x} cy={p.y} r={NODE} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
                {p.vertex}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="visual-control">
        <span id={label}>Vértice</span>
        <ToggleGroup type="single" value={selected ?? ""} aria-labelledby={label} onValueChange={(v) => setSelected(v || null)}>
          {graph.vertices.map((v) => (
            <ToggleGroupItem key={v} value={v} className="min-w-8 px-2 font-mono">
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="visual-readout" role="status" aria-live="polite" aria-atomic="true">
        <p>{summary}</p>
        <p className="visual-conclusion">{detail}</p>
      </div>
    </>
  );
}
