"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Award, Flame, NotebookPen, Shield, Snowflake, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HudBar } from "@/components/hud/hud-bar";
import { RichText } from "@/components/study/rich-text";
import { StudyGate, type StudyContext } from "@/components/study/study-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findUnit } from "@/content/core/study-catalog";
import type { CortexDb } from "@/db/db";
import { saveMistakeNote, scheduleNow, setFrame } from "@/db/progress";
import { ACHIEVEMENTS } from "@/engine/achievements";
import { CONFIG } from "@/engine/config";
import { weekStart } from "@/engine/dates";
import { baseline, divisionName, weekXp } from "@/engine/league";
import { levelInfo, titleForLevel } from "@/engine/levels";
import { RECORD_LABELS } from "@/engine/records";
import { visibleStreak } from "@/engine/streak";
import { unitHref } from "@/lib/study";
import { useToday } from "@/lib/use-clock";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingState } from "@/components/ui/state";


// ---------------------------------------------------------------- cuaderno de errores
function Notebook({ db, catalog }: StudyContext) {
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [db]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  if (!mistakes) return <LoadingState label="Abriendo tu cuaderno…" rows={3} />;
  const list = mistakes
    .filter((m) => catalog.exercises[m.exerciseId])
    .sort((a, b) => Number(a.fixedAt !== null) - Number(b.fixedAt !== null) || Number(b.illusion) - Number(a.illusion) || b.lastAt - a.lastAt);
  if (!list.length) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Todavía no hay errores anotados."
        description="Cuando falles un ejercicio aparecerá aquí, con tu respuesta y la explicación."
        action={
          <Button asChild>
            <Link href="/sesion">Empezar la sesión de hoy</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-4">
      {list.map((m) => {
        const ex = catalog.exercises[m.exerciseId];
        const unit = ex ? findUnit(catalog, ex.unitKey) : undefined;
        if (!ex) return null;
        return (
          <li key={m.exerciseId} className={cn("raised rounded-lg border bg-surface p-5", m.fixedAt === null ? "border-border-strong" : "opacity-80")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{m.exerciseId}</span>
              {unit ? (
                <Link href={unitHref(unit)} className="text-xs text-brand underline-offset-2 hover:underline">
                  {unit.title}
                </Link>
              ) : null}
              <Badge variant="outline">{m.misses === 1 ? "1 fallo" : `${m.misses} fallos`}</Badge>
              {m.illusion && m.fixedAt === null ? <Badge className="border-warning text-warning">Ilusión de saber</Badge> : null}
              {m.fixedAt !== null ? <Badge variant="brand">Corregido</Badge> : null}
            </div>
            <RichText text={ex.enunciado} className="mt-3" />
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Tu última respuesta: </span>
              <code className="font-mono">{m.lastAnswer || "—"}</code>
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-brand">Ver la explicación</summary>
              <RichText text={ex.explicacion} className="mt-2" />
            </details>
            <label className="mt-3 grid gap-1 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <NotebookPen aria-hidden className="size-3.5" /> Tu nota (¿por qué fallaste?)
              </span>
              <textarea
                defaultValue={m.note}
                rows={2}
                onBlur={(e) => void saveMistakeNote(db, m.exerciseId, e.target.value)}
                className="w-full rounded-md border border-input bg-surface px-3 py-2"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/ejercicios/${m.exerciseId}`}>Practicarlo ahora</Link>
              </Button>
            {m.fixedAt === null ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={sent.has(m.exerciseId)}
                onClick={() => void scheduleNow(db, [m.exerciseId], Date.now()).then(() => setSent(new Set([...sent, m.exerciseId])))}
              >
                {sent.has(m.exerciseId) ? "En tu repaso de hoy" : "Mandarlo a mi repaso de hoy"}
              </Button>
            ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function NotebookClient() {
  return <StudyGate>{(ctx) => <Notebook {...ctx} />}</StudyGate>;
}

// ---------------------------------------------------------------- progreso
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Progress({ db, catalog, profile, today }: StudyContext & { today: string }) {
  const data = useLiveQuery(() => Promise.all([db.days.toArray(), db.records.toArray(), db.achievements.toArray(), db.attempts.toArray(), db.unitProgress.toArray()]), [db]);
  if (!data) return <LoadingState label="Sumando tu progreso…" />;
  const [days, records, achievements, attempts, progress] = data;
  const lvl = levelInfo(profile.xpTotal);
  const streak = visibleStreak({ current: profile.currentStreak, max: profile.maxStreak, freezes: profile.streakFreezes, lastDay: profile.lastStudyDay, repair: profile.streakRepair }, today);
  const monday = weekStart(today);
  const dx = days.map((d) => ({ day: d.day, xp: d.xp }));
  const thisWeek = weekXp(dx, monday);
  const base = baseline(dx, monday);
  const unlocked = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const recordRows = records.filter((r) => r.key.startsWith("best:"));
  const calib = ([1, 2, 3] as const).map((c) => {
    const rows = attempts.filter((a) => a.confidence === c);
    return { c, n: rows.length, acc: rows.length ? rows.filter((a) => a.correct).length / rows.length : null };
  });
  const bossBadges = achievements.filter((a) => a.id.startsWith("jefe:"));
  return (
    <div className="grid gap-10">
      <section aria-labelledby="nivel" className="grid gap-4">
        <h2 id="nivel" className="eyebrow">
          Nivel y racha
        </h2>
        <div className="flex flex-wrap items-center gap-4" data-frame={profile.cosmetics.frame ?? undefined}>
          <HudBar data={{ xpTotal: profile.xpTotal, level: lvl.level, currentStreak: streak.current, levelProgress: lvl.progress }} />
          <span className="text-ink-2">
            «{titleForLevel(lvl.level)}» · faltan {lvl.span - lvl.into} XP para el nivel {lvl.level + 1}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Racha" value={streak.current} hint={streak.atRisk ? "Te guardamos el lugar con un congelamiento." : `Máxima: ${profile.maxStreak}`} />
          <Stat label="Congelamientos" value={<span className="inline-flex items-center gap-2"><Snowflake aria-hidden className="size-6 text-info" />{profile.streakFreezes}/{CONFIG.streak.maxFreezes}</span>} hint="Se gana 1 cada 7 días de racha." />
          <Stat label="XP total" value={profile.xpTotal.toLocaleString("es-MX")} />
          <Stat label="Lecciones" value={progress.filter((p) => p.lessonDone).length} hint={`${progress.filter((p) => p.bossPassed).length} jefes derrotados`} />
        </div>
        {profile.streakRepair ? (
          <p className="flex items-center gap-2 text-sm text-streak">
            <Flame aria-hidden className="size-4" /> Puedes recuperar tus {profile.streakRepair.previous} días si haces doble misión (6 aciertos) a más tardar el {profile.streakRepair.deadline}.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="liga" className="grid gap-3">
        <h2 id="liga" className="eyebrow">
          Liga personal · tú contra tu promedio
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="División" value={<span className="inline-flex items-center gap-2"><Shield aria-hidden className="size-6 text-brand" />{divisionName(profile.league.division)}</span>} />
          <Stat label="XP esta semana" value={thisWeek} hint={base === null ? "Tu promedio se calcula desde tu segunda semana." : `Tu promedio de 4 semanas: ${Math.round(base)} XP`} />
          <Stat
            label="Ritmo"
            value={base ? `${(thisWeek / base).toFixed(2)}×` : "—"}
            hint={`Al cerrar la semana: ≥ ${CONFIG.league.up}× sube, < ${CONFIG.league.down}× baja.`}
          />
        </div>
      </section>

      <section aria-labelledby="records" className="grid gap-3">
        <h2 id="records" className="eyebrow">
          Récords personales
        </h2>
        {recordRows.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recordRows.map((r) => {
              const meta = RECORD_LABELS[r.key];
              const boss = r.key.startsWith("best:boss:") ? findUnit(catalog, r.key.slice("best:boss:".length)) : undefined;
              const gym = r.key.startsWith("best:gym") ? r.key.replace("best:gym-", "Gimnasio · ") : null;
              const label = meta?.label ?? (boss ? `Jefe «${boss.boss.nombre}»` : (gym ?? r.key));
              return (
                <li key={r.key} className="flex items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Trophy aria-hidden className="size-4 text-xp-text" /> {label}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {r.value}
                    {meta?.unit ? ` ${meta.unit}` : boss ? " %" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-2">Tus récords aparecen al terminar tus primeras sesiones.</p>
        )}
      </section>

      <section aria-labelledby="calibracion" className="grid gap-3">
        <h2 id="calibracion" className="eyebrow">
          Calibración · ¿sabes lo que sabes?
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {calib.map((k) => (
            <Stat key={k.c} label={k.c === 1 ? "Cuando adivinas" : k.c === 2 ? "Cuando crees" : "Cuando estás seguro"} value={k.acc === null ? "—" : `${Math.round(k.acc * 100)}%`} hint={`${k.n} respuestas`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Bien calibrado: el acierto sube con tu confianza. Si «seguro» falla seguido, revisa el cuaderno de errores.</p>
      </section>

      <section aria-labelledby="logros" className="grid gap-3">
        <h2 id="logros" className="eyebrow">
          Logros · {unlocked.size}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...ACHIEVEMENTS, ...bossBadges.map((b) => ({ id: b.id, name: `Insignia: ${b.id.slice(5)}`, description: "Derrotaste a un jefe.", secret: false }))].map((a) => {
            const at = unlocked.get(a.id);
            const hidden = a.secret && !at;
            return (
              <li key={a.id} className={cn("flex items-start gap-3 rounded-lg border bg-surface p-3", at ? "glow glow-xp border-xp/60" : "opacity-70")}>
                <Award aria-hidden className={cn("mt-0.5 size-5 shrink-0", at ? "text-xp-text" : "text-muted-foreground")} />
                <span>
                  <span className="block font-semibold">{hidden ? "???" : a.name}</span>
                  <span className="block text-xs text-muted-foreground">{hidden ? "Logro secreto: sigue explorando." : a.description}</span>
                  {at ? <span className="block font-mono text-caption text-muted-foreground">{new Date(at).toLocaleDateString("es-MX")}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="cosmeticos" className="grid gap-3">
        <h2 id="cosmeticos" className="eyebrow">
          Cosméticos (no dan ventajas)
        </h2>
        {profile.cosmetics.frames.length ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={profile.cosmetics.frame === null ? "default" : "outline"} onClick={() => void setFrame(db, null)}>
              Sin marco
            </Button>
            {profile.cosmetics.frames.map((f) => (
              <Button key={f} size="sm" variant={profile.cosmetics.frame === f ? "default" : "outline"} onClick={() => void setFrame(db, f)}>
                <span data-frame={f} className="inline-block size-3 rounded-full" /> {f}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-ink-2">Los marcos del HUD salen en el cofre del día.</p>
        )}
        {profile.cosmetics.badges.length ? <p className="text-sm">Insignias raras: {profile.cosmetics.badges.join(", ")}</p> : null}
      </section>
    </div>
  );
}

export function ProgressClient() {
  const today = useToday();
  return <StudyGate>{(ctx) => (today ? <Progress {...ctx} today={today} /> : null)}</StudyGate>;
}

export type { CortexDb };
