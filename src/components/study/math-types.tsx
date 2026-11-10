"use client";

import { Check } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef } from "react";
import { GraphVisual } from "@/components/visuals/graph-visual";
import { FunctionStage } from "@/components/visuals/function-visuals";
import type { CatalogExercise } from "@/content/core/study-catalog";
import { describeVisual, resolveVisual, type VisualProps } from "@/content/core/visuals";
import { elementKey, formatSet, parseSet, SetError } from "@/engine/answers/sets";
import { displayOrder, TRUTH_STYLE, truthSymbol } from "@/engine/logic/convention";
import { parseFormula } from "@/engine/logic/formula";
import { type TruthTable, truthTable } from "@/engine/logic/truth-table";
import { isTyping } from "@/lib/keyboard";
import { cn } from "@/lib/utils";
import type { InputProps, TypeModule } from "./exercise-types";
import { RichText } from "./rich-text";

/*
 * Tipos de la Fase 3 (docs/05): selección múltiple, conjunto y tabla de verdad, más el visual fijo
 * que puede acompañar a un enunciado. Teclado primero, como el resto de las tarjetas.
 */

const LETTERS = "ABCDEFGH";

// ---------------------------------------------------------------- selección múltiple
function MultiSelectInput({ exercise, draft, setDraft, disabled }: InputProps<readonly number[]>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "seleccion_multiple" }>;
  const toggle = (i: number) => setDraft(draft.includes(i) ? draft.filter((j) => j !== i) : [...draft, i].sort((a, b) => a - b));
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i >= 0 && i < ex.opciones.length) {
        e.preventDefault();
        setDraft(draft.includes(i) ? draft.filter((j) => j !== i) : [...draft, i].sort((a, b) => a - b));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, draft, ex.opciones.length, setDraft]);
  const hint = useId();
  return (
    <div className="grid gap-2">
      <p id={hint} className="text-caption text-muted-foreground">
        Puede haber varias correctas: marca todas. Teclas <span className="kbd">A</span>, <span className="kbd">B</span>, <span className="kbd">C</span>…
      </p>
      <div role="group" aria-label="Opciones" aria-describedby={hint} className="grid gap-2">
        {ex.opciones.map((o, i) => {
          const on = draft.includes(i);
          return (
            <button
              key={i}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(i)}
              className={cn(
                "tactile flex items-center gap-3 rounded-md border bg-surface px-3 py-2.5 text-left hover:border-brand/60 disabled:opacity-80",
                on ? "border-brand bg-surface-2" : "border-border-strong",
              )}
            >
              <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-sm border", on ? "border-brand bg-brand text-brand-ink" : "border-border-strong")}>
                {on ? <Check className="size-3.5" /> : null}
              </span>
              <span className="kbd" aria-hidden>
                {LETTERS[i]}
              </span>
              <RichText text={o} inline />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const multipleSelect: TypeModule<readonly number[]> = {
  initial: () => [],
  Input: MultiSelectInput,
  toAnswer: (_ex, d) => (d.length ? { kind: "choices", indexes: d } : "Marca al menos una opción (teclas A, B, C…)."),
  describe: (ex, d) => (ex.tipo === "seleccion_multiple" ? d.map((i) => ex.opciones[i] ?? String(i)).join(" · ") : ""),
};

// ---------------------------------------------------------------- conjunto
type SetPreview = { readonly ok: true; readonly text: string; readonly count: number } | { readonly ok: false; readonly text: string };

function previewSet(text: string): SetPreview | null {
  if (!text.trim()) return null;
  try {
    const items = parseSet(text);
    return { ok: true, text: formatSet(items), count: new Set(items.map(elementKey)).size };
  } catch (e) {
    return { ok: false, text: e instanceof SetError ? e.message : "No entendí el conjunto." };
  }
}

function SetInput({ draft, setDraft, disabled, onEnter }: InputProps<string>) {
  const hint = useId();
  const preview = useMemo(() => previewSet(draft), [draft]);
  return (
    <div className="grid gap-1.5">
      <input
        aria-label="Tu conjunto"
        aria-describedby={hint}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        className="h-11 w-full rounded-md border border-input bg-surface px-3 font-mono text-base"
        placeholder="{1, 2, 3}"
      />
      <p id={hint} className="text-caption text-muted-foreground">
        Separa los elementos con comas; el orden no importa. Pares: <code>(1, 2)</code>. Vacío: <code>∅</code> o <code>{"{}"}</code>.
      </p>
      <p className={cn("min-h-5 text-sm", preview?.ok === false ? "text-warning" : "text-muted-foreground")} aria-live="polite">
        {preview === null ? null : preview.ok ? (
          <>
            Leo <span className="font-mono text-ink-2">{preview.text}</span> · {preview.count} {preview.count === 1 ? "elemento" : "elementos"}
          </>
        ) : (
          preview.text
        )}
      </p>
    </div>
  );
}

const set: TypeModule<string> = {
  initial: () => "",
  Input: SetInput,
  toAnswer: (_ex, d) => (d.trim() ? { kind: "text", value: d } : "Escribe los elementos (o ∅ si es vacío)."),
  describe: (_ex, d) => d,
};

// ---------------------------------------------------------------- tabla de verdad
type TruthDraft = readonly (boolean | null)[];

function tableOf(ex: CatalogExercise): TruthTable | null {
  if (ex.tipo !== "tabla_verdad") return null;
  try {
    return truthTable(parseFormula(ex.formula));
  } catch {
    return null;
  }
}

const TRUE_KEYS = new Set([TRUTH_STYLE.symbols[0].toLowerCase(), "v", "t", "1"]);
const FALSE_KEYS = new Set([TRUTH_STYLE.symbols[1].toLowerCase(), "f", "0"]);

function TruthTableInput({ exercise, draft, setDraft, disabled }: InputProps<TruthDraft>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "tabla_verdad" }>;
  const table = useMemo(() => tableOf(ex), [ex]);
  const hint = useId();
  // `refs[pos][0|1]`: los botones V y F de cada fila, en el orden en que se ven.
  const refs = useRef<(HTMLButtonElement | null)[][]>([]);
  if (!table) return <p className="text-sm text-danger">No se pudo leer la fórmula de este ejercicio.</p>;

  const order = displayOrder(table.rows.length);
  const label = table.columns.at(-1)?.label ?? ex.formula;
  // Las filas no cambian de lugar, así que el foco se mueve en el acto. (Con `requestAnimationFrame`
  // llegaba tarde al teclear rápido, y nunca con la pestaña oculta: la siguiente tecla caía en la misma fila.)
  const focus = (pos: number, which: 0 | 1) => refs.current[pos]?.[which]?.focus();
  const assign = (row: number, value: boolean) => setDraft(draft.map((v, i) => (i === row ? value : v)));

  const onKey = (e: KeyboardEvent, pos: number, row: number) => {
    if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    const last = order.length - 1;
    if (TRUE_KEYS.has(key) || FALSE_KEYS.has(key)) {
      e.preventDefault();
      const value = TRUE_KEYS.has(key);
      assign(row, value);
      // Llena y baja: así se recorre la tabla con dos teclas.
      focus(Math.min(pos + 1, last), pos < last ? 0 : value ? 0 : 1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const next = e.key === "ArrowDown" ? Math.min(pos + 1, last) : Math.max(pos - 1, 0);
      focus(next, draft[order[next] ?? 0] === false ? 1 : 0);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      const which = e.key === "ArrowLeft" ? 0 : 1;
      assign(row, which === 0);
      focus(pos, which);
    }
  };

  return (
    <div className="grid gap-2">
      <p id={hint} className="text-caption text-muted-foreground">
        Llena la columna de la fórmula. En cada fila: <span className="kbd">{TRUTH_STYLE.symbols[0]}</span> o <span className="kbd">{TRUTH_STYLE.symbols[1]}</span> (también <span className="kbd">1</span>/
        <span className="kbd">0</span>) y baja sola; <span className="kbd">↑</span>/<span className="kbd">↓</span> para moverte.
      </p>
      <div className="truth-scroll" role="region" aria-label="Tabla por llenar" aria-describedby={hint}>
        <table className="truth-table">
          <thead>
            <tr>
              {table.variables.map((v) => (
                <th key={v} scope="col">
                  {v}
                </th>
              ))}
              <th scope="col" data-final>
                {label}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.map((row, pos) => {
              const assignment = table.rows[row] ?? {};
              const rowLabel = `Fila ${pos + 1}: ${table.variables.map((v) => `${v} ${truthSymbol(assignment[v] ?? false)}`).join(", ")}`;
              const value = draft[row] ?? null;
              return (
                <tr key={row}>
                  {table.variables.map((v) => (
                    <td key={v} data-true={assignment[v] ?? false}>
                      {truthSymbol(assignment[v] ?? false)}
                    </td>
                  ))}
                  <td data-final>
                    <div role="radiogroup" aria-label={rowLabel} className="inline-flex gap-1">
                      {([true, false] as const).map((option, which) => {
                        const checked = value === option;
                        // Una sola parada de Tab por fila: la opción marcada, o la primera si no hay.
                        const tabbable = checked || (value === null && which === 0);
                        return (
                          <button
                            key={String(option)}
                            ref={(el) => {
                              (refs.current[pos] ??= [])[which] = el;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            tabIndex={disabled ? -1 : tabbable ? 0 : -1}
                            disabled={disabled}
                            onClick={() => assign(row, option)}
                            onKeyDown={(e) => onKey(e, pos, row)}
                            className={cn(
                              "tactile h-8 min-w-9 rounded-sm border px-2 font-mono text-sm disabled:opacity-80",
                              checked ? "border-brand bg-brand-soft font-semibold text-ink" : "border-border-strong bg-surface text-muted-foreground hover:border-brand/60",
                            )}
                          >
                            {truthSymbol(option)}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const truth: TypeModule<TruthDraft> = {
  initial: (ex) => Array.from({ length: tableOf(ex)?.rows.length ?? (ex.tipo === "tabla_verdad" ? ex.respuesta.length : 0) }, () => null),
  Input: TruthTableInput,
  toAnswer: (_ex, d) => (d.some((v) => v === null) ? "Llena todas las filas de la tabla." : { kind: "truth", values: d }),
  // De arriba abajo, como se ve.
  describe: (_ex, d) =>
    displayOrder(d.length)
      .map((i) => (d[i] === null || d[i] === undefined ? "·" : truthSymbol(d[i] as boolean)))
      .join(" "),
};

export const MATH_TYPE_MODULES = {
  seleccion_multiple: multipleSelect,
  conjunto: set,
  tabla_verdad: truth,
} as const;

// ---------------------------------------------------------------- visual del enunciado
/**
 * El visual fijo de un ejercicio (`visual:` en docs/05): una gráfica o un grafo sin controles que
 * revelen la respuesta. La descripción en texto va debajo, como en las lecciones.
 */
export function ExerciseVisual({ props }: { props: VisualProps }) {
  const resolved = useMemo(() => resolveVisual(props), [props]);
  if (!resolved.ok) return null;
  const { visual } = resolved;
  return (
    <figure className="mt-4 grid gap-2">
      {visual.id === "grafo" ? <GraphVisual graph={visual.graph} interactive={false} /> : visual.id === "grafica" ? <FunctionStage visual={visual} /> : null}
      <figcaption className="text-caption text-muted-foreground">
        <RichText text={describeVisual(visual)} inline />
      </figcaption>
    </figure>
  );
}
