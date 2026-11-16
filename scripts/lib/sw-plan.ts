/**
 * Plan de precarga y plantilla del service worker de la PWA del iPad (B2).
 * Lo puro (`buildPrecachePlan`, `renderServiceWorker`) se prueba con Vitest; `main` toca el disco.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { CACHE_PREFIX, COMPLETE_MARKER } from "./sw-core";

/**
 * ¿Precargar también los `.txt` RSC (63 MB)? No: sin red, el router de Next cae a una navegación
 * completa y el service worker sirve el HTML. Si la validación sin conexión de B5 falla, ponlo en `true`.
 */
export const INCLUDE_RSC_TXT = false;

/** Descargas simultáneas durante la instalación (son ~900 archivos). */
export const PRECACHE_CONCURRENCY = 6;

const ROOT_FILES: ReadonlySet<string> = new Set(["catalogo.json", "manifest.webmanifest", "icon.svg", "favicon.ico"]);
const PYODIDE_DIR = "vendor/pyodide/";

export interface PrecachePlan {
  /** Rutas canónicas de la caché principal (`cortex-<BUILD_ID>`). */
  main: string[];
  /** Rutas de la caché de Pyodide (`cortex-pyodide-<versión>`), que se reutiliza entre publicaciones. */
  pyodide: string[];
}

/** `index.html` -> `/`; `materias/calculo.html` -> `/materias/calculo`; `a/index.html` -> `/a`. */
export function htmlKey(file: string): string {
  const base = file.replace(/\.html$/, "");
  if (base === "index") return "/";
  return `/${base.replace(/\/index$/, "")}`;
}

/** `files`: rutas relativas a `out/` con `/` como separador. */
export function buildPrecachePlan(files: readonly string[], options: { includeRsc?: boolean } = {}): PrecachePlan {
  const includeRsc = options.includeRsc ?? INCLUDE_RSC_TXT;
  const main = new Set<string>();
  const pyodide = new Set<string>();
  for (const file of files) {
    if (file === "sw.js" || file.endsWith(".map")) continue;
    if (file.endsWith(".html")) main.add(htmlKey(file));
    else if (file.startsWith(PYODIDE_DIR)) pyodide.add(`/${file}`);
    else if (file.endsWith(".txt")) {
      if (includeRsc && file !== "robots.txt") main.add(`/${file}`);
    } else if (
      file.startsWith("_next/static/") ||
      file.startsWith("vendor/") ||
      file.startsWith("icons/") ||
      ROOT_FILES.has(file)
    ) {
      main.add(`/${file}`);
    }
  }
  return { main: [...main].sort(), pyodide: [...pyodide].sort() };
}

export interface RenderOptions {
  buildId: string;
  pyodideVersion: string;
  /** Resultado de `pyodideHash` (hex). */
  pyodideHash: string;
  plan: PrecachePlan;
  /** Código JS de `sw-core.ts` ya transpilado y sin `export`. */
  coreJs: string;
}

/** Transpila `sw-core.ts` a JS plano para incrustarlo en el worker. */
export function transpileCore(source: string): string {
  const out = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return out.replace(/^export /gm, "");
}

export function mainCacheName(buildId: string): string {
  return `${CACHE_PREFIX}${buildId}`;
}
export function pyodideCacheName(version: string, hash: string): string {
  return `${CACHE_PREFIX}pyodide-${version}-${hash.slice(0, 8)}`;
}

/**
 * Huella de la caché de Pyodide: sha256 sobre la lista ordenada de URL y el sha256 de cada archivo.
 * Si cambia la lista o el contenido, cambia el nombre de la caché y se vuelve a bajar.
 */
export function pyodideHash(entries: readonly { url: string; sha256: string }[]): string {
  const h = createHash("sha256");
  for (const e of [...entries].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0))) h.update(`${e.url}\0${e.sha256}\n`);
  return h.digest("hex");
}

/** Valores que se inyectan como JSON; solo caracteres seguros. */
function assertSafeId(label: string, value: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) throw new Error(`${label} con caracteres no permitidos: «${value}»`);
}

