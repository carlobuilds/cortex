import type { Metadata } from "next";
import { GymPageClient } from "@/components/pages/study-pages";
import { APP_NAME } from "@/lib/app";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: `Gimnasio · ${APP_NAME}` };

export default function GymPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Gimnasio cognitivo" title="Gimnasio" description="Entrena habilidades útiles para la carrera: memoria de trabajo, cálculo mental y razonamiento. La dificultad se ajusta sola y solo compites contra ti." />
      <GymPageClient />
    </div>
  );
}
