import { expect, type Page, test } from "@playwright/test";
import type { StudyCatalog } from "../src/content/core/study-catalog";
import { addDays } from "../src/engine/dates";
import { gymGameFor } from "../src/engine/session";
import { catalog, submitAnswer } from "./answer";

/*
 * iPad (WebKit con emulación táctil, sin teclado físico): TODO se hace con toques. Nada de
 * `keyboard.press` para responder, confirmar o salir. La emulación puede no activar `pointer: coarse`,
 * por eso cada prueba fuerza el modo táctil de la app con `localStorage["cortex-input"] = "touch"`
 * (el mismo interruptor que hay en Ajustes).
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cortex-input", "touch"));
});

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /hydrat/i.test(msg.text())) errors.push(`consola: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`página: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return errors;
}

/** Un día cuyo minijuego sea "secuencias" (el más corto de jugar en una prueba). */
function dayWithSequences(): Date {
  let day = "2026-10-05";
  while (gymGameFor(day) !== "sequences") day = addDays(day, 1);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1, 18, 0, 0);
}

/**
 * Botones y enlaces visibles de menos de 44 px de alto. Excepciones (a propósito):
 * - «Saltar al contenido»: solo existe al enfocar con teclado, fuera de pantalla.
 * - Las casillas `<input type=checkbox>` no son botones ni enlaces: su etiqueta mide 44 (no se miden aquí).
 * - El `<button role=switch>` de Ajustes dibuja 24 px y amplía su área de toque a 44 con `::after`.
 */
async function smallTargets(page: Page): Promise<string[]> {
  // Las microanimaciones (`.fx-right`, `pop`) escalan el botón a 0.96 un instante: se espera a que terminen.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href]")) {
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
      if (label === "Saltar al contenido" || el.getAttribute("role") === "switch") continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
      // Los botones de solo ícono (sin texto) deben medir 44 también de ancho.
      const iconOnly = !(el.textContent || "").trim();
      if (r.height < 43.5 || (iconOnly && r.width < 43.5)) out.push(`${el.tagName} «${label}» ${Math.round(r.width)}x${r.height.toFixed(1)}`);
    }
    return out;
  });
}

const pickConfidence = (page: Page, name: RegExp) => page.getByRole("button", { name }).click();

/** Contesta con toques, marca «Seguro» con su botón y pasa al siguiente con «Siguiente». */
async function answerCurrent(page: Page, cat: StudyCatalog, checkFeedback = false): Promise<string> {
  const id = await submitAnswer(page, cat, { touch: true });
  await pickConfidence(page, /^Seguro/);
  await expect(page.getByText("¡Correcto!")).toBeVisible();
  if (checkFeedback) expect(await smallTargets(page), "botones de la retroalimentación de menos de 44").toEqual([]);
  await page.getByRole("button", { name: /^(Siguiente|Ver resultado)/ }).click();
  return id;
}

test("ipad 1 - el inicio carga sin errores de consola", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu sesión de hoy");
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-input"))).toBe("touch");
  expect(errors).toEqual([]);
});

