"use client";

import { useEffect, useRef, useState } from "react";
import { setMathKeyboardInset } from "@/lib/keyboard-inset";
import { useTouchMode } from "@/lib/use-touch-mode";
import { cn } from "@/lib/utils";

/**
 * Entrada de fórmulas con MathLive (docs/02). Se carga solo en el navegador; mientras carga (o si
 * prefieres teclear) hay un campo de texto con la misma sintaxis que aceptan los verificadores:
 * `x^2`, `sqrt(x)`, `(x+1)/(x-1)`, `sin(x)`.
 */

interface MathFieldElement extends HTMLElement {
  value: string;
  getValue(format: "ascii-math" | "latex"): string;
  setValue(value: string): void;
  insert(s: string, options?: { format?: "ascii-math" | "latex" }): boolean;
  smartFence: boolean;
  mathVirtualKeyboardPolicy: string;
}

/** Lo que usamos de `window.mathVirtualKeyboard` (el evento `geometrychange` es un `Event` sin detalle: se lee `boundingRect`). */
interface MathKeyboard extends EventTarget {
  visible: boolean;
  readonly boundingRect: DOMRect;
  show(): void;
  hide(): void;
}

function mathKeyboard(): MathKeyboard | undefined {
  return (window as unknown as { mathVirtualKeyboard?: MathKeyboard }).mathVirtualKeyboard;
}

let configured: Promise<void> | null = null;

function loadMathLive(): Promise<void> {
  configured ??= import("mathlive").then(({ MathfieldElement }) => {
    MathfieldElement.fontsDirectory = "/vendor/mathlive/fonts";
    MathfieldElement.soundsDirectory = null;
  });
  return configured;
}

/** MathLive escribe `\cdot`, `⋅` o `·`; los verificadores ya traducen esos símbolos. */
export function asciiFromMathLive(ascii: string): string {
  return ascii.replace(/⁢/g, "*").replace(/\s+/g, " ").trim();
}

