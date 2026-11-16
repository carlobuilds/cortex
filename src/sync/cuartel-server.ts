import "server-only";
import { constants, closeSync, fstatSync, openSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dayKey } from "@/engine/dates";
import type { CuartelPushResult, CuartelReason } from "./cuartel-status";
import { cuartelBody, parseStudyRequest, STUDY_LIMITS } from "./study-summary";

/** Destino fijo de Cuartel (ADR-030): no se lee de ningún archivo ni variable. */
export const CUARTEL_ORIGIN = "https://personalos.carlogarza.dev";
/** Único origen de Cortex con los datos reales (ADR-010). */
export const CORTEX_HOST = "localhost:3000";
export const CORTEX_ORIGIN = "http://localhost:3000";
export const SEND_TIMEOUT_MS = 5000;
export const MIN_SEND_INTERVAL_MS = 15_000;

const TOKEN_FILE = ".cuartel/cortex-token";
const TOKEN_RE = /^cu_[A-Za-z0-9_-]{43}\n?$/;

export type CuartelAccess =
  | { readonly ok: true }
  | { readonly ok: false; readonly status: 403 | 405 | 415; readonly reason: CuartelReason };

/** Candados de la ruta (ADR-030, R4): solo local, POST, mismo origen exacto y encabezado propio. */
export function checkCuartelRequest(method: string, headers: Headers, env: NodeJS.ProcessEnv): CuartelAccess {
  if (env.CORTEX_LOCAL !== "1") return { ok: false, status: 403, reason: "prohibido" };
  if (method !== "POST") return { ok: false, status: 405, reason: "prohibido" };
  if (headers.get("host") !== CORTEX_HOST) return { ok: false, status: 403, reason: "prohibido" };
  if (headers.get("origin") !== CORTEX_ORIGIN) return { ok: false, status: 403, reason: "prohibido" };
  const site = headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return { ok: false, status: 403, reason: "prohibido" };
  if (headers.get("x-cortex-cuartel") !== "1") return { ok: false, status: 403, reason: "prohibido" };
  if (!/^application\/json(; charset=utf-8)?$/i.test(headers.get("content-type") ?? "")) {
    return { ok: false, status: 415, reason: "tipo" };
  }
  return { ok: true };
}

export type LimitedText =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly status: 413 | 400; readonly reason: CuartelReason };

/** Lee el cuerpo con tope de bytes, contando mientras llega (ADR-030, R5). */
export async function readLimitedText(req: Request, maxBytes: number): Promise<LimitedText> {
  const tooBig: LimitedText = { ok: false, status: 413, reason: "cuerpo grande" };
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    const n = Number(declared);
    if (!Number.isFinite(n) || n > maxBytes) {
      await req.body?.cancel().catch(() => {});
      return tooBig;
    }
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return tooBig;
      }
      chunks.push(value);
    }
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(all) };
  } catch {
    return { ok: false, status: 400, reason: "cuerpo inválido" };
  }
}

export type TokenRead =
  | { readonly ok: true; readonly token: string }
  | { readonly ok: false; readonly reason: "sin token" | "token inválido" };

export interface TokenDeps {
  readonly path: string;
  readonly uid: number;
  readonly fs: {
    openSync: typeof openSync;
    fstatSync: typeof fstatSync;
    readSync: typeof readSync;
    closeSync: typeof closeSync;
  };
}

/**
 * Lee el token de Cuartel en cada envío (ADR-030, R1/R2): sin seguir symlinks, comprobando sobre el
 * mismo descriptor que es un archivo regular, del usuario y con permisos 0600.
 */
export function readCortexToken(deps: TokenDeps): TokenRead {
  const bad = { ok: false, reason: "token inválido" } as const;
  let fd: number;
  try {
    fd = deps.fs.openSync(deps.path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    const code = (e as { code?: unknown } | null)?.code;
    return code === "ENOENT" ? { ok: false, reason: "sin token" } : bad;
  }
  try {
    const stat = deps.fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== deps.uid || (stat.mode & 0o077) !== 0 || stat.size > 256) return bad;
    const buf = Buffer.alloc(257);
    const n = deps.fs.readSync(fd, buf, 0, 257, 0);
    if (n > 256) return bad;
    const text = buf.subarray(0, n).toString("utf8");
    if (!TOKEN_RE.test(text)) return bad;
    return { ok: true, token: text.replace(/\n$/, "") };
  } catch {
    return bad;
  } finally {
    try {
      deps.fs.closeSync(fd);
    } catch {
      // ya cerrado
    }
  }
}

