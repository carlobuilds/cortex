import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SubjectsPage from "./page";

describe("materias", () => {
  const html = renderToStaticMarkup(<SubjectsPage />);

  it("lista los 8 semestres y las 45 entradas del mapa", () => {
    expect(html.match(/aria-labelledby="semestre-\d"/g)).toHaveLength(8);
    expect(html.match(/data-has-content="(true|false)"/g)).toHaveLength(45);
  });

  it("solo cálculo y programación están marcadas con contenido y enlazadas", () => {
    expect(html.match(/data-has-content="true"/g)).toHaveLength(2);
    expect(html).toContain('href="/materias/calculo"');
    expect(html).toContain('href="/materias/programacion"');
    expect(html).not.toContain('href="/materias/algebra-lineal"');
  });

  it("muestra la fase de cada materia (Mecánica y EM en Fase 4)", () => {
    expect(html).toMatch(/Mecánica y electromagnetismo<\/h4><span[^>]*>Fase 4</);
  });

  it("lo disponible va antes que el mapa y hay un solo h1", () => {
    expect(html.indexOf("Disponibles ahora")).toBeLessThan(html.indexOf("Mapa del plan"));
    expect(html.match(/<h1/g)).toHaveLength(1);
  });
});
