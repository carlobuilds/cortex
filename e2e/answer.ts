import { expect, type Page } from "@playwright/test";
import type { CatalogExercise, StudyCatalog } from "../src/content/core/study-catalog";
import { displayOrder } from "../src/engine/logic/convention";

/**
 * Contestar el ejercicio en pantalla con la respuesta del propio catálogo (`/catalogo.json`), así
 * las pruebas no dependen del orden. Lo comparten la sesión, el jefe y el simulacro.
 */

export async function catalog(page: Page): Promise<StudyCatalog> {
  const res = await page.request.get("/catalogo.json");
  expect(res.ok()).toBe(true);
  return (await res.json()) as StudyCatalog;
}

export const LETTERS = "ABCDEFGH";

/** Texto del YAML sin marcas de Markdown/LaTeX, para buscarlo en el DOM ya renderizado. */
export const plain = (s: string) => s.replace(/[`$*]/g, "");

/**
 * Escribe la respuesta del ejercicio que está en pantalla (bien o mal) y la envía. No marca la
 * confianza ni espera la retroalimentación: eso depende del modo (práctica o simulacro).
 */
export async function submitAnswer(page: Page, cat: StudyCatalog, { correct = true }: { correct?: boolean } = {}): Promise<string> {
  const article = page.locator("article[aria-label^='Ejercicio ']");
  await expect(article).toBeVisible();
  const id = ((await article.getAttribute("aria-label")) ?? "").replace("Ejercicio ", "");
  const ex = cat.exercises[id] as CatalogExercise;
  expect(ex, `ejercicio ${id} en el catálogo`).toBeTruthy();
  switch (ex.tipo) {
    case "opcion_multiple":
      await page.keyboard.press(LETTERS[correct ? ex.correcta : (ex.correcta + 1) % ex.opciones.length] ?? "A");
      await page.keyboard.press("Enter");
      break;
    case "numerico":
    case "simbolico": {
      const value = correct ? String(ex.respuesta) : "123456";
      if (ex.tipo === "simbolico") await page.getByRole("button", { name: "Prefiero teclear como texto" }).click();
      const box = page.getByRole("textbox", { name: ex.tipo === "simbolico" ? "Tu expresión" : "Tu respuesta" });
      await box.fill(value);
      await box.press("Enter");
      break;
    }
    case "completar": {
      for (let i = 0; i < ex.respuestas.length; i++) {
        await page.getByRole("textbox", { name: `Hueco ${i + 1} de ${ex.respuestas.length}` }).fill(correct ? (ex.respuestas[i] ?? "") : "zzz");
      }
      await page.getByRole("button", { name: /^(Comprobar|Responder)/ }).click();
      break;
    }
    case "predecir_salida": {
      const box = page.getByRole("textbox", { name: "Salida exacta" });
      await box.fill(correct ? ex.respuesta : "nada");
      await box.press("Control+Enter");
      break;
    }
    case "ordenar": {
      // Bien: ordena con los botones "Subir paso N" hasta que coincida con `elementos`. Mal: entrega
      // el orden barajado tal cual (la app nunca lo muestra ya ordenado, ver `shuffledOrder`).
      for (let target = 0; correct && target < ex.elementos.length; target++) {
        const items = await page.getByRole("list", { name: "Pasos en tu orden" }).locator("li").allTextContents();
        const from = items.findIndex((t) => t.includes(plain(ex.elementos[target] ?? "\u0000")));
        expect(from, `paso «${ex.elementos[target]}» en pantalla`).toBeGreaterThanOrEqual(target);
        for (let k = from; k > target; k--) await page.getByRole("button", { name: `Subir paso ${k + 1}` }).click();
      }
      await page.getByRole("button", { name: /^(Comprobar|Responder)/ }).click();
      break;
    }
    case "seleccion_multiple": {
      // Correcta: exactamente las marcadas. Incorrecta: una opción que no lo es, o (si todas lo son)
      // solo la primera, que deja fuera a las demás (hay al menos dos opciones).
      const wrongPick = ex.opciones.findIndex((_, i) => !ex.correctas.includes(i));
      const picks = correct ? ex.correctas : [wrongPick >= 0 ? wrongPick : 0];
      for (const i of picks) await page.keyboard.press(LETTERS[i] ?? "A");
      await page.keyboard.press("Enter");
      break;
    }
    case "conjunto": {
      const box = page.getByRole("textbox", { name: "Tu conjunto" });
      await box.fill(correct ? `{${ex.respuesta.join(", ")}}` : "{123456}");
      await box.press("Enter");
      break;
    }
    case "tabla_verdad": {
      // Fila por fila con el teclado (V/F y baja sola), en el orden en que se ve.
      const groups = page.getByRole("radiogroup", { name: /^Fila \d+/ });
      await expect(groups).toHaveCount(ex.respuesta.length);
      await groups.first().getByRole("radio").first().focus();
      // La fila que se ve en la posición `pos` es la canónica `displayOrder(n)[pos]` (convention.ts).
      const order = displayOrder(ex.respuesta.length);
      for (let pos = 0; pos < order.length; pos++) {
        const value = ex.respuesta[order[pos] ?? 0] === "V";
        // Para fallar basta con voltear la primera fila.
        await page.keyboard.press((correct || pos > 0 ? value : !value) ? "1" : "0");
      }
      await page.keyboard.press("Enter");
      break;
    }
    default:
      throw new Error(`tipo no contemplado en la prueba: ${ex.tipo}`);
  }
  return id;
}
