import { BookOpen, Brain, House, NotebookPen, Palette, Repeat, Settings, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** Destinos de todos los días (ADR-020): a un clic desde cualquier página. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/", label: "Hoy", icon: House },
  { href: "/materias", label: "Materias", icon: BookOpen },
  { href: "/repaso", label: "Repaso", icon: Repeat },
  { href: "/gimnasio", label: "Gimnasio", icon: Brain },
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
];

/** Menú "Más": lo que se visita de vez en cuando. */
export const MORE_NAV: readonly NavItem[] = [
  { href: "/cuaderno", label: "Cuaderno de errores", icon: NotebookPen },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
  { href: "/estilo", label: "Sistema visual", icon: Palette },
];

/** En el celular la barra inferior tiene 4 destinos + "Más"; Progreso pasa al menú. */
export const BOTTOM_NAV: readonly NavItem[] = PRIMARY_NAV.filter((i) => i.href !== "/progreso");
export const BOTTOM_MORE: readonly NavItem[] = [...PRIMARY_NAV.filter((i) => i.href === "/progreso"), ...MORE_NAV];

/** "page" si es exactamente esa ruta (aria-current), "section" si estás dentro de ella, `null` si no. */
export function navMatch(pathname: string, href: string): "page" | "section" | null {
  if (pathname === href) return "page";
  if (href !== "/" && pathname.startsWith(`${href}/`)) return "section";
  return null;
}

const STUDY_ROUTE = /^\/materias\/[^/]+\/[^/]+\/(quiz|practica|jefe)\/?$/;
const LESSON_ROUTE = /^\/materias\/[^/]+\/(?!mapa\/?$)[^/]+\/?$/;

/** Rutas de estudio con "header de foco": sin navegación, solo migas y Salir (decisión de Carlo, 2026-10-03). */
export function isFocusRoute(pathname: string): boolean {
  return pathname === "/sesion" || pathname.startsWith("/ejercicios/") || STUDY_ROUTE.test(pathname);
}

/** La barra inferior se oculta en foco y en la lección (que trae su propia barra de acciones). */
export function hidesBottomBar(pathname: string): boolean {
  return isFocusRoute(pathname) || LESSON_ROUTE.test(pathname);
}
