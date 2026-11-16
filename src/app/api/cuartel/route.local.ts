import { createCuartelHandler, defaultCuartelDeps } from "@/sync/cuartel-server";

/**
 * Empuje del resumen de estudio a Cuartel (ADR-030). Solo POST, solo desde la Mac en
 * `localhost:3000`; los candados, el cuerpo y la tasa los revisa el manejador.
 * Solo existe en la build de la Mac: la build del iPad excluye `local.ts` (ADR-005).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCuartelHandler(defaultCuartelDeps());
