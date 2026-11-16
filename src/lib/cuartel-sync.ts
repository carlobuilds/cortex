import type { CortexDb } from "@/db/db";
import { studyDaysFrom, syncWindow } from "@/engine/cuartel";
import { dayKey } from "@/engine/dates";

/**
 * Lado del navegador del envío a Cuartel (ADR-022). Al cerrar una sesión de estudio manda a la ruta
 * local `/api/cuartel` los días de la ventana (hoy y los 6 anteriores) con la proyección de 7
 * campos. Nunca lanza ni bloquea: si la ruta no existe (sin `CORTEX_LOCAL`) o Cuartel falla, el
 * siguiente cierre reenvía esos días. No hay cola.
 */

export const CUARTEL_SYNC_PATH = "/api/cuartel";

let running: Promise<void> | null = null;
let again = false;

async function sendOnce(db: CortexDb, now: number, fetchImpl: typeof fetch): Promise<void> {
  const records = await db.days.bulkGet(syncWindow(dayKey(now)));
  const days = studyDaysFrom(records);
  if (days.length === 0) return;
  const res = await fetchImpl(CUARTEL_SYNC_PATH, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cortex-sync": "1" },
    body: JSON.stringify({ days }),
    credentials: "same-origin",
    // Se cierra la sesión justo al salir de la página: que el envío sobreviva a la navegación.
    keepalive: true,
  });
  await res.body?.cancel().catch(() => undefined);
}

/** Envía las cifras de estudio recientes. Si ya hay un envío en curso, se repite una vez al terminar. */
export function syncStudyToCuartel(db: CortexDb, now: () => number = Date.now, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        await sendOnce(db, now(), fetchImpl);
      } catch {
        // Red, base cerrada o ruta apagada: no afecta el estudio.
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}
