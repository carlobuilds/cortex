"use client";

import { Download, Info, Share2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  backupFileName,
  backupSizeError,
  type BackupSummary,
  type DeviceSummary,
  exportBackup,
  importBackup,
  importRisk,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  summarizeDevice,
  utf8ByteLength,
} from "@/db/backup";
import type { Backup } from "@/db/backup-schema";
import { type CortexDb, DbClosedError, FutureSchemaError, getDb } from "@/db/db";
import { DATA_TABLES, type DataTableName } from "@/db/schema";
import { useCortexDb } from "@/db/use-profile";
import { APP_NAME, APP_VERSION } from "@/lib/app";
import { canShareFiles, downloadText, makeFile, shareFile } from "@/lib/download";
import { type BuildResult, SharePreparer } from "@/lib/share-prep";
import { formatActivity, type ImportNotice, importNotice } from "./import-notice";

const TABLE_LABELS: Record<DataTableName, string> = {
  profile: "Perfil",
  unitProgress: "Progreso por unidad",
  attempts: "Intentos",
  cards: "Tarjetas de repaso",
  sessions: "Sesiones",
  missions: "Misiones",
  records: "Récords",
  ghosts: "Fantasmas",
  achievements: "Logros",
  gymResults: "Gimnasio",
  mistakes: "Cuaderno de errores",
  reports: "Reportes",
  days: "Días de estudio",
};

