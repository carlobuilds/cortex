import { describe, expect, it } from "vitest";
import type { StudyCatalog } from "@/content/core/study-catalog";
import { buildCommands, fold, matchRange, searchCommands } from "./command-search";

const unit = (subjectId: string, number: number, slug: string, title: string, boss: string) =>
  ({ key: `${subjectId}/${slug}`, subjectId, slug, number, title, minutes: 20, concepts: [], exerciseIds: [], cardIds: [], boss: { nombre: boss } }) as unknown as StudyCatalog["subjects"][number]["units"][number];

const catalog = {
  subjects: [
    {
      id: "programacion",
      name: "Fundamentos de programación",
      semester: 1,
      phase: 2,
      notation: null,
      concepts: [
        { id: "if-else", name: "Decisiones con if / else", prerequisites: [] },
        { id: "condiciones-anidadas", name: "Condiciones anidadas y elif / else if", prerequisites: [] },
      ],
      units: [unit("programacion", 1, "01-variables-y-tipos", "Variables, tipos y entrada/salida", "El Compilador Terco"), unit("programacion", 2, "02-condicionales", "Condicionales: programas que deciden", "La Esfinge Booleana")],
    },
    {
      id: "calculo",
      name: "Cálculo",
      semester: 1,
      phase: 3,
      notation: null,
      concepts: [],
      units: [unit("calculo", 1, "01-limites", "Límites: acercarse sin llegar", "El Guardián del Infinito")],
    },
  ],
  exercises: {},
} as unknown as StudyCatalog;

const commands = buildCommands(catalog, [
  { href: "/repaso", label: "Repaso" },
  { href: "/ajustes", label: "Ajustes" },
]);

describe("paleta de comandos", () => {
  it("fold quita acentos sin mover los índices", () => {
    expect(fold("Cálculo Límites Ñu")).toBe("calculo limites nu");
    expect(fold("Cálculo")).toHaveLength("Cálculo".length);
  });

  it("sin búsqueda muestra solo Ir a y Acciones", () => {
    const groups = searchCommands(commands, "").map((g) => g.group);
    expect(groups).toEqual(["Ir a", "Acciones"]);
  });

  it("'cond' encuentra la unidad, el jefe de esa unidad y los conceptos, sin acentos de por medio", () => {
    const r = searchCommands(commands, "cond");
    const byGroup = Object.fromEntries(r.map((g) => [g.group, g.items.map((i) => i.label)]));
    expect(byGroup["Unidades"]).toEqual(["02 Condicionales: programas que deciden"]);
    expect(byGroup["Conceptos"]).toEqual(["Condiciones anidadas y elif / else if"]);
    expect(searchCommands(commands, "limites")[0]?.items[0]?.label).toBe("01 Límites: acercarse sin llegar");
    expect(searchCommands(commands, "CALCULO").some((g) => g.items.some((i) => i.hint === "Cálculo"))).toBe(true);
  });

  it("todas las palabras deben aparecer (en etiqueta o pista)", () => {
    const r = searchCommands(commands, "esfinge programacion");
    expect(r.flatMap((g) => g.items.map((i) => i.id))).toEqual(["jefe:programacion/02-condicionales"]);
    expect(searchCommands(commands, "esfinge calculo")).toEqual([]);
  });

  it("enlaces correctos y acciones de tema", () => {
    const byId = Object.fromEntries(commands.map((c) => [c.id, c]));
    expect(byId["unidad:calculo/01-limites"]).toMatchObject({ href: "/materias/calculo/01-limites" });
    expect(byId["jefe:programacion/02-condicionales"]).toMatchObject({ href: "/materias/programacion/02-condicionales/jefe" });
    expect(byId["tema:light"]).toMatchObject({ theme: "light" });
  });

  it("cada materia tiene su simulacro en el grupo de jefes", () => {
    const r = searchCommands(commands, "simulacro calculo");
    expect(r.flatMap((g) => g.items.map((i) => [g.group, i.id, "href" in i ? i.href : null]))).toEqual([["Jefes", "simulacro:calculo", "/materias/calculo/simulacro"]]);
  });

  it("limita los resultados por grupo", () => {
    const many = buildCommands(null, Array.from({ length: 12 }, (_, i) => ({ href: `/p${i}`, label: `Página ${i}` })));
    expect(searchCommands(many, "pagina", 5)[0]?.items).toHaveLength(5);
  });

  it("matchRange marca la coincidencia en el texto original", () => {
    expect(matchRange("Cálculo diferencial", "calc")).toEqual([0, 4]);
    expect(matchRange("Repaso", "xyz")).toBeNull();
    expect(matchRange("Repaso", "  ")).toBeNull();
  });
});
