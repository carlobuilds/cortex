"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Brain, Check, Flame, Gift, Layers, Lock, Play, Skull, Sparkles, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { GAME_INFO } from "@/components/gym/games";
import { LifeBar } from "@/components/hud/life-bar";
import { missionTitle } from "@/components/study/daily-session";
import { StudyGate, type StudyContext } from "@/components/study/study-gate";
import { Button } from "@/components/ui/button";
import { LoadingState, ProgressRing, StatTile } from "@/components/ui/state";
import { findUnit } from "@/content/core/study-catalog";
import { ensureToday } from "@/db/progress";
import { CONFIG } from "@/engine/config";
import { missionLabel, type MissionKind } from "@/engine/missions";
import { chooseMission, gymGameFor } from "@/engine/session";
import { visibleStreak } from "@/engine/streak";
import { countForRing, type RouteStepId, type RouteStepState, sessionRoute } from "@/lib/session-route";
import { missionContext, unitHref } from "@/lib/study";
import { readToday, unitStates } from "@/lib/today";
import { useToday } from "@/lib/use-clock";
import { cn } from "@/lib/utils";

const STEP_INFO: Record<RouteStepId, { label: string; icon: LucideIcon }> = {
  warmup: { label: "Calentamiento", icon: Layers },
  mission: { label: "Misión", icon: Target },
  gym: { label: "Reto cognitivo", icon: Brain },
  close: { label: "Cierre", icon: Gift },
};

/** Anillo del día: pasos hechos de la sesión. */
function SessionRing({ done, total }: { done: number; total: number }) {
  return (
    <ProgressRing value={total ? done / total : 0} label={`${done} de ${total} pasos de hoy hechos`} className="sm:size-36">
      <p className="font-mono text-3xl font-semibold tabular-nums">
        {done}
        <span className="text-muted-foreground">/{total}</span>
      </p>
      <p className="text-caption text-muted-foreground">pasos</p>
    </ProgressRing>
  );
}

function RouteStepRow({ id, state, detail }: { id: RouteStepId; state: RouteStepState; detail: string }) {
  const { label, icon: Icon } = STEP_INFO[id];
  const finished = state === "done" || state === "skipped";
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", state === "current" ? "border-brand/50 bg-brand-soft" : "bg-surface", state === "skipped" && "opacity-60")}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border",
          state === "done" ? "border-transparent bg-success/15 text-success" : state === "current" ? "border-brand/40 text-brand" : "text-ink-2",
        )}
      >
        {state === "done" ? <Check aria-label="hecho" className="size-4" /> : state === "upcoming" && id === "close" ? <Lock aria-hidden className="size-4" /> : <Icon aria-hidden className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", finished && "text-ink-2")}>{label}</span>
        <span className="block truncate text-caption text-muted-foreground">{state === "skipped" ? "Sin repasos vencidos hoy" : detail}</span>
      </span>
    </li>
  );
}

/**
 * Inicio (ADR-020): "Hoy" manda. Un hero con la ruta de la sesión y una sola acción principal;
 * debajo, 3 cifras, misiones, el próximo jefe y tus materias. El plan completo vive en /materias.
 * Todo texto sale de datos reales (readToday, jefe.yaml, CONFIG): nada de cifras de muestra.
 */
