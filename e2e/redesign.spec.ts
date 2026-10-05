import { expect, type Page, test } from "@playwright/test";

/**
 * Rediseño de interfaz (ADR-020): lector por pasos, navegación con barra inferior y hoja "Más",
 * tema según el sistema y paleta de comandos. Todo con teclado y sin errores de consola.
 */

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

const noHorizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const visibleSteps = (page: Page) => page.locator(".lesson-step:not([hidden])");
const LESSON = "/materias/programacion/01-variables-y-tipos";

test("16 - lección por pasos: teclado, foco, ver todo y memoria del paso", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(LESSON);
  const rail = page.getByRole("navigation", { name: "Pasos de la lección" });
  await expect(rail).toContainText("1/5");
  await expect(visibleSteps(page)).toHaveCount(1);
  await expect(visibleSteps(page).getByRole("heading", { level: 2 })).toHaveText("El problema");

  // → avanza: el foco va al título del paso y se anuncia.
  await page.locator("body").press("ArrowRight");
  await expect(rail).toContainText("2/5");
  await expect(page.getByRole("heading", { level: 2, name: "Variables" })).toBeFocused();
  await expect(page.locator("[aria-live=polite].sr-only")).toHaveText("Paso 2 de 5: Variables");

  // Escribir en una predicción no mueve de paso (la "n" y las flechas son del campo).
  await page.locator("body").press("ArrowLeft");
  await expect(rail).toContainText("1/5");
  await page.getByRole("textbox", { name: "Tu predicción" }).fill("n p v");
  await expect(rail).toContainText("1/5");

  // V alterna "ver todo" (la preferencia se recuerda) y el riel lo dice.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("v");
  await expect(visibleSteps(page)).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Ver por pasos/ })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("v");
  await expect(visibleSteps(page)).toHaveCount(1);

  // El riel también navega con clic, y el paso se recuerda al recargar (misma pestaña).
  await rail.getByRole("button", { name: "Paso 3: Tipos y operaciones" }).click();
  await expect(rail).toContainText("3/5");
  await page.reload();
  await expect(rail).toContainText("3/5");

  // Un #ancla lleva directo a ese paso.
  await page.goto(`${LESSON}#cierre`);
  await expect(rail).toContainText("5/5");
  await expect(page.getByText("Terminaste la lección. El mini quiz la completa.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("17 - en el celular: acciones arriba, barra de pasos abajo, sin desborde", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(LESSON);
  await expect(page.getByRole("navigation", { name: "Práctica de la unidad" }).getByRole("link", { name: "Practicar" })).toBeVisible();
  await page.getByRole("button", { name: /Paso siguiente/ }).click();
  await expect(page.getByRole("navigation", { name: "Pasos de la lección" })).toContainText("2/5");
  // La lección no lleva barra inferior de navegación (trae la suya).
  await expect(page.locator("nav.fixed[aria-label=Principal]")).toHaveCount(0);
  expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("18 - navegación: página actual, barra inferior y hoja Más con teclado", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/progreso");
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Progreso" })).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const bottom = page.locator("nav.fixed[aria-label=Principal]");
  await expect(bottom.getByRole("link", { name: "Hoy" })).toHaveAttribute("aria-current", "page");
  const more = bottom.getByRole("button", { name: "Más" });
  await more.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Más" });
  await expect(sheet.getByRole("link", { name: "Cuaderno de errores" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(more).toBeFocused();

  // Las rutas de estudio usan header de foco: sin navegación.
  await page.goto("/sesion");
  await expect(page.getByRole("navigation", { name: "Principal" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("19 - el tema sigue al sistema y el selector lo cambia sin destello", async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);

  // Elegir "Oscuro" gana sobre el sistema, y al recargar ya pinta oscuro desde el primer cuadro.
  await page.getByRole("button", { name: /^Tema:/ }).click();
  await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  expect(errors).toEqual([]);
});

test("20 - paleta de comandos: Ctrl+K, búsqueda sin acentos y Enter", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: /Buscar unidades/ });
  await expect(input).toBeFocused();
  await input.fill("limites");
  await expect(page.getByRole("option", { name: /Límites: acercarse sin llegar/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/materias\/calculo\/01-limites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Límites: acercarse sin llegar" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("21 - en estudio: migas del servidor y Esc sale sin recargar la página", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/materias/calculo/01-limites/practica");
  const crumbs = page.getByRole("navigation", { name: "Ruta" });
  await expect(crumbs.getByRole("link", { name: "Unidad 01" })).toHaveAttribute("href", "/materias/calculo/01-limites");
  await expect(crumbs.locator("[aria-current=page]")).toHaveText("Práctica");
  await expect(page.locator("article[aria-label^='Ejercicio ']")).toBeVisible();

  // Un marcador en window solo sobrevive si la navegación es del lado del cliente (sin recargar).
  await page.evaluate(() => ((window as unknown as { __cortex: number }).__cortex = 42));
  await page.locator("h1, main").first().click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/materias\/calculo\/01-limites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Límites: acercarse sin llegar" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __cortex?: number }).__cortex)).toBe(42);
  expect(errors).toEqual([]);
});
