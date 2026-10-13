"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatNumber, type FunctionVisual, RIEMANN_DEFAULT_N, RIEMANN_MAX_N } from "@/content/core/visuals";
import { compileExpression } from "@/engine/answers/math";
import {
  clampPieces,
  type Curve,
  derivativeAt,
  estimateLimit,
  fitRange,
  type Fn,
  integrate,
  type Interval,
  type LimitEstimate,
  type Point,
  riemannRects,
  type RiemannRule,
  riemannSum,
  safeValue,
  sampleCurve,
  secantSlope,
} from "@/engine/plot";
import { PlotCurve, PlotDot, PlotFrame, PlotLine, PlotRect, PlotSegment } from "./plot-frame";

/*
 * Visuales de Cálculo (docs/01, Fase 3). Reciben el visual ya validado por la guardia del compilador
 * (`resolveVisual`). El control principal es siempre un deslizador nativo: funciona con teclado, lo
 * anuncia el lector de pantalla y no compite con ← → del lector por pasos. Nada se anima solo.
 */

interface Scene {
  readonly f: Fn;
  readonly curve: Curve;
  readonly pieces: Point[][];
  readonly x: Interval;
  readonly y: Interval;
}

function useScene(visual: FunctionVisual): Scene | null {
  return useMemo(() => {
    try {
      const compiled = compileExpression(visual.f, ["x"]);
      const f: Fn = (x) => compiled.evaluate({ x });
      const curve = sampleCurve(f, visual.domain);
      const y = visual.range ?? fitRange(curve);
      return { f, curve, pieces: clampPieces(curve.pieces, y), x: visual.domain, y };
    } catch {
      return null;
    }
  }, [visual]);
}

const same = (p: number, q: number) => Math.abs(p - q) <= 1e-6 * Math.max(1, Math.abs(p), Math.abs(q));

/** La curva con sus cortes: hueco donde se acerca sin llegar, punto relleno donde sí vale, línea punteada en una asíntota. */
function CurveLayer({ scene }: { scene: Scene }) {
  const [lo, hi] = scene.y;
  const span = hi - lo;
  const gone = (v: number) => !Number.isFinite(v) || v < lo - span || v > hi + span;
  return (
    <>
      <PlotCurve pieces={scene.pieces} />
      {scene.curve.breaks.map((b) => {
        if (gone(b.left) || gone(b.right)) return <PlotSegment key={b.x} from={[b.x, lo]} to={[b.x, hi]} dashed />;
        const sides = same(b.left, b.right) ? [b.left] : [b.left, b.right];
        return (
          <g key={b.x}>
            {sides.map((y) => (same(y, b.value) ? null : <PlotDot key={y} at={[b.x, y]} hollow />))}
            {Number.isFinite(b.value) ? <PlotDot at={[b.x, b.value]} /> : null}
          </g>
        );
      })}
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  text,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Lo que se lee junto al control y lo que anuncia el lector de pantalla. */
  text: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="visual-control">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={text} onChange={(e) => onChange(Number(e.target.value))} />
      <output htmlFor={id}>{text}</output>
    </div>
  );
}

function Readout({ children }: { children: ReactNode }) {
  return (
    <div className="visual-readout" role="status" aria-live="polite" aria-atomic="true">
      {children}
    </div>
  );
}

const approx = (value: number) => `≈ ${formatNumber(value)}`;

function Unavailable() {
  return <p className="text-sm text-muted-foreground">No se pudo dibujar esta función.</p>;
}

function GraphVisual({ scene }: { scene: Scene }) {
  return (
    <PlotFrame x={scene.x} y={scene.y}>
      <CurveLayer scene={scene} />
    </PlotFrame>
  );
}

/** Pasos del deslizador de acercamiento: la distancia baja de forma geométrica hasta 0.001. */
const LIMIT_SLIDER_STEPS = 24;
const LIMIT_CLOSEST = 0.001;
/** A partir de esta distancia se muestra la conclusión (antes, que el usuario la vea venir). */
const LIMIT_REVEAL = 0.01;

