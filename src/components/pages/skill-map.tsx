"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, Lock, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StudyGate, type StudyContext } from "@/components/study/study-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type CatalogUnit, findSubject, type StudyCatalog } from "@/content/core/study-catalog";
import type { AttemptRecord, CardRecord, UnitProgressRecord } from "@/db/types";
import { conceptMastery, type Mastery, MASTERY_LABELS, MASTERY_ORDER, masteryRank, missingPrerequisites } from "@/engine/mastery";
import { layeredLayout } from "@/lib/graph-layout";
import { unitHref } from "@/lib/study";
import { cn } from "@/lib/utils";

/** Estados del mapa (ADR-020): dominado = violeta sólido con glow; maestría = oro. Pares AA en tokens.test.ts. */
const MASTERY_STYLE: Record<Mastery, string> = {
  new: "border-dashed border-border-strong bg-surface text-muted-foreground",
  seen: "border-border-strong bg-surface text-ink",
  practiced: "border-brand/50 bg-brand-soft text-ink",
  mastered: "glow border-brand bg-brand text-brand-ink",
  expert: "glow glow-xp border-xp bg-xp text-xp-ink",
};

interface ConceptNode {
  readonly id: string;
  readonly name: string;
  readonly prerequisites: readonly string[];
  readonly state: Mastery;
  readonly missing: string[];
}

/** Estado de maestría de cada concepto de la materia según tu historial (docs/03). */
export function conceptStates(
  catalog: StudyCatalog,
  subjectId: string,
  attempts: readonly AttemptRecord[],
  progress: readonly UnitProgressRecord[],
  cards: readonly CardRecord[],
): ConceptNode[] {
  const subject = findSubject(catalog, subjectId);
  if (!subject) return [];
  const done = new Set(progress.filter((p) => p.lessonDone).map((p) => p.unitKey));
  const passed = new Set(progress.filter((p) => p.bossPassed).map((p) => p.unitKey));
  const longOk = new Set(cards.filter((c) => c.longOk).map((c) => c.exerciseId));
  const ev = new Map<string, { lessonDone: boolean; attempts: number; correct: number; bossPassed: boolean; longReviewOk: boolean }>();
  const get = (id: string) => {
    let e = ev.get(id);
    if (!e) ev.set(id, (e = { lessonDone: false, attempts: 0, correct: 0, bossPassed: false, longReviewOk: false }));
    return e;
  };
  for (const u of subject.units) {
    for (const c of u.concepts) if (done.has(u.key)) get(c).lessonDone = true;
    for (const id of u.exerciseIds) {
      const ex = catalog.exercises[id];
      if (!ex) continue;
      for (const c of ex.conceptos) {
        if (passed.has(u.key)) get(c).bossPassed = true;
        if (longOk.has(id)) get(c).longReviewOk = true;
      }
    }
  }
  for (const a of attempts) {
    const ex = catalog.exercises[a.exerciseId];
    if (!ex || ex.subjectId !== subjectId) continue;
    for (const c of ex.conceptos) {
      const e = get(c);
      e.attempts++;
      if (a.correct) e.correct++;
    }
  }
  const states: Record<string, Mastery> = {};
  for (const c of subject.concepts) states[c.id] = conceptMastery(ev.get(c.id) ?? { lessonDone: false, attempts: 0, correct: 0, bossPassed: false, longReviewOk: false });
  return subject.concepts.map((c) => ({ id: c.id, name: c.name, prerequisites: c.prerequisites, state: states[c.id] ?? "new", missing: missingPrerequisites(c.prerequisites, states) }));
}

const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 44;
const ROW_GAP = 14;
const practicedUp = (m: Mastery) => masteryRank(m) >= masteryRank("practiced");

