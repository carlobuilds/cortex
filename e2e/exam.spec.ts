import { expect, type Page, test } from "@playwright/test";
import { catalog, submitAnswer } from "./answer";

/*
 * Simulacro de examen (Fase 3): se elige la materia, se contesta sin retroalimentación y al
 * entregar se ve el desglose; solo entonces se guarda. Corre en el puerto de e2e (otro origen).
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

/** Intentos y sesiones de examen guardados en la IndexedDB de la página. */
function examRows(page: Page): Promise<{ attempts: number; sessions: number }> {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).map((d) => d.name ?? "").find((n) => /cortex/i.test(n)) ?? "cortex";
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = (store: string) =>
      new Promise<Record<string, unknown>[]>((resolve) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as Record<string, unknown>[]);
      });
    const attempts = (await all("attempts")).filter((a) => a.mode === "exam").length;
    const sessions = (await all("sessions")).filter((s) => s.kind === "exam").length;
    db.close();
    return { attempts, sessions };
  });
}

const RESULT = /^(Aprobado|Todavía no)$/;
const article = (page: Page) => page.locator("article[aria-label^='Ejercicio ']");

test("simulacro: sin retroalimentación hasta entregar, desglose y mejor puntaje", async ({ page }) => {
  const errors = collectErrors(page);
  const cat = await catalog(page);
  await page.goto("/materias/calculo");
  await page.getByRole("link", { name: /Simulacro de examen/ }).click();
  await expect(page).toHaveURL(/\/materias\/calculo\/simulacro$/);
  await expect(page.getByRole("heading", { level: 2, name: "Cálculo" })).toBeVisible();
  await page.getByRole("button", { name: "Empezar el simulacro" }).click();

  // Esc no saca a medio examen (se perdería); "Salir" sigue a la mano.
  await expect(article(page)).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/simulacro$/);

  // Saltar manda la actual al final de la fila.
  const first = await article(page).getAttribute("aria-label");
  await page.getByRole("button", { name: /Saltar/ }).click();
  await expect(article(page)).not.toHaveAttribute("aria-label", first ?? "");

  // Todas bien menos la primera; nunca se dice si acertaste.
  let answered = 0;
  while (!(await page.getByRole("heading", { name: RESULT }).isVisible())) {
    expect(answered, "el simulacro no termina").toBeLessThan(40);
    await submitAnswer(page, cat, { correct: answered > 0 });
    await page.keyboard.press("2");
    answered++;
    await expect(page.getByText(new RegExp(`^Contestadas ${answered} de`)).or(page.getByRole("heading", { name: RESULT }))).toBeVisible();
    await expect(page.getByText(/¡Correcto!|No es correcto\./)).toHaveCount(0);
  }

  expect(answered).toBeGreaterThanOrEqual(5);
  await expect(page.getByRole("heading", { name: "Aprobado" })).toBeVisible();
  await expect(page.getByText(`${answered - 1} de ${answered} correctas`)).toBeVisible();
  await expect(page.getByText("Es tu primer simulacro de esta materia.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Por unidad" })).toBeVisible();
  await expect(page.getByText("fallada")).toHaveCount(1);
  await page.getByRole("button", { name: "Mandar estos a mi repaso de hoy" }).click();
  await expect(page.getByText(/Listo: las falladas ya están en tu cola/)).toBeVisible();
  expect(await examRows(page)).toEqual({ attempts: answered, sessions: 1 });

  // De vuelta a configurar: ya aparece el mejor puntaje.
  await page.getByRole("button", { name: "Otro simulacro" }).click();
  await expect(page.getByText(`Tu mejor simulacro de esta materia: ${Math.round((100 * (answered - 1)) / answered)}%.`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("simulacro: si se acaba el tiempo, lo no contestado cuenta como error", async ({ page }) => {
  const errors = collectErrors(page);
  const cat = await catalog(page);
  await page.clock.install();
  await page.goto("/materias/calculo/simulacro");
  await page.getByRole("button", { name: "Empezar el simulacro" }).click();
  await submitAnswer(page, cat, { correct: true });
  await page.keyboard.press("2");
  await expect(page.getByText(/^Contestadas 1 de/)).toBeVisible();
  await page.clock.fastForward(60 * 60_000);
  await expect(page.getByRole("heading", { name: "Todavía no" })).toBeVisible();
  await expect(page.getByText(/Se acabó el tiempo\./)).toBeVisible();
  await expect(page.getByText("sin contestar").first()).toBeVisible();
  expect(await examRows(page)).toEqual({ attempts: 1, sessions: 1 });
  expect(errors).toEqual([]);
});
