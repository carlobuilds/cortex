import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { SubjectSummary } from "@/content/core/model";
import { cn } from "@/lib/utils";

function phaseLabel(s: SubjectSummary): string {
  return s.cortexPhase === null ? "Backlog" : `Fase ${s.cortexPhase}`;
}

/** Tarjeta compacta del mapa: enlazada si tiene contenido; apagada (con su fase) si no. */
export function SubjectCard({ subject, trackName }: { subject: SubjectSummary; trackName: string | null }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4 className={cn("text-sm leading-snug font-semibold text-balance", !subject.hasContent && "text-ink-2")}>
          {subject.name}
        </h4>
        <Badge variant={subject.hasContent ? "brand" : "outline"} className="mt-0.5">
          {subject.electiveSlot ? "Optativa" : phaseLabel(subject)}
        </Badge>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
        {trackName ? <span>{trackName}</span> : null}
        {subject.credits !== null ? <span aria-hidden>·</span> : null}
        {subject.credits !== null ? <span>{subject.credits} créditos</span> : null}
      </p>
      <p className={cn("mt-2 text-label", subject.hasContent ? "font-medium text-brand" : "text-muted-foreground")}>
        {subject.hasContent
          ? `Con contenido · ${subject.unitCount} ${subject.unitCount === 1 ? "unidad" : "unidades"}`
          : "Sin contenido aún"}
      </p>
    </>
  );

  if (!subject.hasContent) {
    return (
      <li data-has-content="false" className="rounded-lg border border-dashed bg-surface/50 p-3">
        {body}
      </li>
    );
  }
  return (
    <li data-has-content="true">
      <Link
        href={`/materias/${subject.id}`}
        className="tactile raised block h-full rounded-lg border border-brand/40 bg-surface p-3 hover:border-brand"
      >
        {body}
      </Link>
    </li>
  );
}
