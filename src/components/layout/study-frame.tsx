import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/state";
import { getContentIndex } from "@/content/server";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** Migas de una actividad de unidad: Materias / materia / Unidad NN / actividad. Se arman en el servidor. */
export function unitCrumbs(subjectId: string, slug: string, activity: string): Crumb[] {
  const index = getContentIndex();
  const subject = index.subjects.find((s) => s.id === subjectId);
  const unit = index.content[subjectId]?.units.find((u) => u.slug === slug);
  return [
    { label: "Materias", href: "/materias" },
    { label: subject?.name ?? subjectId, href: `/materias/${subjectId}` },
    { label: unit ? `Unidad ${String(unit.number).padStart(2, "0")}` : slug, href: `/materias/${subjectId}/${slug}` },
    { label: activity },
  ];
}

/**
 * "Header de foco" de las rutas de estudio (decisión de Carlo, 2026-10-03): la navegación se
 * oculta y aquí quedan dónde estás y cómo salir (Esc hace lo mismo). Funciona en el servidor, así
 * que las migas aparecen antes de que carguen tus datos.
 */
export function StudyFrame({ crumbs, exitHref, exitLabel = "Salir", children }: { crumbs: readonly Crumb[]; exitHref: string; exitLabel?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Breadcrumbs items={crumbs} />
        <Link href={exitHref} className="tactile inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-label text-ink-2 hover:border-border-strong hover:text-ink">
          <LogOut aria-hidden className="size-4 [@media(pointer:fine)]:hidden" />
          <Kbd>Esc</Kbd> {exitLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}
