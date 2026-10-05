"use client";

import { ArrowLeft, ArrowRight, BookOpen, ListOrdered } from "lucide-react";
import { Children, createContext, isValidElement, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/state";
import { isTyping } from "@/lib/keyboard";
import { cn } from "@/lib/utils";

/*
 * Lector por pasos (ADR-020, "no un libro"): una sección a la vez, con riel, teclado y "ver todo".
 * En el servidor (y sin JS) se ve la lección completa; content:check y las pruebas leen todo.
 */

type Mode = "steps" | "all";
const MODE_KEY = "cortex-lesson-mode";
const stepKey = () => `cortex-lesson-step:${window.location.pathname}`;

interface StepsState {
  readonly current: number;
  readonly mode: Mode;
  readonly go: (i: number) => void;
}
const StepsContext = createContext<StepsState>({ current: 0, mode: "all", go: () => {} });

/** "¿Ya llegó al último paso?" para que la tarjeta de la unidad resalte el mini quiz. */
let atEnd = false;
const listeners = new Set<() => void>();
function setAtEnd(v: boolean) {
  if (v === atEnd) return;
  atEnd = v;
  listeners.forEach((l) => l());
}
export function useLessonAtEnd(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => atEnd,
    () => false,
  );
}

function readMode(): Mode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "all" ? "all" : "steps";
  } catch {
    return "steps";
  }
}

interface StepMeta {
  readonly title: string;
  readonly slug: string;
}

