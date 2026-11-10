import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudyFrame } from "@/components/layout/study-frame";
import { ExamPageClient } from "@/components/pages/study-pages";
import { getContentIndex } from "@/content/server";
import { APP_NAME } from "@/lib/app";

// Solo las materias con contenido tienen simulacro.
export const dynamicParams = false;

export function generateStaticParams() {
  return getContentIndex()
    .subjects.filter((s) => s.hasContent)
    .map((s) => ({ materia: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/materias/[materia]/simulacro">): Promise<Metadata> {
  const { materia } = await params;
  const subject = getContentIndex().subjects.find((s) => s.id === materia);
  return { title: subject ? `Simulacro · ${subject.name} · ${APP_NAME}` : APP_NAME };
}

export default async function Page({ params }: PageProps<"/materias/[materia]/simulacro">) {
  const { materia } = await params;
  const subject = getContentIndex().subjects.find((s) => s.id === materia);
  if (!subject?.hasContent) notFound();
  return (
    <StudyFrame
      crumbs={[
        { label: "Materias", href: "/materias" },
        { label: subject.name, href: `/materias/${materia}` },
        { label: "Simulacro" },
      ]}
      exitHref={`/materias/${materia}`}
    >
      <div className="max-w-3xl">
        <ExamPageClient subjectId={materia} />
      </div>
    </StudyFrame>
  );
}
