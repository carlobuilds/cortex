import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonBody } from "@/components/lessons/lesson-body";
import { UnitActions } from "@/components/pages/unit-actions";
import { Badge } from "@/components/ui/badge";
import { getContentIndex, getUnit, readLessonSource } from "@/content/server";
import { APP_NAME } from "@/lib/app";

// Solo existen las unidades del índice; cualquier otra ruta es 404 (y el build falla si el contenido es inválido).
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(getContentIndex().content).flatMap((s) =>
    s.units.map((u) => ({ materia: s.id, unidad: u.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/materias/[materia]/[unidad]">): Promise<Metadata> {
  const { materia, unidad } = await params;
  const unit = getUnit(materia, unidad);
  return { title: unit ? `${unit.frontmatter.titulo} · ${APP_NAME}` : APP_NAME };
}

export default async function LessonPage({ params }: PageProps<"/materias/[materia]/[unidad]">) {
  const { materia, unidad } = await params;
  const unit = getUnit(materia, unidad);
  if (!unit) notFound();
  const index = getContentIndex();
  const subject = index.subjects.find((s) => s.id === materia);
  const conceptNames = new Map(index.content[materia]?.concepts?.conceptos.map((c) => [c.id, c.nombre]));
  const fm = unit.frontmatter;
  const pending = fm.programa_ref.trim().toLowerCase() === "pendiente";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Materias", href: "/materias" }, { label: subject?.name ?? materia, href: `/materias/${materia}` }, { label: `Unidad ${String(unit.number).padStart(2, "0")}` }]} />
      <header className="mt-4 mb-6 max-w-[68ch]">
        <p className="eyebrow">
          Unidad {String(unit.number).padStart(2, "0")} · {fm.duracion_min} min
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">{fm.titulo}</h1>
        {/* En el celular, 3 conceptos y "+N" (revelación progresiva); el lector de pantalla oye todos. */}
        <ul aria-label="Conceptos de la lección" className="mt-4 flex flex-wrap gap-1.5 max-sm:[&>li:nth-child(n+4):not(:last-child)]:hidden">
          {fm.conceptos.map((c) => (
            <li key={c}>
              <Badge className="max-w-full text-left whitespace-normal">{conceptNames.get(c) ?? c}</Badge>
            </li>
          ))}
          {fm.conceptos.length > 3 ? (
            <li aria-hidden className="sm:hidden">
              <Badge variant="outline">+{fm.conceptos.length - 3}</Badge>
            </li>
          ) : null}
        </ul>
      </header>
      {/* En el celular las acciones van arriba de la lección; en escritorio, en una columna fija a la derecha. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
        <aside aria-label="Tu unidad" className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:col-start-2 lg:row-start-1 lg:self-start">
          <UnitActions unitKey={unit.key} exerciseCount={unit.exercises.length} bossName={unit.boss.nombre} bossLives={unit.boss.vidas} />
          <p className="mt-3 hidden px-1 text-caption text-muted-foreground lg:block">{pending ? "Programa oficial: pendiente" : `Programa: ${fm.programa_ref}`}</p>
        </aside>
        <article className="lesson-prose min-w-0 lg:col-start-1 lg:row-start-1">
          <LessonBody file={unit.lessonFile} source={readLessonSource(unit)} />
        </article>
      </div>
    </div>
  );
}
