/** El foco está en un campo de texto: los atajos de una letra no deben dispararse ahí. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.tagName === "MATH-FIELD");
}
