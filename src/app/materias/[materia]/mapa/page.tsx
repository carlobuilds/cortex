import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { SkillMapClient } from "@/components/pages/skill-map";
import { getContentIndex } from "@/content/server";
import { APP_NAME } from "@/lib/app";

export const dynamicParams = false;

export function generateStaticParams() {
  return getContentIndex()
    .subjects.filter((s) => s.hasContent)
    .map((s) => ({ materia: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/materias/[materia]/mapa">): Promise<Metadata> {
  const { materia } = await params;
  const subject = getContentIndex().subjects.find((s) => s.id === materia);
  return { title: subject ? `Mapa · ${subject.name} · ${APP_NAME}` : APP_NAME };
}

export default async function SkillMapPage({ params }: PageProps<"/materias/[materia]/mapa">) {
  const { materia } = await params;
  const subject = getContentIndex().subjects.find((s) => s.id === materia);
  if (!subject?.hasContent) notFound();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Materias", href: "/materias" }, { label: subject.name, href: `/materias/${materia}` }, { label: "Mapa" }]} />
      <PageHeader
        className="mt-4"
        title="Mapa de maestría"
        description="Cada concepto pasa de sin ver → vista → practicada → dominada → maestría. Elige un concepto para ver qué necesita y qué desbloquea."
      />
      <SkillMapClient subjectId={materia} />
    </div>
  );
}
