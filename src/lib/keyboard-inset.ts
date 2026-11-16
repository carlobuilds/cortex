/*
 * Alto del teclado en pantalla como variable CSS `--kb` (en px) sobre <html>, para que la barra de
 * acciones pegada abajo (`bottom: var(--kb)`) no quede tapada. En Safari de iPad el viewport de
 * diseño no se encoge con el teclado (`env(keyboard-inset-height)` e `interactive-widget` no
 * sirven), así que se mide con `visualViewport`. El teclado de fórmulas de MathLive es DOM propio
 * (no mueve `visualViewport`): su alto llega por `setMathKeyboardInset` (evento `geometrychange`).
 */

let viewportInset = 0;
let mathInset = 0;

function publish(): void {
  const px = Math.max(0, Math.round(Math.max(viewportInset, mathInset)));
  document.documentElement.style.setProperty("--kb", `${px}px`);
}

/**
 * Alto del teclado del sistema a partir de un `visualViewport` (mínimo 0), en unidades de layout.
 * Con zoom por pellizco (`scale` > 1) `vv.height` es `innerHeight / scale` y no dice nada del teclado: 0.
 */
export function viewportKeyboardInset(innerHeight: number, vv: { height: number; offsetTop: number; scale: number }): number {
  if (vv.scale > 1.01) return 0;
  return Math.max(0, innerHeight - vv.height * vv.scale - vv.offsetTop);
}

/** Alto del teclado de fórmulas de MathLive (0 al ocultarlo). */
export function setMathKeyboardInset(px: number): void {
  mathInset = Number.isFinite(px) ? Math.max(0, px) : 0;
  publish();
}

/** Empieza a medir el teclado del sistema; regresa cómo parar (y deja `--kb` en 0). */
export function startKeyboardInset(): () => void {
  const vv = window.visualViewport;
  const update = () => {
    viewportInset = vv ? viewportKeyboardInset(window.innerHeight, vv) : 0;
    publish();
  };
  update();
  vv?.addEventListener("resize", update);
  vv?.addEventListener("scroll", update);
  return () => {
    vv?.removeEventListener("resize", update);
    vv?.removeEventListener("scroll", update);
    viewportInset = 0;
    mathInset = 0;
    document.documentElement.style.removeProperty("--kb");
  };
}