export function renderServiceWorker({ buildId, pyodideVersion, pyodideHash: pyHash, plan, coreJs }: RenderOptions): string {
  assertSafeId("BUILD_ID", buildId);
  assertSafeId("Versión de Pyodide", pyodideVersion);
  assertSafeId("Huella de Pyodide", pyHash);
  const config = {
    buildId,
    mainCache: mainCacheName(buildId),
    pyodideCache: pyodideCacheName(pyodideVersion, pyHash),
    mainUrls: plan.main,
    pyodideUrls: plan.pyodide,
    concurrency: PRECACHE_CONCURRENCY,
  };
  return `/* Service worker de Cortex (PWA del iPad). GENERADO por scripts/build-sw.ts; no editar a mano.
 *
 * Qué hace: precarga todo el sitio al instalarse para que la app abra sin conexión, y solo sirve
 * desde esa caché las rutas de la lista de precarga y las navegaciones. No guarda nada durante el uso.
 * Nunca toca /api, la sincronización, otros orígenes ni peticiones que no sean GET.
 *
 * Actualizaciones: SIN skipWaiting ni clients.claim. Una versión nueva se instala en segundo plano
 * y se activa cuando se cierran todas las pestañas/ventanas de la app (en el iPad, al cerrarla y
 * reabrirla). Así una migración de Dexie de la versión nueva no cierra a la fuerza la otra pestaña.
 */
"use strict";

${coreJs}
const CONFIG = ${JSON.stringify(config)};
const KEYS = new Set([...CONFIG.mainUrls, ...CONFIG.pyodideUrls]);
const MARKER_URL = self.location.origin + ${JSON.stringify(COMPLETE_MARKER)};

async function fetchValid(key) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(self.location.origin + key, { cache: "reload", credentials: "same-origin" });
      if (!isValidPrecacheResponse(res)) throw new Error("Respuesta no válida para " + key + " (" + res.status + ", " + res.type + ")");
      return res;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fillCache(name, urls) {
  const cache = await caches.open(name);
  await mapLimit(urls, CONFIG.concurrency, async (key) => {
    await cache.put(self.location.origin + key, await fetchValid(key));
  });
  // La marca va al final: sin ella la caché se considera incompleta.
  await cache.put(MARKER_URL, new Response(JSON.stringify({ buildId: CONFIG.buildId, count: urls.length }), { headers: { "content-type": "application/json" } }));
}

// La marca es válida solo si su conteo coincide con la lista de esta versión.
async function isComplete(name, expected) {
  try {
    const hit = await caches.match(MARKER_URL, { cacheName: name });
    if (!hit) return false;
    const data = await hit.json();
    return data.count === expected;
  } catch (error) {
    return false;
  }
}
const mainComplete = () => isComplete(CONFIG.mainCache, CONFIG.mainUrls.length);
const pyodideComplete = () => isComplete(CONFIG.pyodideCache, CONFIG.pyodideUrls.length);

/** Instalación atómica: o queda todo en cachés completas o la instalación falla y sigue la versión anterior. */
async function precache() {
  try {
    if (!(await pyodideComplete())) {
      await caches.delete(CONFIG.pyodideCache);
      await fillCache(CONFIG.pyodideCache, CONFIG.pyodideUrls);
    }
    // Mismo BUILD_ID = misma build: reinstalar con el mismo nombre no debe borrar la caché del worker activo.
    if (await mainComplete()) return;
    await caches.delete(CONFIG.mainCache);
    await fillCache(CONFIG.mainCache, CONFIG.mainUrls);
  } catch (error) {
    await caches.delete(CONFIG.mainCache);
    if (!(await pyodideComplete())) await caches.delete(CONFIG.pyodideCache);
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

// Reparación: iOS puede desalojar la caché de una versión activa. Se rehace una sola vez por vida del worker.
let repairStarted = false;
async function repairIfNeeded() {
  if (repairStarted) return;
  if ((await mainComplete()) && (await pyodideComplete())) return;
  if (repairStarted) return;
  repairStarted = true;
  try {
    await precache();
  } catch (error) {
    // Sin conexión o error de red: se reintentará en la próxima vida del worker.
  }
}

// Las cachés viejas se borran solo aquí: mientras la versión anterior siga activa, conserva las suyas.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CONFIG.mainCache, CONFIG.pyodideCache]);
      for (const name of await caches.keys()) {
        if (name.startsWith(${JSON.stringify(CACHE_PREFIX)}) && !keep.has(name)) await caches.delete(name);
      }
      await repairIfNeeded();
    })(),
  );
});

async function matchKey(key) {
  const url = self.location.origin + key;
  for (const cacheName of [CONFIG.mainCache, CONFIG.pyodideCache]) {
    const hit = await caches.match(url, { cacheName, ignoreVary: true });
    if (hit) return hit;
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const decision = decide(
    { method: req.method, mode: req.mode, sameOrigin: url.origin === self.location.origin, pathname: url.pathname, hasRange: req.headers.has("range") },
    KEYS,
  );
  if (decision.action === "skip") return;
  event.respondWith(matchKey(decision.key).catch(() => undefined).then((hit) => hit || fetch(req)));
});

// Canal de solo lectura: únicamente "cortex:status", y solo desde nuestro propio origen.
// Ajustes pregunta aquí si la precarga está completa; si no lo está, se dispara la reparación.
self.addEventListener("message", (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  const data = event.data;
  const port = event.ports && event.ports[0];
  if (!data || data.type !== "cortex:status" || !port) return;
  event.waitUntil(
    (async () => {
      const complete = (await mainComplete()) && (await pyodideComplete());
      port.postMessage({ version: CONFIG.buildId, complete });
      if (!complete) await repairIfNeeded();
    })(),
  );
});
`;
}