test("ipad 2 - sesión del día solo con toques, con botones de al menos 44 de alto", async ({ page }) => {
  const errors = collectErrors(page);
  await page.clock.setFixedTime(dayWithSequences());
  const cat = await catalog(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Empezar sesión de hoy/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sesión de hoy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Lección nueva:/ })).toBeVisible();
  await page.getByRole("button", { name: "Ya la leí: mini quiz" }).click();

  // Primer ejercicio: responder, medir el ejercicio y el selector de confianza, y corregir.
  await expect(page.locator("article[aria-label^='Ejercicio ']")).toBeVisible();
  expect(await smallTargets(page), "botones del ejercicio de menos de 44").toEqual([]);
  await submitAnswer(page, cat, { touch: true });
  await expect(page.locator("[data-confidence-picker]")).toBeVisible();
  expect(await smallTargets(page), "botones del selector de confianza de menos de 44").toEqual([]);
  // Esc no se ofrece al tocar; el botón visible hace lo mismo.
  await expect(page.getByText("para corregir tu respuesta")).toBeHidden();
  await page.getByRole("button", { name: "Corregir mi respuesta" }).click();
  await expect(page.locator("[data-confidence-picker]")).toHaveCount(0);

  // Se vuelve a contestar y se sigue con toques.
  const ids: string[] = [];
  ids.push(await answerCurrent(page, cat, true));
  for (let i = 1; i < 5; i++) ids.push(await answerCurrent(page, cat));
  expect(new Set(ids).size).toBe(5);
  await expect(page.getByRole("heading", { name: "Lección completada" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Reto cognitivo (secuencias): campo numérico con «Cambiar signo» de 44 y botón «Responder».
  await expect(page.getByRole("heading", { name: "Patrón oculto" })).toBeVisible();
  for (let i = 0; i < 6; i++) {
    const box = page.getByRole("textbox", { name: "Siguiente término" });
    if (i === 0) {
      const sign = page.getByRole("button", { name: "Cambiar signo" });
      expect((await sign.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await box.fill("5");
      await sign.click();
      await expect(box).toHaveValue("-5");
      await sign.click();
      await expect(box).toHaveValue("5");
    }
    await box.fill("0");
    await page.getByRole("button", { name: "Responder" }).click();
    await page.getByRole("button", { name: i === 5 ? "Terminar" : "Siguiente" }).click();
  }
  await expect(page.getByText(/secuencias resueltas/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Buen trabajo hoy." })).toBeVisible();
  await page.getByRole("button", { name: "Abrir el cofre" }).click();
  await expect(page.getByText(/XP de bonus|congelamiento|Marco nuevo|Insignia rara|Dato curioso/).first()).toBeVisible();

  // Salir con toque: en la sesión el enlace de salida se llama «Al inicio» (en otras rutas, «Salir»).
  await page.getByRole("link", { name: "Al inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test("ipad 3 - ejercicio simbólico: «Teclado de fórmulas» abre el teclado y Comprobar sigue a la vista", async ({ page }) => {
  const cat = await catalog(page);
  const id = Object.keys(cat.exercises).find((k) => cat.exercises[k]?.tipo === "simbolico");
  expect(id, "un ejercicio simbólico en el catálogo").toBeTruthy();
  await page.goto(`/ejercicios/${id}`);
  const open = page.getByRole("button", { name: "Teclado de fórmulas" });
  await expect(open).toBeVisible();
  expect((await open.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await open.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard?.visible ?? false)).toBe(true);
  const check = page.getByRole("button", { name: /^(Comprobar|Responder)/ });
  await expect(check).toBeInViewport();
  await expect(page.getByRole("button", { name: "Ocultar teclado de fórmulas" })).toBeInViewport();
  // `toBeInViewport` no basta: el teclado de MathLive es `position: fixed` y podría tapar la barra.
  const keyboardTop = await page.evaluate(() => (window as unknown as { mathVirtualKeyboard: { boundingRect: DOMRect } }).mathVirtualKeyboard.boundingRect.top);
  const box = await check.boundingBox();
  expect(box, "caja de Comprobar").not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(keyboardTop);
  // El teclado interno de MathLive (⌨) sobra: ya hay botón propio. Su menú (☰) no baja de 44.
  const menu = await page.evaluate(() => {
    const mf = document.querySelector("math-field");
    const el = mf?.shadowRoot?.querySelector("[part=menu-toggle]") as HTMLElement | null;
    const kb = mf?.shadowRoot?.querySelector("[part=virtual-keyboard-toggle]") as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    return { kbShown: kb ? getComputedStyle(kb).display !== "none" : false, menuW: r?.width ?? 0, menuH: r?.height ?? 0 };
  });
  expect(menu.kbShown).toBe(false);
  expect(menu.menuW).toBeGreaterThanOrEqual(44);
  expect(menu.menuH).toBeGreaterThanOrEqual(44);
});

test("ipad 4 - la lección y Ajustes: botones y enlaces de al menos 44 de alto", async ({ page }) => {
  for (const url of ["/materias/programacion/01-variables-y-tipos", "/ajustes"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await smallTargets(page), `objetivos de menos de 44 en ${url}`).toEqual([]);
  }
});
