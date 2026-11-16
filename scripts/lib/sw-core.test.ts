import { describe, expect, it } from "vitest";
import { decide, isValidPrecacheResponse, mapLimit, normalizePathname, type RequestInfo } from "./sw-core";

const KEYS = new Set(["/", "/404", "/materias/calculo", "/catalogo.json", "/_next/static/chunks/a.js", "/vendor/pyodide/pyodide.asm.wasm"]);
const req = (over: Partial<RequestInfo>): RequestInfo => ({ method: "GET", mode: "no-cors", sameOrigin: true, pathname: "/", hasRange: false, ...over });

describe("decide (lista permitida, E3)", () => {
  it("sirve las navegaciones por pathname, sin query ni barra final", () => {
    expect(decide(req({ mode: "navigate", pathname: "/" }), KEYS)).toEqual({ action: "serve", key: "/" });
    expect(decide(req({ mode: "navigate", pathname: "/materias/calculo" }), KEYS)).toEqual({ action: "serve", key: "/materias/calculo" });
    expect(decide(req({ mode: "navigate", pathname: "/materias/calculo/" }), KEYS)).toEqual({ action: "serve", key: "/materias/calculo" });
  });
  it("navegación a ruta desconocida: 404 de la caché; sin 404, la red", () => {
    expect(decide(req({ mode: "navigate", pathname: "/no-existe" }), KEYS)).toEqual({ action: "serve", key: "/404" });
    expect(decide(req({ mode: "navigate", pathname: "/no-existe" }), new Set(["/"]))).toEqual({ action: "skip" });
  });
  it("sirve los recursos de la lista y deja pasar el resto", () => {
    expect(decide(req({ pathname: "/_next/static/chunks/a.js" }), KEYS)).toEqual({ action: "serve", key: "/_next/static/chunks/a.js" });
    expect(decide(req({ pathname: "/catalogo.json" }), KEYS)).toEqual({ action: "serve", key: "/catalogo.json" });
    expect(decide(req({ pathname: "/_next/static/chunks/otro.js" }), KEYS)).toEqual({ action: "skip" });
    expect(decide(req({ pathname: "/materias/calculo.txt" }), KEYS)).toEqual({ action: "skip" }); // RSC
  });
  it("nunca toca otros orígenes, no-GET, /api ni rangos", () => {
    expect(decide(req({ sameOrigin: false, pathname: "/catalogo.json" }), KEYS)).toEqual({ action: "skip" });
    expect(decide(req({ method: "POST", pathname: "/catalogo.json" }), KEYS)).toEqual({ action: "skip" });
    expect(decide(req({ method: "POST", mode: "navigate", pathname: "/" }), KEYS)).toEqual({ action: "skip" });
    expect(decide(req({ mode: "navigate", pathname: "/api/sync" }), KEYS)).toEqual({ action: "skip" });
    expect(decide(req({ pathname: "/api/sync" }), new Set([...KEYS, "/api/sync"]))).toEqual({ action: "skip" });
    expect(decide(req({ pathname: "/vendor/pyodide/pyodide.asm.wasm", hasRange: true }), KEYS)).toEqual({ action: "skip" });
  });
});

describe("normalizePathname", () => {
  it("quita la barra final salvo en la raíz", () => {
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("/a/")).toBe("/a");
    expect(normalizePathname("/a//")).toBe("/a");
  });
});

describe("isValidPrecacheResponse", () => {
  const ok = { ok: true, status: 200, type: "basic", redirected: false };
  it("solo acepta 200 básicas y sin redirección", () => {
    expect(isValidPrecacheResponse(ok)).toBe(true);
    expect(isValidPrecacheResponse({ ...ok, ok: false, status: 404 })).toBe(false);
    expect(isValidPrecacheResponse({ ...ok, status: 206 })).toBe(false);
    expect(isValidPrecacheResponse({ ...ok, type: "opaque" })).toBe(false);
    expect(isValidPrecacheResponse({ ...ok, type: "cors" })).toBe(false);
    expect(isValidPrecacheResponse({ ...ok, redirected: true })).toBe(false);
  });
});

describe("mapLimit", () => {
  it("respeta el límite de concurrencia y procesa todo", async () => {
    let active = 0;
    let peak = 0;
    const done: number[] = [];
    await mapLimit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      done.push(n);
    });
    expect(peak).toBe(3);
    expect(done).toHaveLength(10);
  });
  it("rechaza con el primer error y deja de lanzar trabajo nuevo", async () => {
    const started: number[] = [];
    await expect(
      mapLimit([1, 2, 3, 4, 5, 6], 1, async (n) => {
        started.push(n);
        if (n === 2) throw new Error("falló");
      }),
    ).rejects.toThrow("falló");
    expect(started).toEqual([1, 2]);
  });
  it("lista vacía no falla", async () => {
    await expect(mapLimit([], 4, async () => undefined)).resolves.toBeUndefined();
  });
});
