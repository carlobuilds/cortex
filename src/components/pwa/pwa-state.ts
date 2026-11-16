/** Lógica pura de la PWA del iPad (sin React ni DOM) para poder probarla con Vitest. */

export type OfflineState =
  | { kind: "unavailable" }
  | { kind: "preparing" }
  | { kind: "incomplete" }
  | { kind: "ready"; version: string; updatePending: boolean };

/** Respuesta del service worker al mensaje `cortex:status`. */
export interface WorkerStatus {
  version: string;
  complete: boolean;
}

/** El service worker solo existe en la build del iPad (`CORTEX_PWA=1`), nunca en `pnpm dev` ni en la Mac. */
export function isPwaBuild(flag: string | undefined): boolean {
  return flag === "1";
}

export interface DisplayProbe {
  matchesStandalone: boolean;
  /** `navigator.standalone` de Safari en iOS. */
  navigatorStandalone: boolean | undefined;
}

/** ¿La app corre instalada (Agregar a inicio) y no en una pestaña de Safari? */
export function isStandalone({ matchesStandalone, navigatorStandalone }: DisplayProbe): boolean {
  return matchesStandalone || navigatorStandalone === true;
}

export interface RegistrationProbe {
  hasActive: boolean;
  hasInstalling: boolean;
  hasWaiting: boolean;
  /** Respuesta del worker activo; `null` si no contestó a tiempo. */
  status: WorkerStatus | null;
}

export function toOfflineState(probe: RegistrationProbe): OfflineState {
  if (!probe.hasActive) return { kind: "preparing" };
  if (probe.status === null) return { kind: "preparing" };
  if (!probe.status.complete) return { kind: "incomplete" };
  return { kind: "ready", version: probe.status.version, updatePending: probe.hasWaiting || probe.hasInstalling };
}

/** Los ids de build de Next son largos; para mostrar basta un prefijo. */
export function versionLabel(version: string): string {
  return version.slice(0, 7);
}

export function offlineMessage(state: OfflineState): string | null {
  switch (state.kind) {
    case "unavailable":
      return null;
    case "preparing":
      return "Preparando el modo sin conexión… Déjalo abierto con internet un momento.";
    case "incomplete":
      return "La copia sin conexión aún no está completa. Abre Cortex con conexión y se completará.";
    case "ready":
      return `Listo para usar sin conexión (versión ${versionLabel(state.version)}).${
        state.updatePending ? " Hay una versión nueva descargada; se aplica al cerrar y volver a abrir la app." : ""
      }`;
  }
}