const sideText = (name: string, estimate: LimitEstimate): string => {
  if (estimate.kind === "finite") return `Por la ${name}, f(x) se acerca a ${approx(estimate.value)}.`;
  if (estimate.kind === "infinite") return `Por la ${name}, f(x) ${estimate.sign > 0 ? "crece" : "baja"} sin tope (→ ${estimate.sign > 0 ? "∞" : "−∞"}).`;
  return `Por la ${name}, f(x) no se acerca a ningún valor.`;
};

function limitConclusion(f: Fn, a: number): string {
  const left = estimateLimit(f, a, -1);
  const right = estimateLimit(f, a, 1);
  const at = safeValue(f, a);
  const here = Number.isNaN(at) ? `En x = ${formatNumber(a)} la función no existe` : `En x = ${formatNumber(a)} la función vale ${formatNumber(at)}`;
  const close = (p: number, q: number) => Math.abs(p - q) <= 1e-3 * Math.max(1, Math.abs(p));
  if (left.kind === "finite" && right.kind === "finite" && close(left.value, right.value)) {
    const limit = (left.value + right.value) / 2;
    const agrees = !Number.isNaN(at) && close(limit, at);
    return `Por los dos lados f(x) se acerca a ${approx(limit)}. ${here}${agrees ? ": coincide con el límite." : ", y al límite eso no le importa."}`;
  }
  return `${sideText("izquierda", left)} ${sideText("derecha", right)} No hay un único valor al que se acerque por los dos lados.`;
}

function LimitVisual({ scene, a }: { scene: Scene; a: number }) {
  const widest = Math.max(Math.min(a - scene.x[0], scene.x[1] - a, 1), 10 * LIMIT_CLOSEST);
  const [step, setStep] = useState(Math.round(LIMIT_SLIDER_STEPS / 4));
  const distance = widest * (LIMIT_CLOSEST / widest) ** (step / LIMIT_SLIDER_STEPS);
  const left: Point = [a - distance, safeValue(scene.f, a - distance)];
  const right: Point = [a + distance, safeValue(scene.f, a + distance)];
  const conclusion = useMemo(() => limitConclusion(scene.f, a), [scene.f, a]);
  const value = (p: Point) => (Number.isNaN(p[1]) ? "no existe" : approx(p[1]));
  return (
    <>
      <PlotFrame x={scene.x} y={scene.y}>
        <PlotSegment from={[a, scene.y[0]]} to={[a, scene.y[1]]} dashed />
        <CurveLayer scene={scene} />
        {Number.isNaN(left[1]) ? null : <PlotDot at={left} tone="xp" />}
        {Number.isNaN(right[1]) ? null : <PlotDot at={right} tone="xp" />}
      </PlotFrame>
      <Slider
        label={`Distancia a x = ${formatNumber(a)}`}
        min={0}
        max={LIMIT_SLIDER_STEPS}
        step={1}
        value={step}
        text={formatNumber(distance)}
        onChange={setStep}
      />
      <Readout>
        <p>
          Izquierda: x = {formatNumber(left[0])}, f(x) {value(left)} · Derecha: x = {formatNumber(right[0])}, f(x) {value(right)}
        </p>
        <p className="visual-conclusion">{distance <= LIMIT_REVEAL ? conclusion : "Acércate más para ver a qué valor se dirige cada lado."}</p>
      </Readout>
    </>
  );
}

const SECANT_SMALLEST = 0.01;
/** Con `h` por debajo de esto, la secante ya casi es la tangente y se muestra la comparación. */
const SECANT_REVEAL = 0.1;