export interface CuartelDeps {
  env: NodeJS.ProcessEnv;
  fetch: typeof fetch;
  now(): number;
  today(): string;
  readToken(): TokenRead;
  log(level: "info" | "warn", line: string): void;
}

const HEADERS = { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } as const;

function reply(status: number, body: CuartelPushResult): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

/** Registra un rechazo temprano con una línea fija: nunca encabezados, cuerpo ni origen. */
function logRejected(deps: CuartelDeps, status: number, reason: CuartelReason): void {
  try {
    deps.log("warn", `cuartel: petición rechazada (HTTP ${status}, ${reason})`);
  } catch {
    // el registro no debe romper la respuesta
  }
}

/** Responde un rechazo temprano y lo registra. */
function reject(deps: CuartelDeps, status: number, reason: CuartelReason): Response {
  logRejected(deps, status, reason);
  return reply(status, { sent: false, status: null, reason });
}

/** Manejador de `POST` hacia Cuartel (ADR-030): candados, validación, tope de ritmo y envío con token. */
export function createCuartelHandler(deps: CuartelDeps): (req: Request) => Promise<Response> {
  let inFlight = false;
  let lastSend: number | null = null;

  return async (req) => {
    try {
      const access = checkCuartelRequest(req.method, req.headers, deps.env);
      if (!access.ok) return reject(deps, access.status, access.reason);

      const text = await readLimitedText(req, STUDY_LIMITS.bodyBytes);
      if (!text.ok) return reject(deps, text.status, text.reason);

      let value: unknown;
      try {
        value = JSON.parse(text.text);
      } catch {
        return reject(deps, 400, "cuerpo inválido");
      }
      const parsed = parseStudyRequest(value, deps.today());
      if (!parsed.ok) return reject(deps, 400, "cuerpo inválido");

      if (inFlight) return reject(deps, 429, "en curso");
      if (lastSend !== null && deps.now() - lastSend < MIN_SEND_INTERVAL_MS) {
        return reject(deps, 429, "muy pronto");
      }

      const token = deps.readToken();
      if (!token.ok) {
        deps.log("warn", `cuartel: estudio sin envío (${token.reason})`);
        return reply(503, { sent: false, status: null, reason: token.reason });
      }

      inFlight = true;
      lastSend = deps.now();
      try {
        const res = await deps.fetch(new URL("/api/ingest/study", CUARTEL_ORIGIN).href, {
          method: "POST",
          headers: { authorization: `Bearer ${token.token}`, "content-type": "application/json" },
          body: cuartelBody(parsed.days),
          redirect: "error",
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
          cache: "no-store",
        });
        await res.body?.cancel().catch(() => {});
        deps.log(res.ok ? "info" : "warn", `cuartel: estudio HTTP ${res.status}`);
        return res.ok ? reply(200, { sent: true, status: res.status }) : reply(502, { sent: false, status: res.status });
      } catch (e) {
        const name = (e as { name?: unknown } | null)?.name;
        if (name === "TimeoutError" || name === "AbortError") {
          deps.log("warn", "cuartel: estudio sin envío (tiempo agotado)");
          return reply(504, { sent: false, status: null, reason: "tiempo agotado" });
        }
        deps.log("warn", "cuartel: estudio sin envío (red)");
        return reply(502, { sent: false, status: null, reason: "red" });
      } finally {
        inFlight = false;
      }
    } catch {
      try {
        deps.log("warn", "cuartel: estudio sin envío (error interno)");
      } catch {
        // el registro no debe romper la respuesta
      }
      return reply(500, { sent: false, status: null, reason: "error interno" });
    }
  };
}

/** Ruta por defecto del token, fuera del repo (ADR-030). */
export const DEFAULT_TOKEN_PATH = join(homedir(), TOKEN_FILE);

/** Dependencias reales del manejador (ADR-030). */
export function defaultCuartelDeps(): CuartelDeps {
  const uid = process.getuid?.() ?? -1;
  return {
    env: process.env,
    fetch: (input, init) => globalThis.fetch(input, init),
    now: Date.now,
    today: () => dayKey(Date.now()),
    readToken: () =>
      readCortexToken({ path: DEFAULT_TOKEN_PATH, uid, fs: { openSync, fstatSync, readSync, closeSync } }),
    log: (level, line) => (level === "info" ? console.info(line) : console.warn(line)),
  };
}
