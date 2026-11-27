"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { codeModule, debugModule, parsonsModule, traceModule } from "@/components/code/code-types";
import { Button } from "@/components/ui/button";
import { type ComponentType, Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import type { CatalogExercise } from "@/content/core/study-catalog";
import { splitBlanks } from "@/content/core/blanks";
import type { Answer } from "@/engine/answers/check";
import { displayOrder, truthSymbol } from "@/engine/logic/convention";
import { parseFormula } from "@/engine/logic/formula";
import { truthTable } from "@/engine/logic/truth-table";
import { createRng, seedFrom, shuffle } from "@/engine/rng";
import { cn } from "@/lib/utils";
import { MathField } from "./math-field";
import { RichText } from "./rich-text";
import { isTyping } from "@/lib/keyboard";

/**
 * Un módulo por tipo de ejercicio: borrador inicial, componente de entrada y cómo se convierte
 * el borrador en una `Answer` para el verificador. La Fase 2 agrega los de código aquí mismo.
 */

export interface InputProps<D> {
  readonly exercise: CatalogExercise;
  readonly draft: D;
  readonly setDraft: (d: D) => void;
  readonly disabled: boolean;
  /** Enviar (Enter en un campo de una línea). */
  readonly onEnter: () => void;
}

export interface TypeModule<D> {
  initial(ex: CatalogExercise, seed: number): D;
  readonly Input: ComponentType<InputProps<D>>;
  /** `string` = mensaje de por qué todavía no se puede enviar. */
  toAnswer(ex: CatalogExercise, d: D): Answer | string | Promise<Answer | string>;
  /** Texto que se guarda en el intento (para el cuaderno de errores). */
  describe(ex: CatalogExercise, d: D): string;
}

const inputClass = "h-11 w-full rounded-md border border-input bg-surface px-3 font-mono text-base";


// ---------------------------------------------------------------- opción múltiple
const LETTERS = "ABCDEFGH";

function ChoiceInput({ exercise, draft, setDraft, disabled }: InputProps<number | null>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "opcion_multiple" }>;
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i >= 0 && i < ex.opciones.length) {
        e.preventDefault();
        setDraft(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, ex.opciones.length, setDraft]);
  return (
    <div role="radiogroup" aria-label="Opciones" className="grid gap-2">
      {ex.opciones.map((o, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={draft === i}
          disabled={disabled}
          onClick={() => setDraft(i)}
          className={cn(
            "tactile flex items-center gap-3 rounded-md border bg-surface px-3 py-2.5 text-left hover:border-brand/60 disabled:opacity-80",
            draft === i ? "border-brand bg-surface-2" : "border-border-strong",
          )}
        >
          <span className="kbd" aria-hidden>
            {LETTERS[i]}
          </span>
          <RichText text={o} inline />
        </button>
      ))}
    </div>
  );
}

const choice: TypeModule<number | null> = {
  initial: () => null,
  Input: ChoiceInput,
  toAnswer: (_ex, d) => (d === null ? "Elige una opción (teclas A, B, C...)." : { kind: "choice", index: d }),
  describe: (ex, d) => (ex.tipo === "opcion_multiple" && d !== null ? (ex.opciones[d] ?? String(d)) : ""),
};

// ---------------------------------------------------------------- numérico y salida
function NumericInput({ draft, setDraft, disabled, onEnter }: InputProps<string>) {
  return (
    <input
      aria-label="Tu respuesta"
      autoFocus
      inputMode="decimal"
      autoComplete="off"
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
      className={inputClass}
      placeholder="Número, fracción (1/3), expresión (sqrt(2)/2) o infinito (oo)"
    />
  );
}

const numeric: TypeModule<string> = {
  initial: () => "",
  Input: NumericInput,
  toAnswer: (_ex, d) => (d.trim() ? { kind: "text", value: d } : "Escribe tu respuesta."),
  describe: (_ex, d) => d,
};

function SymbolicInput({ exercise, draft, setDraft, disabled, onEnter }: InputProps<string>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "simbolico" }>;
  return (
    <div className="grid gap-1.5">
      <MathField label="Tu expresión" value={draft} onChange={setDraft} onEnter={onEnter} disabled={disabled} />
      {ex.salvo_constante ? <p className="text-caption text-muted-foreground">La constante de integración es opcional: puedes escribir + C o dejarla fuera.</p> : null}
    </div>
  );
}

const symbolic: TypeModule<string> = { ...numeric, Input: SymbolicInput };

