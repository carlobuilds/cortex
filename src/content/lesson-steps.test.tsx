import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LESSON_COMPONENTS } from "@/components/lessons/registry";
import { LESSON_API } from "@/content/core/lesson-api";
import { CLOSING_BLOCKS, CLOSING_TITLE, slugify } from "./lesson-steps";
import { compileMdx, LessonCompileError } from "./mdx";

const LESSONS = readdirSync("content", { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .flatMap((d) => readdirSync(join("content", d.name), { withFileTypes: true }).filter((u) => u.isDirectory()).map((u) => join("content", d.name, u.name, "leccion.mdx")));

/** Envoltorios transparentes: si el plugin no toca el contenido, el HTML queda idéntico. */
const Fragment = ({ children }: { children?: ReactNode }) => <>{children}</>;

/** Registra los pasos que arma el plugin (título y ancla) sin dibujar nada extra. */
function stepsOf(source: string, file = "x.mdx") {
  const seen: { title: string; slug: string; index: string }[] = [];
  const Step = (p: { title: string; slug: string; index: string; children?: ReactNode }) => {
    seen.push({ title: p.title, slug: p.slug, index: p.index });
    return <>{p.children}</>;
  };
  const content = compileMdx({ file, source, components: LESSON_API, steps: true });
  renderToStaticMarkup(<>{content({ components: { ...LESSON_COMPONENTS, LessonSteps: Fragment, LessonStep: Step } })}</>);
  return seen;
}

/** Los ids de `useId` dependen de la profundidad del árbol (los envoltorios la cambian): se normalizan. */
const html = (source: string, steps: boolean) => {
  const content = compileMdx({ file: "x.mdx", source, components: LESSON_API, steps });
  return renderToStaticMarkup(<>{content({ components: { ...LESSON_COMPONENTS, LessonSteps: Fragment, LessonStep: Fragment } })}</>).replace(/_R_[A-Za-z0-9]+_/g, "_ID_");
};

describe("lección por pasos", () => {
  it("hay lecciones reales que revisar", () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(13);
  });

  it.each(LESSONS)("%s: con pasos el contenido es idéntico (mismos nodos, mismo orden)", (file) => {
    const source = readFileSync(file, "utf8");
    expect(html(source, true)).toBe(html(source, false));
  });

  it.each(LESSONS)("%s: un paso por ## y el cierre al final, con anclas únicas", (file) => {
    const source = readFileSync(file, "utf8");
    const h2 = source.split("\n").filter((l) => l.startsWith("## ")).length;
    const steps = stepsOf(source, file);
    const closing = CLOSING_BLOCKS.size > 0 ? 1 : 0;
    expect(steps).toHaveLength(h2 + closing);
    expect(steps.map((s) => s.index)).toEqual(steps.map((_, i) => String(i)));
    expect(new Set(steps.map((s) => s.slug)).size).toBe(steps.length);
    if (closing) expect(steps.at(-1)?.title).toBe(CLOSING_TITLE);
  });

  it("programación 01: los títulos salen de los ## (con código inline como texto)", () => {
    const titles = stepsOf(readFileSync("content/programacion/01-variables-y-tipos/leccion.mdx", "utf8")).map((s) => s.title);
    expect(titles.slice(0, 4)).toEqual(["El problema", "Variables", "Tipos y operaciones", "Entrada y salida"]);
    const withCode = stepsOf(readFileSync("content/programacion/04-funciones/leccion.mdx", "utf8")).map((s) => s.title);
    expect(withCode).toContain("return no es print");
  });

  it("con 0 o 1 sección no hay pasos (se dibuja como siempre)", () => {
    expect(stepsOf("Solo un párrafo.")).toEqual([]);
    expect(stepsOf("Intro.\n\n## Única\n\nTexto.")).toEqual([]);
  });

  it("lo que va antes del primer ## se une al paso 1", () => {
    const steps = stepsOf("Intro.\n\n## Uno\n\nA.\n\n## Dos\n\nB.");
    expect(steps.map((s) => s.title)).toEqual(["Uno", "Dos"]);
    const out = html("Intro.\n\n## Uno\n\nA.\n\n## Dos\n\nB.", true);
    expect(out.indexOf("Intro.")).toBeLessThan(out.indexOf("Uno"));
  });

  it("las anclas no se repiten aunque dos ## se llamen igual", () => {
    expect(stepsOf("## Ejemplo\n\nA.\n\n## Ejemplo\n\nB.").map((s) => s.slug)).toEqual(["ejemplo", "ejemplo-2"]);
    expect(slugify("¿Qué es `return`?")).toBe("que-es-return");
  });

  it("un autor no puede escribir <LessonStep> a mano (no está en LESSON_API)", () => {
    expect(() => compileMdx({ file: "x.mdx", source: '## A\n\n<LessonStep index="0" title="x" slug="x" />\n\n## B\n\nB.', components: LESSON_API, steps: true })).toThrow(LessonCompileError);
  });
});
