import { describe, expect, it } from "vitest";
import { INPUT_BOOT, INPUT_KEY, parseInputMode, resolveTouch } from "./input-mode";
import { viewportKeyboardInset } from "./keyboard-inset";

/** Corre el arranque con un localStorage falso; regresa el atributo `data-input` que queda (o null). */
function boot(stored: string | null | "throws"): string | null {
  let attr: string | null = "previo";
  const fakeStorage = {
    getItem: (k: string) => {
      if (stored === "throws") throw new Error("bloqueado");
      return k === INPUT_KEY ? stored : null;
    },
  };
  const fakeDocument = {
    documentElement: {
      setAttribute: (_n: string, v: string) => {
        attr = v;
      },
      removeAttribute: () => {
        attr = null;
      },
    },
  };
  new Function("localStorage", "document", INPUT_BOOT)(fakeStorage, fakeDocument);
  return attr;
}

describe("modo de entrada", () => {
  it("parseInputMode trata lo desconocido como 'auto'", () => {
    expect(parseInputMode("touch")).toBe("touch");
    expect(parseInputMode("fine")).toBe("fine");
    expect(parseInputMode("auto")).toBe("auto");
    expect(parseInputMode(null)).toBe("auto");
    expect(parseInputMode("tableta")).toBe("auto");
  });

  it("resolveTouch: lo forzado gana y en 'auto' manda el puntero", () => {
    expect(resolveTouch("touch", false)).toBe(true);
    expect(resolveTouch("fine", true)).toBe(false);
    expect(resolveTouch("auto", true)).toBe(true);
    expect(resolveTouch("auto", false)).toBe(false);
  });

  it.each([
    ["touch", "touch"],
    ["fine", "fine"],
    ["auto", null],
    [null, null],
    ["basura", null],
    ["throws", null],
  ] as const)("el arranque con %s guardado deja data-input=%s", (stored, attr) => {
    expect(boot(stored)).toBe(attr);
  });
});

describe("teclado en pantalla", () => {
  it("el alto es innerHeight - vv.height - vv.offsetTop, nunca negativo", () => {
    expect(viewportKeyboardInset(1000, { height: 640, offsetTop: 0, scale: 1 })).toBe(360);
    expect(viewportKeyboardInset(1000, { height: 640, offsetTop: 100, scale: 1 })).toBe(260);
    expect(viewportKeyboardInset(1000, { height: 1000, offsetTop: 0, scale: 1 })).toBe(0);
    expect(viewportKeyboardInset(1000, { height: 1000, offsetTop: 40, scale: 1 })).toBe(0);
  });

  it("con zoom por pellizco no hay teclado que medir (scale 2: height = innerHeight/2)", () => {
    expect(viewportKeyboardInset(1000, { height: 500, offsetTop: 0, scale: 2 })).toBe(0);
    expect(viewportKeyboardInset(1000, { height: 500, offsetTop: 120, scale: 2 })).toBe(0);
  });
});
