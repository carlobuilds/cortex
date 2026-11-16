// CLI del service worker: corre en `pnpm build:pwa` después de `next build` y antes de `check-out-cli.ts`.
import { main } from "./lib/sw-plan";

main();
