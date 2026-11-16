import { CUARTEL_LIMITS, localSyncBodySchema } from "@/engine/cuartel";
import { sendStudyDays } from "@/server/cuartel";
import { checkLocalRequest } from "@/server/local-access";

/**
 * Envío de cifras de estudio a Cuartel (ADR-022). Como el runner de C (ADR-005), solo existe con
 * `CORTEX_LOCAL=1`, desde localhost y desde la propia app: sin eso responde 404. El navegador manda
 * la proyección de 7 campos por día; el servidor la vuelve a validar y la reenvía a Cuartel con el
 * token, que nunca sale de aquí.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUARD = {
  header: "x-cortex-sync",
  headerMessage: "Falta el encabezado del envío.",
  disabledMessage: "No encontrado.",
} as const;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

export async function POST(req: Request) {
  if (process.env.CORTEX_LOCAL !== "1") return json({ error: "No encontrado." }, 404);
  const access = checkLocalRequest(req.headers, "POST", GUARD);
  if (!access.ok) return json({ error: access.message }, access.status);
  if (Number(req.headers.get("content-length") ?? 0) > CUARTEL_LIMITS.bodyBytes) return json({ error: "Cuerpo demasiado grande." }, 413);
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > CUARTEL_LIMITS.bodyBytes) return json({ error: "Cuerpo demasiado grande." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  const parsed = localSyncBodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Cuerpo inválido." }, 400);
  return json(await sendStudyDays(parsed.data.days));
}
