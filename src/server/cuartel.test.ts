import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cuartelHome, DAY, fakeCuartel, TOKEN } from "./cuartel-fakes";
import { ingestEndpoint, parseConfig, readTarget, resetWarnings, sendStudyDays } from "./cuartel";

const fake = fakeCuartel();
let base = "";
let dir = "";
let logs: string[] = [];

beforeAll(async () => {
  base = await fake.start();
});
afterAll(() => fake.stop());
beforeEach(() => {
  resetWarnings();
  dir = cuartelHome(base);
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
  fake.seen.length = 0;
  fake.setReply(200, { ok: true, received: 1, saved: 1, skipped: [], habitMarked: ["2026-11-16"] });
});

const env = () => ({ CORTEX_CUARTEL_DIR: dir }) as unknown as NodeJS.ProcessEnv;
const noToken = (x: unknown) => expect(JSON.stringify(x)).not.toContain(TOKEN);

describe("configuración de Cuartel", () => {
  it("lee CUARTEL_URL con export, comillas y comentarios", () => {
    expect(parseConfig('# x\nexport CUARTEL_URL="https://a.dev"\nB = 2 # nota\nC=\'x y\'\n')).toEqual({ CUARTEL_URL: "https://a.dev", B: "2", C: "x y" });
  });

  it("solo https (o http a la propia máquina) y sin credenciales en la URL", () => {
    expect(ingestEndpoint("https://personalos.carlogarza.dev")).toBe("https://personalos.carlogarza.dev/api/ingest/study");
    expect(ingestEndpoint("https://personalos.carlogarza.dev/")).toBe("https://personalos.carlogarza.dev/api/ingest/study");
    expect(ingestEndpoint("http://127.0.0.1:4000")).toBe("http://127.0.0.1:4000/api/ingest/study");
    expect(ingestEndpoint("http://personalos.carlogarza.dev")).toBeNull();
    expect(ingestEndpoint("https://u:p@a.dev")).toBeNull();
    expect(ingestEndpoint("https://a.dev/?x=1")).toBeNull();
    expect(ingestEndpoint("ftp://a.dev")).toBeNull();
    expect(ingestEndpoint("")).toBeNull();
  });

  it("explica qué falta sin mandar nada", async () => {
    const empty = mkdtempSync(join(tmpdir(), "cortex-cuartel-"));
    expect(await readTarget({ CORTEX_CUARTEL_DIR: empty } as unknown as NodeJS.ProcessEnv)).toEqual({ ok: false, reason: "sin-config" });
    writeFileSync(join(empty, "config"), "CUARTEL_URL=http://evil.example\n");
    expect(await readTarget({ CORTEX_CUARTEL_DIR: empty } as unknown as NodeJS.ProcessEnv)).toEqual({ ok: false, reason: "config-invalida" });
    writeFileSync(join(empty, "config"), `CUARTEL_URL=${base}\n`);
    expect(await readTarget({ CORTEX_CUARTEL_DIR: empty } as unknown as NodeJS.ProcessEnv)).toEqual({ ok: false, reason: "sin-token" });
    writeFileSync(join(empty, "cortex-token"), "no es un token\n");
    chmodSync(join(empty, "cortex-token"), 0o600);
    expect(await readTarget({ CORTEX_CUARTEL_DIR: empty } as unknown as NodeJS.ProcessEnv)).toEqual({ ok: false, reason: "token-invalido" });
    rmSync(empty, { recursive: true, force: true });
    expect(fake.seen).toHaveLength(0);
  });

  it.skipIf(process.platform === "win32")("no usa un token que otros usuarios pueden leer", async () => {
    rmSync(dir, { recursive: true, force: true });
    dir = cuartelHome(base, TOKEN, 0o644);
    const r = await sendStudyDays([DAY], env());
    expect(r).toEqual({ sent: false, reason: "token-inseguro" });
    expect(fake.seen).toHaveLength(0);
    noToken(logs);
  });
});

describe("POST a Cuartel (servidor falso)", () => {
  it("200: manda el contrato exacto con el token y devuelve los conteos, sin el token", async () => {
    fake.setReply(200, { ok: true, received: 2, saved: 1, skipped: [{ day: "2026-11-10", reason: "antes del inicio (2026-11-16)" }], habitMarked: ["2026-11-16"] });
    const r = await sendStudyDays([{ ...DAY, day: "2026-11-10" }, DAY], env());
    expect(r).toEqual({ sent: true, status: 200, received: 2, saved: 1, skipped: [{ day: "2026-11-10", reason: "antes del inicio (2026-11-16)" }] });
    noToken(r);
    const [req] = fake.seen;
    expect(req?.method).toBe("POST");
    expect(req?.url).toBe("/api/ingest/study");
    expect(req?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(req?.headers["content-type"]).toBe("application/json");
    const body = JSON.parse(req?.body ?? "{}") as { v: number; source: string; days: Record<string, unknown>[] };
    expect(Object.keys(body).sort()).toEqual(["days", "source", "v"]);
    expect(body.v).toBe(1);
    expect(body.source).toBe("cortex-local");
    expect(body.days.map((d) => Object.keys(d).sort())).toEqual([
      ["activeMs", "answered", "correct", "day", "lessons", "minimumMet", "reviews"],
      ["activeMs", "answered", "correct", "day", "lessons", "minimumMet", "reviews"],
    ]);
    expect(logs).toEqual([]);
  });

  it.each([400, 401, 403, 413, 415, 500, 503])("%i: no lanza, devuelve el código y lo registra sin el token ni el cuerpo", async (status) => {
    fake.setReply(status, { ok: false, error: "cuerpo inválido", issues: [{ path: ["days", 0, "xp"], message: "no reconocido" }] });
    const r = await sendStudyDays([DAY], env());
    expect(r).toEqual({ sent: false, reason: "http", status });
    noToken(r);
    expect(logs).toEqual([`[cuartel] Cuartel no aceptó el envío: HTTP ${status}`]);
    expect(fake.seen).toHaveLength(1); // sin reintento
  });

  it("red caída: no lanza ni filtra el token; avisa una sola vez", async () => {
    rmSync(dir, { recursive: true, force: true });
    const dead = fakeCuartel();
    const deadUrl = await dead.start();
    await dead.stop();
    dir = cuartelHome(deadUrl);
    expect(await sendStudyDays([DAY], env())).toEqual({ sent: false, reason: "red" });
    expect(await sendStudyDays([DAY], env())).toEqual({ sent: false, reason: "red" });
    expect(logs).toHaveLength(1);
    noToken(logs);
    expect(logs[0]).not.toContain(deadUrl);
  });

  it("no sigue redirecciones (el token no viaja a otro lado)", async () => {
    const r = await sendStudyDays([DAY], env(), async () => {
      throw new TypeError("redirect mode is set to error");
    });
    expect(r).toEqual({ sent: false, reason: "red" });
    const calls: RequestInit[] = [];
    await sendStudyDays([DAY], env(), async (_u, init) => {
      calls.push(init ?? {});
      return new Response("{}", { status: 200 });
    });
    expect(calls[0]?.redirect).toBe("error");
  });

  it("un 200 con cuerpo raro cuenta como enviado", async () => {
    fake.setReply(200, "no es lo esperado");
    expect(await sendStudyDays([DAY], env())).toEqual({ sent: true, status: 200, received: null, saved: null, skipped: [] });
  });
});
