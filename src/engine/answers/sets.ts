import { evaluateNumber } from "./math";

/**
 * Respuestas que son un conjunto (docs/05, tipo `conjunto`): elementos sin orden y sin repetidos.
 * Un elemento puede ser un número (`1/2` y `0.5` son el mismo), un par ordenado (`(1, 2)`) o un
 * texto (`a`). Puro: lo usan el verificador de la app y el esquema del contenido.
 */

export class SetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetError";
  }
}

/** Parte en las comas de primer nivel: `"(1, 2), (3, 4)"` → `["(1, 2)", "(3, 4)"]`. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  [...text].forEach((ch, i) => {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
    if (depth < 0) throw new SetError("Sobra un paréntesis de cierre.");
  });
  if (depth !== 0) throw new SetError("Falta cerrar un paréntesis.");
  parts.push(text.slice(start));
  return parts.map((p) => p.trim());
}

/** Clave que identifica a un elemento: dos textos con la misma clave son el mismo elemento. */
export function elementKey(text: string): string {
  const t = text.normalize("NFKC").trim();
  if (!t) throw new SetError("Hay un elemento vacío (revisa las comas).");
  if (t.startsWith("(") && t.endsWith(")")) {
    const parts = splitTopLevel(t.slice(1, -1));
    // Un solo componente no es un par: `(3)` es el número 3.
    if (parts.length > 1) return `(${parts.map(elementKey).join(",")})`;
  }
  try {
    const value = evaluateNumber(t);
    // 12 cifras: `0.1 + 0.2` y `0.3` son el mismo elemento.
    if (Number.isFinite(value)) return `#${Number(value.toPrecision(12))}`;
  } catch {
    // No es un número: se compara como texto.
  }
  return `"${t.replace(/\s+/g, "")}`;
}

const EMPTY = new Set(["", "{}", "∅", "vacio", "vacío"]);

/** Los elementos que escribió el usuario: `1, 2, 3` o `{1, 2, 3}`; el vacío es `{}` o `∅`. */
export function parseSet(text: string): string[] {
  const t = text.normalize("NFKC").trim();
  if (EMPTY.has(t.toLowerCase().replace(/\s+/g, ""))) return [];
  const inner = t.startsWith("{") && t.endsWith("}") ? t.slice(1, -1) : t;
  if (/[{}]/.test(inner)) throw new SetError("Escribe los elementos separados por comas; las llaves solo van afuera.");
  return splitTopLevel(inner);
}

/** Las claves de un conjunto, sin repetidos. */
export function setKeys(items: readonly string[]): Set<string> {
  return new Set(items.map(elementKey));
}

/** ¿Lo que escribió el usuario es el mismo conjunto que el oficial? Lanza `SetError` si no se puede leer. */
export function sameSet(user: string, expected: readonly string[]): boolean {
  const got = setKeys(parseSet(user));
  const want = setKeys(expected);
  return got.size === want.size && [...want].every((key) => got.has(key));
}

/** El conjunto escrito como se muestra: `{1, 2, 3}` o `∅`. */
export function formatSet(items: readonly string[]): string {
  return items.length ? `{${items.join(", ")}}` : "∅";
}