function SkillMap({ db, catalog, subjectId }: StudyContext & { subjectId: string }) {
  const data = useLiveQuery(() => Promise.all([db.attempts.toArray(), db.unitProgress.toArray(), db.cards.toArray()]), [db]);
  const subject = findSubject(catalog, subjectId);
  const nodes = useMemo(() => (data ? conceptStates(catalog, subjectId, data[0], data[1], data[2]) : []), [catalog, data, subjectId]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  // Unidad donde se presenta cada concepto (la primera que lo lista).
  const home = useMemo(() => {
    const m = new Map<string, CatalogUnit>();
    for (const u of subject?.units ?? []) for (const c of u.concepts) if (!m.has(c)) m.set(c, u);
    return m;
  }, [subject]);
  const [unitKey, setUnitKey] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  if (!subject) return <EmptyState icon={MapIcon} title="Esta materia todavía no tiene contenido." />;
  if (!data) return <LoadingState label="Calculando tu mapa…" />;

  const stats = subject.units.map((u) => {
    const own = u.concepts.filter((c) => home.get(c)?.key === u.key);
    return { unit: u, total: own.length, done: own.filter((c) => practicedUp(byId.get(c)?.state ?? "new")).length };
  });
  const selected = subject.units.find((u) => u.key === unitKey) ?? stats.find((s) => s.total > 0 && s.done < s.total)?.unit ?? subject.units[0];
  const own = (selected?.concepts ?? []).filter((c) => home.get(c)?.key === selected?.key);
  const ownSet = new Set(own);
  const ghosts = [...new Set(own.flatMap((c) => byId.get(c)?.prerequisites ?? []))].filter((p) => !ownSet.has(p) && byId.has(p));
  const visibleIds = [...ghosts, ...own];
  const layout = layeredLayout(visibleIds.map((id) => ({ id, prerequisites: byId.get(id)?.prerequisites ?? [] })));
  const at = new Map(layout.nodes.map((n) => [n.id, n]));
  const focus = (focusId && ownSet.has(focusId) ? focusId : null) ?? own.find((c) => !practicedUp(byId.get(c)?.state ?? "new")) ?? own[0] ?? null;
  const focused = focus ? byId.get(focus) : undefined;

  // Cadena del foco: todo lo que necesita (hacia atrás) y lo que desbloquea directamente.
  const chain = new Set<string>();
  const back = (id: string) => {
    if (chain.has(id)) return;
    chain.add(id);
    for (const p of byId.get(id)?.prerequisites ?? []) if (at.has(p)) back(p);
  };
  if (focus) back(focus);
  const unlocks = focus ? own.filter((c) => byId.get(c)?.prerequisites.includes(focus)) : [];
  unlocks.forEach((c) => chain.add(c));

  const width = Math.max(1, layout.layers) * (NODE_W + COL_GAP) - COL_GAP;
  const height = Math.max(1, layout.rows) * (NODE_H + ROW_GAP) - ROW_GAP;
  const xy = (id: string) => {
    const n = at.get(id);
    return { x: (n?.layer ?? 0) * (NODE_W + COL_GAP), y: (n?.row ?? 0) * (NODE_H + ROW_GAP) };
  };
  const focusHome = focus ? home.get(focus) : undefined;

  return (
    <Tabs defaultValue="grafo" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList aria-label="Vista del mapa">
          <TabsTrigger value="grafo">Grafo</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>
        <ul aria-label="Leyenda" className="flex flex-wrap gap-1.5">
          {MASTERY_ORDER.map((m) => (
            <li key={m} className={cn("rounded-sm border px-2 py-0.5 text-caption", MASTERY_STYLE[m])}>
              {MASTERY_LABELS[m]}
            </li>
          ))}
        </ul>
      </div>

      <TabsContent value="grafo" className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[12rem_minmax(0,1fr)_16rem]">
        <nav aria-label="Unidades" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:content-start lg:overflow-visible lg:px-0">
          {stats.map(({ unit, total, done }) => {
            const active = unit.key === selected?.key;
            return (
              <button
                key={unit.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setUnitKey(unit.key);
                  setFocusId(null);
                }}
                className={cn("tactile shrink-0 rounded-lg border px-3 py-2 text-left text-sm", active ? "border-brand/50 bg-brand-soft" : "bg-surface hover:border-border-strong")}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium whitespace-nowrap lg:whitespace-normal">
                    <span className="font-mono text-muted-foreground tabular-nums">{String(unit.number).padStart(2, "0")}</span> {unit.title.split(":")[0]}
                  </span>
                  <span className="font-mono text-caption whitespace-nowrap text-muted-foreground tabular-nums">{total ? Math.round((100 * done) / total) : 0} %</span>
                </span>
                <span aria-hidden className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3 max-lg:hidden">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${total ? (100 * done) / total : 0}%` }} />
                </span>
              </button>
            );
          })}
        </nav>

        <div role="region" aria-label={`Conceptos de la unidad ${selected?.number ?? ""}`} tabIndex={0} className="raised min-w-0 overflow-x-auto rounded-xl border bg-surface p-4 sm:p-5">
          {own.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta unidad repasa conceptos de otras; no presenta conceptos nuevos.</p>
          ) : (
            <div className="relative" style={{ width, height }}>
              <svg aria-hidden className="absolute inset-0 overflow-visible" width={width} height={height}>
                {layout.edges.map((e) => {
                  const a = xy(e.from);
                  const b = xy(e.to);
                  const x1 = a.x + NODE_W;
                  const y1 = a.y + NODE_H / 2;
                  const x2 = b.x;
                  const y2 = b.y + NODE_H / 2;
                  const lit = chain.has(e.from) && chain.has(e.to);
                  const missing = byId.get(e.to)?.missing.includes(e.from) ?? false;
                  return (
                    <path
                      key={`${e.from}->${e.to}`}
                      d={`M ${x1} ${y1} C ${x1 + COL_GAP / 2} ${y1}, ${x2 - COL_GAP / 2} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      strokeWidth={lit ? 2 : 1.25}
                      strokeDasharray={missing ? "4 4" : undefined}
                      className={cn(lit ? "stroke-brand" : "stroke-border-strong", focus && !lit && "opacity-40")}
                    />
                  );
                })}
              </svg>
              {visibleIds.map((id) => {
                const n = byId.get(id);
                if (!n) return null;
                const { x, y } = xy(id);
                const ghost = !ownSet.has(id);
                const isFocus = id === focus;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isFocus}
                    aria-label={`${n.name}: ${MASTERY_LABELS[n.state]}${ghost ? " (de otra unidad)" : ""}`}
                    disabled={ghost}
                    onClick={() => setFocusId(id)}
                    onFocus={() => !ghost && setFocusId(id)}
                    style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                    className={cn(
                      "tactile absolute flex items-center rounded-lg border px-3 text-left text-label leading-tight font-medium",
                      MASTERY_STYLE[n.state],
                      ghost && "border-dashed opacity-60",
                      isFocus && "ring-2 ring-ring ring-offset-2 ring-offset-surface",
                      focus && !chain.has(id) && "opacity-40",
                    )}
                  >
                    <span className="line-clamp-2">{n.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {focused ? (
          <aside aria-label="Detalle del concepto" className="raised grid content-start gap-4 rounded-xl border bg-surface p-5">
            <div>
              <h2 className="font-semibold text-balance">{focused.name}</h2>
              <Badge variant={practicedUp(focused.state) ? "brand" : "default"} className="mt-2">
                {MASTERY_LABELS[focused.state]}
              </Badge>
            </div>
            <ol aria-label="Escalera de maestría" className="flex gap-1">
              {MASTERY_ORDER.map((m) => (
                <li key={m} title={undefined} className="flex-1">
                  <span aria-hidden className={cn("block h-1.5 rounded-full", masteryRank(m) <= masteryRank(focused.state) ? "bg-brand" : "bg-surface-3")} />
                  <span className="sr-only">
                    {MASTERY_LABELS[m]}
                    {masteryRank(m) <= masteryRank(focused.state) ? " (alcanzado)" : ""}
                  </span>
                </li>
              ))}
            </ol>
            {focused.prerequisites.length ? (
              <div>
                <p className="eyebrow mb-1.5">Prerrequisitos</p>
                <ul className="grid gap-1 text-sm">
                  {focused.prerequisites.map((p) => {
                    const missing = focused.missing.includes(p);
                    return (
                      <li key={p} className="flex items-start gap-2">
                        {missing ? <Lock aria-label="falta ver" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : <Check aria-label="visto" className="mt-0.5 size-3.5 shrink-0 text-success" />}
                        <span className={cn(missing && "text-muted-foreground")}>{byId.get(p)?.name ?? p}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {unlocks.length ? (
              <div>
                <p className="eyebrow mb-1.5">Desbloquea</p>
                <ul className="grid gap-1 text-sm text-ink-2">
                  {unlocks.map((c) => (
                    <li key={c}>{byId.get(c)?.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {focusHome ? (
              <div className="grid gap-2">
                <Button asChild>
                  <Link href={unitHref(focusHome, "/practica")}>Practicar esta unidad</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={unitHref(focusHome)}>Ver la lección</Link>
                </Button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </TabsContent>

      <TabsContent value="lista" className="grid gap-6">
        {subject.units.map((u) => {
          const ownIds = u.concepts.filter((c) => home.get(c)?.key === u.key);
          if (!ownIds.length) return null;
          return (
            <section key={u.key} aria-labelledby={`lista-${u.key}`}>
              <h2 id={`lista-${u.key}`} className="mb-2 text-sm font-semibold">
                <span className="font-mono text-muted-foreground tabular-nums">{String(u.number).padStart(2, "0")}</span> {u.title}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ownIds.map((c) => {
                  const n = byId.get(c);
                  if (!n) return null;
                  return (
                    <li key={c} className={cn("rounded-lg border p-3", MASTERY_STYLE[n.state])}>
                      <p className="font-medium">{n.name}</p>
                      <p className="text-caption opacity-80">{MASTERY_LABELS[n.state]}</p>
                      {n.missing.length ? (
                        <p className="mt-1 flex items-start gap-1 text-caption">
                          <Lock aria-hidden className="mt-0.5 size-3 shrink-0" /> Falta ver: {n.missing.map((m) => byId.get(m)?.name ?? m).join(", ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </TabsContent>
    </Tabs>
  );
}

export function SkillMapClient({ subjectId }: { subjectId: string }) {
  return <StudyGate>{(ctx) => <SkillMap {...ctx} subjectId={subjectId} />}</StudyGate>;
}
