import { clamp01 } from "./format";

/**
 * Nivel actual dentro de un anillo con el avance al siguiente (ADR-020): así la XP también se ve en
 * el celular, donde no cabe la barra. `progress = null` = cargando (anillo vacío, sin inventar).
 */
export function LevelBadge({ level, progress = null }: { level: number | null; progress?: number | null }) {
  const turn = progress === null ? 0 : clamp01(progress);
  return (
    <span
      role="img"
      aria-label={level === null ? "Nivel: cargando" : `Nivel ${level}`}
      className="grid size-7 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--xp) ${turn}turn, var(--surface-3) 0)` }}
    >
      <span aria-hidden className="grid size-[1.375rem] place-items-center rounded-full bg-surface-2 font-mono text-caption font-bold whitespace-nowrap text-xp-text tabular-nums">
        {level ?? "–"}
      </span>
    </span>
  );
}
