import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/app";
import { CommandPalette } from "./command-palette";
import { BottomBar, DesktopNav } from "./main-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * Marco de todas las páginas (ADR-020): salto al contenido, header fijo con navegación (escritorio),
 * selector de tema y HUD; barra inferior en el celular. En las rutas de foco la navegación se oculta.
 */
export function AppShell({ children, hud }: { children: ReactNode; hud?: ReactNode }) {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md font-semibold tracking-tight">
            <span aria-hidden className="grid size-7 place-items-center rounded-md border border-brand/30 bg-brand-soft text-sm font-bold text-brand">
              C
            </span>
            <span className="sr-only sm:not-sr-only">{APP_NAME}</span>
          </Link>
          <DesktopNav />
          {/* El HUD va al final: la prueba de desborde mide el último elemento de esta fila. */}
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
            <CommandPalette />
            <ThemeToggle />
            {hud}
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pt-4 pb-10 sm:px-6">
        <p className="eyebrow">
          Tus datos viven solo en este navegador ·{" "}
          <Link href="/ajustes" className="underline underline-offset-2 hover:text-ink">
            Ajustes y respaldo
          </Link>{" "}
          ·{" "}
          <Link href="/estilo" className="underline underline-offset-2 hover:text-ink">
            Sistema visual
          </Link>
        </p>
      </footer>
      <BottomBar />
    </>
  );
}
