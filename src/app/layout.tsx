import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ProfileHud } from "@/components/hud/profile-hud";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/layout/providers";
import { SwRegister } from "@/components/pwa/sw-register";
import { THEME_BOOT, THEME_COLOR } from "@/lib/theme";
import { APP_NAME } from "@/lib/app";
// KaTeX: CSS y fuentes locales (desde node_modules; ninguna red).
import "katex/dist/katex.min.css";
// Mafs (ADR-021): solo su CSS base, que no pide nada a la red. `mafs/font.css` no se usa (la fuente es Geist).
import "mafs/core.css";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Estudia Ingeniería en IA (IPN, plan 2020) con práctica, repaso y jefes.",
  // El sitio es público pero de un solo usuario: que no lo indexen.
  robots: { index: false, follow: false },
  // `default` (no `black-translucent`) para que el contenido no quede bajo la barra de estado del iPad.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  // Con `icons` en el layout Next ya no inyecta solo el favicon de `src/app/icon.svg`: se declara aquí.
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" }, apple: "/icons/apple-touch-icon.png" },
};

// Colores = `--bg` de Arcano (globals.css). Sin maximum-scale ni user-scalable (accesibilidad).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`dark ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Tema sin destello: se resuelve antes de pintar (ThemeSync lo mantiene). Sin JS queda oscuro. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <Providers>
          <AppShell hud={<ProfileHud />}>{children}</AppShell>
        </Providers>
        <SwRegister />
      </body>
    </html>
  );
}
