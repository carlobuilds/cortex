"use client";

import { useEffect } from "react";
import { startKeyboardInset } from "@/lib/keyboard-inset";
import { useTouchMode } from "@/lib/use-touch-mode";

/** En modo táctil mantiene `--kb` (alto del teclado en pantalla) para las barras pegadas abajo. */
export function KeyboardInsetSync() {
  const touch = useTouchMode();
  useEffect(() => (touch ? startKeyboardInset() : undefined), [touch]);
  return null;
}
