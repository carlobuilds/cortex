/**
 * Revisa que `out/` (build estática del iPad) no contenga el runner de C ni archivos que no deben
 * publicarse (ADR-005). La lógica es pura (`findOutProblems`); `main` solo recorre el disco.
 * Se corre al final de `pnpm build:pwa` y en `deploy/publicar.sh`.
 */
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const REQUIRED_OUT_FILES: readonly string[] = [
  "index.html",
  "404.html",
  "catalogo.json",
  "robots.txt",
  "sw.js",
  "manifest.webmanifest",
  "vendor/python-worker.mjs",
  "vendor/pyodide/pyodide.asm.wasm",
];

/** No usar `gcc` ni `x-cortex-runner`: dan falsos positivos (aparecen en `content/` y en el cliente). */
export const RUNNER_MARKERS: readonly string[] = [
  "sandbox-exec",
  "CORTEX_LOCAL",
  "child_process",
  "spawnSync",
  "Solo desde localhost",
];

/**
 * Pyodide (emscripten, de terceros) trae ramas para Node que mencionan estos marcadores; es código
 * inerte en el navegador y no es el runner de C. La excepción es por PAR EXACTO archivo+marcador y
 * solo si el archivo es idéntico (sha256) al de node_modules/pyodide (`isPristine`); si no, falla cerrado.
 */
export const PYODIDE_ALLOWED_MARKERS: Readonly<Record<string, readonly string[]>> = {
  "vendor/pyodide/pyodide.mjs": ["child_process"],
  "vendor/pyodide/pyodide.asm.mjs": ["child_process", "spawnSync"],
};

const TEXT_EXTENSIONS = [".html", ".js", ".mjs", ".txt", ".json", ".css", ".webmanifest"];
const FORBIDDEN_SUFFIXES = [
  ".map",
  ".cortex-backup.json",
  ".pdf",
  ".yml",
  ".yaml",
  ".md",
  ".mdx",
  ".ts",
  ".tsx",
];

/** Id de build de Next: carpeta `_next/static/<id>/` que contiene `_buildManifest.js`. */
export function findBuildIds(files: readonly string[]): string[] {
  const ids: string[] = [];
  for (const file of files) {
    const m = /^_next\/static\/([^/]+)\/_buildManifest\.js$/.exec(file);
    if (m?.[1]) ids.push(m[1]);
  }
  return ids;
}

export interface SwCheckOptions {
  /** Contenido de `scripts/sw-kill.js` (el único `sw.js` alternativo permitido). */
  swKillSource: string;
}

/**
 * `files`: rutas relativas a `out/` con `/` como separador. Con `swCheck` también se revisa que
 * `sw.js` sea el generado de esta build (o el kill switch) y que no haya otros scripts en la raíz.
 */
export function findOutProblems(
  files: readonly string[],
  read: (path: string) => string,
  isPristine: (path: string) => boolean = () => false,
  swCheck?: SwCheckOptions,
): string[] {
  const problems: string[] = [];
  const present = new Set(files);

  for (const file of files) {
    const segments = file.split("/");
    const name = (segments[segments.length - 1] ?? file).toLowerCase();
    if (file.startsWith("api/")) problems.push(`Existe una ruta de API en la build: out/${file}`);
    if (segments.some((s) => s.startsWith("."))) problems.push(`Archivo oculto: out/${file}`);
    if (FORBIDDEN_SUFFIXES.some((ext) => name.endsWith(ext))) {
      problems.push(`Archivo que no debe publicarse: out/${file}`);
    }
    if (name.startsWith(".env")) problems.push(`Archivo de entorno: out/${file}`);
    if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      const allowed = isPristine(file) ? (PYODIDE_ALLOWED_MARKERS[file] ?? []) : [];
      const text = read(file);
      for (const marker of RUNNER_MARKERS) {
        if (allowed.includes(marker)) continue;
        if (text.includes(marker)) problems.push(`Marcador del runner «${marker}» en out/${file}`);
      }
    }
  }

  if (swCheck) {
    // Solo un script en la raíz puede reclamar el scope "/": que sea `sw.js` y no otro.
    for (const file of files) {
      if (!file.includes("/") && /\.m?js$/.test(file) && file !== "sw.js") {
        problems.push(`Script en la raíz de out/ que podría reclamar el scope "/": out/${file}`);
      }
    }
    if (present.has("sw.js")) {
      const sw = read("sw.js");
      const ids = findBuildIds(files);
      const generated = ids.length > 0 && ids.some((id) => sw.includes(`"buildId":${JSON.stringify(id)}`));
      if (!generated && sw !== swCheck.swKillSource) {
        problems.push("out/sw.js no es el generado de esta build (buildId distinto) ni el kill switch (scripts/sw-kill.js).");
      }
    }
  }

  for (const required of REQUIRED_OUT_FILES) {
    if (!present.has(required)) problems.push(`Falta el archivo requerido: out/${required}`);
  }
  return problems;
}

function walk(dir: string, root: string, acc: string[], problems: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(root, full).split(sep).join("/");
    const st = lstatSync(full);
    if (st.isSymbolicLink()) problems.push(`Enlace simbólico no permitido: out/${rel}`);
    else if (st.isDirectory()) walk(full, root, acc, problems);
    else acc.push(rel);
  }
}

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

export function main(): void {
  const root = join(process.cwd(), "out");
  const files: string[] = [];
  const problems: string[] = [];
  try {
    walk(root, root, files, problems);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    console.error(
      code === "ENOENT"
        ? "No existe out/. Corre `pnpm build:pwa` primero."
        : `No se pudo recorrer out/: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  const isPristine = (path: string): boolean => {
    try {
      return sha256(join(root, path)) === sha256(join(process.cwd(), "node_modules/pyodide", path.split("/").pop() ?? ""));
    } catch {
      return false;
    }
  };
  problems.push(...findOutProblems(files, (p) => readFileSync(join(root, p), "utf8"), isPristine, {
      swKillSource: readFileSync(join(process.cwd(), "scripts/sw-kill.js"), "utf8"),
    }));
  if (problems.length > 0) {
    console.error(`out/ no pasa la revisión (${problems.length} problema(s)):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`out/ limpia: ${files.length} archivos, sin runner de C.`);
}
