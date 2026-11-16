import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildStudyCatalog, type StudyCatalog } from "@/content/core/study-catalog";
import { loadContent } from "@/content/loader";
import { parseBackup } from "@/db/backup";
import type { Backup } from "@/db/backup-schema";
import type { CoachInput } from "@/engine/coach-metrics";
import { emptyResultsFile, type InstitutionalFile, institutionalFileSchema, type InstitutionalResult } from "@/engine/institutional";
import type { AttemptFacts, CardFacts, UnitProgressFacts } from "@/engine/skill-profile";

/**
 * Capa de archivos del MCP de Cortex (ADR-026). Lee el respaldo más reciente de `respaldos/` y el
 * contenido del repo; lee y escribe `diario/resultados.yaml`. Nada de esto sale del MCP tal cual:
 * las herramientas solo devuelven agregados.
 */

export interface CortexPaths {
  /** Raíz del repo: de aquí salen `content/` y `curriculum/`. */
  readonly repoRoot: string;
  readonly backupsDir: string;
  readonly diarioDir: string;
}

export const pathsFor = (repoRoot: string): CortexPaths => ({
  repoRoot,
  backupsDir: join(repoRoot, "respaldos"),
  diarioDir: join(repoRoot, "diario"),
});

/** Error con un mensaje en español pensado para que el coach se lo explique a Carlo. */
export class DataError extends Error {}

/** Acepta también las copias que renombra el navegador: `… .cortex-backup (1).json`. */
const BACKUP_FILE = /\.cortex-backup(?: \(\d+\))?\.json$/;

export interface LoadedBackup {
  readonly file: string;
  readonly backup: Backup;
}

export function loadLatestBackup(paths: CortexPaths): LoadedBackup {
  const dir = paths.backupsDir;
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => BACKUP_FILE.test(f)) : [];
  if (files.length === 0) {
    throw new DataError("No hay respaldos en respaldos/. Exporta uno desde Ajustes de Cortex y guárdalo en esa carpeta.");
  }
  const newest = files
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime || b.f.localeCompare(a.f))[0]!.f;
  const parsed = parseBackup(readFileSync(join(dir, newest), "utf8"));
  if (!parsed.ok) throw new DataError(`El respaldo ${newest} no es válido: ${parsed.errors.slice(0, 3).join(" · ")}`);
  return { file: newest, backup: parsed.backup };
}

export interface LoadedCatalog {
  readonly catalog: StudyCatalog;
  /** Ids de todas las materias del plan 2020 (con o sin contenido). */
  readonly planSubjects: ReadonlySet<string>;
  /** Nombre visible por `materia/concepto`. */
  readonly conceptNames: Readonly<Record<string, string>>;
}

/** Se vuelve a leer en cada llamada: así una unidad recién escrita aparece sin reiniciar el MCP. */
export function loadCatalog(paths: CortexPaths): LoadedCatalog {
  const { index } = loadContent(paths.repoRoot);
  if (!index) throw new DataError("No pude leer curriculum/plan-2020.json; corre pnpm content:check.");
  const catalog = buildStudyCatalog(index);
  const conceptNames: Record<string, string> = {};
  for (const s of catalog.subjects) for (const c of s.concepts) conceptNames[`${s.id}/${c.id}`] = c.name;
  return { catalog, planSubjects: new Set(index.subjects.map((s) => s.id)), conceptNames };
}

type Row = Record<string, unknown>;
const rows = (backup: Backup, table: keyof Backup["tables"]): Row[] => backup.tables[table] as unknown as Row[];
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === "string";
const confidence = (v: unknown): 1 | 2 | 3 | null => (v === 1 || v === 2 || v === 3 ? v : null);

/**
 * Proyección del respaldo a lo que necesitan las métricas. Copia campo por campo (nunca el
 * registro entero), así ningún texto libre —respuestas, notas, reportes— entra al cálculo.
 */
