import { describe, expect, it } from "vitest";
import { parseThemePreference, resolveTheme, THEME_BOOT, THEME_KEY } from "./theme";

/** Corre el script de arranque con un localStorage y un matchMedia falsos; regresa si quedó oscuro. */
function boot(stored: string | null | "throws", prefersDark: boolean | "missing"): boolean {
  const classes = new Set<string>(["dark"]);
  const fakeWindow = {
    matchMedia: prefersDark === "missing" ? undefined : (q: string) => ({ matches: q.includes("dark") && prefersDark }),
  };
  const fakeStorage = {
    getItem: (k: string) => {
      if (stored === "throws") throw new Error("bloqueado");
      return k === THEME_KEY ? stored : null;
    },
  };
  const fakeDocument = {
    documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } },
  };
  new Function("window", "localStorage", "document", THEME_BOOT)(fakeWindow, fakeStorage, fakeDocument);
  return classes.has("dark");
}

describe("tema", () => {
  it("resolveTheme respeta la elección y en 'system' sigue a la computadora", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("parseThemePreference trata lo desconocido como 'system'", () => {
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("morado")).toBe("system");
  });

  it.each([
    ["dark", false, true],
    ["dark", true, true],
    ["light", true, false],
    ["light", false, false],
    ["system", true, true],
    ["system", false, false],
    [null, true, true],
    [null, false, false],
    ["throws", true, true],
    ["throws", false, false],
    [null, "missing", false],
  ] as const)("el arranque con %s guardado y sistema oscuro=%s pinta oscuro=%s", (stored, prefersDark, dark) => {
    expect(boot(stored, prefersDark)).toBe(dark);
  });

  it("el arranque coincide con resolveTheme en los 6 casos", () => {
    for (const pref of ["system", "light", "dark"] as const) {
      for (const prefersDark of [true, false]) {
        expect(boot(pref, prefersDark)).toBe(resolveTheme(pref, prefersDark) === "dark");
      }
    }
  });
});
