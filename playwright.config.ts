import { defineConfig, devices } from "@playwright/test";

// Opcional: ruta a un Chromium ya instalado (p. ej. en un contenedor sin acceso al CDN de Playwright).
const chromiumPath = process.env.CORTEX_CHROMIUM_PATH;

// iPad: WebKit con toque, sin teclado físico. La emulación puede no activar `pointer: coarse`, así que
// se fuerza el modo táctil de la app (localStorage `cortex-input`, solo en este proyecto).
const ipadUse = { browserName: "webkit" as const };

// Pruebas contra el contenedor de Caddy (B5, `pnpm test:e2e:pwa`): sin `webServer`, el contenedor ya está arriba en :3300.
// El `test:e2e` normal ni los ve.
const pwa = process.env.CORTEX_E2E_PWA === "1";
const pwaUse = { baseURL: "http://localhost:3300" };

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
  projects: pwa
    ? [
        {
          name: "pwa-chromium",
          use: { ...devices["Desktop Chrome"], ...pwaUse, launchOptions: chromiumPath ? { executablePath: chromiumPath } : {} },
          testMatch: /pwa\.spec\.ts/,
        },
        { name: "pwa-webkit", use: { ...devices["iPad Pro 11"], ...ipadUse, ...pwaUse }, testMatch: /pwa\.spec\.ts/ },
      ]
    : [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
      },
      testIgnore: /(ipad|pwa)\.spec\.ts/,
    },
    { name: "ipad", use: { ...devices["iPad Pro 11"], ...ipadUse }, testMatch: /ipad\.spec\.ts/ },
    { name: "ipad-landscape", use: { ...devices["iPad Pro 11 landscape"], ...ipadUse }, testMatch: /ipad\.spec\.ts/ },
  ],
  webServer: pwa
    ? undefined
    : {
        command: "pnpm build && pnpm start:e2e",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
