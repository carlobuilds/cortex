"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseCard } from "./exercise-card";
import { EXERCISE_DEMOS } from "./exercise-demos";

/**
 * Los tipos de ejercicio de la Fase 3, jugables en `/estilo` sin guardar nada. Se ve una tarjeta a
 * la vez: cada tarjeta escucha el teclado de la página (Enter, letras), y dos a la vez se pisarían.
 */
export function ExerciseDemo() {
  const [round, setRound] = useState(0);
  return (
    <Tabs defaultValue="0" onValueChange={() => setRound((r) => r + 1)} className="grid gap-4">
      <TabsList className="flex-wrap justify-start self-start" aria-label="Tipo de ejercicio">
        {EXERCISE_DEMOS.map((d, i) => (
          <TabsTrigger key={d.exercise.id} value={String(i)}>
            {d.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {EXERCISE_DEMOS.map((d, i) => (
        <TabsContent key={d.exercise.id} value={String(i)}>
          <ExerciseCard
            key={`${d.exercise.id}/${round}`}
            exercise={d.exercise}
            onAnswered={() => ({ note: "Muestra: no se guarda ningún intento." })}
            onNext={() => setRound((r) => r + 1)}
            nextLabel="Otra vez"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
