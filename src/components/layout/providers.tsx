"use client";

import type { ReactNode } from "react";
import { CelebrationProvider } from "@/components/study/celebrations";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardInsetSync } from "./keyboard-inset-sync";
import { ThemeSync } from "./theme-sync";

/** Proveedores de cliente de toda la app: celebraciones, tooltips, tema y teclado en pantalla. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <CelebrationProvider>
      <TooltipProvider>
        <ThemeSync />
        <KeyboardInsetSync />
        {children}
      </TooltipProvider>
    </CelebrationProvider>
  );
}
