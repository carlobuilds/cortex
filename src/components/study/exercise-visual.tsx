"use client";

import { useMemo } from "react";
import { FunctionStage } from "@/components/visuals/function-visuals";
import { GraphVisual } from "@/components/visuals/graph-visual";
import { describeVisual, resolveVisual, type VisualProps } from "@/content/core/visuals";
import { RichText } from "./rich-text";

/**
 * El `visual` de un ejercicio (docs/05): una gráfica o un grafo fijos junto al enunciado. Se dibuja
 * sin lecturas ni conclusiones (el grafo no dice grados) y con su descripción en texto, que se lee
 * aunque el dibujo no cargue. Los parámetros ya los validó `content:check`.
 */
export function ExerciseVisual({ props }: { props: VisualProps }) {
  const resolved = useMemo(() => resolveVisual(props), [props]);
  if (!resolved.ok) return null;
  const visual = resolved.visual;
  let stage: React.ReactNode = null;
  if (visual.id === "grafo") stage = <GraphVisual graph={visual.graph} fixed />;
  // El esquema solo admite `grafica` y `grafo` en ejercicios; los demás dirían su conclusión.
  else if (visual.id === "grafica") stage = <FunctionStage visual={visual} />;
  if (!stage) return null;
  return (
    <figure className="mt-5 grid gap-2 rounded-lg border bg-surface-2 p-3">
      {stage}
      <figcaption className="text-sm text-muted-foreground">
        <RichText text={describeVisual(visual)} />
      </figcaption>
    </figure>
  );
}
