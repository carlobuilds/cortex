import "server-only";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { ingestBody, type StudyDay } from "@/engine/cuartel";

/**
 * Lado del servidor del envío a Cuartel (ADR-022). Solo corre en la máquina de Carlo, detrás de los
 * candados de `local-access.ts`:
 *  - `CUARTEL_URL` sale de `~/.cuartel/config` (líneas `CLAVE=valor`);
 *  - el token sale de `~/.cuartel/cortex-token` (token `cortex-mac`, solo scope `ingest`, permisos 0600);
 *  - el token nunca llega al navegador, a un log ni al repo: los errores se registran solo con el
 *    código HTTP y el resultado que vuelve al navegador no lo incluye;
 *  - si Cuartel no responde o falla, no pasa nada: el siguiente cierre reenvía esos días.
 *
 * `CORTEX_CUARTEL_DIR` apunta a otra carpeta, solo para pruebas (como `CORTEX_CONTENT_ROOT`).
 */

export const CUARTEL_FILES = { config: "config", token: "cortex-token" } as const;
export const CUARTEL_TIMEOUT_MS = 10_000;

export type SyncFailure = "sin-config" | "config-invalida" | "sin-token" | "token-inseguro" | "token-invalido" | "http" | "red";

export type SyncResult =
  | {
      readonly sent: true;
      readonly status: number;
      readonly received: number | null;
      readonly saved: number | null;
      readonly skipped: readonly { readonly day: string; readonly reason: string }[];
    }
  | { readonly sent: false; readonly reason: SyncFailure; readonly status?: number };

export interface CuartelTarget {
  readonly endpoint: string;
  readonly token: string;
}

export function cuartelDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.CORTEX_CUARTEL_DIR || join(/* turbopackIgnore: true */ homedir(), ".cuartel");
}

/** Lee `CLAVE=valor` (acepta `export`, comillas y comentarios con `#`). */
export function parseConfig(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m?.[1]) continue;
    let value = (m[2] ?? "").trim();
    const q = value[0];
    if ((q === '"' || q === "'") && value.endsWith(q) && value.length >= 2) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    out[m[1]] = value;
  }
  return out;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `https://…` (o `http://` solo hacia la propia máquina, para pruebas), sin usuario ni contraseña. */
export function ingestEndpoint(base: string): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK.has(url.hostname))) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}/api/ingest/study`;
}

/** `cu_` + caracteres visibles, sin espacios ni saltos de línea (nada que rompa el encabezado). */
const TOKEN_RE = /^cu_[\x21-\x7e]{8,512}$/;

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(/* turbopackIgnore: true */ path, "utf8");
  } catch {
    return null;
  }
}

/** Dónde mandar y con qué token, o por qué no se puede. */
export async function readTarget(env: NodeJS.ProcessEnv = process.env): Promise<{ ok: true; target: CuartelTarget } | { ok: false; reason: SyncFailure }> {
  const dir = cuartelDir(env);
  const config = await readOptional(join(/* turbopackIgnore: true */ dir, CUARTEL_FILES.config));
  if (config === null) return { ok: false, reason: "sin-config" };
  const endpoint = ingestEndpoint(parseConfig(config).CUARTEL_URL ?? "");
  if (!endpoint) return { ok: false, reason: "config-invalida" };

  const tokenPath = join(/* turbopackIgnore: true */ dir, CUARTEL_FILES.token);
  let mode: number;
  try {
    mode = (await stat(/* turbopackIgnore: true */ tokenPath)).mode;
  } catch {
    return { ok: false, reason: "sin-token" };
  }
  // Como ssh: si otro usuario de la máquina puede leer el token, no se usa.
  if (process.platform !== "win32" && (mode & 0o077) !== 0) return { ok: false, reason: "token-inseguro" };
  const token = ((await readOptional(tokenPath)) ?? "").trim();
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "token-invalido" };
  return { ok: true, target: { endpoint, token } };
}

const okResponse = z.object({
  received: z.number().int().nonnegative().optional(),
  saved: z.number().int().nonnegative().optional(),
  skipped: z.array(z.object({ day: z.string().max(20), reason: z.string().max(200) })).max(60).optional(),
});

const warned = new Set<SyncFailure>();

/** Avisa en la terminal sin datos sensibles; lo que no cambia entre cierres, una sola vez. */
function warn(reason: SyncFailure, status?: number): void {
  if (reason === "http") {
    console.warn(`[cuartel] Cuartel no aceptó el envío: HTTP ${status}`);
    return;
  }
  if (warned.has(reason)) return;
  warned.add(reason);
  const why: Record<Exclude<SyncFailure, "http">, string> = {
    "sin-config": "falta ~/.cuartel/config; no se envía nada",
    "config-invalida": "CUARTEL_URL en ~/.cuartel/config no es una URL https válida",
    "sin-token": `falta ~/.cuartel/${CUARTEL_FILES.token}`,
    "token-inseguro": `~/.cuartel/${CUARTEL_FILES.token} debe tener permisos 0600`,
    "token-invalido": `~/.cuartel/${CUARTEL_FILES.token} no tiene un token con formato cu_…`,
    red: "Cuartel no respondió; el siguiente cierre reenvía estos días",
  };
  console.warn(`[cuartel] ${why[reason]}`);
}

/** Olvida qué avisos ya salieron (pruebas). */
export function resetWarnings(): void {
  warned.clear();
}

export async function postStudyDays(target: CuartelTarget, days: readonly StudyDay[], fetchImpl: typeof fetch = fetch): Promise<SyncResult> {
  let res: Response;
  try {
    res = await fetchImpl(target.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${target.token}`, "content-type": "application/json" },
      body: JSON.stringify(ingestBody(days)),
      // Una redirección podría llevarse el token a otro lado: se corta.
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(CUARTEL_TIMEOUT_MS),
    });
  } catch {
    warn("red");
    return { sent: false, reason: "red" };
  }
  if (res.status !== 200) {
    await res.body?.cancel().catch(() => undefined);
    warn("http", res.status);
    return { sent: false, reason: "http", status: res.status };
  }
  warned.delete("red");
  let parsed: z.infer<typeof okResponse> = {};
  try {
    const r = okResponse.safeParse(await res.json());
    if (r.success) parsed = r.data;
  } catch {
    // 200 con un cuerpo raro: se guardó igual; solo no hay conteos.
  }
  return { sent: true, status: 200, received: parsed.received ?? null, saved: parsed.saved ?? null, skipped: parsed.skipped ?? [] };
}

/** Lee la configuración y manda los días. Nunca lanza. */
export async function sendStudyDays(days: readonly StudyDay[], env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): Promise<SyncResult> {
  const t = await readTarget(env);
  if (!t.ok) {
    warn(t.reason);
    return { sent: false, reason: t.reason };
  }
  return postStudyDays(t.target, days, fetchImpl);
}
