import { compileMdx } from "@/content/mdx";
import { LessonStep, LessonSteps } from "./lesson-stepper";
import { LESSON_API, LESSON_COMPONENTS } from "./registry";

/**
 * Componentes de los pasos: no son parte de la API del contenido (LESSON_COMPONENTS debe ser
 * exactamente LESSON_API). Se arman aquí, en el servidor: un objeto exportado desde un módulo
 * "use client" llega como referencia opaca y al expandirlo queda vacío.
 */
const LESSON_LAYOUT = { LessonSteps, LessonStep };

/** Compila y dibuja una lección en el servidor, dividida en pasos (ADR-020). Lanza `LessonCompileError` (con línea) si algo falla. */
export function LessonBody({ file, source }: { file: string; source: string }) {
  const content = compileMdx({ file, source, components: LESSON_API, steps: true });
  // El MDX compilado no usa hooks: se llama como función (no se crea un componente en cada render).
  return content({ components: { ...LESSON_COMPONENTS, ...LESSON_LAYOUT } });
}
