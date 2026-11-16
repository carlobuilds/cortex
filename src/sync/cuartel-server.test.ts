import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import * as nodeFs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CuartelDeps,
  DEFAULT_TOKEN_PATH,
  checkCuartelRequest,
  createCuartelHandler,
  readCortexToken,
  readLimitedText,
} from "./cuartel-server";
import { cuartelBody } from "./study-summary";

afterEach(() => vi.restoreAllMocks());

function hasMkfifo(): boolean {
  try {
    const p = join(mkdtempSync(join(tmpdir(), "cuartel-mk-")), "f");
    execFileSync("mkfifo", [p]);
    return true;
  } catch {
    return false;
  }
}

const TOKEN = "cu_" + "A".repeat(43);
const day = { day: "2026-10-10", activeMs: 1000, answered: 5, correct: 4, reviews: 2, lessons: 1, minimumMet: true };
const BODY = JSON.stringify({ v: 1, days: [day] });
const GOOD_HEADERS: Record<string, string> = {
  host: "localhost:3000",
  origin: "http://localhost:3000",
  "sec-fetch-site": "same-origin",
  "x-cortex-cuartel": "1",
  "content-type": "application/json",
};
const ENV: NodeJS.ProcessEnv = { NODE_ENV: "test", CORTEX_LOCAL: "1" };

function mkReq(over: { method?: string; headers?: Record<string, string | null>; body?: BodyInit | null } = {}): Request {
  const headers = new Headers();
  for (const [k, v] of Object.entries({ ...GOOD_HEADERS, ...over.headers })) if (v !== null) headers.set(k, v);
  const method = over.method ?? "POST";
  return new Request("http://localhost:3000/api/cuartel", {
    method,
    headers,
    ...(method === "GET" ? {} : { body: over.body === undefined ? BODY : over.body }),
  });
}

interface H {
  deps: CuartelDeps;
  fetch: ReturnType<typeof vi.fn>;
  logs: string[];
  clock: { t: number };
  handler: (r: Request) => Promise<Response>;
}
function setup(over: Partial<CuartelDeps> = {}, fetchImpl?: () => Promise<Response>): H {
  const fetchMock = vi.fn(fetchImpl ?? (async () => new Response("{}", { status: 200 })));
  const logs: string[] = [];
  const clock = { t: 1_000_000 };
  const deps: CuartelDeps = {
    env: ENV,
    fetch: fetchMock as unknown as typeof fetch,
    now: () => clock.t,
    today: () => "2026-10-10",
    readToken: () => ({ ok: true, token: TOKEN }),
    log: (l, line) => void logs.push(`${l}:${line}`),
    ...over,
  };
  return { deps, fetch: fetchMock, logs, clock, handler: createCuartelHandler(deps) };
}

describe("candados", () => {
  it("sin CORTEX_LOCAL", async () => {
    const h = setup({ env: { NODE_ENV: "test" } });
    expect((await h.handler(mkReq())).status).toBe(403);
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["host 127", { host: "127.0.0.1:3000" }],
    ["host 3100", { host: "localhost:3100" }],
    ["host 3200", { host: "localhost:3200" }],
    ["host ajeno", { host: "evil.com" }],
    ["sin host", { host: null }],
    ["sin origin", { origin: null }],
    ["origin 3100", { origin: "http://localhost:3100" }],
    ["cross-site", { "sec-fetch-site": "cross-site" }],
    ["sin encabezado", { "x-cortex-cuartel": null }],
  ])("403 %s", (_n, headers) => {
    const r = checkCuartelRequest("POST", new Headers(Object.entries({ ...GOOD_HEADERS, ...headers }).filter(([, v]) => v !== null) as [string, string][]), ENV);
    expect(r).toMatchObject({ ok: false, status: 403, reason: "prohibido" });
  });
  it("415 tipo y 405 GET", async () => {
    const h = setup();
    for (const ct of ["text/plain", "application/json; charset=latin1"]) {
      expect((await h.handler(mkReq({ headers: { "content-type": ct } }))).status).toBe(415);
    }
    expect((await h.handler(mkReq({ method: "GET" }))).status).toBe(405);
    expect(checkCuartelRequest("POST", new Headers({ ...GOOD_HEADERS, "content-type": "Application/JSON; charset=UTF-8" }), ENV).ok).toBe(true);
    expect(h.fetch).not.toHaveBeenCalled();
  });
});

