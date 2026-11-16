import { APP_ID } from "@/lib/app";
import { type Backup, BACKUP_FORMAT, backupSchema, type BackupTables, PRIMARY_KEYS } from "./backup-schema";
import type { CortexDb } from "./db";
import { cardV1toV2, mistakeV1toV2, profileV1toV2, unitProgressV1toV2 } from "./migrations";
import { DATA_TABLES, type DataTableName, SCHEMA_VERSION } from "./schema";

/** Tamaño máximo por defecto de un respaldo a importar (100 MB). */
export const DEFAULT_MAX_BACKUP_BYTES = 100 * 1024 * 1024;

/** Bytes que ocupa un texto en UTF-8, sin copiarlo. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Mensaje si un respaldo de `bytes` pasa del máximo que se puede importar; `null` si cabe. */
export function backupSizeError(bytes: number, maxBytes: number = DEFAULT_MAX_BACKUP_BYTES): string | null {
  return bytes > maxBytes ? `El archivo pesa ${megabytes(bytes)}; el máximo es ${megabytes(maxBytes)}.` : null;
}

const MAX_ERRORS = 20;
const MAX_ERROR_CHARS = 200;
/** Recorta un mensaje que cita datos del archivo (llaves, valores) para no inundar la pantalla. */
const clip = (text: string) => (text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS)}…` : text);

export type ParseResult = { ok: true; backup: Backup } | { ok: false; errors: string[] };

/** `cortex-AAAA-MM-DD.cortex-backup.json` con la fecha local. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${APP_ID}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.cortex-backup.json`;
}

/** Lee todas las tablas de datos en una sola transacción de lectura. */
export async function exportBackup(db: CortexDb, appVersion: string, now: Date = new Date()): Promise<Backup> {
  const tables = await db.transaction("r", DATA_TABLES.map((t) => db.table(t)), async () => {
    const entries = await Promise.all(DATA_TABLES.map(async (t) => [t, await db.table(t).toArray()] as const));
    return Object.fromEntries(entries) as unknown as BackupTables;
  });
  return { app: APP_ID, format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), appVersion, tables };
}