function SecantTangentVisual({ scene, a }: { scene: Scene; a: number }) {
  const widest = Math.max(SECANT_SMALLEST * 2, Math.min(scene.x[1] - a, 2));
  const [h, setH] = useState(Number((widest * 0.75).toFixed(2)));
  const p: Point = [a, safeValue(scene.f, a)];
  const q: Point = [a + h, safeValue(scene.f, a + h)];
  const secant = secantSlope(scene.f, a, h);
  const tangent = derivativeAt(scene.f, a);
  const close = h <= SECANT_REVEAL;
  return (
    <>
      <PlotFrame x={scene.x} y={scene.y}>
        <CurveLayer scene={scene} />
        {close && Number.isFinite(tangent) ? <PlotLine point={p} slope={tangent} tone="success" dashed /> : null}
        {Number.isFinite(secant) ? <PlotLine point={p} slope={secant} tone="xp" /> : null}
        <PlotDot at={p} />
        {Number.isNaN(q[1]) ? null : <PlotDot at={q} tone="xp" />}
      </PlotFrame>
      <Slider label="h" min={SECANT_SMALLEST} max={Number(widest.toFixed(2))} step={0.01} value={h} text={formatNumber(h, 2)} onChange={setH} />
      <Readout>
        <p>
          La secante pasa por x = {formatNumber(a)} y x = {formatNumber(a + h, 2)}. Su pendiente es {Number.isFinite(secant) ? approx(secant) : "indefinida"}.
        </p>
        <p className="visual-conclusion">
          {close && Number.isFinite(tangent)
            ? `Con h tan pequeño la secante casi no se distingue de la tangente (punteada), cuya pendiente es ${approx(tangent)}.`
            : "Encoge h y mira hacia qué recta gira la secante."}
        </p>
      </Readout>
    </>
  );
}

const RULES: readonly { readonly id: RiemannRule; readonly label: string }[] = [
  { id: "left", label: "Izquierda" },
  { id: "mid", label: "Punto medio" },
  { id: "right", label: "Derecha" },
];

function RiemannVisual({ scene, initial }: { scene: Scene; initial: number }) {
  const ruleLabel = useId();
  const [n, setN] = useState(initial);
  const [rule, setRule] = useState<RiemannRule>("left");
  const rects = useMemo(() => riemannRects(scene.f, scene.x, n, rule), [scene, n, rule]);
  const exact = useMemo(() => integrate(scene.f, scene.x), [scene]);
  const sum = riemannSum(rects);
  return (
    <>
      <PlotFrame x={scene.x} y={scene.y}>
        {rects.map((r) => (
          <PlotRect key={r.x0} x0={r.x0} x1={r.x1} height={r.height} />
        ))}
        <CurveLayer scene={scene} />
      </PlotFrame>
      <Slider label="n" min={1} max={RIEMANN_MAX_N} step={1} value={n} text={`${n} ${n === 1 ? "rectángulo" : "rectángulos"}`} onChange={setN} />
      <div className="visual-control">
        <span id={ruleLabel}>Altura tomada en</span>
        <ToggleGroup type="single" value={rule} aria-labelledby={ruleLabel} onValueChange={(v) => (v ? setRule(v as RiemannRule) : undefined)}>
          {RULES.map((r) => (
            <ToggleGroupItem key={r.id} value={r.id}>
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Readout>
        <p>
          Suma de los rectángulos {approx(sum)} · Integral {approx(exact)} · Diferencia {approx(Math.abs(sum - exact))}
        </p>
      </Readout>
    </>
  );
}

/** Dibuja un visual de función. El servidor le pasa el visual resuelto (solo textos y números). */
export function FunctionStage({ visual }: { visual: FunctionVisual }) {
  const scene = useScene(visual);
  if (!scene) return <Unavailable />;
  switch (visual.id) {
    case "grafica":
      return <GraphVisual scene={scene} />;
    case "limite":
      return <LimitVisual scene={scene} a={visual.a ?? 0} />;
    case "secante-tangente":
      return <SecantTangentVisual scene={scene} a={visual.a ?? 0} />;
    case "riemann":
      return <RiemannVisual scene={scene} initial={visual.n ?? RIEMANN_DEFAULT_N} />;
  }
}