export function MathField({
  value,
  onChange,
  onEnter,
  disabled,
  label,
}: {
  value: string;
  onChange: (ascii: string) => void;
  onEnter: () => void;
  disabled?: boolean;
  label: string;
}) {
  const touch = useTouchMode();
  const touchRef = useRef(touch);
  const [mode, setMode] = useState<"visual" | "texto">("visual");
  const [kbOpen, setKbOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathFieldElement | null>(null);
  const handlers = useRef({ onChange, onEnter, value });
  useEffect(() => {
    handlers.current = { onChange, onEnter, value };
    touchRef.current = touch;
  });

  // Al tocar, MathLive decide solo cuándo mostrar su teclado; con teclado y ratón solo a petición.
  useEffect(() => {
    if (field.current) field.current.mathVirtualKeyboardPolicy = touch ? "auto" : "manual";
  }, [touch, ready]);

  // El teclado de fórmulas es DOM propio: su alto alimenta `--kb` y el campo se centra al abrirlo.
  useEffect(() => {
    if (!touch || !ready) return;
    const kb = mathKeyboard();
    if (!kb) return;
    let wasVisible = false;
    const sync = () => {
      setKbOpen(kb.visible);
      setMathKeyboardInset(kb.visible ? kb.boundingRect.height : 0);
      const mf = field.current;
      if (!mf) return;
      // Deja libre el teclado y la barra de acciones pegada (~6 rem) al centrar el campo.
      mf.style.scrollMarginBottom = kb.visible ? `calc(${kb.boundingRect.height}px + 6rem)` : "";
      // Solo al pasar de oculto a visible: `geometrychange` se repite mientras el teclado cambia de tamaño.
      if (kb.visible && !wasVisible) mf.scrollIntoView({ block: "center" });
      wasVisible = kb.visible;
    };
    kb.addEventListener("geometrychange", sync);
    kb.addEventListener("virtual-keyboard-toggle", sync);
    return () => {
      kb.removeEventListener("geometrychange", sync);
      kb.removeEventListener("virtual-keyboard-toggle", sync);
      setMathKeyboardInset(0);
      setKbOpen(false);
      kb.hide();
    };
  }, [touch, ready]);

  useEffect(() => {
    if (mode !== "visual") return;
    let alive = true;
    loadMathLive().then(
      () => {
        if (!alive || !host.current) return;
        const mf = document.createElement("math-field") as MathFieldElement;
        mf.setAttribute("aria-label", label);
        mf.mathVirtualKeyboardPolicy = touchRef.current ? "auto" : "manual";
        mf.smartFence = true;
        mf.className = "block w-full rounded-md border border-input bg-surface px-3 py-2 text-xl";
        mf.addEventListener("input", () => handlers.current.onChange(asciiFromMathLive(mf.getValue("ascii-math"))));
        mf.addEventListener("keydown", (e) => {
          if ((e as KeyboardEvent).key === "Enter") {
            e.preventDefault();
            handlers.current.onEnter();
          }
        });
        host.current.replaceChildren(mf);
        field.current = mf;
        // Si venías del modo texto, se conserva lo escrito.
        const typed = handlers.current.value;
        if (typed) {
          try {
            mf.insert(typed, { format: "ascii-math" });
          } catch {
            handlers.current.onChange("");
          }
        }
        setReady(true);
        // Al tocar no se enfoca solo: abriría el teclado antes de que leas el enunciado.
        if (!touchRef.current) mf.focus();
      },
      () => alive && setMode("texto"),
    );
    return () => {
      alive = false;
      field.current = null;
      setReady(false);
    };
    // El campo se crea una vez por modo; los manejadores se leen de la ref.
  }, [mode, label]);

  useEffect(() => {
    if (field.current) field.current.toggleAttribute("read-only", Boolean(disabled));
  }, [disabled, ready]);

  return (
    <div className="grid">
      {mode === "visual" ? (
        <div ref={host} className={cn("min-h-12", !ready && "animate-pulse rounded-md bg-surface-2")} />
      ) : (
        <input
          aria-label={label}
          autoFocus={!touch}
          disabled={disabled}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="done"
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          className="h-12 w-full touch:min-h-11 rounded-md border border-input bg-surface px-3 font-mono text-lg"
          placeholder="p. ej. (x+1)/(x-1) o sqrt(x)"
        />
      )}
      {/* En táctil los controles van ARRIBA del campo: el teclado y la barra de acciones tapan lo de abajo. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground touch:order-first touch:mt-0 touch:mb-2">
        {touch && mode === "visual" ? (
          <button
            type="button"
            aria-pressed={kbOpen}
            disabled={disabled || !ready}
            onClick={() => {
              const kb = mathKeyboard();
              if (!kb) return;
              if (kb.visible) kb.hide();
              else {
                field.current?.focus();
                kb.show();
              }
            }}
            className="tactile inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface-2 px-3 text-sm font-medium text-ink disabled:opacity-50"
          >
            {kbOpen ? "Ocultar teclado de fórmulas" : "Teclado de fórmulas"}
          </button>
        ) : null}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-ink touch:inline-flex touch:min-h-11 touch:items-center touch:rounded-md touch:border touch:border-border-strong touch:px-3 touch:text-sm touch:text-ink touch:no-underline"
          onClick={() => setMode((m) => (m === "visual" ? "texto" : "visual"))}
          disabled={disabled}
        >
          {mode === "visual" ? (touch ? "Escribir a mano o con teclado de texto" : "Prefiero teclear como texto") : "Usar el editor de fórmulas"}
        </button>
        {mode === "texto" ? (
          <span>{touch ? "Sintaxis: x^2 · sqrt(x) · sin(x) · (a)/(b). Con el Apple Pencil, escribe en el campo." : "Sintaxis: x^2 · sqrt(x) · sin(x) · (a)/(b)"}</span>
        ) : touch ? (
          <span>Toca el campo y usa el teclado de fórmulas (fracción, potencia, raíz).</span>
        ) : (
          <span>Teclea / para fracción, ^ para potencia</span>
        )}
      </div>
    </div>
  );
}