export function coachInputFrom(backup: Backup): CoachInput & {
  readonly attemptFacts: readonly (AttemptFacts & { readonly mode: string | null })[];
  readonly progress: readonly UnitProgressFacts[];
  readonly cardFacts: readonly CardFacts[];
} {
  const p = backup.tables.profile[0];
  const attempts = rows(backup, "attempts")
    .filter((a) => str(a.exerciseId) && num(a.at) && typeof a.correct === "boolean")
    .map((a) => ({
      exerciseId: a.exerciseId as string,
      at: a.at as number,
      correct: a.correct as boolean,
      confidence: confidence(a.confidence),
      sessionId: num(a.sessionId) ? a.sessionId : null,
      mode: str(a.mode) ? a.mode : null,
    }));
  const cards = rows(backup, "cards")
    .filter((c) => str(c.exerciseId))
    .map((c) => ({ exerciseId: c.exerciseId as string, lapses: num(c.lapses) ? c.lapses : 0, due: num(c.due) ? c.due : Infinity, longOk: c.longOk === true }));
  const days = rows(backup, "days")
    .filter((d) => str(d.day))
    .map((d) => ({
      day: d.day as string,
      xp: num(d.xp) ? d.xp : 0,
      answered: num(d.answered) ? d.answered : 0,
      correct: num(d.correct) ? d.correct : 0,
      reviews: num(d.reviews) ? d.reviews : 0,
      reviewsCorrect: num(d.reviewsCorrect) ? d.reviewsCorrect : 0,
      activeMs: num(d.activeMs) ? d.activeMs : 0,
    }));
  const sessions = rows(backup, "sessions")
    .filter((s) => num(s.id) && num(s.startedAt) && str(s.kind))
    .map((s) => ({ id: s.id as number, startedAt: s.startedAt as number, kind: s.kind as string, ...(str(s.unitKey) ? { unitKey: s.unitKey } : {}) }));
  const gymResults = rows(backup, "gymResults")
    .filter((g) => str(g.game) && num(g.at))
    .map((g) => ({ game: g.game as string, domain: str(g.domain) ? g.domain : "", level: num(g.level) ? g.level : 0, at: g.at as number }));
  const progress = rows(backup, "unitProgress")
    .filter((u) => str(u.unitKey))
    .map((u) => ({
      unitKey: u.unitKey as string,
      status: str(u.status) ? u.status : "new",
      bestBoss: num(u.bestBoss) ? u.bestBoss : null,
      bossPassed: u.bossPassed === true,
      lessonDone: u.lessonDone === true,
    }));
  return {
    profile: p ? { level: p.level, xpTotal: p.xpTotal, currentStreak: p.currentStreak, maxStreak: p.maxStreak } : null,
    attempts,
    cards,
    days,
    sessions,
    gymResults,
    attemptFacts: attempts,
    progress,
    cardFacts: cards,
  };
}

const RESULTS_FILE = "resultados.yaml";
const RESULTS_HEADER =
  "# Resultados institucionales reales de Carlo (ADR-026). Lo escribe el MCP de Cortex con\n" +
  "# record_institutional_result; puedes corregirlo a mano. Formato: src/engine/institutional.ts.\n";

export const resultsPath = (paths: CortexPaths): string => join(paths.diarioDir, RESULTS_FILE);

export function readResults(paths: CortexPaths): InstitutionalFile {
  const file = resultsPath(paths);
  if (!existsSync(file)) return emptyResultsFile();
  let data: unknown;
  try {
    data = parseYaml(readFileSync(file, "utf8"));
  } catch (error) {
    throw new DataError(`diario/${RESULTS_FILE} no es YAML válido: ${(error as Error).message}`);
  }
  const parsed = institutionalFileSchema.safeParse(data ?? emptyResultsFile());
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new DataError(`diario/${RESULTS_FILE} tiene errores: ${issues.join(" · ")}`);
  }
  return parsed.data;
}

/** Agrega un resultado con escritura atómica (archivo temporal + renombrar). */
export function appendResult(paths: CortexPaths, result: InstitutionalResult): InstitutionalFile {
  const current = readResults(paths);
  const dupe = current.resultados.find((r) => r.materia === result.materia && r.evaluacion === result.evaluacion && r.fecha === result.fecha);
  if (dupe) {
    throw new DataError(`Ya hay un ${result.evaluacion} de ${result.materia} con fecha ${result.fecha}. Si quieres corregirlo, edita diario/${RESULTS_FILE}.`);
  }
  const next: InstitutionalFile = { ...current, resultados: [...current.resultados, result] };
  mkdirSync(paths.diarioDir, { recursive: true });
  const file = resultsPath(paths);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, RESULTS_HEADER + stringifyYaml(next), "utf8");
  renameSync(tmp, file);
  return next;
}
