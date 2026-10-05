import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { HomeToday } from "@/components/pages/home-today";
import { buildHomeModel } from "@/content/core/home-model";
import { getContentIndex } from "@/content/server";

export default function HomePage() {
  const index = getContentIndex();
  const home = buildHomeModel(index);
  const { plan } = index;

  return (
    <div>
      <header className="max-w-3xl">
        <p className="console-label">
          {plan.programa} · plan {plan.plan} · IPN
        </p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">
          Tu carrera, <span className="text-brand">en niveles.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-2">
          Cada materia se vuelve lecciones, práctica con repaso espaciado y un jefe que demuestra que sí lo dominas.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 font-mono">
          <div>
            <dt className="console-label">Materias</dt>
            <dd className="text-3xl font-semibold tabular-nums">{home.totals.subjects}</dd>
          </div>
          <div>
            <dt className="console-label">Con contenido</dt>
            <dd className="text-3xl font-semibold text-brand tabular-nums">{home.totals.withContent}</dd>
          </div>
          <div>
            <dt className="console-label">Lecciones</dt>
            <dd className="text-3xl font-semibold tabular-nums">{home.totals.units}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-10">
        <HomeToday />
      </div>

      <section aria-labelledby="lecciones" className="mt-14">
        <h2 id="lecciones" className="console-label mb-4">
          Unidades jugables · lección, práctica y jefe
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {home.lessons.map((l) => (
            <li key={l.unit.key}>
              <Link
                href={`/materias/${l.subjectId}/${l.unit.slug}`}
                className="tactile group flex h-full items-center gap-4 rounded-lg border-2 border-border-strong bg-surface p-4 hover:border-brand"
              >
                <span className="font-mono text-3xl font-semibold text-xp tabular-nums">{String(l.unit.number).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">{l.subjectName}</span>
                  <span className="block font-semibold text-balance">{l.unit.title}</span>
                  <span className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground">{l.unit.minutes} min</span>
                </span>
                <ArrowRight aria-hidden className="size-5 text-ink-2 group-hover:text-brand" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10">
        <Link href="/materias" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          Ver el plan completo ({home.totals.subjects} materias) <ArrowRight aria-hidden className="size-4" />
        </Link>
      </p>
    </div>
  );
}
