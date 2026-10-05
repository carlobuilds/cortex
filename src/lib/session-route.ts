/**
 * Ruta de la sesión del día que se ve en el Inicio (ADR-020): los 4 pasos de /sesion con su estado.
 * Usa la misma fuente que la sesión (`readToday`), así el Inicio y la sesión nunca se contradicen.
 */

export type RouteStepId = "warmup" | "mission" | "gym" | "close";
export type RouteStepState = "done" | "skipped" | "current" | "upcoming";

export interface RouteInput {
  /** Repasos vencidos ahora mismo (0 = el calentamiento no tiene nada que hacer). */
  readonly dueCards: number;
  /** El bloque de repaso del día ya se hizo (`dayRecord.reviewBlockDone`). */
  readonly reviewBlockDone: boolean;
  readonly missionDone: boolean;
  readonly gymDone: boolean;
  readonly sessionDone: boolean;
}

export interface RouteStep {
  readonly id: RouteStepId;
  readonly state: RouteStepState;
}

/**
 * Estado de cada paso, en orden. Exactamente uno es "current" mientras la sesión no termine
 * (el primero que falta); los de después son "upcoming".
 *
 * TODO(Carlo): decide qué pasa con el calentamiento cuando no hay repasos vencidos
 * (`dueCards === 0` y `reviewBlockDone === false`). Hoy `/sesion` lo salta. Opciones:
 *   - "done":    cuenta para el anillo ("1 de 4" sin haber hecho nada: se siente como regalo).
 *   - "skipped": se ve tachado/atenuado y el anillo cuenta solo lo que hiciste ("0 de 3").
 * Lo que elijas debe ser coherente con `countForRing` de abajo.
 */
export function sessionRoute(input: RouteInput): RouteStep[] {
  const warmup: RouteStepState = input.reviewBlockDone ? "done" : input.dueCards === 0 ? "done" : "upcoming";
  const raw: [RouteStepId, boolean | RouteStepState][] = [
    ["warmup", warmup],
    ["mission", input.missionDone],
    ["gym", input.gymDone],
    ["close", input.sessionDone],
  ];
  let currentGiven = false;
  return raw.map(([id, v]) => {
    const finished = v === true || v === "done" || v === "skipped";
    if (finished) return { id, state: v === "skipped" ? "skipped" : "done" };
    if (!currentGiven) {
      currentGiven = true;
      return { id, state: "current" };
    }
    return { id, state: "upcoming" };
  });
}

/** Cuántos pasos cuenta el anillo del Inicio y de cuántos (los omitidos no cuentan en ningún lado). */
export function countForRing(steps: readonly RouteStep[]): { done: number; total: number } {
  const counted = steps.filter((s) => s.state !== "skipped");
  return { done: counted.filter((s) => s.state === "done").length, total: counted.length };
}
