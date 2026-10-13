/**
 * Cómo se MUESTRA una tabla de verdad. No cambia ninguna respuesta: las tablas se calculan y se
 * guardan siempre en orden canónico (`truth-table.ts`); esto solo decide con qué símbolos y en qué
 * orden las ve el usuario.
 */

export interface TruthStyle {
  /** Símbolo de verdadero y de falso, en ese orden. */
  readonly symbols: readonly [isTrue: string, isFalse: string];
  /** Con qué fila empieza la tabla: todas verdaderas (VV…) o todas falsas (FF…). */
  readonly firstRow: "all-true" | "all-false";
}

/**
 * TODO(Carlo): pon aquí la convención de tu clase de Matemáticas discretas, para que la tabla de la
 * app se vea igual que la del pizarrón y la del examen.
 *   - `symbols`: `["V", "F"]` (la más común en español), `["1", "0"]` (la de circuitos y álgebra
 *     booleana) o `["T", "F"]` si siguen un libro en inglés.
 *   - `firstRow`: `"all-true"` empieza en VV (Rosen y la mayoría de los libros de lógica);
 *     `"all-false"` empieza en FF, que es contar en binario (00, 01, 10, 11) y suele acompañar a 1/0.
 * Lo que elijas vale para el simulador y para los ejercicios de tabla de verdad.
 */
export const TRUTH_STYLE: TruthStyle = { symbols: ["V", "F"], firstRow: "all-true" };

export function truthSymbol(value: boolean, style: TruthStyle = TRUTH_STYLE): string {
  return style.symbols[value ? 0 : 1];
}

/** Índices de las filas canónicas en el orden en que se muestran. */
export function displayOrder(rowCount: number, style: TruthStyle = TRUTH_STYLE): number[] {
  const canonical = Array.from({ length: rowCount }, (_, i) => i);
  return style.firstRow === "all-true" ? canonical : canonical.reverse();
}
