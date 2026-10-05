import { ArrowRight, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SemesterSection } from "@/components/subjects/semester-section";
import { Badge } from "@/components/ui/badge";
import { buildHomeModel } from "@/content/core/home-model";
import { getContentIndex } from "@/content/server";
import { APP_NAME } from "@/lib/app";

export const metadata: Metadata = { title: `Materias · ${APP_NAME}` };

/** Plan completo (ADR-020): primero lo que ya se puede estudiar; el resto del plan, compacto debajo. */
export default function SubjectsPage() {
  const index = getContentIndex();
  const home = buildHomeModel(index);
  const { plan } = index;
  const available = home.semesters.flatMap((g) => g.subjects.map((s) => ({ ...s, semester: g.n }))).filter((s) => s.hasContent);

  return (
    <div>
      <PageHeader
        eyebrow={`${plan.programa} · plan ${plan.plan} · IPN`}
        title="Materias"
        description={`${home.totals.subjects} materias en ${plan.semestres.length} semestres. Hoy hay contenido en ${home.totals.withContent}; las demás llegan por fases.`}
      />

      <section aria-labelledby="disponibles">
        <h2 id="disponibles" className="mb-3 text-lg font-semibold">
          Disponibles ahora
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {available.map((s) => (
            <li key={s.id}>
              <Link href={`/materias/${s.id}`} className="tactile glow group flex h-full items-center gap-4 rounded-xl border bg-surface p-5 hover:border-brand/50">
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block">Semestre {s.semester}</span>
                  <span className="mt-1 block text-lg font-semibold text-balance">{s.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {s.unitCount} {s.unitCount === 1 ? "unidad" : "unidades"} con lección, práctica y jefe
                  </span>
                </span>
                <ArrowRight aria-hidden className="size-5 text-ink-2 group-hover:text-brand" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mapa" className="mt-12">
        <h2 id="mapa" className="mb-2 text-lg font-semibold">
          Mapa del plan · {plan.semestres.length} semestres
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Las materias apagadas todavía no tienen contenido; la etiqueta dice en qué fase llegan.</p>
        <div className="grid gap-6">
          {home.semesters.map((g) => (
            <SemesterSection key={g.n} group={g} tracks={plan.tracks} />
          ))}
        </div>
      </section>

      <details className="group mt-10 rounded-lg border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 font-semibold">
          <span>Catálogo de optativas · {home.electives.length}</span>
          <ChevronDown aria-hidden className="size-4 text-ink-2 group-open:rotate-180 motion-safe:transition-transform" />
        </summary>
        <ul className="flex min-w-0 flex-wrap gap-2 border-t px-4 py-4">
          {home.electives.map((o) => (
            <li key={o.id}>
              <Badge variant={o.hasContent ? "brand" : "default"} className="max-w-full text-left whitespace-normal">
                {o.name}
              </Badge>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