/** JSON compacto: con sangría pesaría ~65 % más y se acercaría antes al máximo de importación. */
export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup)}\n`;
}

/**
 * Valida un respaldo completo ANTES de tocar la base. Nunca lanza: devuelve los errores en español.
 */
export function parseBackup(text: string, maxBytes: number = DEFAULT_MAX_BACKUP_BYTES): ParseResult {
  const tooBig = backupSizeError(utf8ByteLength(text), maxBytes);
  if (tooBig) return { ok: false, errors: [tooBig] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["El archivo no es un JSON válido (¿está incompleto o es otro archivo?)."] };
  }
  const head = data as { app?: unknown; format?: unknown; schemaVersion?: unknown } | null;
  if (typeof head !== "object" || head === null || head.app !== APP_ID) {
    return { ok: false, errors: [`No es un respaldo de ${APP_ID}.`] };
  }
  if (head.format !== BACKUP_FORMAT) {
    return { ok: false, errors: [clip(`Formato de respaldo ${String(head.format)} desconocido (esta app lee el ${BACKUP_FORMAT}).`)] };
  }
  const v = head.schemaVersion;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
    return { ok: false, errors: [clip(`Versión de esquema inválida: ${JSON.stringify(v)}.`)] };
  }
  if (v > SCHEMA_VERSION) {
    return { ok: false, errors: [`El respaldo es de una versión más nueva (esquema ${v}; esta app entiende hasta el ${SCHEMA_VERSION}). Actualiza la app.`] };
  }
  const r = backupSchema.safeParse(migrateBackup(data as Backup));
  if (!r.success) {
    return { ok: false, errors: r.error.issues.slice(0, MAX_ERRORS).map((i) => clip(`${i.path.join(".") || "respaldo"}: ${i.message}`)) };
  }
  const dupes = DATA_TABLES.flatMap((t) => {
    const key = PRIMARY_KEYS[t];
    const seen = new Set<unknown>();
    return (r.data.tables[t] as Record<string, unknown>[]).flatMap((row) => {
      const k = row[key];
      if (seen.has(k)) return [clip(`${t}: la clave ${JSON.stringify(k)} se repite.`)];
      seen.add(k);
      return [];
    });
  });
  if (dupes.length) return { ok: false, errors: dupes.slice(0, MAX_ERRORS) };
  return { ok: true, backup: r.data };
}

/**
 * Lleva un respaldo viejo a la versión actual con las mismas transformaciones que el `upgrade` de
 * Dexie. Recibe datos SIN validar: solo toca lo que tiene la forma esperada y deja que Zod juzgue.
 */
export function migrateBackup(backup: Backup): Backup {
  let b = backup as unknown as { schemaVersion: number; tables?: unknown };
  if (b.schemaVersion === 1) b = v1toV2(b);
  return b as unknown as Backup;
}

function v1toV2(b: { schemaVersion: number; tables?: unknown }): { schemaVersion: number; tables?: unknown } {
  const t = b.tables;
  if (typeof t !== "object" || t === null || Array.isArray(t)) return { ...b, schemaVersion: 2 };
  const tables = { ...(t as Record<string, unknown>) };
  const mapRows = (name: string, fn: (r: Record<string, unknown>) => Record<string, unknown>) => {
    const rows = tables[name];
    if (Array.isArray(rows)) {
      tables[name] = rows.map((r: unknown) =>
        typeof r === "object" && r !== null && !Array.isArray(r) ? { ...fn(r as Record<string, unknown>), schemaVersion: 2 } : r,
      );
    }
  };
  mapRows("profile", profileV1toV2);
  mapRows("cards", cardV1toV2);
  mapRows("mistakes", mistakeV1toV2);
  mapRows("unitProgress", unitProgressV1toV2);
  if (!("days" in tables)) tables.days = [];
  return { ...b, schemaVersion: 2, tables };
}

/** Filas de las que sale la última actividad: tabla → campo con la fecha en milisegundos. */
const ACTIVITY_FIELDS = [
  ["attempts", "at"],
  ["sessions", "startedAt"],
  ["gymResults", "at"],
] as const;

/** Tablas (respaldo o prueba) de las que se lee la actividad; sin validar, por eso `unknown`. */
export type ActivityTables = { readonly [K in (typeof ACTIVITY_FIELDS)[number][0]]?: readonly unknown[] };

export interface LastActivity {
  /** Máximo de `attempts.at`, `sessions.startedAt` y `gymResults.at`; `null` si no hay filas legibles. */
  readonly at: number | null;
  /** Filas cuya fecha no es un número finito > 0 (o que ni son objeto). */
  readonly unreadable: number;
}

/** Máximo de `Date` (ms): más allá no es una fecha. */
const MAX_DATE_MS = 8.64e15;
const isReadableDate = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_DATE_MS;

/** Última actividad de un conjunto de tablas. Pura: no valida más de lo necesario y nunca lanza. */
export function lastActivity(tables: ActivityTables): LastActivity {
  let at: number | null = null;
  let unreadable = 0;
  for (const [table, field] of ACTIVITY_FIELDS) {
    for (const row of tables[table] ?? []) {
      const v = typeof row === "object" && row !== null ? (row as Record<string, unknown>)[field] : undefined;
      if (isReadableDate(v)) {
        if (at === null || v > at) at = v;
      } else unreadable++;
    }
  }
  return { at, unreadable };
}

export interface BackupSummary {
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly counts: Readonly<Record<DataTableName, number>>;
  readonly xpTotal: number;
  readonly level: number;
  /** Última actividad (ms) dentro del respaldo; `null` si no hay. */
  readonly lastActivityAt: number | null;
  /** Filas del respaldo con fecha ilegible (ver `lastActivity`). */
  readonly unreadableDates: number;
}

export function summarizeBackup(backup: Backup): BackupSummary {
  const counts = Object.fromEntries(DATA_TABLES.map((t) => [t, backup.tables[t].length])) as Record<DataTableName, number>;
  const profile = backup.tables.profile[0];
  const activity = lastActivity(backup.tables);
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    counts,
    xpTotal: profile?.xpTotal ?? 0,
    level: profile?.level ?? 1,
    lastActivityAt: activity.at,
    unreadableDates: activity.unreadable,
  };
}

/** Resumen de lo que hay ahora en la base (para comparar antes de importar). */
export async function summarizeDb(db: CortexDb): Promise<Readonly<Record<DataTableName, number>>> {
  const entries = await Promise.all(DATA_TABLES.map(async (t) => [t, await db.table(t).count()] as const));
  return Object.fromEntries(entries) as Record<DataTableName, number>;
}

/** Lo que `importRisk` sabe del dispositivo: conteos y última actividad (ms). */
export interface DeviceSummary {
  readonly counts: Readonly<Record<DataTableName, number>>;
  readonly lastActivityAt: number | null;
  /**
   * Filas sin fecha indexable (diferencia `count` − `orderBy.count`, exacta) más 1 por tabla cuya
   * fila con la fecha más alta no es un número legible (las cadenas ordenan después de los números).
   * Cota inferior: una cadena o una fecha absurda que no sea la más alta no se ve.
   */
  readonly unreadableDates: number;
}

/** Conteos más `lastActivityAt`, leyendo solo el último valor de cada índice (sin tablas enteras). */
export async function summarizeDevice(db: CortexDb): Promise<DeviceSummary> {
  const counts = await summarizeDb(db);
  let at: number | null = null;
  let unreadableDates = 0;
  for (const [table, field] of ACTIVITY_FIELDS) {
    // IndexedDB no indexa null, undefined, NaN ni booleanos: esas filas no salen en `orderBy`, pero
    // sí en `count()`. La diferencia exacta son filas sin fecha indexable.
    const [total, indexed, row] = await Promise.all([
      db.table(table).count(),
      db.table(table).orderBy(field).count(),
      db.table(table).orderBy(field).last() as Promise<Record<string, unknown> | undefined>,
    ]);
    unreadableDates += total - indexed;
    if (!row) continue;
    const v = row[field];
    if (isReadableDate(v)) {
      if (at === null || v > at) at = v;
    } else unreadableDates++;
  }
  return { counts, lastActivityAt: at, unreadableDates };
}

export type ImportRiskLevel = "ok" | "aviso" | "alto";
export interface ImportRisk {
  readonly level: ImportRiskLevel;
  /** Razones en español, cortas y sin culpa; vacío si `level` es `"ok"`. */
  readonly reasons: readonly string[];
}

/** Tolerancia entre relojes de la Mac y el iPad (y entre exportar y la última fila escrita). */
export const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Decide si el diálogo de «Reemplazar» avisa (ADR-028). Dos capas:
 * a) chequeos que fallan cerrado (E9): si dan `"alto"`, se devuelven sin consultar la regla;
 * b) la regla de Carlo, en `decideImportRisk`.
 */
export function importRisk(local: DeviceSummary, incoming: BackupSummary, now: Date = new Date()): ImportRisk {
  const reasons: string[] = [];
  if (incoming.unreadableDates > 0) {
    reasons.push("Algunas fechas del respaldo no se pueden leer, así que no puedo comparar con lo de este dispositivo.");
  }
  const exportedMs = Date.parse(incoming.exportedAt);
  if (Number.isNaN(exportedMs)) {
    reasons.push("No se puede leer la fecha en que se exportó el respaldo.");
  } else {
    if (exportedMs > now.getTime() + CLOCK_TOLERANCE_MS) {
      reasons.push("El respaldo dice haberse exportado en el futuro; revisa el reloj de este dispositivo y del que lo exportó.");
    }
    if (incoming.lastActivityAt !== null && incoming.lastActivityAt > exportedMs + CLOCK_TOLERANCE_MS) {
      reasons.push("El respaldo trae actividad posterior a su propia fecha de exportación.");
    }
  }
  if (local.unreadableDates > 0) reasons.push("Algunas fechas de este dispositivo no se pueden leer.");
  const localRows = local.counts.attempts + local.counts.sessions + local.counts.gymResults;
  if (local.lastActivityAt === null && localRows > 0) {
    reasons.push("Este dispositivo tiene actividad que no se puede fechar.");
  }
  if (reasons.length > 0) return { level: "alto", reasons };
  return decideImportRisk(local, incoming, now);
}

/**
 * LA REGLA DE CARLO (ADR-028). Aquí se decide cuándo avisar al reemplazar los datos de este
 * dispositivo por los de un respaldo. Llega después de los chequeos que fallan cerrado: aquí
 * `incoming` ya tiene fechas legibles y `exportedAt` válido, no futuro y coherente con su actividad.
 *
 * Recibe:
 * - `local`: conteos y `lastActivityAt` (ms) de este dispositivo; `null` si no hay actividad.
 *   OJO: `local.lastActivityAt` es una cota inferior (sale de los índices, no de leer todas las
 *   filas). La capa a ya descartó fechas ilegibles de los dos lados (y actividad sin fecha local).
 * - `incoming`: lo mismo del respaldo, más `exportedAt` (ISO) y `appVersion`.
 * - `now`: para medir la antigüedad del respaldo.
 *
 * Qué se juega: importar REEMPLAZA todo y no fusiona. Lo hecho aquí después de ese respaldo se
 * pierde. Avisar de más enseña a ignorar el aviso; avisar de menos pisa una sesión.
 *
 * Opciones (combina las que quieras):
 * - `"aviso"` si este dispositivo tiene actividad posterior al `exportedAt` del respaldo;
 * - `"aviso"` si el respaldo tiene menos intentos que el dispositivo (`counts.attempts`);
 * - `"aviso"` si el respaldo tiene más de N días respecto a `now`;
 * - cuándo subir a `"alto"` y cuándo bajar a `"aviso"` o `"ok"` (dispositivo vacío, p. ej.).
 */
export function decideImportRisk(local: DeviceSummary, incoming: BackupSummary, now: Date): ImportRisk {
  void local;
  void incoming;
  void now;
  // TODO(Carlo): escribe aquí la regla (5–10 líneas). Mientras tanto nunca dice «ok».
  return { level: "aviso", reasons: ["Compara las fechas antes de reemplazar: la regla del aviso aún no está escrita."] };
}

/**
 * Reemplaza TODOS los datos por los del respaldo en una sola transacción: si algo falla, no
 * cambia nada (decisión D7). Los ids se conservan; `meta` se regenera.
 */
export async function importBackup(db: CortexDb, backup: Backup): Promise<void> {
  await db.transaction("rw", [...DATA_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const t of DATA_TABLES) await db.table(t).clear();
    for (const t of DATA_TABLES) {
      const rows = backup.tables[t] as object[];
      if (rows.length) await db.table(t).bulkAdd(rows);
    }
    await db.meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
  });
}
