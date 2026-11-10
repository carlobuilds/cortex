import { expect, type Page, test } from "@playwright/test";

/*
 * Tipos de ejercicio de la Fase 3 (selección múltiple, conjunto, tabla de verdad y visual fijo),
 * jugados con el teclado en los ejemplos de `/estilo` (`demo-exercises.ts`).
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /hydrat/i.test(msg.text())) errors.push(`consola: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`página: ${err.message}`));
  return errors;
}

/** Abre un ejemplo y deja el foco fuera de cualquier campo (la demo de MathLive de /estilo lo toma al cargar). */
async function open(page: Page, label: string) {
  await page.getByRole("radiogroup", { name: "Tipo de ejercicio" }).getByRole("radio", { name: label }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

const card = (page: Page) => page.locator("article[aria-label^='Ejercicio demo-']");

test("tipos nuevos de ejercicio: se juegan con el teclado", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/estilo");

  // Selección múltiple: hay que marcar todas las correctas y solo esas.
  await open(page, "Selección múltiple");
  await page.keyboard.press("a");
  await page.keyboard.press("Enter");
  await expect(card(page).getByText("No es correcto.")).toBeVisible();
  await expect(card(page).getByText("Respuesta esperada:")).toBeVisible();
  await page.keyboard.press("n");
  await page.keyboard.press("a");
  await page.keyboard.press("c");
  await expect(card(page).getByRole("checkbox", { checked: true })).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(card(page).getByText("¡Correcto!")).toBeVisible();

  // Con un grafo: se dibuja fijo (sin elegir vértices, que mostraría el grado) y con su descripción.
  await open(page, "Con un grafo");
  await expect(card(page).getByRole("img", { name: "Grafo con 5 vértices y 6 aristas." })).toBeVisible();
  await expect(card(page).getByText("Vértice", { exact: true })).toHaveCount(0);
  await page.keyboard.press("a");
  await page.keyboard.press("c");
  await page.keyboard.press("Enter");
  await expect(card(page).getByText("¡Correcto!")).toBeVisible();

  // Conjunto: lo ilegible avisa sin gastar el intento; el orden y la forma de los números no importan.
  await open(page, "Conjunto");
  const box = page.getByRole("textbox", { name: "Tu conjunto" });
  await box.fill("{(1, 2}");
  await expect(card(page).getByText("Falta cerrar un paréntesis.").first()).toBeVisible();
  await box.press("Enter");
  await expect(card(page).getByRole("alert")).toContainText("Falta cerrar un paréntesis.");
  await box.fill("{0.5, -2}");
  await expect(card(page).getByText("2 elementos")).toBeVisible();
  await box.press("Enter");
  await expect(card(page).getByText("¡Correcto!")).toBeVisible();

  // Tabla de verdad: una tecla por fila y baja sola; Enter comprueba.
  await open(page, "Tabla de verdad");
  const rows = card(page).getByRole("radiogroup", { name: /^Fila \d+/ });
  await expect(rows).toHaveCount(4);
  await page.keyboard.press("Enter");
  await expect(card(page).getByRole("alert")).toContainText("Llena todas las filas");
  await rows.first().getByRole("radio").first().focus();
  for (const key of ["f", "f", "f", "v"]) await page.keyboard.press(key);
  await expect(rows.nth(3).getByRole("radio", { checked: true })).toHaveText("V");
  await page.keyboard.press("Enter");
  await expect(card(page).getByText("¡Correcto!")).toBeVisible();
  await page.keyboard.press("n");
  await rows.first().getByRole("radio").first().focus();
  for (const key of ["1", "0", "0", "1"]) await page.keyboard.press(key);
  await page.keyboard.press("Enter");
  await expect(card(page).getByText("No es correcto.")).toBeVisible();
  await expect(card(page).getByText("(de arriba abajo)")).toBeVisible();

  expect(errors).toEqual([]);
});
