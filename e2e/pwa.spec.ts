import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { expect, type BrowserContext, type Page, test } from "@playwright/test";
import type { StudyCatalog } from "../src/content/core/study-catalog";

/*
 * B5 · La PWA servida por el contenedor de Caddy (ADR-029), no por `next start`.
 * Solo corre con `pnpm test:e2e:pwa` (proyectos `pwa-chromium` y `pwa-webkit`) y con el contenedor arriba:
 *   rm -rf out && pnpm build:pwa
 *   docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml up -d   → :3300
 * Límite conocido: una violación de CSP dentro de un Worker se dispara en el Worker, no en la página;
 * aquí se captura lo que llega a la consola del contexto. El criterio decisivo del Worker es que Python corra.
 */

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const OUT = join(process.cwd(), "out");

/** Escucha violaciones de CSP en el documento y errores de consola/página; sobrevive a las navegaciones. */
async function watch(context: BrowserContext, page: Page): Promise<string[]> {
  const problems: string[] = [];
  await context.exposeFunction("__reportCsp", (msg: string) => problems.push(`CSP: ${msg}`));
  await context.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __reportCsp: (m: string) => void }).__reportCsp(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  context.on("console", (msg) => {
    if (msg.type() === "error" || /content security policy|refused to/i.test(msg.text())) problems.push(`consola: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`página: ${err.message}`));
  return problems;
}

async function pythonExerciseId(page: Page): Promise<string> {
  const res = await page.request.get("/catalogo.json");
  expect(res.ok()).toBe(true);
  const cat = (await res.json()) as StudyCatalog;
  const ex = Object.values(cat.exercises).find((e) => e.tipo === "codigo" && e.lenguaje === "python");
  expect(ex, "hay un ejercicio de Python").toBeTruthy();
  return (ex as { id: string }).id;
}

/**
 * «Sin conexión». Chromium: `setOffline`. El `setOffline` de WebKit en Playwright bloquea también las
 * navegaciones que atendería el service worker («internal error»), así que ahí se detiene el contenedor:
 * es un corte de red real hacia el origen, que es justo lo que pasa en el iPad en modo avión.
 */
async function setConnection(context: BrowserContext, projectName: string, online: boolean): Promise<void> {
  if (projectName !== "pwa-webkit") return void (await context.setOffline(!online));
  // Nunca apagar un contenedor que no sea el local: debe publicar exactamente 127.0.0.1:3300.
  // (`docker port` falla con el contenedor parado; HostConfig.PortBindings funciona en ambos estados.)
  const bindings = (JSON.parse(execFileSync("docker", ["inspect", "--format", "{{json .HostConfig.PortBindings}}", "cortex-pwa"], { encoding: "utf8" })) ?? {}) as Record<string, { HostIp: string; HostPort: string }[]>;
  const b = bindings["8080/tcp"] ?? [];
  const port = b.length === 1 ? `${b[0]?.HostIp}:${b[0]?.HostPort}` : "(ninguno o varios)";
  if (port !== "127.0.0.1:3300") throw new Error(`cortex-pwa no es el contenedor local (puerto: '${port}'); no lo detengo.`);
  execFileSync("docker", [online ? "start" : "stop", "cortex-pwa"], { stdio: "ignore" });
  if (online) {
    await expect.poll(async () => (await fetch("http://localhost:3300/robots.txt").catch(() => null))?.status, { timeout: 30_000 }).toBe(200);
  }
}

test.beforeEach(async ({ context }, testInfo) => {
  // El iPad usa el modo táctil de la app (la emulación de WebKit no siempre activa `pointer: coarse`).
  if (testInfo.project.name === "pwa-webkit") await context.addInitScript(() => localStorage.setItem("cortex-input", "touch"));
});

test("1 - encabezados del contenedor, /api/* en 404 y sin redirecciones", async ({ request }) => {
  const home = await request.get("/", { maxRedirects: 0 });
  expect(home.status()).toBe(200);
  const h = home.headers();
  expect(h["content-security-policy"]).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  expect(h["cross-origin-resource-policy"]).toBe("same-origin");
  expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  expect(h["server"]).toBeUndefined();
  expect(h["service-worker-allowed"]).toBeUndefined();
  expect(h["cache-control"]).toBe("no-cache");

  const materia = await request.get("/materias/calculo", { maxRedirects: 0 });
  expect(materia.status()).toBe(200);
  // 404, 405 y /healthz también llevan los encabezados de seguridad, no-cache y sin `server`.
  const conEncabezados = (res: { headers(): Record<string, string> }) => {
    const x = res.headers();
    expect(x["content-security-policy"]).toBe(h["content-security-policy"]);
    expect(x["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    expect(x["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
    expect(x["cache-control"]).toBe("no-cache");
    expect(x["server"]).toBeUndefined();
  };
  for (const path of ["/no-existe", "/api/run-c"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
    conEncabezados(res);
  }
  const post = await request.post("/", { data: "x" });
  expect(post.status()).toBe(405);
  expect(post.headers()["allow"]).toBe("GET, HEAD");
  conEncabezados(post);
  const health = await request.get("/healthz");
  expect(health.status()).toBe(200);
  conEncabezados(health);
  expect((await request.get("/manifest.webmanifest")).headers()["content-type"]).toBe("application/manifest+json");
  expect((await request.get("/vendor/pyodide/pyodide.asm.wasm")).headers()["content-type"]).toBe("application/wasm");
  expect((await request.get("/vendor/python-worker.mjs")).headers()["content-type"]).toMatch(/^text\/javascript/);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toBe("no-cache");
});

test("2 - sin CSP ni errores, el SW queda listo y todo funciona sin conexión (incluido Python)", async ({ page, context }, testInfo) => {
  const problems = await watch(context, page);
  const swHits: string[] = [];
  page.on("response", (res) => {
    if (res.url().endsWith("/api/run-c") && res.fromServiceWorker()) swHits.push(res.url());
  });

  const visit = async (path: string, heading?: RegExp) => {
    await page.goto(path);
    // Los ejercicios no tienen h1: basta con que se pinte el contenido principal.
    if (path.startsWith("/ejercicios/")) await expect(page.locator("article[aria-label^='Ejercicio ']")).toBeVisible();
    else await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    if (heading) await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
    // Margen para que terminen las precargas de Next: navegar con peticiones en vuelo las aborta y WebKit
    // lo reporta como «due to access control checks» (ruido de navegación, no de CSP/CORP).
    await page.waitForTimeout(1500);
  };
  const pyId = await pythonExerciseId(page);

  await visit("/", /Tu sesión de hoy/);
  await visit("/materias/calculo");
  await visit("/materias/calculo/01-limites");
  await visit(`/ejercicios/${pyId}`);
  await visit("/ajustes");

  // El SW queda activo y la copia sin conexión llega a «Listo».
  await expect(page.getByText(/Listo para usar sin conexión/)).toBeVisible({ timeout: 180_000 });
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state)).toBe("activated");

  expect(problems, "sin CSP ni errores de consola en línea").toEqual([]);

  // /api/run-c: 404 y el SW no lo intercepta.
  const apiStatus = await page.evaluate(async () => (await fetch("/api/run-c")).status);
  expect(apiStatus).toBe(404);
  expect(swHits).toEqual([]);

  // Sin conexión: recargar, lección, ejercicio, y Python corre.
  const online = problems.length;
  await setConnection(context, testInfo.project.name, false);
  try {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await visit("/materias/calculo");
    await visit("/materias/calculo/01-limites");
    await visit(`/ejercicios/${pyId}`);
    await page.getByRole("button", { name: /^Probar/ }).click();
    await expect(page.getByText(/^\d+\/\d+ pruebas$/)).toBeVisible({ timeout: 90_000 });
    // Sin red, las precargas de enlaces de Next (`?_rsc=`) fallan por diseño; lo que no puede aparecer es una violación de CSP.
    expect(problems.slice(online).filter((p) => /^CSP:|content security policy|refused to/i.test(p)), "sin violaciones de CSP sin conexión").toEqual([]);
  } finally {
    await setConnection(context, testInfo.project.name, true);
  }
});

/** Servidor estático mínimo con la misma semántica de `try_files` que el Caddyfile, para probar el kill switch. */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2", ".zip": "application/zip",
};
function fileAt(p: string): string | null {
  try {
    return statSync(p).isFile() ? p : null;
  } catch {
    return null;
  }
}
function serveOut(killSw: () => boolean): Promise<Server> {
  const killSource = readFileSync(join(process.cwd(), "scripts", "sw-kill.js"));
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const base = normalize(join(OUT, path));
    if (!base.startsWith(OUT)) return void res.writeHead(403).end();
    const hit = path === "/sw.js" && killSw() ? "KILL" : (fileAt(`${base}.html`) ?? fileAt(base) ?? fileAt(join(base, "index.html")));
    if (!hit) return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": hit === "KILL" ? MIME[".js"]! : (MIME[extname(hit)] ?? "application/octet-stream"), "cache-control": "no-cache" });
    res.end(hit === "KILL" ? killSource : readFileSync(hit));
  });
  return new Promise((resolve) => server.listen(3301, "127.0.0.1", () => resolve(server)));
}

test("3 - el kill switch borra cachés y SW sin tocar IndexedDB", async ({ page }) => {
  let kill = false;
  const server = await serveOut(() => kill);
  try {
    const base = "http://localhost:3301";
    await page.goto(`${base}/ajustes`);
    await expect(page.getByText(/Listo para usar sin conexión/)).toBeVisible({ timeout: 180_000 });
    const rows = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const open = indexedDB.open("cortex");
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const names = Array.from(db.objectStoreNames);
              let total = 0;
              let pending = names.length;
              if (pending === 0) return resolve(0);
              const tx = db.transaction(names, "readonly");
              for (const n of names) {
                const c = tx.objectStore(n).count();
                c.onsuccess = () => {
                  total += c.result;
                  if (--pending === 0) {
                    db.close();
                    resolve(total);
                  }
                };
              }
            };
          }),
      );
    const before = await rows();
    expect(before).toBeGreaterThan(0);
    expect(await page.evaluate(() => caches.keys().then((k) => k.length))).toBeGreaterThan(0);

    kill = true;
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect
      .poll(() => page.evaluate(async () => ({ caches: await caches.keys(), regs: (await navigator.serviceWorker.getRegistrations()).length })), { timeout: 60_000 })
      .toEqual({ caches: [], regs: 0 });
    await page.waitForTimeout(3000); // ¿la página recargada lo vuelve a registrar? Debe seguir en cero.
    expect(await page.evaluate(async () => ({ caches: await caches.keys(), regs: (await navigator.serviceWorker.getRegistrations()).length }))).toEqual({ caches: [], regs: 0 });
    expect(await rows()).toBe(before);
  } finally {
    server.close();
  }
});
