/**
 * Genera los íconos de la PWA (`public/icons/*.png`) con Chromium de Playwright. Los PNG se versionan:
 * solo hay que correr `pnpm icons` si cambia el glifo o los colores. Sin red ni dependencias nuevas.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BG = "#0E0C19"; // --bg oscuro de Arcano
const STROKE = "#9D8FF9"; // --brand oscuro de Arcano

interface Variant {
  file: string;
  size: number;
  /** Esquinas redondeadas (solo el ícono "any"); maskable y Apple van a sangre: el SO aplica su máscara. */
  rounded: boolean;
  /** Escala del glifo alrededor del centro. Maskable: el glifo debe caber en el 80 % central. */
  scale: number;
}

const VARIANTS: readonly Variant[] = [
  { file: "icon-192.png", size: 192, rounded: true, scale: 1.1 },
  { file: "icon-512.png", size: 512, rounded: true, scale: 1.1 },
  // Radio del glifo ~9.9 de 32 unidades a escala 1; con 1.2 queda en ~11.9 < 12.8 (círculo seguro de 80 %).
  { file: "icon-maskable-512.png", size: 512, rounded: false, scale: 1.2 },
  // iOS no respeta maskable y exige fondo opaco sin transparencia.
  { file: "apple-touch-icon.png", size: 180, rounded: false, scale: 1.2 },
];

export function iconSvg({ rounded, scale }: Pick<Variant, "rounded" | "scale">): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32"${rounded ? ' rx="8"' : ""} fill="${BG}"/>
  <g transform="translate(16 16) scale(${scale}) translate(-16 -16)">
    <path d="M21.5 10.5a8 8 0 1 0 0 11" fill="none" stroke="${STROKE}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="22" cy="16" r="2.2" fill="${STROKE}"/>
  </g>
</svg>
`;
}

async function main(): Promise<void> {
  const dir = join(process.cwd(), "public/icons");
  mkdirSync(dir, { recursive: true });
  // Fuente versionada: el ícono "any" a escala 1 (igual que src/app/icon.svg, con colores de Arcano).
  writeFileSync(join(dir, "icon.svg"), iconSvg({ rounded: true, scale: 1 }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const v of VARIANTS) {
      await page.setViewportSize({ width: v.size, height: v.size });
      await page.setContent(
        `<style>html,body{margin:0;background:transparent}svg{display:block;width:${v.size}px;height:${v.size}px}</style>${iconSvg(v)}`,
      );
      const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: v.size, height: v.size } });
      writeFileSync(join(dir, v.file), png);
      console.log(`public/icons/${v.file} (${v.size}x${v.size})`);
    }
  } finally {
    await browser.close();
  }
}

void main();
