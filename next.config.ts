import type { NextConfig } from "next";

// Build del iPad (PWA): export estático sin el runner de C (ADR-005).
// CORTEX_PWA solo acepta vacío/no definido o "1"; cualquier otro valor falla cerrado.
const pwaFlag = process.env.CORTEX_PWA;
if (pwaFlag !== undefined && pwaFlag !== "" && pwaFlag !== "1") {
  throw new Error(`CORTEX_PWA solo acepta vacío o "1" (recibido: "${pwaFlag}").`);
}
const isPwa = pwaFlag === "1";
if (isPwa && process.env.CORTEX_LOCAL === "1") {
  throw new Error("CORTEX_PWA=1 y CORTEX_LOCAL=1 son incompatibles: la build del iPad nunca incluye el runner de C.");
}

const nextConfig: NextConfig = {
  // No dejar que `next dev` escriba reglas para agentes en CLAUDE.md/AGENTS.md (decisión D4).
  agentRules: false,
  poweredByHeader: false,
  // `route.local.ts` (runner de C) solo se reconoce como ruta en la Mac; en la PWA no existe para Next.
  pageExtensions: isPwa ? ["tsx", "ts"] : ["tsx", "ts", "local.ts"],
  // Se deriva del mismo booleano para que el cliente sepa que no hay runner sin `fetch`.
  env: { NEXT_PUBLIC_CORTEX_PWA: isPwa ? "1" : "" },
  ...(isPwa
    ? {
        output: "export" as const,
        // trailingSlash=false: los enlaces de la app son canónicos sin barra final (`/materias/calculo`)
        // y corresponden a `out/materias/calculo.html`, que un servidor estático entrega sin
        // redirección (el service worker no puede guardar respuestas redirigidas y Safari las
        // rechaza en navegaciones). Con `true` cada enlace sin barra provocaría un 308.
        // OJO para B5: para rutas anidadas también existe la carpeta `out/materias/calculo/`
        // (cargas RSC), así que el `try_files` de Caddy debe probar `{path}.html` ANTES que `{path}`
        // (p. ej. `try_files {path}.html {path} {path}/index.html`), o servirá la carpeta.
        trailingSlash: false,
      }
    : {}),
};

export default nextConfig;
