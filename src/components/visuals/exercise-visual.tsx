"use client";

import { useMemo } from "react";
import { RichText } from "@/components/study/rich-text";
import { describeVisual, resolveVisual } from "@/content/core/visuals";
import { FunctionStage } from "./function-visuals";
import { GraphVisual } from "./graph-visual";

/**
 * El visual fijo de un enunciado (campo `visual` de un ejercicio, docs/05): solo `grafica` y
 * `grafo`, y el grafo sin elegir vértices ni leer grados. Debajo va la misma frase que en una
 * lección, que es lo que lee un lector de pantalla.
 */
export function ExerciseVisual({ params }: { params: Readonly<Record<string, string>> }) {
  const resolved = useMemo(() => resolveVisual(params), [params]);
  // `content:check` ya rechaza un visual inválido; aquí solo se evita dibujar algo roto.
  if (!resolved.ok) return null;
  const visual = resolved.visual;
  let stage: React.ReactNode = null;
  if (visual.id === "grafo") stage = <GraphVisual graph={visual.graph} interactive={false} />;
  else if (visual.id === "grafica") stage = <FunctionStage visual={visual} />;
  if (!stage) return null;
  return (
    <figure className="mt-5 grid gap-2">
      {visual.title ? <p className="text-label font-medium text-ink-2">{visual.title}</p> : null}
      {stage}
      <figcaption className="text-caption text-muted-foreground">
        <RichText text={describeVisual(visual)} inline />
      </figcaption>
    </figure>
  );
}
