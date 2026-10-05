import { cn } from "@/lib/utils";
import { plural } from "./format";

/**
 * Vidas de un jefe como barra segmentada (rasgo firma de ADR-020, de la variante "HUD cian").
 * Un bloque por vida; los perdidos quedan apagados.
 */
export function LifeBar({ current, max, className }: { current: number; max: number; className?: string }) {
  const full = Math.max(0, Math.min(current, max));
  return (
    <span role="img" aria-label={`El jefe tiene ${plural(max, "vida", "vidas")}`} className={cn("flex h-2 gap-1", className)}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden data-full={i < full || undefined} className="flex-1 rounded-full bg-surface-3 data-full:bg-life" />
      ))}
    </span>
  );
}
