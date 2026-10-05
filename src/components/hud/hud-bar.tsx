import { formatNumber } from "./format";
import { LevelBadge } from "./level-badge";
import { StreakChip } from "./streak-chip";
import { XpBar } from "./xp-bar";

export interface HudData {
  readonly xpTotal: number;
  readonly level: number;
  readonly currentStreak: number;
  /** Avance dentro del nivel actual, 0–1 (lo calcula el motor de la Fase 1); `null` = sin calcular. */
  readonly levelProgress: number | null;
}

/** HUD compacto de la barra superior. `data = null` dibuja el estado de carga (igual en servidor y cliente). */
export function HudBar({ data }: { data: HudData | null }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" aria-busy={data === null || undefined}>
      <StreakChip days={data?.currentStreak ?? null} />
      {/* Juego premium: el nivel y la XP llevan el glow dorado (solo pesa en el tema oscuro). */}
      <div className="glow glow-xp flex h-8 items-center gap-2 rounded-full border bg-surface-2 p-0.5 sm:pr-3">
        <LevelBadge level={data?.level ?? null} progress={data?.levelProgress ?? null} />
        <div className="hidden flex-col gap-1 sm:flex">
          <span className="font-mono text-caption leading-none text-xp-text tabular-nums">{data === null ? "– XP" : `${formatNumber(data.xpTotal)} XP`}</span>
          <XpBar progress={data?.levelProgress ?? null} segments={16} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}
