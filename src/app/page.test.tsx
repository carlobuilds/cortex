import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("inicio", () => {
  const html = renderToStaticMarkup(<HomePage />);

  it("ofrece las 2 lecciones disponibles", () => {
    expect(html).toContain('href="/materias/calculo/01-limites"');
    expect(html).toContain('href="/materias/programacion/01-variables-y-tipos"');
  });

  it("el plan completo vive en /materias, no en el inicio", () => {
    expect(html).toContain('href="/materias"');
    expect(html).not.toMatch(/data-has-content=/);
  });
});
