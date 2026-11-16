import { defineConfig, devices } from "@playwright/test";

// Opcional: ruta a un Chromium ya instalado (p. ej. en un contenedor sin acceso al CDN de Playwright).
const chromiumPath = process.env.CORTEX_CHROMIUM_PATH;

// iPad: WebKit con toque, sin teclado físico. La emulación puede no activar `pointer: coarse`, así que
// se fuerza el modo táctil de la app (localStorage `cortex-input`, solo en este proyecto).
const ipadUse = { browserName: "webkit" as const };

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // Puerto distinto al de `pnpm dev`: es otro origen, así que no toca tus datos reales.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
      },
      testIgnore: /ipad\.spec\.ts/,
    },
    { name: "ipad", use: { ...devices["iPad Pro 11"], ...ipadUse }, testMatch: /ipad\.spec\.ts/ },
    { name: "ipad-landscape", use: { ...devices["iPad Pro 11 landscape"], ...ipadUse }, testMatch: /ipad\.spec\.ts/ },
  ],
  webServer: {
    command: "pnpm build && pnpm start:e2e",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
