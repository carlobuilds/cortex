import { Inbox } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, Kbd, LoadingState, StatTile } from "./state";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("Breadcrumbs", () => {
  it("es una lista ordenada con la página actual marcada y sin enlace", () => {
    const m = html(<Breadcrumbs items={[{ label: "Materias", href: "/materias" }, { label: "Cálculo", href: "/materias/calculo" }, { label: "Práctica" }]} />);
    expect(m).toContain('aria-label="Ruta"');
    expect(m).toMatch(/<ol/);
    expect(m).toContain('href="/materias"');
    expect(m).toContain('href="/materias/calculo"');
    expect(m).toMatch(/<span aria-current="page"[^>]*>Práctica<\/span>/);
    expect((m.match(/<li/g) ?? []).length).toBe(3);
  });

  it("la última miga nunca es enlace aunque traiga href", () => {
    const m = html(<Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Aquí", href: "/aqui" }]} />);
    expect(m).not.toContain('href="/aqui"');
    expect(m).toContain('aria-current="page"');
  });
});

describe("PageHeader", () => {
  it("tiene exactamente un h1 y la etiqueta va antes", () => {
    const m = html(<PageHeader eyebrow="Tu semana" title="Tu progreso" description="Compites contra ti." actions={<button type="button">Ver</button>} />);
    expect((m.match(/<h1/g) ?? []).length).toBe(1);
    expect(m.indexOf("Tu semana")).toBeLessThan(m.indexOf("<h1"));
    expect(m).toContain("Compites contra ti.");
    expect(m).toContain(">Ver</button>");
  });
});

describe("estados", () => {
  it("LoadingState avisa ocupado y deja texto para lectores de pantalla", () => {
    const m = html(<LoadingState label="Abriendo tu cuaderno…" rows={3} />);
    expect(m).toContain('aria-busy="true"');
    expect(m).toContain('class="sr-only">Abriendo tu cuaderno…</span>');
    expect((m.match(/data-slot="skeleton"/g) ?? []).length).toBe(3);
  });

  it("EmptyState dice qué hacer y su ícono es decorativo", () => {
    const m = html(<EmptyState icon={Inbox} title="Aún no hay errores guardados." description="Cuando falles uno, aparece aquí." action={<a href="/practica">Hacer práctica</a>} />);
    expect(m).toContain("Aún no hay errores guardados.");
    expect(m).toContain('href="/practica"');
    expect(m).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("StatTile pone el número en mono tabular y la etiqueta en sans", () => {
    const m = html(<StatTile label="Racha" value="4 días" tone="streak" hint="+1 hoy" />);
    expect(m).toMatch(/class="eyebrow">Racha</);
    expect(m).toMatch(/font-mono[^"]*tabular-nums[^"]*text-streak">4 días/);
    expect(m).toContain("+1 hoy");
  });

  it("Kbd se oculta en pantallas táctiles", () => {
    expect(html(<Kbd>H</Kbd>)).toContain("touch:hidden");
  });
});
