/*
 * Modo de entrada del dispositivo: Automático (lo decide `pointer: coarse`), Táctil o Teclado y ratón.
 * Es de ESTE dispositivo: vive en localStorage (no en Dexie) para que no viaje en el respaldo.
 * El atributo `data-input` de <html> ("touch" | "fine") lo usa la variante `touch:` de globals.css;
 * sin atributo manda el puntero del sistema.
 */

export type InputModePreference = "auto" | "touch" | "fine";

export const INPUT_KEY = "cortex-input";

export const INPUT_MODE_LABELS: Readonly<Record<InputModePreference, string>> = {
  auto: "Automático",
  touch: "Táctil",
  fine: "Teclado y ratón",
};

export const INPUT_MODE_ORDER: readonly InputModePreference[] = ["auto", "touch", "fine"];

/** Lo que guarda localStorage puede ser cualquier cosa: lo desconocido es "auto". */
export function parseInputMode(value: unknown): InputModePreference {
  return value === "touch" || value === "fine" ? value : "auto";
}

/** Regla única (la misma que la variante `touch:` de CSS): lo forzado gana; en "auto" manda `pointer: coarse`. */
export function resolveTouch(preference: InputModePreference, coarsePointer: boolean): boolean {
  return preference === "auto" ? coarsePointer : preference === "touch";
}

/** Se corre en <head> antes de pintar. Repite `parseInputMode` en JS plano: no puede importar nada. */
export const INPUT_BOOT = `(function(){var i=null;try{i=localStorage.getItem("${INPUT_KEY}")}catch(e){}var r=document.documentElement;if(i==="touch"||i==="fine")r.setAttribute("data-input",i);else r.removeAttribute("data-input")})()`;
