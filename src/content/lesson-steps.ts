/**
 * Lección por pasos (ADR-020, "no un libro"): agrupa la lección compilada por sus `##` en
 * `<LessonSteps>` → `<LessonStep>`. Corre en rehype, DESPUÉS de la guardia de remark: el contenido
 * no cambia (mismos nodos, mismo orden) y un autor no puede escribir `<LessonStep>` a mano porque
 * no está en LESSON_API. Solo se activa con `compileMdx({ steps: true })`.
 */

interface HastNode {
  type: string;
  tagName?: string;
  name?: string | null;
  value?: string;
  attributes?: unknown[];
  children?: HastNode[];
}

/** Texto plano de un nodo (títulos con `código` o *énfasis* incluidos). */
export function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** Ancla estable para `#paso`: minúsculas, sin acentos ni signos. */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "paso"
  );
}

export interface StepGroup<N> {
  readonly title: string;
  readonly nodes: N[];
}

const isBlank = (n: HastNode) => n.type === "text" && !(n.value ?? "").trim();

/**
 * Bloques que forman el paso final "Cierre" cuando aparecen juntos al final de la lección.
 *
 * TODO(Carlo): decide el ritmo del final. Hoy las 13 lecciones terminan con Conexión(es) + Resumen
 * + Feynman después del último `##`. Con este conjunto se separan en un paso "Cierre"; si lo vacías
 * (`new Set()`), se quedan dentro del último paso (más largo, pero sin un paso extra). También
 * puedes cambiar `CLOSING_TITLE`.
 */
export const CLOSING_BLOCKS: ReadonlySet<string> = new Set(["Conexion", "Resumen", "Feynman"]);
export const CLOSING_TITLE = "Cierre";

/**
 * Agrupa los hijos de primer nivel: un grupo por cada `h2` (lo que va antes del primero se une al
 * paso 1) y, si la lección termina con bloques de cierre, un último grupo con ellos.
 * Con menos de 2 secciones regresa `null` (la lección se dibuja como siempre).
 */
export function groupSteps(nodes: readonly HastNode[]): StepGroup<HastNode>[] | null {
  const groups: { title: string; nodes: HastNode[] }[] = [];
  const before: HastNode[] = [];
  for (const node of nodes) {
    if (node.type === "element" && node.tagName === "h2") groups.push({ title: textOf(node).trim(), nodes: [node] });
    else (groups.at(-1)?.nodes ?? before).push(node);
  }
  if (groups.length < 2) return null;
  groups[0]?.nodes.unshift(...before);

  const last = groups.at(-1);
  if (last && CLOSING_BLOCKS.size > 0) {
    let cut = last.nodes.length;
    while (cut > 1) {
      const n = last.nodes[cut - 1];
      if (n && (isBlank(n) || (n.type === "mdxJsxFlowElement" && CLOSING_BLOCKS.has(n.name ?? "")))) cut--;
      else break;
    }
    const closing = last.nodes.slice(cut);
    // Solo si hay bloques de cierre reales y al último paso le queda contenido además de su título.
    if (closing.some((n) => !isBlank(n)) && last.nodes.slice(1, cut).some((n) => !isBlank(n))) {
      last.nodes.length = cut;
      groups.push({ title: CLOSING_TITLE, nodes: closing });
    }
  }
  return groups;
}

const attr = (name: string, value: string) => ({ type: "mdxJsxAttribute", name, value });

/** Plugin de rehype: envuelve la lección en <LessonSteps> con un <LessonStep> por grupo. */
export function rehypeLessonSteps() {
  return (tree: HastNode) => {
    const groups = groupSteps(tree.children ?? []);
    if (!groups) return;
    const used = new Map<string, number>();
    tree.children = [
      {
        type: "mdxJsxFlowElement",
        name: "LessonSteps",
        attributes: [],
        children: groups.map((g, i) => {
          const base = slugify(g.title);
          const n = (used.get(base) ?? 0) + 1;
          used.set(base, n);
          return {
            type: "mdxJsxFlowElement",
            name: "LessonStep",
            attributes: [attr("index", String(i)), attr("title", g.title), attr("slug", n === 1 ? base : `${base}-${n}`)],
            children: g.nodes,
          };
        }),
      },
    ];
  };
}
