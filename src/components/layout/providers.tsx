"use client";

import type { ReactNode } from "react";
import { CelebrationProvider } from "@/components/study/celebrations";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeSync } from "./theme-sync";

/** Proveedores de cliente de toda la app: celebraciones, tooltips y tema. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <CelebrationProvider>
      <TooltipProvider>
        <ThemeSync />
        {children}
      </TooltipProvider>
    </CelebrationProvider>
  );
}
