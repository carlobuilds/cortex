/**
 * Preparación del archivo para la hoja de compartir. Safari exige que `navigator.share` se llame
 * dentro del toque, sin esperar nada antes: el archivo debe estar listo de antemano (ver `shareFile`).
 * Sin React ni DOM: el panel solo se suscribe y pinta.
 */
export type BuildResult =
  | { readonly ok: true; readonly file: File; readonly tooBig: string | null; readonly at: number }
  | { readonly ok: false; readonly error: string };

export type PrepState =
  | { readonly status: "idle" }
  | { readonly status: "preparing" }
  | { readonly status: "ready"; readonly file: File; readonly tooBig: string | null; readonly at: number }
  | { readonly status: "failed"; readonly error: string };

export interface PrepSnapshot {
  readonly state: PrepState;
  /** Reintentos seguidos por `NotAllowedError`. */
  readonly retries: number;
  /** El navegador no deja compartir: ya no se ofrece en esta visita. */
  readonly disabled: boolean;
}

/** Al segundo `retry` seguido se deja de ofrecer compartir. */
export const MAX_SHARE_RETRIES = 2;

export class SharePreparer {
  private snap: PrepSnapshot = { state: { status: "idle" }, retries: 0, disabled: false };
  private gen = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly build: () => Promise<BuildResult>) {}

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): PrepSnapshot => this.snap;

  private set(patch: Partial<PrepSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    for (const l of this.listeners) l();
  }

  /** Prepara un archivo con los datos de ahora. Una preparación vieja que termina tarde no pisa a la nueva. */
  async prepare(): Promise<PrepState> {
    const mine = ++this.gen;
    this.set({ state: { status: "preparing" } });
    let r: BuildResult;
    try {
      r = await this.build();
    } catch (e) {
      r = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (mine !== this.gen) return this.snap.state;
    this.set({ state: r.ok ? { status: "ready", file: r.file, tooBig: r.tooBig, at: r.at } : { status: "failed", error: r.error } });
    return this.snap.state;
  }

  /** Descarta el archivo y cualquier preparación en vuelo (los datos pudieron cambiar o la página se oculta). */
  invalidate(): void {
    this.gen++;
    this.set({ state: { status: "idle" } });
  }

  /** Entrega el archivo listo y lo consume: un archivo, un uso. */
  take(): Extract<PrepState, { status: "ready" }> | null {
    const s = this.snap.state;
    if (s.status !== "ready") return null;
    this.gen++;
    this.set({ state: { status: "idle" } });
    return s;
  }

  /** Cuenta un `NotAllowedError` seguido; devuelve `true` si ya toca dejar de ofrecer compartir. */
  noteRetry(): boolean {
    const retries = this.snap.retries + 1;
    const disabled = retries >= MAX_SHARE_RETRIES;
    this.set({ retries, disabled: this.snap.disabled || disabled });
    return disabled;
  }

  resetRetries(): void {
    if (this.snap.retries !== 0) this.set({ retries: 0 });
  }
}
