"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEMO_EXERCISES, DEMO_PRIMES } from "./demo-exercises";
import { ExerciseCard } from "./exercise-card";

/** Los tipos de ejercicio de la Fase 3 en `/estilo`, jugables y sin guardar nada (datos en `demo-exercises.ts`). */

const LABELS: Readonly<Record<string, string>> = {
  "demo-00-001": "Selección múltiple",
  "demo-00-002": "Con un grafo",
  "demo-00-003": "Conjunto",
  "demo-00-004": "Tabla de verdad",
};

export function ExerciseTypesDemo() {
  const [current, setCurrent] = useState<string>(DEMO_PRIMES.id);
  const [round, setRound] = useState(0);
  const exercise = DEMO_EXERCISES.find((e) => e.id === current) ?? DEMO_PRIMES;
  return (
    <div className="grid gap-4">
      <ToggleGroup type="single" value={current} aria-label="Tipo de ejercicio" onValueChange={(v) => v && setCurrent(v)}>
        {DEMO_EXERCISES.map((e) => (
          <ToggleGroupItem key={e.id} value={e.id}>
            {LABELS[e.id]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ExerciseCard key={`${exercise.id}-${round}`} exercise={exercise} onAnswered={() => undefined} onNext={() => setRound((r) => r + 1)} nextLabel="Otra vez" askConfidence={false} />
    </div>
  );
}