export function LessonSteps({ children }: { children?: ReactNode }) {
  const steps = useMemo<StepMeta[]>(
    () =>
      Children.toArray(children)
        .filter(isValidElement)
        .map((c) => {
          const p = c.props as { title?: string; slug?: string };
          return { title: p.title ?? "", slug: p.slug ?? "" };
        }),
    [children],
  );
  const total = steps.length;
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<Mode>("all");
  const [ready, setReady] = useState(false);
  const live = useRef<HTMLParagraphElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // Al montar: modo guardado y paso (#ancla > el último que leíste en esta pestaña > el primero).
  useLayoutEffect(() => {
    const fromHash = steps.findIndex((s) => `#${s.slug}` === window.location.hash);
    let saved = 0;
    try {
      saved = Number(window.sessionStorage.getItem(stepKey()) ?? 0);
    } catch {
      // Sin sessionStorage se empieza en el paso 1.
    }
    const start = fromHash >= 0 ? fromHash : Number.isInteger(saved) && saved >= 0 && saved < total ? saved : 0;
    // Una sola vez al montar: leer el navegador antes de pintar evita un salto visible de paso.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCurrent(start);
    setMode(fromHash >= 0 ? "steps" : readMode());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [steps, total]);

  useEffect(() => {
    if (!ready) return;
    setAtEnd(mode === "all" || current === total - 1);
    try {
      window.sessionStorage.setItem(stepKey(), String(current));
    } catch {
      // Sin sessionStorage no se recuerda el paso; no pasa nada.
    }
  }, [current, mode, ready, total]);
  useEffect(() => () => setAtEnd(false), []);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(total - 1, i));
      setCurrent(next);
      setMode("steps");
      requestAnimationFrame(() => {
        const section = root.current?.querySelector<HTMLElement>(`[data-step="${next}"]`);
        const target = section?.querySelector<HTMLElement>(":scope > h2") ?? section;
        if (target) {
          target.tabIndex = -1;
          target.focus({ preventScroll: true });
          const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
          root.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
        }
        if (live.current) live.current.textContent = `Paso ${next + 1} de ${total}: ${steps[next]?.title ?? ""}`;
      });
    },
    [steps, total],
  );

  const toggleAll = useCallback(() => {
    setMode((m) => {
      const next: Mode = m === "all" ? "steps" : "all";
      try {
        window.localStorage.setItem(MODE_KEY, next);
      } catch {
        // Sin localStorage la preferencia dura lo que la pestaña.
      }
      return next;
    });
  }, []);

  // Teclado: → / N siguiente, ← / P anterior, V ver todo. Nunca mientras escribes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || e.defaultPrevented) return;
      const k = e.key.toLowerCase();
      if (k === "v") toggleAll();
      else if (mode === "steps" && (e.key === "ArrowRight" || k === "n") && current < total - 1) go(current + 1);
      else if (mode === "steps" && (e.key === "ArrowLeft" || k === "p") && current > 0) go(current - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, mode, toggleAll, total]);

  const state = useMemo<StepsState>(() => ({ current, mode: ready ? mode : "all", go }), [current, go, mode, ready]);
  const stepsMode = ready && mode === "steps";

  return (
    <StepsContext.Provider value={state}>
      <div ref={root} data-lesson-steps="" data-ready={ready || undefined} className="scroll-mt-[calc(var(--header-h)+0.5rem)]">
        <div className="sticky top-[var(--header-h)] z-30 -mx-4 mb-6 border-b bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <nav aria-label="Pasos de la lección" className="flex items-center gap-3 sm:gap-4">
            <p className="min-w-0 shrink truncate text-label sm:max-w-[45%]">
              {stepsMode ? (
                <>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {current + 1}/{total}
                  </span>{" "}
                  · <span className="font-semibold">{steps[current]?.title}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Lección completa · {total} pasos</span>
              )}
            </p>
            {/* list-none/m-0/p-0: el riel vive dentro de .lesson-prose, que numera y separa sus listas. */}
            <ol className="m-0 flex min-w-0 flex-1 list-none gap-1 p-0">
              {steps.map((s, i) => {
                const isCurrent = stepsMode && i === current;
                const done = stepsMode && i < current;
                return (
                  <li key={s.slug} className="m-0 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Paso ${i + 1}: ${s.title}`}
                      aria-current={isCurrent ? "step" : undefined}
                      className="group block w-full rounded-sm py-2"
                    >
                      <span
                        aria-hidden
                        className={cn("block h-1.5 rounded-full group-hover:bg-brand/70", isCurrent ? "bg-brand" : done || !stepsMode ? "bg-brand/40" : "bg-surface-3")}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={toggleAll}
              aria-pressed={!stepsMode}
              className="tactile inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-label text-ink-2 hover:text-ink aria-pressed:bg-brand-soft aria-pressed:text-brand"
            >
              {stepsMode ? <BookOpen aria-hidden className="size-4" /> : <ListOrdered aria-hidden className="size-4" />}
              <span className="max-sm:sr-only">{stepsMode ? "Ver toda la lección" : "Ver por pasos"}</span>
              <Kbd>V</Kbd>
            </button>
          </nav>
        </div>

        <p ref={live} aria-live="polite" className="sr-only" />
        {children}

        {stepsMode ? (
          <div className="mt-10 flex items-center justify-between gap-3 border-t pt-6 max-lg:sticky max-lg:bottom-0 max-lg:-mx-4 max-lg:border-t max-lg:bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] max-lg:px-4 max-lg:py-3 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:backdrop-blur sm:max-lg:-mx-6 sm:max-lg:px-6">
            <Button variant="secondary" onClick={() => go(current - 1)} disabled={current === 0}>
              <ArrowLeft aria-hidden /> <span className="max-sm:sr-only">Paso anterior</span> <Kbd>←</Kbd>
            </Button>
            {current < total - 1 ? (
              <Button variant="cta" onClick={() => go(current + 1)}>
                Paso siguiente <Kbd className="border-brand-ink/40 text-brand-ink">→</Kbd> <ArrowRight aria-hidden />
              </Button>
            ) : (
              <p className="text-right text-sm text-ink-2">Terminaste la lección. El mini quiz la completa.</p>
            )}
          </div>
        ) : null}
      </div>
    </StepsContext.Provider>
  );
}

/**
 * Un paso. En modo "pasos" los que no tocan quedan `hidden="until-found"` (Ctrl+F los encuentra y
 * salta a ellos); React no maneja ese valor, así que se pone directo en el DOM.
 */
export function LessonStep({ index, title, slug, children }: { index: string; title: string; slug: string; children?: ReactNode }) {
  const { current, mode, go } = useContext(StepsContext);
  const i = Number(index);
  const ref = useRef<HTMLElement>(null);
  const hidden = mode === "steps" && i !== current;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (hidden) el.setAttribute("hidden", "until-found");
    else el.removeAttribute("hidden");
  }, [hidden]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMatch = () => go(i);
    el.addEventListener("beforematch", onMatch);
    return () => el.removeEventListener("beforematch", onMatch);
  }, [go, i]);
  return (
    <section ref={ref} id={slug} data-step={i} aria-label={title} className="lesson-step">
      {children}
    </section>
  );
}