function OutputInput({ exercise, draft, setDraft, disabled, onEnter }: InputProps<string>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "predecir_salida" }>;
  return (
    <div className="grid gap-3">
      <pre className="code-view" aria-label={`Código en ${ex.lenguaje}`}>
        {ex.codigo.replace(/\n$/, "")}
      </pre>
      <label className="grid gap-1.5">
        <span className="eyebrow">Salida exacta (una línea por renglón)</span>
        <textarea
          aria-label="Salida exacta"
          autoFocus
          disabled={disabled}
          value={draft}
          spellCheck={false}
          rows={Math.max(2, Math.min(8, draft.split("\n").length + 1))}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onEnter();
            }
          }}
          className="w-full rounded-md border border-input bg-surface px-3 py-2 font-mono text-base"
        />
        <span className="text-xs text-muted-foreground">
          <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> para comprobar
        </span>
      </label>
    </div>
  );
}

const output: TypeModule<string> = { ...numeric, Input: OutputInput };

// ---------------------------------------------------------------- completar
function BlanksInput({ exercise, draft, setDraft, disabled, onEnter }: InputProps<string[]>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "completar" }>;
  const parts = splitBlanks(ex.texto);
  return (
    <p className="rich text-lg leading-[2.4]">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part ? <RichText text={part} inline /> : null}
          {i < parts.length - 1 ? (
            <input
              aria-label={`Hueco ${i + 1} de ${parts.length - 1}`}
              autoFocus={i === 0}
              disabled={disabled}
              value={draft[i] ?? ""}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setDraft(draft.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEnter();
                }
              }}
              style={{ width: `${Math.max(5, (draft[i] ?? "").length + 2)}ch` }}
              className="mx-1 inline-block h-9 rounded-sm border-b-2 border-dashed border-xp bg-surface-2 px-2 align-baseline font-mono text-base"
            />
          ) : null}
        </Fragment>
      ))}
    </p>
  );
}

const blanks: TypeModule<string[]> = {
  initial: (ex) => (ex.tipo === "completar" ? ex.respuestas.map(() => "") : []),
  Input: BlanksInput,
  toAnswer: (_ex, d) => (d.some((v) => !v.trim()) ? "Llena todos los huecos." : { kind: "blanks", values: d }),
  describe: (_ex, d) => d.join(" · "),
};

// ---------------------------------------------------------------- ordenar
function OrderInput({ draft, setDraft, disabled }: InputProps<string[]>) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j] as string, next[i] as string];
    setDraft(next);
    requestAnimationFrame(() => refs.current[j]?.focus());
  };
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Enfoca un paso y usa <span className="kbd">Alt</span> + <span className="kbd">↑</span>/<span className="kbd">↓</span>, o los botones.
      </p>
      <ol className="grid gap-2" aria-label="Pasos en tu orden">
        {draft.map((item, i) => (
          <li
            key={item}
            ref={(el) => {
              refs.current[i] = el;
            }}
            tabIndex={disabled ? -1 : 0}
            aria-label={`Paso ${i + 1}`}
            onKeyDown={(e) => {
              if (disabled || !e.altKey) return;
              if (e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              }
            }}
            className="flex items-center gap-3 rounded-md border bg-surface px-3 py-2"
          >
            <span className="font-mono text-sm text-xp-text tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <RichText text={item} inline />
            </span>
            <span className="flex gap-1">
              <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Subir paso ${i + 1}`} className="rounded-sm p-1 hover:bg-surface-2 disabled:opacity-30">
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button type="button" disabled={disabled || i === draft.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar paso ${i + 1}`} className="rounded-sm p-1 hover:bg-surface-2 disabled:opacity-30">
                <ArrowDown className="size-4" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Baraja con semilla; si por azar queda en el orden correcto, rota uno. */
export function shuffledOrder(items: readonly string[], seed: number): string[] {
  const out = shuffle(createRng(seed), items);
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift() as string);
  return out;
}

const order: TypeModule<string[]> = {
  initial: (ex, seed) => (ex.tipo === "ordenar" ? shuffledOrder(ex.elementos, seed ^ seedFrom(ex.id)) : []),
  Input: OrderInput,
  toAnswer: (_ex, d) => ({ kind: "order", items: d }),
  describe: (_ex, d) => d.join(" → "),
};

// ---------------------------------------------------------------- autoevaluación
export interface SelfDraft {
  readonly text: string;
  readonly met: readonly boolean[];
}

function SelfInput({ draft, setDraft, disabled, onEnter }: InputProps<SelfDraft>) {
  return (
    <label className="grid gap-1.5">
      <span className="eyebrow">Tu explicación (con tus palabras)</span>
      <textarea
        autoFocus
        disabled={disabled}
        value={draft.text}
        rows={5}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onEnter();
          }
        }}
        className="w-full rounded-md border border-input bg-surface px-3 py-2 text-base"
      />
      <span className="text-xs text-muted-foreground">
        Después compararás con una respuesta modelo y una rúbrica. <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span>
      </span>
    </label>
  );
}