function Today({ db, catalog, profile, today }: StudyContext & { today: string }) {
  useEffect(() => {
    const now = Date.now();
    void missionContext(db, catalog, now).then((ctx) => ensureToday(db, now, ctx));
  }, [catalog, db, today]);
  const data = useLiveQuery(
    () => Promise.all([readToday(db, catalog, Date.now()), db.missions.where("day").equals(today).toArray()]),
    // `today` cambia a medianoche y vuelve a leer todo.
    [db, catalog, today],
  );
  if (!data) return <LoadingState label="Armando tu día…" />;
  const [status, missions] = data;
  const day = status.dayRecord;
  const streak = visibleStreak({ current: profile.currentStreak, max: profile.maxStreak, freezes: profile.streakFreezes, lastDay: profile.lastStudyDay, repair: profile.streakRepair }, today);
  const route = sessionRoute({ dueCards: status.dueCards, reviewBlockDone: day.reviewBlockDone, missionDone: status.missionDone, gymDone: status.gymDone, sessionDone: day.sessionDone });
  const ring = countForRing(route);
  const details: Record<RouteStepId, string> = {
    warmup: status.dueCards === 1 ? "1 repaso" : `${status.dueCards} repasos`,
    mission: status.mission ? missionTitle(status.mission, catalog) : "Todo al día",
    gym: GAME_INFO[gymGameFor(status.day)].name,
    close: "Resumen y cofre del día",
  };
  const next = chooseMission(unitStates(catalog, status.progress), catalog.subjects.map((s) => s.id));
  const bossUnit = next ? findUnit(catalog, next.unitKey) : undefined;
  const bossProgress = bossUnit ? status.progress.find((p) => p.unitKey === bossUnit.key) : undefined;
  const cta = day.sessionDone ? "Seguir estudiando" : day.answered ? "Continuar sesión de hoy" : "Empezar sesión de hoy";

  // minmax(0,1fr): sin esto, un texto truncado largo (la misión) ensancha toda la columna en el celular.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section aria-labelledby="hoy" className="raised rounded-xl border bg-surface p-5 sm:p-7">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <div className="flex flex-col gap-6">
            <div>
              <p className="eyebrow">Hoy · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
              <h1 id="hoy" className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl">
                Tu sesión de hoy{" "}
                <span className="font-mono text-2xl font-semibold whitespace-nowrap text-brand sm:text-3xl">
                  {CONFIG.dailyMinutes.min}–{CONFIG.dailyMinutes.max} min
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-5 sm:gap-6">
              <SessionRing done={ring.done} total={ring.total} />
              <div className="grid gap-2 text-sm text-ink-2">
                {streak.atRisk ? <p>Te guardamos el lugar: un congelamiento cubre el día que faltó.</p> : null}
                {day.minimumMet ? (
                  <p className="text-success">Tu misión mínima de hoy ya cuenta. Lo que sigas haciendo es extra.</p>
                ) : (
                  <p>Calentamiento, una misión, un reto y el cofre. Parar después nunca tiene castigo.</p>
                )}
              </div>
            </div>
            <Button asChild variant="cta" size="lg" className="h-14 w-full text-lg sm:w-auto sm:self-start">
              <Link href="/sesion">
                <Play aria-hidden className="size-5" /> {cta}
              </Link>
            </Button>
          </div>
          <div>
            <h2 className="eyebrow mb-3">Ruta de la sesión</h2>
            <ol aria-label="Pasos de la sesión de hoy" className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {route.map((s) => (
                <RouteStepRow key={s.id} id={s.id} state={s.state} detail={details[s.id]} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Racha" tone="streak" icon={Flame} value={streak.current === 0 ? "empieza hoy" : `${streak.current} ${streak.current === 1 ? "día" : "días"}`} />
        <StatTile label="XP de hoy" tone="xp" icon={Sparkles} value={day.xp} />
        <StatTile label="Repasos pendientes" icon={Layers} value={status.dueCards} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="misiones" className="raised rounded-xl border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="misiones" className="font-semibold">
              Misiones del día
            </h2>
            <span className="text-caption text-muted-foreground">{CONFIG.xp.mission} XP cada una</span>
          </div>
          <ul className="grid gap-2">
            {[...missions]
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((m) => (
                <li key={m.key} className={cn("rounded-lg border px-3 py-2.5", m.completed ? "bg-surface" : "bg-surface-2")}>
                  <div className="flex items-center gap-3 text-sm">
                    {m.completed ? <Check aria-label="cumplida" className="size-4 shrink-0 text-success" /> : <Target aria-hidden className="size-4 shrink-0 text-ink-2" />}
                    <span className={cn("flex-1", m.completed && "text-muted-foreground")}>{missionLabel({ kind: m.kind as MissionKind, target: m.target })}</span>
                    <span className="font-mono text-caption text-ink-2 tabular-nums">
                      {Math.min(m.progress, m.target)}/{m.target}
                    </span>
                  </div>
                  <div aria-hidden className="mt-2 ml-7 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn("h-full rounded-full", m.completed ? "bg-success" : "bg-brand")} style={{ width: `${Math.round(100 * Math.min(1, m.progress / Math.max(1, m.target)))}%` }} />
                  </div>
                </li>
              ))}
          </ul>
        </section>

        {next && bossUnit ? (
          <section aria-labelledby="jefe" className="glow glow-life flex flex-col gap-3 rounded-xl border border-life/40 bg-surface p-5">
            <p className="flex items-center gap-2 text-label font-medium text-danger">
              <Skull aria-hidden className="size-4" /> Jefe de la unidad {String(bossUnit.number).padStart(2, "0")}
            </p>
            <h2 id="jefe" className="text-lg font-semibold">
              {bossUnit.boss.nombre}
            </h2>
            <LifeBar current={bossUnit.boss.vidas} max={bossUnit.boss.vidas} />
            <p className="text-sm text-muted-foreground">
              {bossUnit.boss.vidas} vidas · {Math.round(bossUnit.boss.tiempo_segundos / 60)} min · pasas con {Math.round(bossUnit.boss.aprobado_minimo * 100)} %
            </p>
            <p className="text-sm text-ink-2">
              {bossProgress?.bossPassed
                ? "Ya lo venciste: puedes volver por tu récord."
                : bossProgress?.bossAttempts
                  ? `Tu mejor intento: ${Math.round((bossProgress.bestBoss ?? 0) * 100)} %`
                  : "Aún no lo enfrentas."}
            </p>
            <Button asChild variant="secondary" className="mt-auto">
              <Link href={unitHref(bossUnit)}>
                Ver la unidad <ArrowRight aria-hidden />
              </Link>
            </Button>
          </section>
        ) : null}
      </div>

      <section aria-labelledby="tus-materias">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tus-materias" className="font-semibold">
            Tus materias
          </h2>
          <Link href="/materias" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            Ver el plan completo <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {catalog.subjects.map((s) => {
            const read = s.units.filter((u) => status.progress.some((p) => p.unitKey === u.key && p.lessonDone)).length;
            return (
              <li key={s.id}>
                <Link href={`/materias/${s.id}`} className="tactile raised group block rounded-lg border bg-surface p-4 hover:border-brand/50">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{s.name}</span>
                    <ArrowRight aria-hidden className="size-4 text-ink-2 group-hover:text-brand" />
                  </span>
                  <span className="mt-1 block text-caption text-muted-foreground">
                    {read} de {s.units.length} {s.units.length === 1 ? "lección leída" : "lecciones leídas"}
                  </span>
                  <span aria-hidden className="mt-3 block h-1 overflow-hidden rounded-full bg-surface-3">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((100 * read) / Math.max(1, s.units.length))}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function HomeToday() {
  const today = useToday();
  return <StudyGate>{(ctx) => (today ? <Today {...ctx} today={today} /> : null)}</StudyGate>;
}
