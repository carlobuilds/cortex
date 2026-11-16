"use client";

import { useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INPUT_MODE_LABELS, INPUT_MODE_ORDER, parseInputMode } from "@/lib/input-mode";
import { setInputModePreference, useInputModePreference } from "@/lib/use-touch-mode";

/**
 * Modo de entrada de ESTE dispositivo. Vive en localStorage (`cortex-input`), no en Dexie: no viaja
 * en el respaldo, así el iPad y la Mac pueden tener cada uno el suyo.
 */
export function InputModeSetting() {
  const id = useId();
  const preference = useInputModePreference();
  return (
    <div className="grid gap-3">
      <div>
        <p id={id} className="font-semibold">
          Modo de entrada
        </p>
        <p id={`${id}-desc`} className="mt-1 text-sm text-muted-foreground">
          Automático usa el puntero del dispositivo. Elige Táctil para ver botones grandes y sin atajos de teclado, o Teclado y ratón para lo contrario. Solo cambia en este dispositivo.
        </p>
      </div>
      <ToggleGroup
        type="single"
        className="w-full sm:w-auto"
        aria-labelledby={id}
        aria-describedby={`${id}-desc`}
        value={preference}
        // Radix manda "" al volver a pulsar la opción activa: siempre queda un modo elegido.
        onValueChange={(v) => v && setInputModePreference(parseInputMode(v))}
      >
        {INPUT_MODE_ORDER.map((m) => (
          <ToggleGroupItem key={m} value={m} className="flex-1 px-2 sm:flex-none sm:px-3">
            {INPUT_MODE_LABELS[m]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
