import type { MetadataRoute } from "next";

// Necesario con `output: "export"` (build del iPad): el manifiesto se genera una sola vez.
export const dynamic = "force-static";

// Colores del tema oscuro de Arcano (`--bg` y `--brand` en globals.css).
const BACKGROUND = "#0E0C19";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Cortex",
    short_name: "Cortex",
    description: "Estudia Ingeniería en IA del IPN con práctica, repaso espaciado y pizarra, también sin conexión.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
