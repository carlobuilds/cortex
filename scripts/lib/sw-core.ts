/**
 * Lógica pura del service worker de la PWA del iPad (B2).
 *
 * IMPORTANTE: este archivo se transpila con TypeScript y se incrusta tal cual dentro de `out/sw.js`
 * (ver `sw-plan.ts`), así que NO puede importar nada ni usar APIs que no existan en un worker. Solo
 * declaraciones de función y constantes; los tipos se borran al transpilar.
 */

/** Entrada que se guarda al final de una precarga completa. Su presencia = «la caché está completa». */
export const COMPLETE_MARKER = "/__cortex-precache-complete";

/** Prefijo de todas las cachés propias; solo estas se borran en `activate`. */
export const CACHE_PREFIX = "cortex-";

export type Decision = { action: "skip" } | { action: "serve"; key: string };

export interface RequestInfo {
  method: string;
  /** `request.mode` (solo importa `"navigate"`). */
  mode: string;
  sameOrigin: boolean;
  pathname: string;
  hasRange: boolean;
}

/** `/materias/calculo/` -> `/materias/calculo`; la raíz queda `/`. */
export function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.replace(/\/+$/, "") || "/" : pathname;
}

/**
 * Lista permitida (E3): decide si el service worker atiende la petición. Todo lo que no sea GET del
 * mismo origen en la lista de precarga (o una navegación) se deja pasar a la red sin tocarlo:
 * otros orígenes, no-GET, `/api/*`, los `.txt` RSC y cualquier ruta fuera del manifiesto.
 */
export function decide(req: RequestInfo, keys: ReadonlySet<string>): Decision {
  if (req.method !== "GET" || !req.sameOrigin) return { action: "skip" };
  const path = normalizePathname(req.pathname);
  if (path === "/api" || path.startsWith("/api/")) return { action: "skip" };
  if (req.mode === "navigate") {
    if (keys.has(path)) return { action: "serve", key: path };
    // Ruta desconocida: la página 404 de la caché (si no existe, `serve` cae a la red).
    return keys.has("/404") ? { action: "serve", key: "/404" } : { action: "skip" };
  }
  // Los rangos (video, descargas parciales) no se sirven desde la caché.
  if (req.hasRange) return { action: "skip" };
  return keys.has(req.pathname) ? { action: "serve", key: req.pathname } : { action: "skip" };
}

/** Solo se guardan respuestas completas, del mismo origen y sin redirección (Safari rechaza las redirigidas). */
export function isValidPrecacheResponse(res: { ok: boolean; status: number; type: string; redirected: boolean }): boolean {
  return res.ok && res.status === 200 && res.type === "basic" && !res.redirected;
}

/** Ejecuta `worker` sobre `items` con a lo sumo `limit` a la vez; al primer error deja de lanzar nuevos. */
export async function mapLimit<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  let failed = false;
  let firstError: unknown;
  const run = async (): Promise<void> => {
    while (!failed && next < items.length) {
      const item = items[next++] as T;
      try {
        await worker(item);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run));
  if (failed) throw firstError;
}
