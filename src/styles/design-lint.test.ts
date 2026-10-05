import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Guardarraíles del sistema visual (ADR-020): lo que el rediseño quitó no debe regresar. Revisa
 * todo el TSX de src/ (las pruebas incluidas quedan fuera).
 */

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return tsxFiles(p);
    return d.name.endsWith(".tsx") && !d.name.endsWith(".test.tsx") ? [p] : [];
  });
}

const FILES = tsxFiles("src").map((path) => ({ path, text: readFileSync(path, "utf8") }));

/** Líneas que cumplen `re`, como "archivo:línea  texto" (para que el error diga dónde). */
function offenders(re: RegExp): string[] {
  return FILES.flatMap(({ path, text }) =>
    text.split("\n").flatMap((line, i) => (re.test(line) ? [`${path}:${i + 1}  ${line.trim().slice(0, 100)}`] : [])),
  );
}

describe("guardarraíles del sistema visual", () => {
  it("hay archivos que revisar", () => {
    expect(FILES.length).toBeGreaterThan(50);
  });

  it.each([
    ["tamaños de texto bajo 12 px escritos a mano (usa text-caption o text-label)", /text-\[0\./],
    ["rounded-2xl (radios: sm 6 · md 8 · lg 12 · xl 16)", /\brounded-2xl\b/],
    ["la etiqueta vieja console-label (usa eyebrow)", /console-label/],
    ["recargar la página para navegar (usa el router)", /window\.location\.assign/],
    ["colores sueltos en TSX (los colores viven en globals.css)", /#[0-9a-fA-F]{6}\b|oklch\(/],
    ["la sombra desplazada vieja (usa raised o glow)", /shadow-hard|\barcade\b/],
  ])("sin %s", (_what, re) => {
    expect(offenders(re)).toEqual([]);
  });

  it("ningún elemento HTML usa title= (no llega al teclado ni al tacto: usa Tooltip)", () => {
    const found = FILES.flatMap(({ path, text }) =>
      [...text.matchAll(/<([a-z][\w-]*)\b([^<>]*?)>/gs)].filter((m) => /\stitle=/.test(m[2] ?? "")).map((m) => `${path}: <${m[1]} … title=…>`),
    );
    expect(found).toEqual([]);
  });

  it("el CSS ya no define console-label ni arcade", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toMatch(/console-label|\.arcade\b/);
  });
});
