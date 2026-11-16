import { describe, expect, it } from "vitest";
import { REQUIRED_OUT_FILES, findOutProblems } from "./check-out";

const clean = (extra: Record<string, string> = {}) => {
  const map: Record<string, string> = { ...Object.fromEntries(REQUIRED_OUT_FILES.map((f) => [f, "ok"])), ...extra };
  return { files: Object.keys(map), read: (p: string) => map[p] ?? "" };
};
const run = (extra: Record<string, string>, pristine: (p: string) => boolean = () => false) => {
  const { files, read } = clean(extra);
  return findOutProblems(files, read, pristine);
};

describe("findOutProblems", () => {
  it("una build limpia no tiene problemas", () => {
    expect(run({})).toEqual([]);
  });
  it("detecta out/api", () => {
    expect(run({ "api/run-c.html": "" }).join()).toMatch(/API/);
  });
  it.each(["sandbox-exec", "CORTEX_LOCAL", "child_process", "spawnSync", "Solo desde localhost"])(
    "detecta el marcador %s",
    (marker) => {
      expect(run({ "_next/static/a.js": `x ${marker} y` }).join()).toContain(marker);
    },
  );
  it.each(["api/ingest/study", "cortex-token", "personalos.carlogarza.dev", "/api/cuartel"])(
    "detecta el marcador de Cuartel %s en .js y .html",
    (marker) => {
      expect(run({ "_next/static/a.js": `x ${marker} y` }).join()).toContain(marker);
      expect(run({ "pagina.html": `<a>${marker}</a>` }).join()).toContain(marker);
    },
  );
  it.each(["api/ingest/study", "cortex-token", "personalos.carlogarza.dev", "/api/cuartel"])(
    "la excepción de Pyodide no exime el marcador de Cuartel %s",
    (marker) => {
      expect(run({ "vendor/pyodide/pyodide.mjs": `child_process ${marker}` }, () => true).join()).toContain(marker);
      expect(run({ "vendor/pyodide/pyodide.asm.mjs": `spawnSync ${marker}` }, () => true).join()).toContain(marker);
    },
  );
  it("no marca gcc ni x-cortex-runner", () => {
    expect(run({ "_next/static/a.js": "gcc x-cortex-runner" })).toEqual([]);
  });
  it("exime el par exacto de Pyodide solo si es idéntico al original", () => {
    const extra = { "vendor/pyodide/pyodide.mjs": "require('child_process')" };
    expect(run(extra, () => true)).toEqual([]);
    expect(run(extra).join()).toContain("child_process");
  });
  it("la excepción de Pyodide no cubre otros marcadores ni otros archivos", () => {
    expect(run({ "vendor/pyodide/pyodide.mjs": "sandbox-exec" }, () => true).join()).toContain("sandbox-exec");
    expect(run({ "vendor/pyodide/pyodide.mjs": "spawnSync" }, () => true).join()).toContain("spawnSync");
    expect(run({ "vendor/pyodide/otro.mjs": "child_process" }, () => true).join()).toContain("child_process");
  });
  it.each(["A.MAP", "P.PDF", "X.MD", ".ENV.local"])("rechaza %s en mayúsculas", (file) => {
    expect(run({ [file]: "" }).length).toBeGreaterThan(0);
  });
  it.each(["a.js.map", ".DS_Store", "x/.hidden/a.js", "r.cortex-backup.json", "p.pdf", "a.yml", "a.yaml", "a.md", "a.mdx", "a.ts", "a.tsx", ".env.local"])(
    "rechaza %s",
    (file) => {
      expect(run({ [file]: "" }).length).toBeGreaterThan(0);
    },
  );
  it("falla si falta un requerido", () => {
    const { files, read } = clean();
    const problems = findOutProblems(files.filter((f) => f !== "robots.txt"), read);
    expect(problems).toEqual(["Falta el archivo requerido: out/robots.txt"]);
  });
});

describe("findOutProblems: service worker (E1)", () => {
  const KILL = "// kill switch";
  const withSw = (sw: string, extra: Record<string, string> = {}) => {
    const { files, read } = clean({ "_next/static/ID1/_buildManifest.js": "x", "sw.js": sw, ...extra });
    return findOutProblems(files, read, () => false, { swKillSource: KILL });
  };
  it("acepta el sw.js generado con el buildId de esta build", () => {
    expect(withSw('const CONFIG = {"buildId":"ID1"};')).toEqual([]);
  });
  it("acepta el kill switch idéntico byte a byte", () => {
    expect(withSw(KILL)).toEqual([]);
  });
  it("rechaza un sw.js de otra build o ajeno", () => {
    expect(withSw('const CONFIG = {"buildId":"OTRO"};').join()).toMatch(/sw\.js no es el generado/);
    expect(withSw(KILL + " ").join()).toMatch(/sw\.js no es el generado/);
  });
  it("rechaza otros .js/.mjs en la raíz, pero no los de subcarpetas", () => {
    const good = 'x {"buildId":"ID1"}';
    expect(withSw(good, { "otro.js": "" }).join()).toMatch(/out\/otro\.js/);
    expect(withSw(good, { "worker.mjs": "" }).join()).toMatch(/out\/worker\.mjs/);
    expect(withSw(good, { "vendor/python-worker.mjs": "" })).toEqual([]);
  });
});

