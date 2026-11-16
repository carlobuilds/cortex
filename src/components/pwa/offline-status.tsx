"use client";

import { useEffect, useState } from "react";
import { isPwaBuild, offlineMessage, toOfflineState, type OfflineState, type WorkerStatus } from "./pwa-state";

/** Solo se acepta una respuesta con la forma exacta esperada; cualquier otra cosa cuenta como «sin respuesta». */
function parseStatus(data: unknown): WorkerStatus | null {
  if (typeof data !== "object" || data === null) return null;
  const { version, complete } = data as { version?: unknown; complete?: unknown };
  return typeof version === "string" && typeof complete === "boolean" ? { version, complete } : null;
}

/** Pregunta al worker activo si su precarga está completa; `null` si no contesta en 3 s. */
function askStatus(worker: ServiceWorker): Promise<WorkerStatus | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (value: WorkerStatus | null) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 3000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => finish(parseStatus(event.data));
    worker.postMessage({ type: "cortex:status" }, [channel.port2]);
  });
}

async function readState(): Promise<OfflineState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return { kind: "preparing" }; // aún se está registrando
  return toOfflineState({
    hasActive: reg.active !== null,
    hasInstalling: reg.installing !== null,
    hasWaiting: reg.waiting !== null,
    status: reg.active ? await askStatus(reg.active) : null,
  });
}

/**
 * Para `/ajustes`: dice cuándo la copia sin conexión está lista (y se puede activar el modo avión).
 * Fuera de la build del iPad no muestra nada.
 */
export function OfflineStatus() {
  const supported = isPwaBuild(process.env.NEXT_PUBLIC_CORTEX_PWA) && typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const [state, setState] = useState<OfflineState>({ kind: "unavailable" });

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      const next = await readState();
      if (!alive) return;
      setState(next);
      // Mientras instala o está incompleta, revisa de nuevo cada 3 s; listo no necesita más.
      if (next.kind !== "ready") timer = window.setTimeout(() => void tick(), 3000);
    };
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [supported]);

  const message = offlineMessage(state);
  if (!supported || message === null) return null;
  return (
    <div>
      <p className="font-semibold">Modo sin conexión</p>
      <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
