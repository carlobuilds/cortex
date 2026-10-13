import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Coordinates, Mafs, Plot } from "mafs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

/*
 * Criterios de ADR-021 que se pueden comprobar sin navegador. Si una versión nueva de Mafs rompe
 * alguno, esta prueba lo dice antes de que falle `content:check` o la invariante de los pasos.
 */

const require = createRequire(import.meta.url);

const scene = (props: { width: number | "auto"; ssr?: boolean }) =>
  renderToStaticMarkup(
    <Mafs {...props} height={240} pan={false} zoom={false} viewBox={{ x: [-3, 3], y: [-1, 9] }}>
      <Coordinates.Cartesian />
      <Plot.OfX y={(x) => x * x} />
    </Mafs>,
  );

describe("Mafs: criterios de ADR-021 sin navegador", () => {
  it("se importa y se dibuja en Node, sin `window`", () => {
    expect(typeof window).toBe("undefined");
    expect(scene({ width: 500 })).toContain("<svg");
  });

  it("con ancho automático el servidor solo deja el contenedor, idéntico en cada render", () => {
    const html = scene({ width: "auto" });
    expect(html).toContain('class="MafsView"');
    expect(html).not.toContain("<svg");
    expect(scene({ width: "auto" })).toBe(html);
  });

  /*
   * Por esto `plot-frame.tsx` usa siempre ancho automático y nunca `ssr`: Mafs numera los patrones
   * de la cuadrícula con un contador del módulo. El servidor cuenta todas las páginas que genera y
   * el navegador empieza en 0, así que los ids no coincidirían al hidratar (y la invariante de los
   * pasos compara HTML). Si un Mafs nuevo deja de numerarlos, esta prueba falla y la regla se puede quitar.
   */
  it("con ancho fijo o `ssr` el HTML cambia entre renders (contador de ids)", () => {
    const strip = (html: string) => html.replace(/cartesian-\d+/g, "cartesian-N");
    for (const props of [{ width: 500 }, { width: "auto", ssr: true }] as const) {
      const first = scene(props);
      const second = scene(props);
      expect(first).toContain("<svg");
      expect(second).not.toBe(first);
      expect(strip(second)).toBe(strip(first));
    }
  });

  it("sin `pan` ni `zoom` la vista no es enfocable (no roba las flechas del lector por pasos)", () => {
    expect(scene({ width: 500 })).toContain('tabindex="-1"');
  });

  it("el CSS base no pide nada a la red", () => {
    const css = readFileSync(require.resolve("mafs/core.css"), "utf8");
    expect(css).not.toMatch(/url\(|@import|https?:/);
  });
});

describe("cuadrícula de las gráficas", () => {
  it("la separación entre líneas es redonda: 1, 2 o 5 por una potencia de 10", async () => {
    const { gridStep } = await import("./plot-frame");
    expect(gridStep(6)).toBe(1);
    expect(gridStep(2)).toBe(0.5);
    expect(gridStep(10)).toBe(2);
    expect(gridStep(100)).toBe(20);
    expect(gridStep(0.8)).toBeCloseTo(0.1, 12);
    expect(gridStep(12, 6)).toBe(2);
    expect(gridStep(30, 6)).toBe(5);
  });
});
