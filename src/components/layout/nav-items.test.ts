import { describe, expect, it } from "vitest";
import { BOTTOM_MORE, BOTTOM_NAV, hidesBottomBar, isFocusRoute, MORE_NAV, navMatch, PRIMARY_NAV } from "./nav-items";

describe("navegación", () => {
  it("navMatch distingue la página exacta de la sección", () => {
    expect(navMatch("/", "/")).toBe("page");
    expect(navMatch("/materias", "/")).toBeNull(); // "Hoy" no se enciende en todas las páginas
    expect(navMatch("/materias", "/materias")).toBe("page");
    expect(navMatch("/materias/calculo/01-limites", "/materias")).toBe("section");
    expect(navMatch("/materiasx", "/materias")).toBeNull();
    expect(navMatch("/repaso", "/progreso")).toBeNull();
  });

  it.each([
    ["/sesion", true, true],
    ["/ejercicios/prog-02-005", true, true],
    ["/materias/calculo/01-limites/quiz", true, true],
    ["/materias/calculo/01-limites/practica", true, true],
    ["/materias/programacion/02-condicionales/jefe", true, true],
    ["/materias/calculo/01-limites", false, true], // la lección trae su barra
    ["/materias/programacion/mapa", false, false], // el mapa es una página de la materia
    ["/materias/calculo/simulacro", true, true], // el simulacro es de la materia y va con header de foco
    ["/materias/calculo", false, false],
    ["/materias", false, false],
    ["/", false, false],
    ["/repaso", false, false],
    ["/progreso", false, false],
  ])("%s → foco=%s, sin barra inferior=%s", (path, focus, noBar) => {
    expect(isFocusRoute(path)).toBe(focus);
    expect(hidesBottomBar(path)).toBe(noBar);
  });

  it("todo destino aparece una sola vez en escritorio y una sola vez en el celular", () => {
    const desktop = [...PRIMARY_NAV, ...MORE_NAV].map((i) => i.href);
    const mobile = [...BOTTOM_NAV, ...BOTTOM_MORE].map((i) => i.href);
    expect(new Set(desktop).size).toBe(desktop.length);
    expect([...mobile].sort()).toEqual([...desktop].sort());
    expect(BOTTOM_NAV).toHaveLength(4); // + "Más" = 5 pestañas
  });
});
