import type { CortexDb } from "@/db/db";
import type { DayRecord } from "@/db/types";
import { addDays, dayKey } from "@/engine/dates";
import { browserStorage, cuartelSyncEnabled, parsePushResult, writeLastPush, type CuartelPushResult } from "./cuartel-status";
import { browserBody, projectStudyDays } from "./study-summary";

/** Dependencias del empujador (inyectables para pruebas). ADR-030. */
export interface StudyPusherDeps {
  readDays(from: string, to: string): Promise<readonly DayRecord[]>;
  fetch: typeof fetch;
  now(): number;
  storage: Storage | null;
  setTimer(fn: () => void, ms: number): unknown;
  minIntervalMs?: number;
}

/**
 * Empujador de cifras de estudio hacia la ruta local (ADR-030, R8): como máximo un envío en vuelo y
 * una pendiente, con separación mínima entre inicios. No hace nada con el interruptor apagado.
 */
function markLocalError(storage: Storage | null, now: () => number): void {
  try {
    writeLastPush(storage, { sent: false, status: null, reason: "error local", at: now() });
  } catch {
    // nunca lanza; si el interruptor está prendido, deja rastro
    try {
      const storage = browserStorage();
      if (cuartelSyncEnabled(storage)) markLocalError(storage, Date.now);
    } catch {
      // nunca lanza
    }
  }
}

export function createStudyPusher(deps: StudyPusherDeps): { request(): void } {
  const minInterval = deps.minIntervalMs ?? 20_000;
  let scheduled = false;
  let inFlight = false;
  let pending = false;
  let lastStart: number | null = null;

  async function run(): Promise<void> {
    scheduled = false;
    inFlight = true;
    lastStart = deps.now();
    try {
      if (!cuartelSyncEnabled(deps.storage)) return;
      const today = dayKey(deps.now());
      const days = projectStudyDays(await deps.readDays(addDays(today, -6), today), today);
      if (days.length === 0) {
        writeLastPush(deps.storage, { sent: false, status: null, reason: "sin días", at: deps.now() });
        return;
      }
      let result: CuartelPushResult;
      try {
        const res = await deps.fetch("/api/cuartel", {
          method: "POST",
          headers: { "content-type": "application/json", "x-cortex-cuartel": "1" },
          body: browserBody(days),
          keepalive: true,
          cache: "no-store",
          credentials: "same-origin",
        });
        result = parsePushResult(await res.json()) ?? { sent: false, status: null, reason: "sin respuesta" };
      } catch {
        result = { sent: false, status: null, reason: "sin respuesta" };
      }
      writeLastPush(deps.storage, { ...result, at: deps.now() });
    } catch {
      // nunca lanza; deja rastro para que Ajustes no muestre un «recibió» viejo (sin registrar el error)
      markLocalError(deps.storage, deps.now);
    } finally {
      inFlight = false;
      if (pending) {
        pending = false;
        request();
      }
    }
  }

  function request(): void {
    try {
      if (!cuartelSyncEnabled(deps.storage)) return;
      if (inFlight) {
        pending = true;
        return;
      }
      if (scheduled) return;
      scheduled = true;
      const now = deps.now();
      const at = lastStart === null ? now : Math.max(now, lastStart + minInterval);
      deps.setTimer(() => void run(), at - now);
    } catch {
      scheduled = false;
    }
  }

  return { request };
}

let shared: { pusher: { request(): void }; db: CortexDb } | null = null;

/** Pide un envío del resumen de estudio; un empujador único por pestaña (ADR-030). */
export function requestStudyPush(db: CortexDb): void {
  try {
    if (shared) shared.db = db;
    else {
      const holder = { db } as { db: CortexDb; pusher: { request(): void } };
      holder.pusher = createStudyPusher({
        readDays: (from, to) => holder.db.days.where("day").between(from, to, true, true).toArray(),
        fetch: (...args) => globalThis.fetch(...args),
        now: () => Date.now(),
        storage: browserStorage(),
        setTimer: (fn, ms) => setTimeout(fn, ms),
      });
      shared = holder;
    }
    shared.pusher.request();
  } catch {
    // nunca lanza; si el interruptor está prendido, deja rastro
    try {
      const storage = browserStorage();
      if (cuartelSyncEnabled(storage)) markLocalError(storage, Date.now);
    } catch {
      // nunca lanza
    }
  }
}
