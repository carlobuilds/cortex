import type { ThemePreference } from "@/db/types";

export const THEME_KEY = "cortex-theme";

export const THEME_LABELS: Readonly<Record<ThemePreference, string>> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

/** Lo que guarda localStorage puede ser cualquier cosa (o nada): todo lo desconocido es "system". */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Tema que se pinta: el elegido o, en "system", el de la computadora (ADR-020). */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}

/**
 * Se corre en <head> antes de pintar (sin destello del tema equivocado). Repite `resolveTheme`
 * en JS plano: no puede importar nada. Sin localStorage sigue al sistema; sin JS queda la clase
 * `dark` del HTML del servidor.
 */
export const THEME_BOOT = `(function(){var t=null;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}var d=t==="dark"||(t!=="light"&&!!window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)})()`;
