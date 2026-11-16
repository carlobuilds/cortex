import type { CortexDb } from "@/db/db";

/**
 * Pide empujar las cifras de estudio a Cuartel (ADR-030). En la PWA del iPad no hace nada y el
 * empaquetador elimina el cliente (R11).
 */
export function pushStudySummary(db: CortexDb): void {
  if (process.env.NEXT_PUBLIC_CORTEX_PWA !== "1") {
    import("./cuartel-client")
      .then((m) => m.requestStudyPush(db))
      .catch(markLocalError);
  }
}

/** Si el cliente no cargó y el interruptor está prendido, deja «error local» (sin registrar el error). */
function markLocalError(): void {
  import("./cuartel-status")
    .then((s) => {
      const storage = s.browserStorage();
      if (s.cuartelSyncEnabled(storage)) {
        s.writeLastPush(storage, { sent: false, status: null, reason: "error local", at: Date.now() });
      }
    })
    .catch(() => {});
}
