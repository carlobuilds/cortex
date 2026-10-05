import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/app";

export const metadata: Metadata = { title: `Página no encontrada · ${APP_NAME}` };

/** 404 en español: rutas mal escritas o materias que todavía no tienen contenido. */
export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Error 404"
        title="No encontré esa página"
        description="Puede que la dirección esté mal escrita o que esa materia todavía no tenga lecciones. Las que ya tienen contenido están en Materias."
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/materias">Ver materias</Link>
        </Button>
      </div>
    </div>
  );
}
