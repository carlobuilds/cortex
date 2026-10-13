"use client";

import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { displayOrder, truthSymbol } from "@/engine/logic/convention";
import { FormulaError, parseFormula } from "@/engine/logic/formula";
import { classify, finalColumn, type FormulaClass, truthTable } from "@/engine/logic/truth-table";

/*
 * Simulador de tablas de verdad (docs/01, Fase 3). La fórmula se puede editar: la tabla se vuelve a
 * calcular con el mismo intérprete que califica los ejercicios. El orden de las filas y los símbolos
 * salen de `engine/logic/convention.ts`.
 */

const INSERTS: readonly { readonly symbol: string; readonly name: string }[] = [
  { symbol: "¬", name: "negación" },
  { symbol: "∧", name: "conjunción (y)" },
  { symbol: "∨", name: "disyunción (o)" },
  { symbol: "→", name: "condicional (si… entonces)" },
  { symbol: "↔", name: "bicondicional (si y solo si)" },
  { symbol: "⊕", name: "disyunción exclusiva" },
  { symbol: "(", name: "abrir paréntesis" },
  { symbol: ")", name: "cerrar paréntesis" },
];

const VERDICT: Readonly<Record<FormulaClass, string>> = {
  tautology: "Es una tautología: verdadera en todas las filas.",
  contradiction: "Es una contradicción: falsa en todas las filas.",
  contingency: "Es una contingencia: verdadera en unas filas y falsa en otras.",
};

/** Dentro de la tabla, ← y → desplazan la tabla; sin esto el lector por pasos cambiaría de paso. */
const keepArrows = (e: KeyboardEvent) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
};

export function TruthTableVisual({ initial }: { initial: string }) {
  const inputId = useId();
  const stepsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initial);
  const [steps, setSteps] = useState(true);

  const result = useMemo(() => {
    try {
      const formula = parseFormula(text);
      return { ok: true as const, table: truthTable(formula), kind: classify(formula) };
    } catch (e) {
      return { ok: false as const, message: e instanceof FormulaError ? e.message : "No entendí la fórmula." };
    }
  }, [text]);

  const insert = (symbol: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    // Se actualiza de inmediato para poder dejar el cursor justo después de lo insertado y seguir
    // escribiendo. (Con `requestAnimationFrame` no pasaba nada si la pestaña estaba oculta.)
    flushSync(() => setText(text.slice(0, start) + symbol + text.slice(end)));
    el?.focus();
    el?.setSelectionRange(start + symbol.length, start + symbol.length);
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor={inputId} className="text-label font-medium text-ink-2">
          Fórmula
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!result.ok}
          className="w-full rounded-md border border-input bg-surface-2 px-3 py-2 font-mono text-base"
        />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Insertar símbolo">
          {INSERTS.map((s) => (
            <Button key={s.symbol} type="button" variant="outline" size="sm" className="min-w-8 px-2 font-mono text-sm" aria-label={`Insertar ${s.name}`} onClick={() => insert(s.symbol)}>
              {s.symbol}
            </Button>
          ))}
          {text === initial ? null : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setText(initial)}>
              Restablecer
            </Button>
          )}
        </div>
        <p className="text-caption text-muted-foreground">
          También puedes escribir <code>~</code>, <code>&amp;</code>, <code>|</code>, <code>-&gt;</code>, <code>&lt;-&gt;</code> o las palabras <code>no</code>, <code>y</code>, <code>o</code>.
        </p>
      </div>

      {result.ok ? (
        <>
          {result.table.columns.length > 1 ? (
            <div className="visual-control">
              <label htmlFor={stepsId}>Columnas intermedias</label>
              <Switch id={stepsId} checked={steps} onCheckedChange={setSteps} />
            </div>
          ) : null}
          <div className="truth-scroll" role="region" aria-label="Tabla de verdad" tabIndex={0} onKeyDown={keepArrows}>
            <table className="truth-table">
              <thead>
                <tr>
                  {result.table.variables.map((v) => (
                    <th key={v} scope="col">
                      {v}
                    </th>
                  ))}
                  {result.table.columns.map((c, i) =>
                    steps || i === result.table.columns.length - 1 ? (
                      <th key={c.label} scope="col" data-final={i === result.table.columns.length - 1}>
                        {c.label}
                      </th>
                    ) : null,
                  )}
                </tr>
              </thead>
              <tbody>
                {displayOrder(result.table.rows.length).map((row) => (
                  <tr key={row}>
                    {result.table.variables.map((v) => {
                      const value = result.table.rows[row]?.[v] ?? false;
                      return (
                        <td key={v} data-true={value}>
                          {truthSymbol(value)}
                        </td>
                      );
                    })}
                    {result.table.columns.map((c, i) => {
                      if (!steps && i !== result.table.columns.length - 1) return null;
                      const value = c.values[row] ?? false;
                      return (
                        <td key={c.label} data-true={value} data-final={i === result.table.columns.length - 1}>
                          {truthSymbol(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="visual-readout" role="status" aria-live="polite" aria-atomic="true">
            <p className="visual-conclusion">{VERDICT[result.kind]}</p>
            <p>
              Verdadera en {finalColumn(result.table).filter(Boolean).length} de {result.table.rows.length} {result.table.rows.length === 1 ? "fila" : "filas"}.
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-danger" role="status" aria-live="polite">
          {result.message}
        </p>
      )}
    </div>
  );
}
