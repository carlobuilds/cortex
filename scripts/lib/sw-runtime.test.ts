/**
 * Corre el `sw.js` que produce `renderServiceWorker` en un contexto `node:vm` con `caches`, `fetch`,
 * `self` y eventos simulados (sin navegador). Cubre las propiedades de instalación atómica, lista
 * permitida y reparación.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { buildPrecachePlan, pyodideCacheName, pyodideHash, renderServiceWorker, transpileCore } from "./sw-plan";

const ORIGIN = "https://cortex.test";
const MARKER = ORIGIN + "/__cortex-precache-complete";
const core = transpileCore(readFileSync("scripts/lib/sw-core.ts", "utf8"));
const FILES = ["index.html", "404.html", "materias/calculo.html", "catalogo.json", "_next/static/chunks/a.js", "vendor/pyodide/a.wasm", "vendor/pyodide/b.zip"];

class FakeResponse {
  readonly ok: boolean;
  constructor(
    private readonly body: string,
    readonly init: { status?: number; type?: string; redirected?: boolean } = {},
  ) {
    this.ok = (init.status ?? 200) >= 200 && (init.status ?? 200) < 300;
  }
  get status() {
    return this.init.status ?? 200;
  }
  get type() {
    return this.init.type ?? "basic";
  }
  get redirected() {
    return this.init.redirected ?? false;
  }
  text() {
    return Promise.resolve(this.body);
  }
  json() {
    return Promise.resolve(JSON.parse(this.body) as unknown);
  }
}

class FakeCaches {
  stores = new Map<string, Map<string, string>>();
  matchError = false;
  async open(name: string) {
    const store = this.stores.get(name) ?? new Map<string, string>();
    this.stores.set(name, store);
    return {
      put: async (url: string, res: FakeResponse) => {
        store.set(url, await res.text());
      },
    };
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async match(url: string, opts?: { cacheName?: string }) {
    if (this.matchError) throw new Error("caches.match falló");
    const stores = opts?.cacheName ? [this.stores.get(opts.cacheName)] : [...this.stores.values()];
    for (const st of stores) {
      const body = st?.get(url);
      if (body !== undefined) return new FakeResponse(body);
    }
    return undefined;
  }
}

type Listener = (event: Record<string, unknown>) => void;

function boot(options: { buildId?: string; pyHash?: string; caches?: FakeCaches; fetchImpl?: (url: string) => Promise<FakeResponse> } = {}) {
  const buildId = options.buildId ?? "build1";
  const caches = options.caches ?? new FakeCaches();
  const plan = buildPrecachePlan(FILES);
  const js = renderServiceWorker({ buildId, pyodideVersion: "314.0.7", pyodideHash: options.pyHash ?? "aaaaaaaa", plan, coreJs: core });
  const listeners = new Map<string, Listener>();
  const fetched: string[] = [];
  const fetchImpl = async (input: string | { url: string }) => {
    const url = typeof input === "string" ? input : input.url;
    fetched.push(url);
    return options.fetchImpl ? options.fetchImpl(url) : new FakeResponse(`body:${url}`);
  };
  const self = { location: { origin: ORIGIN }, addEventListener: (t: string, l: Listener) => listeners.set(t, l) };
  vm.runInNewContext(js, { self, caches, fetch: fetchImpl, Response: FakeResponse, URL, Set, Promise, JSON, Array });
  const dispatch = async (type: string, event: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    const responses: Promise<unknown>[] = [];
    listeners.get(type)?.({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p), respondWith: (p: Promise<unknown>) => responses.push(p) });
    await Promise.all(waits);
    return Promise.all(responses);
  };
  return { caches, fetched, dispatch, plan, mainName: `cortex-${buildId}`, pyName: pyodideCacheName("314.0.7", options.pyHash ?? "aaaaaaaa") };
}

const status = async (sw: ReturnType<typeof boot>, extra: Record<string, unknown> = {}) => {
  const posted: unknown[] = [];
  await sw.dispatch("message", { data: { type: "cortex:status" }, ports: [{ postMessage: (m: unknown) => posted.push(m) }], ...extra });
  return posted;
};

describe("sw.js en vm", () => {
  it("(a) reinstalar el mismo BUILD_ID conserva la caché completa y no vuelve a bajar", async () => {
    const first = boot();
    await first.dispatch("install");
    const stored = [...(first.caches.stores.get(first.mainName) ?? [])].length;
    expect(stored).toBe(first.plan.main.length + 1); // + marca
    const again = boot({ caches: first.caches });
    await again.dispatch("install");
    expect(again.fetched).toEqual([]);
    expect(first.caches.stores.get(first.mainName)?.size).toBe(stored);
  });

  it("(b) una falla a medias no deja caché principal parcial y no toca las anteriores", async () => {
    const old = boot({ buildId: "old" });
    await old.dispatch("install");
    const caches = old.caches;
    const oldSize = caches.stores.get("cortex-old")?.size;
    const failing = boot({
      buildId: "new",
      caches,
      fetchImpl: async (url) => (url.endsWith("/catalogo.json") ? new FakeResponse("x", { status: 500 }) : new FakeResponse(`body:${url}`)),
    });
    await expect(failing.dispatch("install")).rejects.toThrow();
    expect(caches.stores.has("cortex-new")).toBe(false);
    expect(caches.stores.get("cortex-old")?.size).toBe(oldSize);
  });

  it("rechaza respuestas redirigidas u opacas al precargar", async () => {
    const sw = boot({ fetchImpl: async () => new FakeResponse("x", { redirected: true }) });
    await expect(sw.dispatch("install")).rejects.toThrow();
    expect(sw.caches.stores.has(sw.mainName)).toBe(false);
  });

  it("activate borra solo las cachés cortex-* ajenas", async () => {
    const sw = boot();
    await sw.dispatch("install");
    sw.caches.stores.set("cortex-viejo", new Map());
    sw.caches.stores.set("otra-app", new Map());
    await sw.dispatch("activate");
    expect([...sw.caches.stores.keys()].sort()).toEqual([sw.mainName, sw.pyName, "otra-app"].sort());
  });

  it("(c) cambiar la lista o el contenido de Pyodide cambia el nombre de su caché", () => {
    const base = [{ url: "/vendor/pyodide/a.wasm", sha256: "1" }, { url: "/vendor/pyodide/b.zip", sha256: "2" }];
    const h = pyodideHash(base);
    expect(pyodideHash([...base].reverse())).toBe(h); // el orden no importa
    expect(pyodideHash([base[0]!, { ...base[1]!, sha256: "3" }])).not.toBe(h);
    expect(pyodideHash([...base, { url: "/vendor/pyodide/c.js", sha256: "4" }])).not.toBe(h);
    expect(pyodideCacheName("314.0.7", h)).not.toBe(pyodideCacheName("314.0.7", pyodideHash([base[0]!])));
  });

  it("(d) si caches.match rechaza, cae a la red", async () => {
    const sw = boot();
    await sw.dispatch("install");
    sw.caches.matchError = true;
    const req = { url: ORIGIN + "/catalogo.json", method: "GET", mode: "cors", headers: { has: () => false } };
    const [res] = (await sw.dispatch("fetch", { request: req })) as FakeResponse[];
    expect(await res?.text()).toBe(`body:${ORIGIN}/catalogo.json`);
  });

  it("sirve de la caché y no atiende /api ni otros orígenes", async () => {
    const sw = boot();
    await sw.dispatch("install");
    const mk = (url: string, mode = "cors") => ({ url, method: "GET", mode, headers: { has: () => false } });
    const [hit] = (await sw.dispatch("fetch", { request: mk(ORIGIN + "/materias/calculo?x=1", "navigate") })) as FakeResponse[];
    expect(await hit?.text()).toBe(`body:${ORIGIN}/materias/calculo`);
    expect(await sw.dispatch("fetch", { request: mk(ORIGIN + "/api/sync") })).toEqual([]);
    expect(await sw.dispatch("fetch", { request: mk("https://otro.test/catalogo.json") })).toEqual([]);
  });

  it("(e) ignora mensajes de otro origen y responde a los propios", async () => {
    const sw = boot();
    await sw.dispatch("install");
    expect(await status(sw, { origin: "https://malo.test" })).toEqual([]);
    expect(await status(sw, { origin: ORIGIN })).toEqual([{ version: "build1", complete: true }]);
    const posted: unknown[] = [];
    await sw.dispatch("message", { data: { type: "otra-cosa" }, ports: [{ postMessage: (m: unknown) => posted.push(m) }] });
    expect(posted).toEqual([]);
  });

  it("(f) la reparación de una caché desalojada corre una sola vez", async () => {
    const sw = boot();
    await sw.dispatch("install");
    sw.caches.stores.delete(sw.mainName); // iOS la desaloja
    sw.fetched.length = 0;
    const first = await status(sw);
    expect(first).toEqual([{ version: "build1", complete: false }]); // responde incompleta mientras repara
    const downloads = sw.fetched.length;
    expect(downloads).toBe(sw.plan.main.length);
    expect(sw.caches.stores.get(sw.mainName)?.has(MARKER)).toBe(true);
    // Si se desaloja otra vez, este worker no repite el intento (guarda global).
    sw.caches.stores.delete(sw.mainName);
    await status(sw);
    expect(sw.fetched.length).toBe(downloads);
  });

  it("un conteo de marca distinto al de la lista cuenta como incompleta", async () => {
    const sw = boot();
    await sw.dispatch("install");
    sw.caches.stores.get(sw.mainName)?.set(MARKER, JSON.stringify({ buildId: "build1", count: 1 }));
    expect((await status(sw))[0]).toEqual({ version: "build1", complete: false });
  });
});