async function buildShareFile(): Promise<BuildResult> {
  try {
    const text = serializeBackup(await exportBackup(await getDb(), APP_VERSION));
    return { ok: true, file: makeFile(backupFileName(), text), tooBig: backupSizeError(utf8ByteLength(text)), at: Date.now() };
  } catch (e) {
    console.error("No pude preparar el respaldo para compartir", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const formatTime = (ms: number) => new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

const noSubscribe = () => () => {};

const formatDate = (iso: string) => new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });

/** Aviso de resultado: `ok` en color de acento; `warning` cuando algo requiere tu atención. */
interface Notice {
  readonly tone: "ok" | "warning";
  readonly text: string;
}

interface ErrorBlock {
  readonly title: string;
  readonly items: readonly string[];
}

const IMPORT_ERROR = "Ese archivo no se puede importar. Tus datos no cambiaron.";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface Pending {
  readonly backup: Backup;
  readonly summary: BackupSummary;
  readonly device: DeviceSummary;
  readonly notice: ImportNotice;
  readonly fileName: string;
}

/** Exportar e importar el respaldo JSON (ADR-015). Importar reemplaza todo, tras confirmar (D7). */
export function BackupPanel() {
  const inputId = useId();
  const db = useCortexDb();
  const ready: CortexDb | null = db.status === "ready" ? db.db : null;
  const input = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  // Se confirmó el reemplazo: el botón que abrió el diálogo va a desaparecer, así que Radix no
  // debe devolverle el foco; lo recibe el resultado (aviso de estado o de error).
  const confirmed = useRef(false);
  const [status, setStatus] = useState<Notice | null>(null);
  const [errors, setErrors] = useState<ErrorBlock | null>(null);
  // Resultado de "Descargar mis datos actuales primero", visible dentro del diálogo.
  const [dialogNote, setDialogNote] = useState<Notice | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  // Archivo para la hoja de compartir, preparado ANTES del toque (Safari pierde la activación si se espera a Dexie).
  const [preparer] = useState(() => new SharePreparer(buildShareFile));
  const snap = useSyncExternalStore(preparer.subscribe, preparer.getSnapshot, preparer.getSnapshot);
  // La hoja de compartir (AirDrop) solo existe en algunos navegadores: se decide ya en el cliente.
  const canShare = useSyncExternalStore(noSubscribe, canShareFiles, () => false) && !snap.disabled;
  const [dialogOpen, setDialogOpen] = useState(false);
  const chooseSeq = useRef(0);
  // Cada apertura del panel deja un archivo listo con los datos de ese momento; si la página se oculta
  // se descarta (pudo cambiar en otra pestaña o app) y al volver se prepara de nuevo.
  useEffect(() => {
    if (!canShare || !ready) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void preparer.prepare();
      else preparer.invalidate();
    };
    const hide = () => preparer.invalidate();
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pagehide", hide);
    };
  }, [canShare, ready, preparer]);
  const [fileName, setFileName] = useState("");
  const [focusAfterImport, setFocusAfterImport] = useState<{ target: "status" | "errors" } | null>(null);

  useEffect(() => {
    if (!focusAfterImport) return;
    (focusAfterImport.target === "status" ? statusRef : errorsRef).current?.focus();
  }, [focusAfterImport]);

  if (db.status === "error") {
    return (
      <div role="alert" className="rounded-lg border border-warning p-4 text-sm">
        <p className="font-semibold text-warning">
          {db.error instanceof FutureSchemaError
            ? `Tus datos son de una versión más nueva de ${APP_NAME}`
            : db.error instanceof DbClosedError
              ? "Se perdió la conexión con tus datos"
              : "No pude abrir tus datos"}
        </p>
        <p className="mt-1 text-ink-2">{db.error.message}</p>
      </div>
    );
  }

  // Los manejadores piden la base a getDb() (misma promesa compartida): así no dependen de un
  // render anterior en el que todavía no estaba lista.
  /** Descarga el respaldo y devuelve el aviso del resultado (en el panel o dentro del diálogo). */
  const download = async (): Promise<Notice> => {
    try {
      const name = backupFileName();
      const text = serializeBackup(await exportBackup(await getDb(), APP_VERSION));
      downloadText(name, text);
      // Nunca un respaldo "exitoso" que luego no se pueda importar sin que lo sepas.
      const tooBig = backupSizeError(utf8ByteLength(text));
      return tooBig
        ? { tone: "warning", text: `Se descargó ${name}, pero no se podrá importar: ${tooBig} Guárdalo y pide que se suba el límite.` }
        : { tone: "ok", text: `Respaldo descargado: ${name}` };
    } catch (e) {
      return { tone: "warning", text: `No pude descargar el respaldo: ${message(e)}` };
    }
  };

  const downloadFromPanel = async () => {
    setErrors(null);
    setStatus(await download());
  };

  /** Síncrono hasta `navigator.share`: sin `await` antes, para conservar la activación del toque. */
  const share = (report: (n: Notice | null) => void) => {
    const state = preparer.getSnapshot().state;
    if (state.status === "failed") {
      report({ tone: "warning", text: `No pude preparar el respaldo: ${state.error}` });
      void preparer.prepare();
      return;
    }
    const file = preparer.take();
    if (!file) {
      report({ tone: "ok", text: "Preparando…" });
      if (state.status === "idle") void preparer.prepare();
      return;
    }
    const outcome = (st: ReturnType<typeof preparer.getSnapshot>["state"]): Notice | null =>
      st.status === "ready"
        ? { tone: "ok", text: "Listo: toca otra vez para compartir." }
        : st.status === "failed"
          ? { tone: "warning", text: `No pude preparar el respaldo: ${st.error}` }
          : { tone: "ok", text: "Preparando…" };
    shareFile(file.file, `Respaldo de ${APP_NAME}`)
      .then(async (r) => {
        if (r === "retry") {
          // Se perdió la activación: no es un error. Se prepara otro y se pide un toque más (con tope).
          if (preparer.noteRetry()) {
            report({ tone: "warning", text: "El navegador no deja compartir: usa Descargar respaldo." });
            return;
          }
          report({ tone: "ok", text: "Preparando…" });
          report(outcome(await preparer.prepare()));
          return;
        }
        if (r === "shared") {
          preparer.resetRetries();
          const name = file.file.name;
          report(
            file.tooBig
              ? { tone: "warning", text: `Se compartió ${name}, pero no se podrá importar: ${file.tooBig}` }
              : { tone: "ok", text: `Respaldo compartido: ${name} · datos de las ${formatTime(file.at)}` },
          );
        } else report(null); // cancelada: no se muestra nada
        void preparer.prepare(); // cancelar no consume: queda uno fresco
      })
      .catch((e: unknown) => {
        report({ tone: "warning", text: `No pude compartir el respaldo: ${message(e)}` });
        void preparer.prepare();
      });
  };

  /** Recalcula el estado de este dispositivo justo antes de abrir la confirmación (pudo haber actividad). */
  const openConfirm = async () => {
    if (!pending) return;
    confirmed.current = false;
    setDialogNote(null);
    try {
      const device = await summarizeDevice(await getDb());
      setPending((cur) => (cur ? { ...cur, device, notice: importNotice(importRisk(device, cur.summary)) } : cur));
      if (canShare) void preparer.prepare();
      setDialogOpen(true);
    } catch (e) {
      setErrors({ title: "No pude leer los datos de este dispositivo. No abrí la confirmación; tus datos no cambiaron.", items: [message(e)] });
    }
  };

  const choose = async (file: File | undefined) => {
    const mine = ++chooseSeq.current;
    const stale = () => mine !== chooseSeq.current; // un `choose` viejo no pisa a uno nuevo
    setErrors(null);
    setPending(null);
    setStatus(null);
    if (!file) return;
    // El tamaño se revisa antes de leer: un archivo enorme ni siquiera se carga en memoria.
    const tooBig = backupSizeError(file.size);
    if (tooBig) {
      setErrors({ title: IMPORT_ERROR, items: [tooBig] });
      return;
    }
    let parsed: ReturnType<typeof parseBackup>;
    try {
      parsed = parseBackup(await file.text());
    } catch (e) {
      if (!stale()) setErrors({ title: IMPORT_ERROR, items: [`No pude leer ese archivo: ${message(e)}`] });
      return;
    }
    if (stale()) return;
    if (!parsed.ok) {
      setErrors({ title: IMPORT_ERROR, items: parsed.errors });
      return;
    }
    try {
      const device = await summarizeDevice(await getDb());
      if (stale()) return;
      const summary = summarizeBackup(parsed.backup);
      setPending({ backup: parsed.backup, summary, device, notice: importNotice(importRisk(device, summary)), fileName: file.name });
      setStatus({ tone: "ok", text: `Respaldo listo para revisar: ${file.name}. Compara abajo y confirma si quieres reemplazar.` });
    } catch (e) {
      if (!stale()) setErrors({ title: "No pude leer los datos de este dispositivo. Tus datos no cambiaron.", items: [message(e)] });
    }
  };

  const replace = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(await getDb(), pending.backup);
      setErrors(null);
      setStatus({ tone: "ok", text: `Listo: tus datos se restauraron · respaldo del ${formatDate(pending.summary.exportedAt)}` });
      setPending(null);
      setFileName("");
      if (input.current) input.current.value = "";
      setFocusAfterImport({ target: "status" });
    } catch (e) {
      setErrors({ title: "No se pudo importar. Tus datos quedaron como estaban.", items: [message(e)] });
      setFocusAfterImport({ target: "errors" });
    } finally {
      // Los datos cambiaron (o pudieron cambiar): el archivo de compartir de antes ya no vale.
      preparer.invalidate();
      void preparer.prepare();
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-semibold">Descargar respaldo</p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Un archivo JSON con todo tu progreso. Guárdalo donde quieras; nada sale de tu máquina.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void downloadFromPanel()} disabled={!ready}>
            <Download aria-hidden /> Descargar respaldo
          </Button>
          {canShare ? (
            <Button
              variant="outline"
              onClick={() => {
                setErrors(null);
                share(setStatus);
              }}
              disabled={!ready}
            >
              <Share2 aria-hidden /> {snap.retries > 0 ? "Compartir ahora (AirDrop)" : "Compartir (AirDrop)"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="max-w-prose text-sm text-ink-2">
        <p>Un dispositivo a la vez: exporta al terminar, importa al empezar.</p>
        {process.env.NEXT_PUBLIC_CORTEX_PWA === "1" ? (
          <p className="mt-1">Importa dentro de la app instalada, no en Safari: no comparten datos.</p>
        ) : null}
      </div>

      <div className="border-t pt-6">
        <label htmlFor={inputId} className="font-semibold">
          Importar respaldo
        </label>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Reemplaza <strong className="text-ink">todos</strong> tus datos por los del archivo. Antes te muestro qué trae y te pido
          confirmación.
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
          {/* El input nativo queda accesible (enfocable con Tab) pero oculto; el botón visible es su etiqueta en español. */}
          <input
            ref={input}
            id={inputId}
            type="file"
            accept=".json,application/json"
            disabled={!ready}
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? "");
              void choose(e.target.files?.[0]);
            }}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            aria-hidden
            className="inline-flex h-9 touch:h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-sm font-semibold hover:bg-surface-3 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]"
          >
            <Upload aria-hidden className="size-4" /> Elegir archivo…
          </label>
          <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{fileName || "Ningún archivo elegido"}</span>
        </div>
      </div>

      {errors ? (
        <div ref={errorsRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger p-4 text-sm outline-offset-4">
          <p className="font-semibold text-danger">{errors.title}</p>
          <ul className="mt-2 list-disc pl-5 text-ink-2">
            {errors.items.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {pending ? (
        <section aria-labelledby="resumen-respaldo" className="min-w-0 rounded-lg border bg-surface-2 p-4">
          <h3 id="resumen-respaldo" className="font-semibold">
            {pending.fileName}
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            Respaldo del {formatDate(pending.summary.exportedAt)} · nivel {pending.summary.level} · {pending.summary.xpTotal} XP
          </p>
          <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Registros por tabla: ahora y en el respaldo</caption>
            <thead>
              <tr className="text-left text-caption text-muted-foreground">
                <th scope="col" className="py-1 font-medium">Tabla</th>
                <th scope="col" className="py-1 pl-3 text-right font-medium">Ahora</th>
                <th scope="col" className="py-1 pl-3 text-right font-medium">Respaldo</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {DATA_TABLES.map((t) => (
                <tr key={t} className="border-t">
                  <th scope="row" className="py-1 text-left font-sans font-normal">
                    {TABLE_LABELS[t]}
                  </th>
                  <td className="py-1 pl-3 text-right">{pending.device.counts[t]}</td>
                  <td className="py-1 pl-3 text-right">{pending.summary.counts[t]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="mt-4 h-auto min-h-9 py-2 whitespace-normal touch:h-auto touch:min-h-11"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault(); // el diálogo se abre al terminar de leer este dispositivo (openConfirm)
                  void openConfirm();
                }}
              >
                Reemplazar mis datos con este respaldo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              // Tras confirmar, el botón que abrió el diálogo desaparece: el foco va al aviso de estado.
              onCloseAutoFocus={(e) => {
                if (confirmed.current) e.preventDefault();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>¿Reemplazar todos tus datos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Lo que tienes ahora se sustituye por el respaldo. Si algo falla a la mitad, nada cambia.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="import-facts">
                <div className="rounded-md bg-surface-2 p-3">
                  <dt className="font-semibold">Este dispositivo</dt>
                  <dd className="mt-1 text-ink-2">
                    Última actividad: {formatActivity(pending.device.lastActivityAt)} · {pending.device.counts.attempts} intentos
                  </dd>
                </div>
                <div className="rounded-md bg-surface-2 p-3">
                  <dt className="font-semibold">Respaldo</dt>
                  <dd className="mt-1 text-ink-2">
                    Exportado: {formatDate(pending.summary.exportedAt)} · última actividad: {formatActivity(pending.summary.lastActivityAt)} ·{" "}
                    {pending.summary.counts.attempts} intentos
                  </dd>
                </div>
              </dl>
              {pending.notice.kind === "neutral" ? (
                <p className="text-sm text-ink-2" data-testid="import-ok">
                  {pending.notice.title}
                </p>
              ) : (
                <div role="note" data-testid="import-aviso" className="flex gap-3 rounded-lg border border-warning p-3 text-sm">
                  <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <p className="font-semibold text-warning">{pending.notice.title}</p>
                    <p className="mt-1">{pending.notice.action}</p>
                    {pending.notice.reasons.length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 text-ink-2">
                        {pending.notice.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="h-auto min-h-9 py-2 whitespace-normal touch:h-auto touch:min-h-11"
                  onClick={() => void download().then(setDialogNote)}
                >
                  <Download aria-hidden /> Guardar primero una copia de este dispositivo
                </Button>
                {canShare ? (
                  <Button
                    variant="outline"
                    className="h-auto min-h-9 py-2 whitespace-normal touch:h-auto touch:min-h-11"
                    onClick={() => share(setDialogNote)}
                  >
                    <Share2 aria-hidden /> {snap.retries > 0 ? "Compartir ahora (AirDrop)" : "Compartir (AirDrop)"}
                  </Button>
                ) : null}
                <p role="status" aria-live="polite" className={dialogNote?.tone === "warning" ? "text-sm text-warning" : "text-sm text-brand"}>
                  {dialogNote?.text}
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-auto min-h-10 touch:min-h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  className="h-auto min-h-10 whitespace-normal touch:min-h-11"
                  onClick={() => {
                    confirmed.current = true;
                    void replace();
                  }}
                >
                  Reemplazar con el respaldo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : null}

      <p
        ref={statusRef}
        tabIndex={-1}
        aria-live="polite"
        role="status"
        className={`text-sm outline-offset-4 ${status?.tone === "warning" ? "text-warning" : "text-brand"}`}
      >
        {status?.text}
      </p>
    </div>
  );
}
