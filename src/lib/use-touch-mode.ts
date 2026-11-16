"use client";

import { useSyncExternalStore } from "react";
import { INPUT_KEY, parseInputMode, resolveTouch, type InputModePreference } from "./input-mode";

const COARSE = "(pointer: coarse)";
const CHANGE_EVENT = "cortex-input-change";

function readPreference(): InputModePreference {
  try {
    return parseInputMode(window.localStorage.getItem(INPUT_KEY));
  } catch {
    return "auto";
  }
}

/** Refleja la preferencia en `data-input` de <html> (lo que lee la variante `touch:` de CSS). */
function applyInputAttr(preference: InputModePreference): void {
  const root = document.documentElement;
  if (preference === "auto") root.removeAttribute("data-input");
  else root.setAttribute("data-input", preference);
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia?.(COARSE);
  // Si otra pestaña cambia `cortex-input`, <html> también se actualiza en esta.
  const onStorage = () => {
    applyInputAttr(readPreference());
    onChange();
  };
  media?.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    media?.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Guarda el modo de entrada de este dispositivo y lo aplica a <html> al instante. */
export function setInputModePreference(preference: InputModePreference): void {
  try {
    window.localStorage.setItem(INPUT_KEY, preference);
  } catch {
    // Sin localStorage el cambio dura solo esta sesión.
  }
  applyInputAttr(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Preferencia guardada ("auto" en el servidor y en el primer render). */
export function useInputModePreference(): InputModePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "auto");
}

/**
 * ¿Se usa con toque? Misma regla que la variante `touch:` de CSS. Para lógica en JS (teclado de
 * fórmulas, `inputMode`, autofoco). En el servidor y en el primer render es `false`.
 */
export function useTouchMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => resolveTouch(readPreference(), window.matchMedia?.(COARSE).matches ?? false),
    () => false,
  );
}
