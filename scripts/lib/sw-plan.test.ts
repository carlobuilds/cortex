import { Script } from "node:vm";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPrecachePlan, htmlKey, mainCacheName, pyodideCacheName, renderServiceWorker, transpileCore } from "./sw-plan";

const FILES = [
  "index.html",
  "404.html",
  "_not-found.html",
  "materias/calculo.html",
  "materias/calculo/index.html",
  "index.txt",
  "__next._tree.txt",
  "materias/calculo.txt",
  "robots.txt",
  "catalogo.json",
  "manifest.webmanifest",
  "icon.svg",
  "icons/icon-192.png",
  "_next/static/chunks/a.js",
  "_next/static/chunks/a.js.map",
  "_next/static/ID/_buildManifest.js",
  "_next/other.js",
  "vendor/python-worker.mjs",
  "vendor/mathlive/fonts/a.woff2",
  "vendor/pyodide/pyodide.asm.wasm",
  "vendor/pyodide/python_stdlib.zip",
  "sw.js",
  "secreto.md",
];

describe("htmlKey", () => {
  it("usa URL canónicas sin .html", () => {
    expect(htmlKey("index.html")).toBe("/");
    expect(htmlKey("materias/calculo.html")).toBe("/materias/calculo");
    expect(htmlKey("a/index.html")).toBe("/a");
    expect(htmlKey("404.html")).toBe("/404");
  });
});

describe("buildPrecachePlan", () => {
  it("separa Pyodide y deja fuera .txt RSC, mapas, sw.js y lo no listado", () => {
    const plan = buildPrecachePlan(FILES, { includeRsc: false });
    expect(plan.pyodide).toEqual(["/vendor/pyodide/pyodide.asm.wasm", "/vendor/pyodide/python_stdlib.zip"]);
    expect(plan.main).toEqual([
      "/",
      "/404",
      "/_next/static/ID/_buildManifest.js",
      "/_next/static/chunks/a.js",
      "/_not-found",
      "/catalogo.json",
      "/icon.svg",
      "/icons/icon-192.png",
      "/manifest.webmanifest",
      "/materias/calculo",
      "/vendor/mathlive/fonts/a.woff2",
      "/vendor/python-worker.mjs",
    ]);
  });
  it("con includeRsc agrega los .txt (menos robots.txt)", () => {
    const plan = buildPrecachePlan(FILES, { includeRsc: true });
    expect(plan.main).toContain("/materias/calculo.txt");
    expect(plan.main).toContain("/__next._tree.txt");
    expect(plan.main).not.toContain("/robots.txt");
  });
});

describe("renderServiceWorker", () => {
  const core = transpileCore(readFileSync("scripts/lib/sw-core.ts", "utf8"));
  const js = renderServiceWorker({ buildId: "abc123", pyodideVersion: "314.0.7", pyodideHash: "0123456789abcdef", plan: buildPrecachePlan(FILES), coreJs: core });

  it("es JavaScript válido y sin sintaxis de módulos ni TypeScript", () => {
    expect(() => new Script(js)).not.toThrow();
    expect(core).not.toMatch(/^export /m);
    expect(core).not.toContain(": string");
  });
  it("sin skipWaiting ni clients.claim (E4)", () => {
    expect(js).not.toMatch(/\.skipWaiting\(|\.claim\(/);
  });
  it("usa cachés con versión, cache reload, marca de precarga y no cachea durante el uso", () => {
    expect(mainCacheName("abc123")).toBe("cortex-abc123");
    expect(pyodideCacheName("314.0.7", "0123456789abcdef")).toBe("cortex-pyodide-314.0.7-01234567");
    expect(js).toContain('"mainCache":"cortex-abc123"');
    expect(js).toContain('"pyodideCache":"cortex-pyodide-314.0.7-01234567"');
    expect(js).toContain('cache: "reload"');
    expect(js).toContain("__cortex-precache-complete");
    // cache.put solo en fillCache (instalación), nunca en el manejador de fetch.
    expect(js.match(/cache\.put\(/g)).toHaveLength(2);
  });
  it("rechaza ids con caracteres peligrosos", () => {
    expect(() => renderServiceWorker({ buildId: 'a";x', pyodideVersion: "1", pyodideHash: "ab", plan: { main: [], pyodide: [] }, coreJs: core })).toThrow();
  });
});

describe("sw-kill.js", () => {
  const kill = readFileSync("scripts/sw-kill.js", "utf8");
  it("borra solo cachés cortex-* y se da de baja", () => {
    expect(() => new Script(kill)).not.toThrow();
    expect(kill).toContain('startsWith("cortex-")');
    expect(kill).toContain("registration.unregister()");
    expect(kill).not.toMatch(/indexedDB|localStorage/);
  });
});
