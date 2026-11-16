import "server-only";

/**
 * Candados comunes de las rutas que solo existen en la máquina de Carlo (ADR-005, ADR-022):
 *  - `CORTEX_LOCAL=1` en el proceso;
 *  - host local (contra DNS rebinding);
 *  - mismo origen (contra que otra página del navegador la dispare);
 *  - encabezado propio en POST (fuerza la verificación previa de CORS) y cuerpo JSON.
 */

export const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export type Access = { readonly ok: true } | { readonly ok: false; readonly status: number; readonly message: string };

export function localEnabled(env: NodeJS.ProcessEnv, disabledMessage: string): Access {
  return env.CORTEX_LOCAL === "1" ? { ok: true } : { ok: false, status: 403, message: disabledMessage };
}

export interface LocalGuard {
  /** Encabezado que la app manda con valor "1" en cada POST. */
  readonly header: string;
  readonly headerMessage: string;
  readonly disabledMessage: string;
}

export function checkLocalRequest(headers: Headers, method: string, guard: LocalGuard, env: NodeJS.ProcessEnv = process.env): Access {
  const enabled = localEnabled(env, guard.disabledMessage);
  if (!enabled.ok) return enabled;
  const host = headers.get("host") ?? "";
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : (host.split(":")[0] ?? "");
  if (!LOCAL_HOSTS.has(hostname)) return { ok: false, status: 403, message: "Solo desde localhost." };
  if (method === "POST") {
    if (headers.get(guard.header) !== "1") return { ok: false, status: 403, message: guard.headerMessage };
    const origin = headers.get("origin");
    if (origin && origin !== `http://${host}`) return { ok: false, status: 403, message: "Origen no permitido." };
    const site = headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return { ok: false, status: 403, message: "Solo desde la propia app." };
    if (!(headers.get("content-type") ?? "").startsWith("application/json")) return { ok: false, status: 415, message: "Se espera JSON." };
  }
  return { ok: true };
}
