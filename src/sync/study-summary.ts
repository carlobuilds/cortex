import { z } from "zod";
import type { DayRecord } from "@/db/types";
import { addDays } from "@/engine/dates";

/** Topes del resumen de estudio que se empuja a Cuartel (ADR-030). Coinciden con el contrato de Cuartel. */
export const STUDY_LIMITS = { activeMs: 86_400_000, answered: 10_000, lessons: 1_000, maxDays: 7, bodyBytes: 4096 } as const;

/** Cifras de un día, y nada más (ADR-030): lo único que sale de Cortex hacia Cuartel. */
export interface StudyDay {
  readonly day: string;
  readonly activeMs: number;
  readonly answered: number;
  readonly correct: number;
  readonly reviews: number;
  readonly lessons: number;
  readonly minimumMet: boolean;
}

function clampInt(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

/**
 * Proyecta las filas de `days` a las 7 cifras permitidas (ADR-030, R9): copia campo por campo, acota,
 * omite los días sin actividad y ordena por día. Solo los últimos 7 días (hoy incluido).
 */
export function projectStudyDays(rows: readonly DayRecord[], today: string): StudyDay[] {
  const from = addDays(today, -6);
  const out: StudyDay[] = [];
  for (const row of rows) {
    const day = row.day;
    if (typeof day !== "string" || day < from || day > today) continue;
    const answered = clampInt(row.answered, STUDY_LIMITS.answered);
    const correct = Math.min(clampInt(row.correct, STUDY_LIMITS.answered), answered);
    const reviews = Math.min(clampInt(row.reviews, STUDY_LIMITS.answered), answered);
    const lessons = clampInt(row.lessons, STUDY_LIMITS.lessons);
    const activeMs = clampInt(row.activeMs, STUDY_LIMITS.activeMs);
    const minimumMet = row.minimumMet === true;
    if (answered === 0 && lessons === 0 && activeMs === 0 && !minimumMet) continue;
    out.push({ day, activeMs, answered, correct, reviews, lessons, minimumMet });
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

const dayField = z.string().refine((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d);

function requestSchema(today: string) {
  const min = addDays(today, -7);
  const max = addDays(today, 1);
  const day = z
    .strictObject({
      day: dayField.refine((d) => d >= min && d <= max),
      activeMs: z.number().int().min(0).max(STUDY_LIMITS.activeMs),
      answered: z.number().int().min(0).max(STUDY_LIMITS.answered),
      correct: z.number().int().min(0).max(STUDY_LIMITS.answered),
      reviews: z.number().int().min(0).max(STUDY_LIMITS.answered),
      lessons: z.number().int().min(0).max(STUDY_LIMITS.lessons),
      minimumMet: z.boolean(),
    })
    .refine((d) => d.correct <= d.answered && d.reviews <= d.answered);
  return z.strictObject({
    v: z.literal(1),
    days: z
      .array(day)
      .min(1)
      .max(STUDY_LIMITS.maxDays)
      .refine((ds) => new Set(ds.map((d) => d.day)).size === ds.length),
  });
}

/**
 * Valida el cuerpo que manda el navegador (ADR-030, R5): objeto estricto `{ v: 1, days }`, sin `source`.
 * Devuelve copias explícitas de los 7 campos.
 */
export function parseStudyRequest(value: unknown, today: string): { ok: true; days: StudyDay[] } | { ok: false } {
  const parsed = requestSchema(today).safeParse(value);
  if (!parsed.success) return { ok: false };
  return { ok: true, days: parsed.data.days.map(copyDay) };
}

function copyDay(d: StudyDay): StudyDay {
  return {
    day: d.day,
    activeMs: d.activeMs,
    answered: d.answered,
    correct: d.correct,
    reviews: d.reviews,
    lessons: d.lessons,
    minimumMet: d.minimumMet,
  };
}

/** Cuerpo del navegador hacia la ruta local (ADR-030): nunca lleva `source`. */
export function browserBody(days: readonly StudyDay[]): string {
  return JSON.stringify({ v: 1, days: days.map(copyDay) });
}

/** Cuerpo canónico hacia Cuartel (ADR-030): lo arma el servidor, con `source` fijo. */
export function cuartelBody(days: readonly StudyDay[]): string {
  return JSON.stringify({ v: 1, source: "cortex-local", days: days.map(copyDay) });
}
