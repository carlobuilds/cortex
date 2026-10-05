import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("inicio", () => {
  const html = renderToStaticMarkup(<HomePage />);

  it("en el servidor dibuja la carga (los datos viven en el navegador), sin números inventados", () => {
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/\d+ XP/);
  });

  it("el plan completo vive en /materias, no en el inicio", () => {
    expect(html).not.toMatch(/data-has-content=/);
  });
});
