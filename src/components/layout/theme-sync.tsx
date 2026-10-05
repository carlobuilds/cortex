"use client";

import { useCallback, useEffect } from "react";
import type { ThemePreference } from "@/db/types";
import { setPreferences } from "@/db/progress";
import { useCortexDb, useProfileRecord } from "@/db/use-profile";
import { resolveTheme, THEME_KEY } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Preferencia de tema del perfil y cómo cambiarla. `preference` es `undefined` mientras el perfil
 * carga (igual en el servidor y en el primer render: sin errores de hidratación).
 */
export function useThemePreference() {
  const db = useCortexDb();
  const ready = db.status === "ready" ? db.db : null;
  const profile = useProfileRecord(ready);
  const preference = profile?.preferences.theme;
  const setPreference = useCallback((theme: ThemePreference) => ready && void setPreferences(ready, { theme }), [ready]);
  return { preference, setPreference, disabled: !ready || !profile };
}

/** Aplica el tema del perfil, sigue al sistema si así se eligió y lo copia a localStorage para el próximo arranque. */
export function ThemeSync() {
  const { preference } = useThemePreference();
  useEffect(() => {
    if (!preference) return;
    try {
      window.localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Sin localStorage: el próximo arranque sigue al sistema hasta que cargue el perfil.
    }
    const media = window.matchMedia?.(DARK_QUERY);
    const apply = () => document.documentElement.classList.toggle("dark", resolveTheme(preference, media?.matches ?? false) === "dark");
    apply();
    if (preference !== "system" || !media) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);
  return null;
}
