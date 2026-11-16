import { describe, expect, it } from "vitest";
import { isPwaBuild, isStandalone, offlineMessage, toOfflineState, versionLabel } from "./pwa-state";

describe("isPwaBuild", () => {
  it("solo acepta exactamente «1»", () => {
    expect(isPwaBuild("1")).toBe(true);
    expect(isPwaBuild("")).toBe(false);
    expect(isPwaBuild(undefined)).toBe(false);
    expect(isPwaBuild("true")).toBe(false);
  });
});

describe("isStandalone", () => {
  it("detecta display-mode o navigator.standalone", () => {
    expect(isStandalone({ matchesStandalone: true, navigatorStandalone: undefined })).toBe(true);
    expect(isStandalone({ matchesStandalone: false, navigatorStandalone: true })).toBe(true);
    expect(isStandalone({ matchesStandalone: false, navigatorStandalone: undefined })).toBe(false);
    expect(isStandalone({ matchesStandalone: false, navigatorStandalone: false })).toBe(false);
  });
});

describe("toOfflineState", () => {
  const base = { hasActive: true, hasInstalling: false, hasWaiting: false };
  it("prepara mientras no hay worker activo o no contestó", () => {
    expect(toOfflineState({ ...base, hasActive: false, hasInstalling: true, status: null })).toEqual({ kind: "preparing" });
    expect(toOfflineState({ ...base, status: null })).toEqual({ kind: "preparing" });
  });
  it("avisa si la caché activa no está completa", () => {
    expect(toOfflineState({ ...base, status: { version: "abc", complete: false } })).toEqual({ kind: "incomplete" });
  });
  it("listo con la versión y si hay una actualización pendiente", () => {
    expect(toOfflineState({ ...base, status: { version: "abcdefghij", complete: true } })).toEqual({ kind: "ready", version: "abcdefghij", updatePending: false });
    expect(toOfflineState({ ...base, hasWaiting: true, status: { version: "abcdefghij", complete: true } })).toMatchObject({ updatePending: true });
  });
});

describe("offlineMessage", () => {
  it("usa español sin culpa y no muestra nada fuera de la PWA", () => {
    expect(offlineMessage({ kind: "unavailable" })).toBeNull();
    expect(offlineMessage({ kind: "preparing" })).toContain("Preparando el modo sin conexión");
    expect(offlineMessage({ kind: "ready", version: "fErZJY2GT0XJ", updatePending: false })).toBe("Listo para usar sin conexión (versión fErZJY2).");
    expect(offlineMessage({ kind: "ready", version: "fErZJY2GT0XJ", updatePending: true })).toContain("se aplica al cerrar y volver a abrir");
    expect(versionLabel("1234567890")).toBe("1234567");
  });
});
