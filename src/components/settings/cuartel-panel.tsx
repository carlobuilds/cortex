"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCortexDb } from "@/db/use-profile";
import { browserStorage, type CuartelReason, cuartelSyncEnabled, type LastPush, readLastPush, setCuartelSync } from "@/sync/cuartel-status";
import { pushStudySummary } from "@/sync/study-push";

const ALLOWED_ORIGIN = "http://localhost:3000";

const REASON_TEXT: Record<CuartelReason, string> = {
  prohibido: "La Mac rechazó la petición: solo se envía desde localhost:3000.",
  tipo: "La petición no tenía el formato esperado.",
  "cuerpo grande": "El resumen salió más grande de lo permitido y no se envió.",
  "cuerpo inválido": "El resumen no pasó la validación y no se envió.",
  "en curso": "Ya había un envío en curso.",
  "muy pronto": "Se envió hace muy poco; el siguiente cierre lo vuelve a mandar.",
  "sin token": "Falta el token cortex-mac en la Mac (ver ADR-030).",
  "token inválido": "El token no es válido o tiene permisos abiertos (debe ser 0600).",
  "tiempo agotado": "Cuartel tardó demasiado en responder; se reintenta en el siguiente cierre.",
  red: "No hubo conexión con Cuartel o respondió con una redirección; se reintenta en el siguiente cierre.",
  "error interno": "Falló algo interno al enviar; se reintenta en el siguiente cierre.",
  "sin días": "Aún no hay actividad en los últimos 7 días que enviar.",
  "sin respuesta": "Cuartel no respondió; se reintenta en el siguiente cierre.",
  "error local": "No se pudo leer tu progreso de este navegador; se reintenta en el siguiente cierre.",
};

function outcomeText(last: LastPush): string {
  if (last.sent && last.status === 200) return "Cuartel lo recibió";
  if (last.status === 401 || last.status === 403) return "Cuartel rechazó el token";
  if (last.status !== null && last.status >= 500) return "Cuartel falló; se reintenta en el siguiente cierre";
  if (last.reason) return REASON_TEXT[last.reason];
  return last.sent ? "Enviado" : "No se envió";
}

function relativeTime(at: number, now: number): string {
  const secs = Math.round((at - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });
  const abs = Math.abs(secs);
  if (abs < 45) return "hace unos segundos";
  if (abs < 3600) return rtf.format(Math.round(secs / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), "hour");
  return rtf.format(Math.round(secs / 86400), "day");
}

/** Interruptor y estado del resumen de estudio a Cuartel (ADR-030). Apagado por defecto. */
export function CuartelPanel() {
  const id = useId();
  const dbState = useCortexDb();
  const db = dbState.status === "ready" ? dbState.db : null;
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [last, setLast] = useState<LastPush | null>(null);
  const [now, setNow] = useState(0);
  const [asked, setAsked] = useState(false);
  const [origin, setOrigin] = useState(ALLOWED_ORIGIN);

  useEffect(() => {
    const storage = browserStorage();
    const refresh = () => {
      setLast(readLastPush(storage));
      setNow(Date.now());
    };
    // Se lee después de montar para no romper la hidratación.
    const init = () => {
      setEnabled(cuartelSyncEnabled(storage));
      setOrigin(window.location.origin);
      refresh();
      setMounted(true);
    };
    queueMicrotask(init);
    window.addEventListener("cortex:cuartel", refresh);
    return () => window.removeEventListener("cortex:cuartel", refresh);
  }, []);

  const wrongOrigin = mounted && origin !== ALLOWED_ORIGIN;

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <label htmlFor={id} className="font-semibold">
            Enviar resumen de estudio a Cuartel
          </label>
          <p id={`${id}-desc`} className="mt-1 text-sm text-muted-foreground">
            Apagado por defecto. Por cada uno de los últimos 7 días se envían: minutos activos, ejercicios respondidos y correctos, repasos, lecciones y si
            cumpliste la misión mínima. Nada más: ni respuestas, ni notas, ni materias. Solo se envía desde esta Mac (localhost:3000) y al cerrar una sesión. Así
            Cuartel marca tu hábito Estudio.
          </p>
        </div>
        <Switch
          id={id}
          aria-describedby={`${id}-desc`}
          checked={enabled}
          disabled={!mounted}
          onCheckedChange={(checked) => {
            setCuartelSync(browserStorage(), checked);
            setEnabled(checked);
          }}
        />
      </div>

      {wrongOrigin ? (
        <p role="note" className="rounded-md border bg-surface-2 p-3 text-sm">
          Desde aquí no se envía: solo se acepta localhost:3000.
        </p>
      ) : null}

      <div className="text-sm" aria-live="polite">
        <p className="font-semibold">Último envío</p>
        <p className="mt-1 text-muted-foreground">
          {last ? `${relativeTime(last.at, now)}: ${outcomeText(last)}.` : "Todavía no hay envíos desde este perfil."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={!enabled || !db}
          aria-describedby={`${id}-now`}
          onClick={() => {
            if (!db) return;
            pushStudySummary(db);
            setAsked(true);
          }}
        >
          Enviar ahora
        </Button>
        <p id={`${id}-now`} aria-live="polite" className="text-sm text-muted-foreground">
          {asked ? "Pedido. Si acabas de enviar, puede tardar unos 20 s; el estado se actualiza arriba." : "Si acabas de enviar, puede tardar unos 20 s."}
        </p>
      </div>
    </div>
  );
}