function walk(dir: string, root: string, acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = lstatSync(full);
    if (st.isDirectory()) walk(full, root, acc);
    else if (st.isFile()) acc.push(relative(root, full).split(sep).join("/"));
  }
}

export function main(): void {
  const cwd = process.cwd();
  const outDir = join(cwd, "out");
  const files: string[] = [];
  try {
    walk(outDir, outDir, files);
  } catch {
    console.error("No existe out/. Corre `pnpm build:pwa` primero.");
    process.exit(1);
  }
  const buildId = readFileSync(join(cwd, ".next/BUILD_ID"), "utf8").trim();
  if (!files.some((f) => f.startsWith(`_next/static/${buildId}/`))) {
    console.error(`El BUILD_ID (${buildId}) no coincide con out/_next/static/: build incompleta.`);
    process.exit(1);
  }
  const pyodideVersion = (JSON.parse(readFileSync(join(cwd, "node_modules/pyodide/package.json"), "utf8")) as { version: string }).version;
  const plan = buildPrecachePlan(files);
  for (const required of ["/", "/404", "/catalogo.json", "/manifest.webmanifest", "/vendor/pyodide/pyodide.asm.wasm"]) {
    if (!plan.main.includes(required) && !plan.pyodide.includes(required)) {
      console.error(`La lista de precarga no incluye ${required}.`);
      process.exit(1);
    }
  }
  const pyHash = pyodideHash(
    plan.pyodide.map((url) => ({ url, sha256: createHash("sha256").update(readFileSync(join(outDir, url.slice(1)))).digest("hex") })),
  );
  const coreJs = transpileCore(readFileSync(join(cwd, "scripts/lib/sw-core.ts"), "utf8"));
  writeFileSync(join(outDir, "sw.js"), renderServiceWorker({ buildId, pyodideVersion, pyodideHash: pyHash, plan, coreJs }));
  const sizeOf = (key: string): number => {
    const rel = key === "/" ? "index.html" : key.slice(1);
    for (const candidate of [rel, `${rel}.html`]) {
      try {
        const st = lstatSync(join(outDir, candidate));
        if (st.isFile()) return st.size;
      } catch {
        // probar el siguiente candidato
      }
    }
    throw new Error(`No se encontró el archivo de ${key}`);
  };
  const mb = (urls: string[]): string => (urls.reduce((sum, u) => sum + sizeOf(u), 0) / 1048576).toFixed(1);
  const swKb = (lstatSync(join(outDir, "sw.js")).size / 1024).toFixed(1);
  console.log(
    `sw.js escrito (${swKb} KB, build ${buildId}): ${plan.main.length} URL / ${mb(plan.main)} MB en la caché principal; ` +
      `${plan.pyodide.length} URL / ${mb(plan.pyodide)} MB en la de Pyodide ${pyodideCacheName(pyodideVersion, pyHash)}.`,
  );
}