const self: TypeModule<SelfDraft> = {
  initial: (ex) => ({ text: "", met: ex.tipo === "autoevaluacion" ? ex.rubrica.map(() => false) : [] }),
  Input: SelfInput,
  toAnswer: (_ex, d) => (d.text.trim() ? { kind: "self", text: d.text, met: d.met } : "Escribe tu explicación antes de compararla."),
  describe: (_ex, d) => d.text,
};

// ---------------------------------------------------------------- selección múltiple (Fase 3)
function MultiSelectInput({ exercise, draft, setDraft, disabled }: InputProps<readonly number[]>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "seleccion_multiple" }>;
  const toggle = useCallback((i: number) => setDraft(draft.includes(i) ? draft.filter((x) => x !== i) : [...draft, i].sort((a, b) => a - b)), [draft, setDraft]);
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i >= 0 && i < ex.opciones.length) {
        e.preventDefault();
        toggle(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, ex.opciones.length, toggle]);
  return (
    <div className="grid gap-2">
      <p className="text-caption text-muted-foreground">
        Marca <strong className="font-semibold text-ink-2">todas</strong> las correctas: puede ser más de una. Las teclas A, B, C… marcan y desmarcan.
      </p>
      <div role="group" aria-label="Opciones (puedes marcar varias)" className="grid gap-2">
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
              <span className="kbd" aria-hidden>
                {LETTERS[i]}
              </span>
              <span aria-hidden className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", on ? "border-brand bg-brand text-brand-ink" : "border-border-strong")}>
                {on ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <RichText text={o} inline />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const multiSelect: TypeModule<readonly number[]> = {
  initial: () => [],
  Input: MultiSelectInput,
  toAnswer: (_ex, d) => (d.length ? { kind: "choices", indexes: d } : "Marca al menos una opción (teclas A, B, C...)."),
  describe: (ex, d) => (ex.tipo === "seleccion_multiple" ? d.map((i) => ex.opciones[i] ?? String(i)).join(" · ") : ""),
};

// ---------------------------------------------------------------- tabla de verdad (Fase 3)
type TruthDraft = readonly (boolean | null)[];

const TRUE_KEYS = new Set(["v", "t", "1"]);
const FALSE_KEYS = new Set(["f", "0"]);

/**
 * Se llena la columna de la fórmula. El borrador va en orden canónico (el de `respuesta`); la tabla
 * se muestra en el orden y con los símbolos de `engine/logic/convention.ts`. Teclado: V/F (o 1/0)
 * llena la casilla y baja a la siguiente; ↑/↓ se mueven; Espacio o clic cambian el valor.
 */
function TruthInput({ exercise, draft, setDraft, disabled }: InputProps<TruthDraft>) {
  const ex = exercise as Extract<CatalogExercise, { tipo: "tabla_verdad" }>;
  const table = useMemo(() => {
    try {
      return truthTable(parseFormula(ex.formula));
    } catch {
      return null;
    }
  }, [ex.formula]);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  if (!table) {
    return (
      <p role="alert" className="text-sm text-warning">
        Este ejercicio tiene un error en su fórmula. Repórtalo con el botón de reporte.
      </p>
    );
  }
  const order = displayOrder(table.rows.length);
  const label = table.columns.at(-1)?.label ?? ex.formula;
  const filled = draft.filter((v) => v !== null).length;
  const put = (row: number, value: boolean) => setDraft(draft.map((v, i) => (i === row ? value : v)));
  const focusAt = (pos: number) => cells.current[Math.max(0, Math.min(order.length - 1, pos))]?.focus();
  const rowText = (row: number) => table.variables.map((v) => `${v} = ${truthSymbol(table.rows[row]?.[v] ?? false)}`).join(", ");

  return (
    <div className="grid gap-2">
      <p className="text-caption text-muted-foreground">
        Llena la columna de la fórmula: en cada casilla escribe <span className="kbd">{truthSymbol(true)}</span> o <span className="kbd">{truthSymbol(false)}</span> y baja sola a la siguiente;{" "}
        <span className="kbd">↑</span> <span className="kbd">↓</span> para moverte, clic o <span className="kbd">Espacio</span> para cambiar.
      </p>
      <div className="truth-scroll" role="region" aria-label="Tabla de verdad por llenar">
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
              const value = draft[row] ?? null;
              return (
                <tr key={row}>
                  {table.variables.map((v) => {
                    const truth = table.rows[row]?.[v] ?? false;
                    return (
                      <td key={v} data-true={truth}>
                        {truthSymbol(truth)}
                      </td>
                    );
                  })}
                  <td data-final data-input data-true={value === null ? undefined : value}>
                    <button
                      ref={(el) => {
                        cells.current[pos] = el;
                      }}
                      type="button"
                      className="truth-cell"
                      disabled={disabled}
                      autoFocus={pos === 0}
                      aria-label={`Fila ${pos + 1} (${rowText(row)}): ${value === null ? "sin llenar" : `vale ${truthSymbol(value)}`}`}
                      onClick={() => put(row, value !== true)}
                      onKeyDown={(e) => {
                        if (e.metaKey || e.ctrlKey || e.altKey) return;
                        const key = e.key.toLowerCase();
                        if (TRUE_KEYS.has(key) || FALSE_KEYS.has(key)) {
                          e.preventDefault();
                          e.stopPropagation();
                          put(row, TRUE_KEYS.has(key));
                          focusAt(pos + 1);
                        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          e.stopPropagation();
                          focusAt(pos + (e.key === "ArrowDown" ? 1 : -1));
                        }
                      }}
                    >
                      {value === null ? <span aria-hidden className="text-muted-foreground">·</span> : truthSymbol(value)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {filled} de {order.length} filas llenas
      </p>
    </div>
  );
}

const truth: TypeModule<TruthDraft> = {
  initial: (ex) => (ex.tipo === "tabla_verdad" ? ex.respuesta.map(() => null) : []),
  Input: TruthInput,
  toAnswer: (_ex, d) => {
    const missing = d.filter((v) => v === null).length;
    if (missing) return `Llena todas las filas (${missing === 1 ? "falta 1" : `faltan ${missing}`}).`;
    return { kind: "truth", values: d };
  },
  // Para el cuaderno: la columna como se ve, de arriba abajo.
  describe: (_ex, d) =>
    displayOrder(d.length)
      .map((i) => {
        const value = d[i];
        return value === null || value === undefined ? "·" : truthSymbol(value);
      })
      .join(" "),
};

// ---------------------------------------------------------------- conjunto (Fase 3)
function SetInput({ draft, setDraft, disabled, onEnter }: InputProps<string>) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="font-mono text-2xl text-muted-foreground">
          {"{"}
        </span>
        <input
          aria-label="Elementos del conjunto, separados por comas"
          autoFocus
          autoComplete="off"
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
          className={inputClass}
          placeholder="1, 2, 3"
        />
        <span aria-hidden className="font-mono text-2xl text-muted-foreground">
          {"}"}
        </span>
        <Button type="button" variant="outline" size="sm" className="font-mono" disabled={disabled} onClick={() => setDraft("∅")} aria-label="Conjunto vacío">
          ∅
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">
        Separa con comas; el orden y los repetidos no importan. Un par ordenado va entre paréntesis: <code>(1, 2)</code>. Si no tiene elementos: <code>∅</code>.
      </p>
    </div>
  );
}

const set: TypeModule<string> = {
  initial: () => "",
  Input: SetInput,
  // Vacío no es ∅: así un Enter por accidente no responde «el conjunto vacío».
  toAnswer: (_ex, d) => (d.trim() ? { kind: "text", value: d } : "Escribe los elementos (o ∅ si no tiene ninguno)."),
  describe: (_ex, d) => d,
};

/** Un módulo por tipo de ejercicio (los de código, de la Fase 2, viven en `components/code`). */
export const TYPE_MODULES: Record<string, TypeModule<never>> = {
  codigo: codeModule as unknown as TypeModule<never>,
  depurar: debugModule as unknown as TypeModule<never>,
  parsons: parsonsModule as unknown as TypeModule<never>,
  rastreo_memoria: traceModule as unknown as TypeModule<never>,
  opcion_multiple: choice as unknown as TypeModule<never>,
  numerico: numeric as unknown as TypeModule<never>,
  simbolico: symbolic as unknown as TypeModule<never>,
  completar: blanks as unknown as TypeModule<never>,
  ordenar: order as unknown as TypeModule<never>,
  predecir_salida: output as unknown as TypeModule<never>,
  autoevaluacion: self as unknown as TypeModule<never>,
  seleccion_multiple: multiSelect as unknown as TypeModule<never>,
  tabla_verdad: truth as unknown as TypeModule<never>,
  conjunto: set as unknown as TypeModule<never>,
};

/** ¿La app ya sabe jugar este tipo de ejercicio? Los que no, se omiten de práctica, repaso y jefes. */
export function isPlayable(ex: { tipo: string }): boolean {
  return ex.tipo in TYPE_MODULES;
}
