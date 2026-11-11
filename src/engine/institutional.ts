import { z } from "zod";
import { daysBetween } from "./dates";

/**
 * Resultados institucionales reales (parciales, finales, ETS) y su calibración contra Cortex
 * (ADR-026). En v1 viven en `diario/resultados.yaml`, que Carlo puede editar a mano; por eso las
 * claves del archivo van en español, como el resto de los YAML del proyecto.
 */

export const EVALUATIONS = ["parcial-1", "parcial-2", "parcial-3", "final", "ets", "extraordinario"] as const;
export type Evaluation = (typeof EVALUATIONS)[number];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const institutionalResultSchema = z
  .strictObject({
    materia: z.string().regex(KEBAB, "materia en kebab-case, como en plan-2020.json"),
    evaluacion: z.enum(EVALUATIONS),
    calificacion: z.number().min(0),
    escala: z.union([z.literal(10), z.literal(100)]),
    fecha: z.string().regex(DAY, "fecha AAAA-MM-DD"),
    nota: z.string().max(500).optional(),
  })
  .refine((r) => r.calificacion <= r.escala, { message: "la calificación pasa de la escala", path: ["calificacion"] });

export type InstitutionalResult = z.infer<typeof institutionalResultSchema>;

export const RESULTS_FORMAT = 1;

export const institutionalFileSchema = z.strictObject({
  formato: z.literal(RESULTS_FORMAT),
  resultados: z.array(institutionalResultSchema),
});

export type InstitutionalFile = z.infer<typeof institutionalFileSchema>;

export const emptyResultsFile = (): InstitutionalFile => ({ formato: RESULTS_FORMAT, resultados: [] });

/** Calificación normalizada a 0–1. */
export const normalized = (r: Pick<InstitutionalResult, "calificacion" | "escala">): number => r.calificacion / r.escala;

/** Simulacros (y la práctica) que cuentan como predicción: los de los 21 días previos. */
export const CALIBRATION_WINDOW_DAYS = 21;

export interface ScorePoint {
  readonly subjectId: string | null;
  readonly day: string;
  readonly score: number | null;
}

export interface PracticePoint {
  readonly subjectId: string;
  readonly day: string;
  readonly correct: boolean;
}

export interface CalibrationRow {
  readonly materia: string;
  readonly evaluacion: Evaluation;
  readonly fecha: string;
  /** Calificación real normalizada (0–1). */
  readonly real: number;
  /** Último simulacro de la materia dentro de la ventana, o `null`. */
  readonly lastExam: { readonly day: string; readonly daysBefore: number; readonly score: number } | null;
  readonly examsInWindow: number;
  /** Acierto en práctica, repaso y jefes de la materia dentro de la ventana. */
  readonly practiceAccuracy: number | null;
  readonly practiceAttempts: number;
  /** real − último simulacro: positivo si el parcial salió mejor de lo que predijo Cortex. */
  readonly delta: number | null;
}

export interface CalibrationReport {
  readonly windowDays: number;
  readonly rows: readonly CalibrationRow[];
  /** Resumen de las filas con simulacro. Con pocos datos es orientativo, no estadística. */
  readonly summary: { readonly n: number; readonly meanAbsError: number | null; readonly bias: number | null };
  readonly caveats: readonly string[];
}

export function calibrationReport(
  results: readonly InstitutionalResult[],
  exams: readonly ScorePoint[],
  practice: readonly PracticePoint[],
  windowDays: number = CALIBRATION_WINDOW_DAYS,
): CalibrationReport {
  const within = (day: string, fecha: string) => {
    const d = daysBetween(day, fecha);
    return d >= 0 && d <= windowDays;
  };
  const rows = [...results]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((r): CalibrationRow => {
      const prior = exams
        .filter((e): e is ScorePoint & { score: number } => e.subjectId === r.materia && e.score !== null && within(e.day, r.fecha))
        .sort((a, b) => a.day.localeCompare(b.day));
      const last = prior.at(-1) ?? null;
      const prac = practice.filter((p) => p.subjectId === r.materia && within(p.day, r.fecha));
      const real = normalized(r);
      return {
        materia: r.materia,
        evaluacion: r.evaluacion,
        fecha: r.fecha,
        real,
        lastExam: last ? { day: last.day, daysBefore: daysBetween(last.day, r.fecha), score: last.score } : null,
        examsInWindow: prior.length,
        practiceAccuracy: prac.length ? prac.filter((p) => p.correct).length / prac.length : null,
        practiceAttempts: prac.length,
        delta: last ? real - last.score : null,
      };
    });
  const deltas = rows.flatMap((r) => (r.delta === null ? [] : [r.delta]));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    windowDays,
    rows,
    summary: { n: deltas.length, meanAbsError: mean(deltas.map(Math.abs)), bias: mean(deltas) },
    caveats: [
      "El puntaje del simulacro cuenta aciertos entre respondidas: lo que no se contestó no se guarda y puede sobrestimar.",
      "Con menos de 5 parciales registrados, la calibración es una pista, no una conclusión.",
    ],
  };
}