describe("cuerpo", () => {
  it("más de 4 KB, con y sin content-length, da 413", async () => {
    const h = setup();
    const big = "x".repeat(5000);
    expect((await h.handler(mkReq({ body: big }))).status).toBe(413);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const noLen = new Request("http://localhost:3000/api/cuartel", {
      method: "POST",
      headers: GOOD_HEADERS,
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(noLen.headers.get("content-length")).toBeNull();
    expect((await h.handler(noLen)).status).toBe(413);
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("UTF-8 inválido da 400", async () => {
    const r = await readLimitedText(mkReq({ body: new Uint8Array([0xff, 0xfe, 0xfd]) }), 100);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });
  const bad: [string, string][] = [
    ["json inválido", "{no"],
    ["raíz extra", JSON.stringify({ v: 1, days: [day], x: 1 })],
    ["día extra", JSON.stringify({ v: 1, days: [{ ...day, xp: 1 }] })],
    ["source", JSON.stringify({ v: 1, source: "cortex-local", days: [day] })],
    ["0 días", JSON.stringify({ v: 1, days: [] })],
    ["8 días", JSON.stringify({ v: 1, days: Array.from({ length: 8 }, (_, i) => ({ ...day, day: `2026-10-0${i + 2}` })) })],
    ["repetidos", JSON.stringify({ v: 1, days: [day, day] })],
    ["correct>answered", JSON.stringify({ v: 1, days: [{ ...day, correct: 9 }] })],
    ["decimales", JSON.stringify({ v: 1, days: [{ ...day, lessons: 1.5 }] })],
    ["2026-02-30", JSON.stringify({ v: 1, days: [{ ...day, day: "2026-02-30" }] })],
    ["fuera de ventana", JSON.stringify({ v: 1, days: [{ ...day, day: "2026-10-01" }] })],
  ];
  it.each(bad)("400 %s", async (_n, body) => {
    const h = setup();
    const res = await h.handler(mkReq({ body }));
    expect(res.status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });
});

describe("rechazos tempranos", () => {
  const line = (status: number, reason: string) => [`warn:cuartel: petición rechazada (HTTP ${status}, ${reason})`];
  it("cada rechazo deja exactamente una línea fija", async () => {
    const cases: [string, () => Promise<H>, number, string][] = [
      ["403", async () => { const h = setup({ env: { NODE_ENV: "test" } }); await h.handler(mkReq()); return h; }, 403, "prohibido"],
      ["405", async () => { const h = setup(); await h.handler(mkReq({ method: "GET" })); return h; }, 405, "prohibido"],
      ["415", async () => { const h = setup(); await h.handler(mkReq({ headers: { "content-type": "text/plain" } })); return h; }, 415, "tipo"],
      ["413", async () => { const h = setup(); await h.handler(mkReq({ body: "x".repeat(5000) })); return h; }, 413, "cuerpo grande"],
      ["400 json", async () => { const h = setup(); await h.handler(mkReq({ body: "{no" })); return h; }, 400, "cuerpo inválido"],
      ["400 forma", async () => { const h = setup(); await h.handler(mkReq({ body: "{}" })); return h; }, 400, "cuerpo inválido"],
      ["429 muy pronto", async () => { const h = setup(); await h.handler(mkReq()); h.logs.length = 0; await h.handler(mkReq()); return h; }, 429, "muy pronto"],
    ];
    for (const [name, run, status, reason] of cases) {
      const h = await run();
      expect(h.logs, name).toEqual(line(status, reason));
    }
  });
  it("429 en curso", async () => {
    let release: (r: Response) => void = () => {};
    const h = setup({}, () => new Promise<Response>((r) => (release = r)));
    const a = h.handler(mkReq());
    await new Promise((r) => setTimeout(r, 0));
    await h.handler(mkReq());
    expect(h.logs).toEqual(line(429, "en curso"));
    release(new Response("", { status: 200 }));
    await a;
  });
  it("un log que lanza no rompe la respuesta", async () => {
    const h = setup({ log: () => { throw new Error("log"); } });
    expect((await h.handler(mkReq({ method: "GET" }))).status).toBe(405);
  });
});

describe("token", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuartel-test-"));
  const uid = process.getuid?.() ?? 0;
  const fs = { openSync: nodeFs.openSync, fstatSync: nodeFs.fstatSync, readSync: nodeFs.readSync, closeSync: nodeFs.closeSync };
  const put = (name: string, content: string, mode = 0o600) => {
    const p = join(dir, name);
    writeFileSync(p, content);
    chmodSync(p, mode);
    return p;
  };
  const read = (path: string, o: Partial<{ uid: number; fs: typeof fs }> = {}) => readCortexToken({ path, uid, fs, ...o });

  it("ausente: sin token, aunque haya un vecino válido, y no se envía", async () => {
    put("token", TOKEN + "\n");
    const path = join(dir, "cortex-token");
    expect(read(path)).toEqual({ ok: false, reason: "sin token" });
    const h = setup({ readToken: () => read(path) });
    const res = await h.handler(mkReq());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ sent: false, status: null, reason: "sin token" });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("symlink, 0644, otro dueño, CRLF, formato, tamaño", () => {
    const real = put("real", TOKEN + "\n");
    const link = join(dir, "link");
    symlinkSync(real, link);
    expect(read(link)).toEqual({ ok: false, reason: "token inválido" });
    expect(read(put("open", TOKEN + "\n", 0o644))).toMatchObject({ ok: false, reason: "token inválido" });
    expect(read(real, { fs: { ...fs, fstatSync: (fd: number) => ({ ...nodeFs.fstatSync(fd), uid: uid + 1 }) as nodeFs.Stats } as typeof fs })).toMatchObject({ ok: false });
    expect(read(put("crlf", TOKEN + "\r\n"))).toMatchObject({ ok: false });
    expect(read(put("short", "cu_abc\n"))).toMatchObject({ ok: false });
    expect(read(put("big", TOKEN + "\n" + "x".repeat(300)))).toMatchObject({ ok: false });
    expect(read(dir)).toMatchObject({ ok: false });
  });
  it("válido 0600, con o sin salto de línea", () => {
    expect(read(put("ok", TOKEN + "\n"))).toEqual({ ok: true, token: TOKEN });
    expect(read(put("ok2", TOKEN))).toEqual({ ok: true, token: TOKEN });
  });
  it("una segunda línea invalida el archivo", () => {
    expect(read(put("dos", TOKEN + "\nbasura\n"))).toEqual({ ok: false, reason: "token inválido" });
    expect(read(put("dos2", TOKEN + "\n\n"))).toEqual({ ok: false, reason: "token inválido" });
  });
  it("ruta por defecto", () => {
    expect(DEFAULT_TOKEN_PATH.endsWith("/.cuartel/cortex-token")).toBe(true);
  });
});

describe.skipIf(!hasMkfifo())("FIFO", () => {
  it("un FIFO es token inválido y no cuelga", () => {
    const p = join(mkdtempSync(join(tmpdir(), "cuartel-fifo-")), "cortex-token");
    execFileSync("mkfifo", [p]);
    const fs = { openSync: nodeFs.openSync, fstatSync: nodeFs.fstatSync, readSync: nodeFs.readSync, closeSync: nodeFs.closeSync };
    expect(readCortexToken({ path: p, uid: process.getuid?.() ?? 0, fs })).toEqual({ ok: false, reason: "token inválido" });
  });
});

describe("ruta", () => {
  it("solo exporta POST", async () => {
    const mod = await import("@/app/api/cuartel/route.local");
    expect(Object.keys(mod).sort()).toEqual(["POST", "dynamic", "runtime"]);
  });
});

describe("redirección", () => {
  it("redirect: error rechaza con TypeError y se responde red", async () => {
    const srv = createServer((_q, r) => {
      r.writeHead(302, { location: "http://127.0.0.1:1/otro" });
      r.end();
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    try {
      const port = (srv.address() as { port: number }).port;
      const h = setup({ fetch: ((_u: unknown, init?: RequestInit) => globalThis.fetch(`http://127.0.0.1:${port}/x`, init)) as typeof fetch });
      const res = await h.handler(mkReq());
      expect(await res.json()).toEqual({ sent: false, status: null, reason: "red" });
      expect(h.logs).toEqual(["warn:cuartel: estudio sin envío (red)"]);
    } finally {
      srv.close();
    }
  });
});

describe("envío", () => {
  it("una llamada con la URL, el token y las opciones exactas", async () => {
    const h = setup();
    const res = await h.handler(mkReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true, status: 200 });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect([...res.headers.keys()].some((k) => k.startsWith("access-control"))).toBe(false);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://personalos.carlogarza.dev/api/ingest/study");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ authorization: `Bearer ${TOKEN}`, "content-type": "application/json" });
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBe(cuartelBody([day]));
    expect(init.body).toBe(JSON.stringify({ v: 1, source: "cortex-local", days: [day] }));
    expect(h.logs).toEqual(["info:cuartel: estudio HTTP 200"]);
  });
  it.each([401, 403, 413, 415, 500])("respuesta %i", async (status) => {
    const h = setup({}, async () => new Response("x", { status }));
    const res = await h.handler(mkReq());
    expect(await res.json()).toEqual({ sent: false, status });
  });
  it("timeout y red", async () => {
    const t = setup({}, async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    });
    expect(await (await t.handler(mkReq())).json()).toEqual({ sent: false, status: null, reason: "tiempo agotado" });
    const n = setup({}, async () => {
      throw new TypeError("fetch failed");
    });
    const res = await n.handler(mkReq());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ sent: false, status: null, reason: "red" });
  });
  it("error interno no se filtra", async () => {
    const h = setup({ readToken: () => { throw new Error("boom"); } });
    const res = await h.handler(mkReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ sent: false, status: null, reason: "error interno" });
  });
});

describe("fuga con marcadores", () => {
  it("ni logs, ni consola, ni respuestas contienen token, error o respuesta de Cuartel", async () => {
    const secret = "cu_" + "MARCADOR_TOKEN_".padEnd(43, "Z");
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const outputs: string[] = [];
    for (const impl of [
      async () => {
        throw new TypeError(`fallo con ${secret} MARCADOR_ERROR`);
      },
      async () => new Response("MARCADOR_RESPUESTA " + secret, { status: 500 }),
      async () => new Response("MARCADOR_RESPUESTA", { status: 200 }),
    ]) {
      const h = setup({ readToken: () => ({ ok: true, token: secret }) }, impl);
      const res = await h.handler(mkReq());
      outputs.push(await res.text(), ...h.logs, JSON.stringify([...res.headers]));
    }
    for (const s of spies) outputs.push(JSON.stringify(s.mock.calls));
    const all = outputs.join("\n");
    for (const m of [secret, "MARCADOR_TOKEN", "MARCADOR_ERROR", "MARCADOR_RESPUESTA", '"days"', "activeMs"]) expect(all).not.toContain(m);
  });
});

describe("concurrencia", () => {
  it("dos simultáneos: un fetch y un 429 en curso", async () => {
    let release: (r: Response) => void = () => {};
    const h = setup({}, () => new Promise<Response>((r) => (release = r)));
    const a = h.handler(mkReq());
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    const b = await h.handler(mkReq());
    expect(b.status).toBe(429);
    expect(await b.json()).toMatchObject({ reason: "en curso" });
    release(new Response("", { status: 200 }));
    expect((await a).status).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it("muy pronto a los 5 s; envía a los 16 s", async () => {
    const h = setup();
    expect((await h.handler(mkReq())).status).toBe(200);
    h.clock.t += 5000;
    const soon = await h.handler(mkReq());
    expect(soon.status).toBe(429);
    expect(await soon.json()).toMatchObject({ reason: "muy pronto" });
    h.clock.t += 11_000;
    expect((await h.handler(mkReq())).status).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });
  it("un fallo de token no cuenta como envío", async () => {
    let ok = false;
    const h = setup({ readToken: () => (ok ? { ok: true, token: TOKEN } : { ok: false, reason: "sin token" }) });
    expect((await h.handler(mkReq())).status).toBe(503);
    ok = true;
    expect((await h.handler(mkReq())).status).toBe(200);
  });
});
