import { expect, test } from "@playwright/test";

/**
 * Cuartel (ADR-030). Aquí corre en localhost:3100: la ruta debe negarse siempre (403 «prohibido»)
 * para que las pruebas nunca lleguen a producción. Nada de esto toca localhost:3000.
 */

const SWITCH = /Enviar resumen de estudio a Cuartel/;

function localDay(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

test("Cuartel: el interruptor nace apagado y persiste al recargar", async ({ page }) => {
  await page.goto("/ajustes");
  const toggle = page.getByRole("switch", { name: SWITCH });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText("Desde aquí no se envía")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar ahora" })).toBeDisabled();

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("button", { name: "Enviar ahora" })).toBeEnabled();

  await page.reload();
  await expect(page.getByRole("switch", { name: SWITCH })).toBeChecked();

  // Se limpia para no dejar el interruptor prendido en el perfil de pruebas.
  await page.getByRole("switch", { name: SWITCH }).click();
  await expect(page.getByRole("switch", { name: SWITCH })).not.toBeChecked();
});

test("Cuartel: la ruta niega todo fuera de localhost:3000 (403 prohibido)", async ({ page }) => {
  await page.goto("/ajustes");
  const day = localDay();
  const result = await page.evaluate(async (today) => {
    const res = await fetch("/api/cuartel", {
      method: "POST",
      headers: { "content-type": "application/json", "x-cortex-cuartel": "1" },
      body: JSON.stringify({ v: 1, days: [{ day: today, activeMs: 60000, answered: 3, correct: 2, reviews: 1, lessons: 0, minimumMet: false }] }),
    });
    return { status: res.status, body: (await res.json()) as unknown };
  }, day);
  expect(result.status).toBe(403);
  expect(result.body).toEqual({ sent: false, status: null, reason: "prohibido" });
});
