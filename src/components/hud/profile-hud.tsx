"use client";

import { TriangleAlert } from "lucide-react";
import { DbClosedError, FutureSchemaError } from "@/db/db";
import { useProfile } from "@/db/use-profile";
import Link from "next/link";
import { levelInfo } from "@/engine/levels";
import { visibleStreak } from "@/engine/streak";
import { useToday } from "@/lib/use-clock";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HudBar } from "./hud-bar";

/**
 * HUD con el perfil real de IndexedDB. En el servidor y en el primer render dibuja el estado de
 * carga (sin números), así que no hay diferencias de hidratación.
 */
export function ProfileHud() {
  const state = useProfile();
  const today = useToday();
  if (state.status === "error") {
    const [label, short] =
      state.error instanceof FutureSchemaError
        ? ["Datos de una versión más nueva", "Versión nueva"]
        : state.error instanceof DbClosedError
          ? ["Recarga la página", "Recarga"]
          : ["No pude abrir tus datos", "Sin datos"];
    // El detalle técnico va en un tooltip (también con el foco del teclado, a diferencia de `title`).
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="status"
            tabIndex={0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning px-2.5 py-1 text-xs font-medium whitespace-nowrap text-warning"
          >
            <TriangleAlert aria-hidden className="size-3.5" />
            {/* En móvil, texto corto a la vista; el lector de pantalla siempre oye el completo. */}
            <span aria-hidden className="sm:hidden">
              {short}
            </span>
            <span className="sr-only sm:not-sr-only">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{state.error.message}</TooltipContent>
      </Tooltip>
    );
  }
  if (state.status === "loading" || today === null) return <HudBar data={null} />;
  const p = state.profile;
  const level = levelInfo(p.xpTotal);
  // La racha que se ve: si los días sin estudiar no caben en los congelamientos, se ve en 0 (sin culpa).
  const streak = visibleStreak({ current: p.currentStreak, max: p.maxStreak, freezes: p.streakFreezes, lastDay: p.lastStudyDay, repair: p.streakRepair }, today);
  return (
    <Link href="/progreso" aria-label="Tu progreso" className="rounded-full touch:inline-flex touch:min-h-11 touch:items-center" data-frame={p.cosmetics.frame ?? undefined}>
      <HudBar data={{ xpTotal: p.xpTotal, level: level.level, currentStreak: streak.current, levelProgress: level.progress }} />
    </Link>
  );
}
