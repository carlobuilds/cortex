"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Dumbbell, Map as MapIcon, Skull, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LifeBar } from "@/components/hud/life-bar";
import { useLessonAtEnd } from "@/components/lessons/lesson-stepper";
import { Badge } from "@/components/ui/badge";
import { useCortexDb } from "@/db/use-profile";
import { MASTERY_LABELS, type Mastery } from "@/engine/mastery";
import { cn } from "@/lib/utils";

function ActionRow({
  href,
  icon: Icon,
  label,
  detail,
  tone,
  highlight,
  children,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: "brand" | "life";
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tactile group flex shrink-0 items-center gap-3 rounded-lg border bg-surface px-3 py-2 text-sm hover:border-border-strong lg:py-2.5",
        tone === "brand" && "border-brand/40",
        tone === "life" && "border-life/40",
        highlight && "glow border-brand bg-brand-soft",
      )}
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-md border bg-surface-2", tone === "brand" ? "text-brand" : tone === "life" ? "text-danger" : "text-ink-2")}>
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 lg:flex-1">
        <span className="block font-semibold whitespace-nowrap lg:whitespace-normal">{label}</span>
        {detail ? <span className="block text-caption text-muted-foreground max-lg:hidden">{detail}</span> : null}
        {children}
      </span>
      <ChevronRight aria-hidden className="size-4 text-ink-2 max-lg:hidden" />
    </Link>
  );
}

/**
 * Acciones de una unidad junto a su lección (ADR-020). En el celular, una fila de chips arriba de
 * la lección (a la mano sin bajar hasta el final); en escritorio, una tarjeta fija a la derecha.
 * El mini quiz se resalta cuando llegas al último paso.
 */
function Actions({ unitKey, exerciseCount, bossName, bossLives }: { unitKey: string; exerciseCount: number; bossName: string; bossLives: number }) {
  const db = useCortexDb();
  const params = useSearchParams();
  const atEnd = useLessonAtEnd();
  const fromSession = params.get("desde") === "sesion";
  const progress = useLiveQuery(async () => (db.status === "ready" ? ((await db.db.unitProgress.get(unitKey)) ?? null) : undefined), [db, unitKey]);
  const [subjectId, slug] = unitKey.split("/");
  const base = `/materias/${subjectId}/${slug}`;
  const suffix = fromSession ? "?desde=sesion" : "";
  const status = (progress?.status ?? "new") as Mastery;
  return (
    <div className="lg:raised lg:rounded-xl lg:border lg:bg-surface lg:p-4">
      <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
        <h2 className="text-sm font-semibold">Tu unidad</h2>
        <Badge variant={status === "new" ? "default" : "brand"}>{progress === undefined ? "…" : MASTERY_LABELS[status]}</Badge>
      </div>
      <nav aria-label="Práctica de la unidad" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:pb-0">
        <ActionRow
          href={`${base}/quiz${suffix}`}
          icon={Sparkles}
          tone="brand"
          highlight={atEnd && !progress?.lessonDone}
          label={progress?.lessonDone ? "Repetir el mini quiz" : "Mini quiz: completar lección"}
          detail={progress?.lessonDone ? "Lección completa" : "Completa la lección"}
        />
        <ActionRow href={`${base}/practica${suffix}`} icon={Dumbbell} label="Practicar" detail={`${exerciseCount} ejercicios en escalera`} />
        <ActionRow href={`${base}/jefe${suffix}`} icon={Skull} tone="life" label={`Jefe: «${bossName}»`}>
          <LifeBar current={bossLives} max={bossLives} className="mt-1.5 h-1 max-lg:hidden" />
        </ActionRow>
        <ActionRow href={`/materias/${subjectId}/mapa`} icon={MapIcon} label="Mapa de maestría" />
      </nav>
      {progress?.bestBoss !== null && progress?.bestBoss !== undefined ? (
        <p className="mt-3 hidden text-caption text-muted-foreground lg:block">Mejor intento contra el jefe: {Math.round(progress.bestBoss * 100)} %</p>
      ) : null}
    </div>
  );
}

export function UnitActions(props: { unitKey: string; exerciseCount: number; bossName: string; bossLives: number }) {
  return (
    <Suspense fallback={null}>
      <Actions {...props} />
    </Suspense>
  );
}
