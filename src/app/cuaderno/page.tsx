import type { Metadata } from "next";
import { NotebookClient } from "@/components/pages/insight-pages";
import { APP_NAME } from "@/lib/app";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: `Cuaderno de errores · ${APP_NAME}` };

export default function NotebookPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Se llena solo" title="Cuaderno de errores" description="Cada fallo queda aquí con tu respuesta y la explicación. Primero las «ilusiones de saber»: lo que fallaste estando seguro." />
      <NotebookClient />
    </div>
  );
}
