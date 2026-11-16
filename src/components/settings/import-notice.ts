import type { ImportRisk } from "@/db/backup";

/** Qué muestra el diálogo de «Reemplazar» según el riesgo; sin React para poder probarlo barato. */
export interface ImportNotice {
  /** `neutral`: una línea; `aviso`: bloque con ícono de información y color de aviso. */
  readonly kind: "neutral" | "aviso";
  readonly title: string;
  /** Frase accionable; `null` en `neutral`. */
  readonly action: string | null;
  readonly reasons: readonly string[];
}

export const NOTICE_OK = "Este respaldo es más reciente que lo que hay aquí.";
export const NOTICE_ACTION = "Lo que hiciste en este dispositivo después del respaldo se perdería al importar.";

export function importNotice(risk: ImportRisk): ImportNotice {
  if (risk.level === "ok") return { kind: "neutral", title: NOTICE_OK, action: null, reasons: [] };
  return {
    kind: "aviso",
    title: risk.level === "alto" ? "Revisa este respaldo antes de reemplazar" : "Antes de reemplazar",
    action: NOTICE_ACTION,
    reasons: risk.reasons,
  };
}

/** Fecha y hora en es-MX; `null` es «sin actividad». */
export function formatActivity(ms: number | null): string {
  return ms === null ? "sin actividad" : new Date(ms).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
}
