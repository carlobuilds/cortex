import { z } from "zod";
import { addDays } from "./dates";

/**
 * Envío de cifras de estudio a Cuartel (ADR-022). Lógica pura: qué días se mandan y la proyección
 * explícita de 7 campos de cada `DayRecord`. Nunca viaja el registro entero (xp, jefes, combo,
 * cofre…), ni respuestas, notas o contenido: solo estas cifras.
 *
 * Contrato de Cuartel: `POST /api/ingest/study` (docs/deploy.md §18 del repo de Cuartel).
 */

/** Cuántos días se reenvían en cada cierre (hoy y los 6 anteriores). Reenviar es seguro: upsert por día. */
export const CUARTEL_SYNC_DAYS = 7;

/** Límites del contrato de Cuartel. */
export const CUARTEL_LIMITS = {
  maxDays: 60,
  activeMs: 86_400_000,
  answered: 10_000,
  lessons: 1_000,
  bodyBytes: 32 * 1024,
} as const;

/** Lo único que sale de un día. */
export interface StudyDay {
  readonly day: string;
  readonly activeMs: number;
  readonly answered: number;
  readonly correct: number;
  readonly reviews: number;
  readonly lessons: number;
  readonly minimumMet: boolean;
}

/** Lo mínimo que la proyección lee de un `DayRecord` (acepta el registro entero). */
export interface StudyDaySource {
  readonly day: string;
  readonly activeMs: number;
  readonly answered: number;
  readonly correct: number;
  readonly reviews: number;
  readonly lessons: number;
  readonly minimumMet: boolean;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ¿`AAAA-MM-DD` de un día que existe? (2026-02-30 no). */
export function isRealDay(day: string): boolean {
  if (!DAY_RE.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const int = (v: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);

/**
 * Proyección explícita de 7 campos: enteros en el rango del contrato, `correct` y `reviews` nunca
 * mayores que `answered`. Campo por campo, así un campo nuevo de `DayRecord` no se cuela.
 */
export function studyDayFrom(d: StudyDaySource): StudyDay {
  const answered = int(d.answered, CUARTEL_LIMITS.answered);
  return {
    day: d.day,
    activeMs: int(d.activeMs, CUARTEL_LIMITS.activeMs),
    answered,
    correct: int(d.correct, answered),
    reviews: int(d.reviews, answered),
    lessons: int(d.lessons, CUARTEL_LIMITS.lessons),
    minimumMet: d.minimumMet === true,
  };
}

/** Los días a reenviar, del más viejo a hoy. */
export function syncWindow(today: string, n: number = CUARTEL_SYNC_DAYS): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** Días listos para mandar: proyectados, válidos, sin repetir y como máximo 60. */
export function studyDaysFrom(records: readonly (StudyDaySource | undefined | null)[]): StudyDay[] {
  const seen = new Set<string>();
  const out: StudyDay[] = [];
  for (const r of records) {
    if (!r || !isRealDay(r.day) || seen.has(r.day)) continue;
    seen.add(r.day);
    out.push(studyDayFrom(r));
  }
  return out.slice(-CUARTEL_LIMITS.maxDays);
}

const count = (max: number) => z.number().int().min(0).max(max);

/** Un día, estricto: cualquier campo de más es error (igual que en Cuartel). */
export const studyDaySchema = z
  .strictObject({
    day: z.string().refine(isRealDay, "día inválido"),
    activeMs: count(CUARTEL_LIMITS.activeMs),
    answered: count(CUARTEL_LIMITS.answered),
    correct: count(CUARTEL_LIMITS.answered),
    reviews: count(CUARTEL_LIMITS.answered),
    lessons: count(CUARTEL_LIMITS.lessons),
    minimumMet: z.boolean(),
  })
  .refine((d) => d.correct <= d.answered && d.reviews <= d.answered, "correct y reviews no pueden pasar de answered");

/** Lo que el navegador manda a la ruta local: solo los días. */
export const localSyncBodySchema = z.strictObject({
  days: z
    .array(studyDaySchema)
    .min(1)
    .max(CUARTEL_LIMITS.maxDays)
    .refine((ds) => new Set(ds.map((d) => d.day)).size === ds.length, "día repetido"),
});

export type LocalSyncBody = z.infer<typeof localSyncBodySchema>;

/** Cuerpo exacto para Cuartel. */
export function ingestBody(days: readonly StudyDay[]): { v: 1; source: "cortex-local"; days: StudyDay[] } {
  return { v: 1, source: "cortex-local", days: days.map(studyDayFrom) };
}
