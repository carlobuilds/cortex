"use client";

import { Coordinates, Line, Mafs, Point as MafsPoint, Polygon, Polyline, Text } from "mafs";
import type { ReactNode } from "react";
import type { Interval, Point } from "@/engine/plot";

/*
 * Único archivo que importa Mafs (ADR-021). Reglas que salen de `mafs-criteria.test.tsx`:
 *  - ancho automático siempre y nunca `ssr`: Mafs numera sus patrones con un contador del módulo,
 *    así que su SVG no puede venir del servidor (no coincidiría al hidratar);
 *  - sin `pan` ni `zoom`: la vista no es enfocable y no se queda con las flechas del lector por pasos;
 *  - colores solo con tokens (`var(--…)`); el mapa de variables de Mafs está en globals.css.
 * Los visuales usan estas piezas y no saben qué librería hay debajo.
 */

export type Tone = "ink" | "muted" | "brand" | "info" | "xp" | "success" | "danger";

const TONE: Readonly<Record<Tone, string>> = {
  ink: "var(--ink)",
  muted: "var(--muted)",
  brand: "var(--brand)",
  info: "var(--info)",
  xp: "var(--xp-text)",
  success: "var(--success)",
  danger: "var(--danger)",
};

const pair = (p: Point): [number, number] => [p[0], p[1]];

/** Separación "redonda" (1, 2 o 5 por una potencia de 10) para unas 8 líneas de cuadrícula en el tramo. */
export function gridStep(span: number, target = 8): number {
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/** Etiqueta de una línea de la cuadrícula; fuera del tramo no se rotula (Mafs dibuja líneas de más y saldrían cortadas). */
const tickIn =
  ([lo, hi]: Interval) =>
  (value: number) => {
    const slack = 1e-9 * Math.max(1, Math.abs(lo), Math.abs(hi));
    return value < lo - slack || value > hi + slack ? "" : String(Number(value.toFixed(6))).replace("-", "−");
  };

/** Margen alrededor del dominio, como fracción del tramo: sin él, los números de los bordes salen cortados. */
const VIEW_MARGIN = 0.05;
const widen = ([lo, hi]: Interval): [number, number] => [lo - VIEW_MARGIN * (hi - lo), hi + VIEW_MARGIN * (hi - lo)];

export function PlotFrame({ x, y, height = 280, children }: { x: Interval; y: Interval; height?: number; children?: ReactNode }) {
  return (
    <div className="plot-frame" aria-hidden>
      <Mafs width="auto" height={height} pan={false} zoom={false} preserveAspectRatio={false} viewBox={{ x: widen(x), y: widen(y), padding: 0 }}>
        <Coordinates.Cartesian
          subdivisions={false}
          xAxis={{ lines: gridStep(x[1] - x[0]), labels: tickIn(x) }}
          yAxis={{ lines: gridStep(y[1] - y[0], 6), labels: tickIn(y) }}
        />
        {children}
      </Mafs>
    </div>
  );
}

/** Curva por tramos: cada tramo es una línea aparte, así un salto o una asíntota no quedan unidos. */
export function PlotCurve({ pieces, tone = "brand", weight = 2.5 }: { pieces: readonly (readonly Point[])[]; tone?: Tone; weight?: number }) {
  return (
    <>
      {pieces.map((piece, i) => (
        <Polyline key={i} points={piece.map(pair)} color={TONE[tone]} weight={weight} fillOpacity={0} />
      ))}
    </>
  );
}

export function PlotLine({ point, slope, tone = "ink", dashed = false, weight = 2 }: { point: Point; slope: number; tone?: Tone; dashed?: boolean; weight?: number }) {
  return <Line.PointSlope point={pair(point)} slope={slope} color={TONE[tone]} style={dashed ? "dashed" : "solid"} weight={weight} />;
}

export function PlotSegment({ from, to, tone = "muted", dashed = false, weight = 1.5 }: { from: Point; to: Point; tone?: Tone; dashed?: boolean; weight?: number }) {
  return <Line.Segment point1={pair(from)} point2={pair(to)} color={TONE[tone]} style={dashed ? "dashed" : "solid"} weight={weight} />;
}

/** Punto relleno (el valor existe ahí) o hueco (la curva se acerca pero no lo toma). */
export function PlotDot({ at, tone = "brand", hollow = false }: { at: Point; tone?: Tone; hollow?: boolean }) {
  return (
    <MafsPoint
      x={at[0]}
      y={at[1]}
      color={TONE[tone]}
      svgCircleProps={hollow ? { style: { fill: "var(--surface)", stroke: TONE[tone], strokeWidth: 2 } } : undefined}
    />
  );
}

/** Rectángulo apoyado en el eje x (una franja de una suma de Riemann). */
export function PlotRect({ x0, x1, height, tone = "info" }: { x0: number; x1: number; height: number; tone?: Tone }) {
  return (
    <Polygon
      points={[
        [x0, 0],
        [x1, 0],
        [x1, height],
        [x0, height],
      ]}
      color={TONE[tone]}
      weight={1}
      fillOpacity={0.22}
    />
  );
}

export function PlotLabel({ at, children, tone = "ink", attach = "ne" }: { at: Point; children: ReactNode; tone?: Tone; attach?: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw" }) {
  return (
    <Text x={at[0]} y={at[1]} attach={attach} attachDistance={12} size={14} color={TONE[tone]}>
      {children}
    </Text>
  );
}
