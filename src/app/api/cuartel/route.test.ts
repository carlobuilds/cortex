import { rmSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetWarnings } from "@/server/cuartel";
import { cuartelHome, DAY, fakeCuartel, TOKEN } from "@/server/cuartel-fakes";
import { POST } from "./route";

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
  vi.stubEnv("CORTEX_CUARTEL_DIR", dir);
  vi.stubEnv("CORTEX_LOCAL", "1");
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
  fake.seen.length = 0;
  fake.setReply(200, { ok: true, received: 1, saved: 1, skipped: [], habitMarked: [] });
});

const OK_HEADERS = { host: "localhost:3000", origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "content-type": "application/json", "x-cortex-sync": "1" };

function req(body: unknown, headers: Record<string, string> = OK_HEADERS): Request {
  return new Request("http://localhost:3000/api/cuartel", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

async function call(r: Request) {
  const res = await POST(r);
  const text = await res.text();
  expect(text).not.toContain(TOKEN);
  return { status: res.status, body: JSON.parse(text) as Record<string, unknown> };
}

describe("ruta /api/cuartel", () => {
  it("sin CORTEX_LOCAL=1 no existe (404) y no llama a Cuartel", async () => {
    vi.stubEnv("CORTEX_LOCAL", "");
    expect((await call(req({ days: [DAY] }))).status).toBe(404);
    vi.stubEnv("CORTEX_LOCAL", "0");
    expect((await call(req({ days: [DAY] }))).status).toBe(404);
    expect(fake.seen).toHaveLength(0);
  });

  it("solo desde localhost y desde la propia app", async () => {
    const bad: Record<string, string>[] = [
      { ...OK_HEADERS, host: "192.168.1.5:3000", origin: "http://192.168.1.5:3000" },
      { ...OK_HEADERS, origin: "https://evil.example" },
      { ...OK_HEADERS, "sec-fetch-site": "cross-site" },
      Object.fromEntries(Object.entries(OK_HEADERS).filter(([k]) => k !== "x-cortex-sync")),
    ];
    for (const h of bad) expect((await call(req({ days: [DAY] }, h))).status).toBe(403);
    expect((await call(req({ days: [DAY] }, { ...OK_HEADERS, "content-type": "text/plain" }))).status).toBe(415);
    expect(fake.seen).toHaveLength(0);
  });

  it("rechaza cuerpos que no son la proyección de 7 campos", async () => {
    expect((await call(req("{no json"))).status).toBe(400);
    expect((await call(req({ days: [{ ...DAY, xp: 50 }] }))).status).toBe(400);
    expect((await call(req({ days: [DAY], nota: "hola" }))).status).toBe(400);
    expect((await call(req({ days: [{ ...DAY, correct: 99 }] }))).status).toBe(400);
    expect((await call(req({ days: [DAY], relleno: "x".repeat(40_000) }))).status).toBe(413);
    expect(fake.seen).toHaveLength(0);
  });

  it("200: reenvía a Cuartel con el token y al navegador solo le regresa conteos", async () => {
    const r = await call(req({ days: [DAY] }));
    expect(r).toEqual({ status: 200, body: { sent: true, status: 200, received: 1, saved: 1, skipped: [] } });
    expect(fake.seen[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(fake.seen[0]?.body ?? "{}")).toEqual({ v: 1, source: "cortex-local", days: [DAY] });
    expect(logs.join("\n")).not.toContain(TOKEN);
  });

  it.each([400, 401, 500])("Cuartel responde %i: la ruta contesta 200 con el código, sin el token", async (status) => {
    fake.setReply(status, { ok: false, error: "x" });
    const r = await call(req({ days: [DAY] }));
    expect(r).toEqual({ status: 200, body: { sent: false, reason: "http", status } });
    expect(logs).toEqual([`[cuartel] Cuartel no aceptó el envío: HTTP ${status}`]);
  });

  it("sin ~/.cuartel configurado: no envía, avisa una vez y no truena", async () => {
    vi.stubEnv("CORTEX_CUARTEL_DIR", `${dir}-no-existe`);
    expect((await call(req({ days: [DAY] }))).body).toEqual({ sent: false, reason: "sin-config" });
    expect((await call(req({ days: [DAY] }))).body).toEqual({ sent: false, reason: "sin-config" });
    expect(logs).toHaveLength(1);
    expect(fake.seen).toHaveLength(0);
  });
});
