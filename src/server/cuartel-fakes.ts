import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StudyDay } from "@/engine/cuartel";

/** Dobles de prueba del envío a Cuartel (solo para Vitest). */

export const TOKEN = "cu_PRUEBA_secreto_que_no_debe_salir_123";

export const DAY: StudyDay = { day: "2026-11-16", activeMs: 2_130_000, answered: 40, correct: 31, reviews: 12, lessons: 1, minimumMet: true };

/** Servidor HTTP falso de Cuartel: responde lo que diga `reply` y guarda lo que recibió. */
export function fakeCuartel() {
  const seen: { method?: string; url?: string; headers: IncomingMessage["headers"]; body: string }[] = [];
  let reply: { status: number; body: unknown } = { status: 200, body: { ok: true, received: 1, saved: 1, skipped: [], habitMarked: ["2026-11-16"] } };
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (c: Buffer) => (body += c.toString("utf8")));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body });
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
  });
  return {
    seen,
    setReply: (status: number, body: unknown) => (reply = { status, body }),
    start: () => new Promise<string>((ok) => server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${(server.address() as AddressInfo).port}`))),
    stop: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}

/** Carpeta `~/.cuartel` de mentiras. */
export function cuartelHome(url: string, token: string | null = TOKEN, mode = 0o600): string {
  const dir = mkdtempSync(join(tmpdir(), "cortex-cuartel-"));
  writeFileSync(join(dir, "config"), `# Cuartel\nexport CUARTEL_URL="${url}"\nOTRA=1\n`);
  if (token !== null) {
    writeFileSync(join(dir, "cortex-token"), `${token}\n`);
    chmodSync(join(dir, "cortex-token"), mode);
  }
  return dir;
}

