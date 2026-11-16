/** Estado del empuje a Cuartel, compartido por navegador y servidor (ADR-030). Sin rutas ni destinos. */

export const CUARTEL_REASONS = [
  "prohibido",
  "tipo",
  "cuerpo grande",
  "cuerpo inválido",
  "en curso",
  "muy pronto",
  "sin token",
  "token inválido",
  "tiempo agotado",
  "red",
  "error interno",
  "sin días",
  "sin respuesta",
  "error local",
] as const;
export type CuartelReason = (typeof CUARTEL_REASONS)[number];

/** Resultado de un envío: lo que responde la ruta local y lo que muestra Ajustes (ADR-030). */
export interface CuartelPushResult {
  readonly sent: boolean;
  readonly status: number | null;
  readonly reason?: CuartelReason;
}

/** Valida la forma de una respuesta; ninguna cadena libre pasa (ADR-030). */
export function parsePushResult(v: unknown): CuartelPushResult | null {
  if (typeof v !== "object" || v === null) return null;
  const { sent, status, reason } = v as Record<string, unknown>;
  if (typeof sent !== "boolean") return null;
  if (status !== null && !(typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599)) return null;
  if (reason === undefined) return { sent, status };
  if (typeof reason !== "string" || !(CUARTEL_REASONS as readonly string[]).includes(reason)) return null;
  return { sent, status, reason: reason as CuartelReason };
}

export const CUARTEL_SYNC_KEY = "cortex:cuartel-sync";
export const CUARTEL_LAST_KEY = "cortex:cuartel-last";
const CUARTEL_EVENT = "cortex:cuartel";

/** `localStorage` o null (fuera del navegador o bloqueado). */
export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Interruptor por perfil (ADR-030, R10): apagado por defecto. */
export function cuartelSyncEnabled(storage: Storage | null): boolean {
  try {
    return storage?.getItem(CUARTEL_SYNC_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCuartelSync(storage: Storage | null, on: boolean): void {
  try {
    if (on) storage?.setItem(CUARTEL_SYNC_KEY, "1");
    else storage?.removeItem(CUARTEL_SYNC_KEY);
  } catch {
    // sin almacenamiento: queda apagado
  }
}

export interface LastPush extends CuartelPushResult {
  readonly at: number;
}

export function readLastPush(storage: Storage | null): LastPush | null {
  try {
    const raw = storage?.getItem(CUARTEL_LAST_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    const result = parsePushResult(value);
    const at = (value as { at?: unknown }).at;
    if (!result || typeof at !== "number" || !Number.isFinite(at)) return null;
    return { ...result, at };
  } catch {
    return null;
  }
}

/** Guarda el último envío y avisa a Ajustes con el evento `cortex:cuartel`. */
export function writeLastPush(storage: Storage | null, v: LastPush): void {
  try {
    const out: LastPush = {
      sent: v.sent,
      status: v.status,
      ...(v.reason !== undefined ? { reason: v.reason } : {}),
      at: v.at,
    };
    storage?.setItem(CUARTEL_LAST_KEY, JSON.stringify(out));
  } catch {
    // sin almacenamiento
  }
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(CUARTEL_EVENT));
  } catch {
    // sin ventana
  }
}
