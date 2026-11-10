"use client";

import { ClipboardCheck, FileClock, SkipForward, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/state";
import { type CatalogSubject, findUnit, type StudyCatalog } from "@/content/core/study-catalog";
import type { CortexDb } from "@/db/db";
import { type ExamOutcome, finishExam, scheduleNow } from "@/db/progress";
import type { ProfileRecord } from "@/db/types";
import { CONFIG } from "@/engine/config";
import {
  answerExam,
  currentExamQuestion,
  type ExamCandidate,
  examResult,
  type ExamResult,
  type ExamRun,
  examTimeLeftMs,
  handInExam,
  planExam,
  skipExam,
  startExam,
  timeoutExam,
} from "@/engine/exam";
import { createRng, seedFrom } from "@/engine/rng";
import { isTyping } from "@/lib/keyboard";
import { playSound } from "@/lib/sound";
import { exerciseRef, missionContext, unitRef } from "@/lib/study";
import { cn } from "@/lib/utils";
import { cRunnerStatus } from "@/runners/c-client";
import { useCelebrate } from "./celebrations";
import { ExerciseCard } from "./exercise-card";
import { isPlayable } from "./exercise-types";
import { RichText } from "./rich-text";

/*
 * Simulacro de examen (docs/01, Fase 3): eliges unidades, contestas con reloj y sin saber si
 * acertaste, y al entregar ves el desglose. Nada se guarda hasta el final (`finishExam`).
 */

const LONG_TYPES = new Set(["codigo", "depurar", "rastreo_memoria"]);

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Lo que puede entrar al simulacro: sin autoevaluaciones, sin lo que la app no juega y sin C si su runner no está. */
export function examCandidates(catalog: StudyCatalog, subject: CatalogSubject, cReady: boolean): ExamCandidate[] {
  return subject.units.flatMap((u) =>
    u.exerciseIds.flatMap((id) => {
      const ex = catalog.exercises[id];
      if (!ex || ex.tipo === "autoevaluacion" || !isPlayable(ex)) return [];
      const needsC = "lenguaje" in ex && ex.lenguaje === "c" && ex.tipo !== "rastreo_memoria";
      if (needsC && !cReady) return [];
      return [{ id, unitKey: u.key, difficulty: ex.dificultad, concepts: ex.conceptos, long: LONG_TYPES.has(ex.tipo) }];
    }),
  );
}

type Saved = { readonly kind: "saved"; readonly outcome: ExamOutcome } | { readonly kind: "error"; readonly message: string; readonly result: ExamResult };

export function ExamRunner({
  db,
  catalog,
  profile,
  subject,
  doneActions,
}: {
  db: CortexDb;
  catalog: StudyCatalog;
  profile: ProfileRecord;
  subject: CatalogSubject;
  doneActions?: React.ReactNode;
}) {
  const { fromOutcome } = useCelebrate();
  const [chosen, setChosen] = useState<readonly string[]>(() => subject.units.map((u) => u.key));
  const [run, setRun] = useState<ExamRun | null>(null);
  const [now, setNow] = useState(0);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [confirmHandIn, setConfirmHandIn] = useState(false);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const saving = useRef(false);

  const [cReady, setCReady] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void cRunnerStatus().then((s) => alive && setCReady(s.enabled));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void db.records.get(`best:exam:${subject.id}`).then((r) => alive && setBest(r?.value ?? null));
    return () => {
      alive = false;
    };
  }, [db, subject.id, saved]);

  const candidates = useMemo(() => (cReady === null ? [] : examCandidates(catalog, subject, cReady)), [catalog, subject, cReady]);
  const preview = useMemo(() => planExam(candidates, chosen, createRng(1)), [candidates, chosen]);

  const save = useCallback(
    async (finalRun: ExamRun) => {
      if (saving.current) return;
      saving.current = true;
      const t = Date.now();
      try {
        const answers = finalRun.answers.flatMap((answer) => {
          const ex = catalog.exercises[answer.exerciseId];
          const unit = ex ? findUnit(catalog, ex.unitKey) : undefined;
          return ex && unit ? [{ exercise: exerciseRef(ex), unit: unitRef(unit), answer }] : [];
        });
        const outcome = await finishExam(db, { subjectId: subject.id, subjectName: subject.name, run: finalRun, answers, now: t, ctx: await missionContext(db, catalog, t) });
        playSound(outcome.result.passed ? "level" : "wrong", profile.preferences.sound);
        fromOutcome(outcome);
        setSaved({ kind: "saved", outcome });
      } catch (e) {
        saving.current = false;
        setSaved({ kind: "error", message: e instanceof Error ? e.message : "No se pudo guardar el simulacro.", result: examResult(finalRun) });
      }
    },
    [catalog, db, fromOutcome, profile.preferences.sound, subject.id, subject.name],
  );

  // Todo cambio del examen pasa por aquí: al terminar (completo, por tiempo o entregado) se guarda una vez.
  const runRef = useRef<ExamRun | null>(null);
  const update = useCallback(
    (next: ExamRun | null) => {
      runRef.current = next;
      setRun(next);
      if (next?.status === "finished") void save(next);
    },
    [save],
  );

  // Reloj: 4 veces por segundo mientras dura el examen.
  const playing = run?.status === "playing";
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const r = runRef.current;
      if (r?.status === "playing" && examTimeLeftMs(r, t) <= 0) update(timeoutExam(r, t));
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, update]);

  // S salta la pregunta (fuera de los campos de texto).
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      // Con la respuesta ya escrita y eligiendo la confianza, saltar la tiraría.
      if (document.querySelector("[data-confidence-picker]")) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (runRef.current) update(skipExam(runRef.current));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, update]);

  const reset = () => {
    saving.current = false;
    setSaved(null);
    update(null);
    setScheduled(null);
    setConfirmHandIn(false);
  };

  // ---------------------------------------------------------------- resultado
  if (run && run.status === "finished") {
    if (!saved) return <p className="text-muted-foreground">Calificando…</p>;
    const result = saved.kind === "saved" ? saved.outcome.result : saved.result;
    const missed = [...result.failed, ...result.unanswered];
    const answerOf = new Map(run.answers.map((a) => [a.exerciseId, a.answer]));
    const conceptName = new Map(subject.concepts.map((c) => [c.id, c.name]));
    const unitTitle = new Map(subject.units.map((u) => [u.key, `${String(u.number).padStart(2, "0")} ${u.title}`]));
    const weak = result.byConcept.filter((c) => c.correct < c.total).slice(0, 5);
    const bestBefore = saved.kind === "saved" ? saved.outcome.bestBefore : null;
    const score = Math.round(result.score * 100);
    return (
      <section aria-live="polite" className={cn("raised rounded-xl border bg-surface p-6 sm:p-7", result.passed ? "glow glow-success border-success/60" : "border-danger/60")}>
        <p className="eyebrow">Resultado del simulacro · {subject.name}</p>
        <h2 className="mt-2 text-3xl font-extrabold">{result.passed ? "Aprobado" : "Todavía no"}</h2>
        <p className="mt-2 text-ink-2">
          {result.correct} de {result.total} correctas: {score}% (se necesita {pct(run.plan.passRatio)}).
          {run.endReason === "time" ? " Se acabó el tiempo." : run.endReason === "handed-in" && result.unanswered.length ? ` Entregaste con ${result.unanswered.length} sin contestar.` : ""}
        </p>
        {saved.kind === "saved" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {saved.outcome.xp.total > 0 ? `+${saved.outcome.xp.total} XP por tus aciertos (como en la práctica). ` : ""}
            {bestBefore === null ? "Es tu primer simulacro de esta materia." : score > bestBefore ? `Nuevo mejor simulacro (antes ${bestBefore}%).` : `Tu mejor simulacro: ${bestBefore}%.`}
          </p>
        ) : (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-warning">
            {saved.message} Tus respuestas siguen aquí.
            <Button size="sm" variant="outline" onClick={() => void save(run)}>
              Reintentar guardar
            </Button>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Por unidad</h3>
            <ul className="mt-3 grid gap-2">
              {result.byUnit.map((t) => (
                <li key={t.key} className="grid gap-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{unitTitle.get(t.key) ?? t.key}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {t.correct}/{t.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${t.correct} de ${t.total} correctas`}>
                    <div className={cn("h-full", t.correct / t.total >= run.plan.passRatio ? "bg-success" : "bg-danger")} style={{ width: `${(100 * t.correct) / t.total}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Conceptos más débiles</h3>
            {weak.length ? (
              <ul className="mt-3 grid gap-1.5 text-sm">
                {weak.map((c) => (
                  <li key={c.key} className="flex justify-between gap-3">
                    <span className="min-w-0">{conceptName.get(c.key) ?? c.key}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                      {c.correct}/{c.total}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Ninguno: acertaste todo lo que viste.</p>
            )}
          </div>
        </div>

        {missed.length ? (
          <div className="mt-8">
            <h3 className="font-semibold">Qué repasar</h3>
            <ul className="mt-3 grid gap-3">
              {missed.map((id) => {
                const ex = catalog.exercises[id];
                if (!ex) return null;
                const mine = answerOf.get(id);
                return (
                  <li key={id} className="rounded-lg border bg-surface-2 p-4 text-sm">
                    <p className="font-mono text-xs text-muted-foreground">
                      {id} · {result.unanswered.includes(id) ? "sin contestar" : "fallada"} · {unitTitle.get(ex.unitKey) ?? ex.unitKey}
                    </p>
                    <RichText text={ex.enunciado} className="mt-2" />
                    {mine ? (
                      <p className="mt-2 text-muted-foreground">
                        Tu respuesta: <span className="font-mono text-ink-2">{mine}</span>
                      </p>
                    ) : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-brand">Ver la explicación</summary>
                      <RichText text={ex.explicacion} className="mt-2" />
                    </details>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={scheduled !== null || saved.kind !== "saved"} onClick={() => void scheduleNow(db, missed, Date.now()).then(setScheduled)}>
                Mandar estos a mi repaso de hoy
              </Button>
              {scheduled !== null ? <span className="text-sm text-muted-foreground">Listo: las falladas ya están en tu cola y en el cuaderno de errores.</span> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Otro simulacro</Button>
          {doneActions}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- configurar
  if (!run) {
    const total = preview.questions.length;
    const toggle = (key: string) => setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : subject.units.map((u) => u.key).filter((k) => k === key || c.includes(k))));
    return (
      <section className="raised rounded-xl border bg-surface p-6 sm:p-7">
        <p className="flex items-center gap-2 text-label font-medium text-brand">
          <ClipboardCheck aria-hidden className="size-4" /> Simulacro de examen
        </p>
        <h2 className="mt-2 text-3xl font-extrabold text-balance">{subject.name}</h2>
        <ul className="mt-4 grid gap-1 text-ink-2">
          <li>
            {total} {total === 1 ? "pregunta" : "preguntas"} de las unidades que elijas, de fácil a difícil · {fmt(preview.timeLimitMs)} min en total.
          </li>
          <li>Sin pistas y sin saber si acertaste hasta que entregues. Apruebas con {pct(CONFIG.exam.passRatio)}.</li>
          <li>
            Puedes saltar una pregunta (<Kbd>S</Kbd>) y vuelve al final de la fila.
          </li>
          {best !== null ? <li>Tu mejor simulacro de esta materia: {best}%.</li> : null}
        </ul>
        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">Unidades</legend>
          <div className="mb-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setChosen(subject.units.map((u) => u.key))}>
              Todas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChosen([])}>
              Ninguna
            </Button>
          </div>
          <ul className="grid gap-1.5">
            {subject.units.map((u) => (
              <li key={u.key}>
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={chosen.includes(u.key)} onChange={() => toggle(u.key)} />
                  <span>
                    <span className="font-mono text-xp-text tabular-nums">{String(u.number).padStart(2, "0")}</span> {u.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {cReady === false ? <p className="mt-4 text-sm text-warning">El runner de C no está disponible: las preguntas en C se omiten de este simulacro.</p> : null}
        <Button
          size="lg"
          variant="cta"
          className="mt-6"
          disabled={cReady === null || total === 0}
          onClick={() => {
            const t = Date.now();
            saving.current = false;
            setNow(t);
            update(startExam(planExam(candidates, chosen, createRng(seedFrom(`${subject.id}/${t}`))), t));
          }}
        >
          <FileClock aria-hidden /> Empezar el simulacro
        </Button>
        {total === 0 && cReady !== null ? <p className="mt-2 text-sm text-muted-foreground">Elige al menos una unidad.</p> : null}
      </section>
    );
  }

  // ---------------------------------------------------------------- en curso
  const q = currentExamQuestion(run);
  const ex = q ? catalog.exercises[q.exerciseId] : null;
  const left = examTimeLeftMs(run, now || run.startedAt);
  const total = run.plan.questions.length;
  const answered = run.answers.length;
  const unit = q ? subject.units.find((u) => u.key === q.unitKey) : undefined;

  return (
    // `data-escape-guard`: Esc no saca de la página a medio examen (se perdería todo); "Salir" sí.
    <div className="grid gap-4" data-escape-guard>
      <div className="sticky top-[calc(var(--header-h)+0.5rem)] z-30 grid gap-3 rounded-xl border bg-surface/95 p-3 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-4">
        <div>
          <p className="text-caption text-muted-foreground">
            Contestadas {answered} de {total}
            {run.pending.length > 1 ? ` · quedan ${run.pending.length}` : " · es la última"}
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Preguntas contestadas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
            <div className="h-full bg-brand" style={{ width: `${(100 * answered) / total}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("flex items-center gap-1.5 font-mono text-lg tabular-nums", left < 60_000 && "text-danger")} aria-label={`Tiempo restante ${fmt(left)}`}>
            <Timer aria-hidden className="size-4" />
            {fmt(left)}
          </p>
          <Button variant="outline" size="sm" disabled={run.pending.length < 2} onClick={() => runRef.current && update(skipExam(runRef.current))}>
            <SkipForward aria-hidden /> Saltar <Kbd>S</Kbd>
          </Button>
          {confirmHandIn ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              {run.pending.length ? `Faltan ${run.pending.length}: cuentan como error.` : null}
              <Button size="sm" variant="cta" onClick={() => runRef.current && update(handInExam(runRef.current, Date.now()))}>
                Sí, entregar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmHandIn(false)}>
                Seguir
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConfirmHandIn(true)}>
              Entregar
            </Button>
          )}
        </div>
      </div>
      {ex && q ? (
        <ExerciseCard
          key={`${q.exerciseId}-${answered}-${run.pending.length}`}
          exercise={ex}
          seed={answered + 17}
          allowHints={false}
          reveal={false}
          header={unit ? <span className="text-caption text-muted-foreground">Unidad {String(unit.number).padStart(2, "0")}</span> : null}
          onAnswered={(r) => {
            const current = runRef.current;
            if (current) update(answerExam(current, { correct: r.correct, answer: r.answer, timeMs: r.timeMs, confidence: r.confidence }, Date.now()));
          }}
          onNext={() => undefined}
        />
      ) : null}
    </div>
  );
}
