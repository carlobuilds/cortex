import type { StudyCatalog } from "@/content/core/study-catalog";
import type { ThemePreference } from "@/db/types";
import { unitHref } from "@/lib/study";

/** Grupos de la paleta en el orden en que se muestran. */
export const COMMAND_GROUPS = ["Ir a", "Unidades", "Jefes", "Conceptos", "Acciones"] as const;
export type CommandGroup = (typeof COMMAND_GROUPS)[number];

export type Command = {
  readonly id: string;
  readonly group: CommandGroup;
  readonly label: string;
  readonly hint?: string;
} & ({ readonly href: string } | { readonly theme: ThemePreference });

/**
 * Texto para comparar: minúsculas y sin acentos, carácter por carácter, así cada índice coincide
 * con el del texto original (sirve para resaltar). "Cálculo" → "calculo".
 */
export function fold(text: string): string {
  return Array.from(text, (c) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().charAt(0) || c).join("");
}

export function buildCommands(catalog: StudyCatalog | null, pages: readonly { href: string; label: string }[]): Command[] {
  const out: Command[] = [{ id: "ir:/sesion", group: "Ir a", label: "Sesión de hoy", href: "/sesion" }];
  for (const p of pages) out.push({ id: `ir:${p.href}`, group: "Ir a", label: p.label, href: p.href });
  for (const s of catalog?.subjects ?? []) {
    for (const u of s.units) {
      const n = String(u.number).padStart(2, "0");
      out.push({ id: `unidad:${u.key}`, group: "Unidades", label: `${n} ${u.title}`, hint: s.name, href: unitHref(u) });
      out.push({ id: `jefe:${u.key}`, group: "Jefes", label: `Jefe · ${u.boss.nombre}`, hint: `${s.name} · unidad ${n}`, href: unitHref(u, "/jefe") });
    }
    for (const c of s.concepts) {
      out.push({ id: `concepto:${s.id}/${c.id}`, group: "Conceptos", label: c.name, hint: s.name, href: `/materias/${s.id}/mapa` });
    }
  }
  const themes: [ThemePreference, string][] = [
    ["system", "Tema: seguir al sistema"],
    ["light", "Tema: claro"],
    ["dark", "Tema: oscuro"],
  ];
  for (const [theme, label] of themes) out.push({ id: `tema:${theme}`, group: "Acciones", label, theme });
  return out;
}

/** Qué tan bien coincide (mayor = mejor); `null` si no coincide. Todas las palabras deben aparecer. */
function score(c: Command, words: readonly string[]): number | null {
  const label = fold(c.label);
  const hay = `${label} ${fold(c.hint ?? "")}`;
  let total = 0;
  for (const w of words) {
    const at = hay.indexOf(w);
    if (at < 0) return null;
    // Al inicio de la etiqueta > al inicio de una palabra de la etiqueta > dentro de la etiqueta > en la pista.
    total += at === 0 ? 4 : at < label.length && /[\s·(]/.test(hay.charAt(at - 1)) ? 3 : at < label.length ? 2 : 1;
  }
  return total;
}

export interface SearchResult {
  readonly group: CommandGroup;
  readonly items: readonly Command[];
}

/**
 * Resultados agrupados. Sin búsqueda solo "Ir a" y "Acciones" (no se tira el catálogo entero);
 * con búsqueda, los mejores `perGroup` de cada grupo (revelación progresiva, ADR-020).
 */
export function searchCommands(commands: readonly Command[], query: string, perGroup = 5): SearchResult[] {
  const words = fold(query).trim().split(/\s+/).filter(Boolean);
  const scored =
    words.length === 0
      ? commands.filter((c) => c.group === "Ir a" || c.group === "Acciones").map((c) => ({ c, s: 0 }))
      : commands.flatMap((c) => {
          const s = score(c, words);
          return s === null ? [] : [{ c, s }];
        });
  return COMMAND_GROUPS.map((group) => ({
    group,
    // sort es estable: a igual puntaje se respeta el orden del catálogo (unidad 01 antes que 02).
    items: scored
      .filter((x) => x.c.group === group)
      .sort((a, b) => b.s - a.s)
      .slice(0, words.length === 0 ? undefined : perGroup)
      .map((x) => x.c),
  })).filter((g) => g.items.length > 0);
}

/** Dónde resaltar la primera palabra buscada dentro de `text` (o `null`). */
export function matchRange(text: string, query: string): [start: number, end: number] | null {
  const first = fold(query).trim().split(/\s+/)[0];
  if (!first) return null;
  const at = fold(text).indexOf(first);
  return at < 0 ? null : [at, at + first.length];
}
