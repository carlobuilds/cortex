"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ThemePreference } from "@/db/types";
import { parseThemePreference, THEME_LABELS } from "@/lib/theme";
import { useThemePreference } from "./theme-sync";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const satisfies Record<ThemePreference, unknown>;
const ORDER: readonly ThemePreference[] = ["system", "light", "dark"];

/** Selector rápido del header. Mientras carga el perfil muestra el ícono de "Sistema" (igual en servidor y cliente). */
export function ThemeToggle() {
  const { preference, setPreference, disabled } = useThemePreference();
  const Icon = ICONS[preference ?? "system"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Tema: ${THEME_LABELS[preference ?? "system"]}`}
        className="tactile grid size-8 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <Icon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference ?? "system"} onValueChange={(v) => setPreference(parseThemePreference(v))}>
          {ORDER.map((t) => {
            const ItemIcon = ICONS[t];
            return (
              <DropdownMenuRadioItem key={t} value={t}>
                <ItemIcon aria-hidden /> {THEME_LABELS[t]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Control segmentado de Ajustes (mismo dato que el selector del header). */
export function ThemeSegmented({ labelledBy }: { labelledBy: string }) {
  const { preference, setPreference, disabled } = useThemePreference();
  return (
    <ToggleGroup
      type="single"
      aria-labelledby={labelledBy}
      value={preference ?? ""}
      disabled={disabled}
      // Radix manda "" al volver a pulsar la opción activa: un tema siempre queda elegido.
      onValueChange={(v) => v && setPreference(parseThemePreference(v))}
    >
      {ORDER.map((t) => {
        const ItemIcon = ICONS[t];
        return (
          <ToggleGroupItem key={t} value={t}>
            <ItemIcon aria-hidden /> {THEME_LABELS[t]}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
