import { describe, expect, it, vi } from "vitest";
import { type Backup } from "./backup-schema";
import {
  type BackupSummary,
  type DeviceSummary,
  importRisk,
  lastActivity,
  summarizeDevice,
  backupFileName,
  backupSizeError,
  exportBackup,
  importBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  summarizeDb,
  utf8ByteLength,
} from "./backup";
import { type CortexDb, openCortexDb } from "./db";
import { emptyDayRecord } from "./defaults";
import { DATA_TABLES } from "./schema";
import { freshIdb } from "./test-utils";

const NOW = new Date("2026-10-01T18:30:00.000Z");

async function filledDb(): Promise<CortexDb> {
  const db = await openCortexDb(freshIdb());
  await db.profile.update(1, {
    xpTotal: 1234,
    level: 5,
    currentStreak: 3,
    maxStreak: 9,
    streakFreezes: 1,
    lastStudyDay: "2026-10-01",
    league: { division: 2, weekKey: "2026-09-28" },
    cosmetics: { frames: ["ambar"], frame: "ambar", badges: ["cofre-dorado"] },
    preferences: { sound: true, theme: "light", healthyMode: true },
  });
  await db.unitProgress.add({ unitKey: "calculo/01-limites", subjectId: "calculo", status: "practiced", bestBoss: 0.75, bossAttempts: 2, lessonDone: true, bossPassed: false, lastActivity: 3, schemaVersion: 1 });
  await db.attempts.bulkAdd([
    { exerciseId: "calc-01-001", at: 1, correct: true, timeMs: 900, confidence: 3, answer: "3", sessionId: 1, schemaVersion: 1 },
    { exerciseId: "calc-01-002", at: 2, correct: false, timeMs: 4000, confidence: 2, answer: "5", sessionId: 1, schemaVersion: 1 },
  ]);
  await db.cards.add({ exerciseId: "calc-01-001", due: 10, stability: 2.5, difficulty: 5, elapsedDays: 0, scheduledDays: 1, learningSteps: 0, reps: 1, lapses: 0, state: 2, lastReview: 1, longOk: false, schemaVersion: 1 });
  await db.sessions.add({ startedAt: 0, endedAt: 600, xpEarned: 50, kind: "daily", schemaVersion: 1 });
  await db.missions.add({ key: "2026-10-01/1", day: "2026-10-01", kind: "ejercicios", target: 3, progress: 3, completed: true, schemaVersion: 1 });
  await db.records.add({ key: "precision", value: 0.9, at: 5, schemaVersion: 1 });
  await db.ghosts.add({ context: "jefe:calculo/01-limites", events: [{ t: 1, ok: true }], schemaVersion: 1 });
  await db.achievements.add({ id: "memoria-de-elefante", unlockedAt: 7, schemaVersion: 1 });
  await db.gymResults.add({ game: "n-back", domain: "memoria", level: 2, score: 80, at: 8, schemaVersion: 1 });
  await db.mistakes.add({ exerciseId: "calc-01-002", misses: 1, lastAnswer: "5", note: "olvidé factorizar", lastAt: 2, illusion: true, fixedAt: null, schemaVersion: 1 });
  await db.reports.add({ exerciseId: "calc-01-003", comment: "¿opción ambigua?", createdAt: 9, schemaVersion: 1 });
  await db.days.add({ ...emptyDayRecord("2026-10-01"), xp: 40, correct: 3, minimumMet: true });
  return db;
}

const tablesOf = (b: Backup) => b.tables;

describe("exportar → importar (ida y vuelta)", () => {
  it("conserva todos los datos e ids, en las 13 tablas", async () => {
    const source = await filledDb();
    const backup = await exportBackup(source, "0.0.0", NOW);
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const target = await openCortexDb(freshIdb());
    await importBackup(target, parsed.backup);
    const again = await exportBackup(target, "0.0.0", NOW);
    expect(tablesOf(again)).toEqual(tablesOf(backup));
    expect(Object.values(summarizeBackup(again).counts).every((n) => n >= 1)).toBe(true);
    expect(await target.meta.get("schemaVersion")).toEqual({ key: "schemaVersion", value: 2 });
    source.close();
    target.close();
  });

  it("acepta el tema 'system' (predeterminado de los perfiles nuevos, ADR-020)", async () => {
    const db = await openCortexDb(freshIdb());
    expect((await db.profile.get(1))?.preferences.theme).toBe("system");
    const parsed = parseBackup(serializeBackup(await exportBackup(db, "0.0.0", NOW)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.backup.tables.profile[0]).toMatchObject({ preferences: { theme: "system" } });
  });

  it("funciona con una base recién creada (solo el perfil)", async () => {
    const db = await openCortexDb(freshIdb());
    const backup = await exportBackup(db, "0.0.0", NOW);
    expect(summarizeBackup(backup).counts.profile).toBe(1);
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    db.close();
  });

  it("el reemplazo borra lo que no viene en el respaldo", async () => {
    const empty = await openCortexDb(freshIdb());
    const emptyBackup = await exportBackup(empty, "0.0.0", NOW);
    const target = await filledDb();
    await importBackup(target, emptyBackup);
    const counts = await summarizeDb(target);
    expect(counts).toEqual(Object.fromEntries(DATA_TABLES.map((t) => [t, t === "profile" ? 1 : 0])));
    expect((await target.profile.get(1))?.xpTotal).toBe(0);
    empty.close();
    target.close();
  });

  it("si algo falla a la mitad, no cambia nada (transacción atómica)", async () => {
    const source = await openCortexDb(freshIdb());
    const backup = await exportBackup(source, "0.0.0", NOW);
    const target = await filledDb();
    const before = await exportBackup(target, "0.0.0", NOW);
    vi.spyOn(target.table("reports"), "clear").mockRejectedValueOnce(new Error("disco lleno"));
    await expect(importBackup(target, backup)).rejects.toThrow("disco lleno");
    expect(tablesOf(await exportBackup(target, "0.0.0", NOW))).toEqual(tablesOf(before));
    source.close();
    target.close();
  });

  it("un respaldo v1 se migra a la v2 al importarlo (mismas reglas que el upgrade de Dexie)", async () => {
    const v1 = {
      app: "cortex",
      format: 1,
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      appVersion: "0.0.0",
      tables: {
        profile: [{ id: 1, xpTotal: 50, level: 1, currentStreak: 1, maxStreak: 1, streakFreezes: 0, preferences: { sound: false }, schemaVersion: 1 }],
        unitProgress: [{ unitKey: "calculo/01-limites", subjectId: "calculo", status: "seen", bestBoss: null, bossAttempts: 0, schemaVersion: 1 }],
        attempts: [{ id: 1, exerciseId: "calc-01-001", at: 1, correct: true, timeMs: 9, confidence: 2, answer: "3", sessionId: null, schemaVersion: 1 }],
        cards: [{ exerciseId: "calc-01-001", due: 172_800_000, stability: 1, difficulty: 5, reps: 1, lapses: 0, lastReview: 86_400_000, schemaVersion: 1 }],
        sessions: [],
        missions: [],
        records: [],
        ghosts: [],
        achievements: [],
        gymResults: [],
        mistakes: [{ exerciseId: "calc-01-002", misses: 1, lastAnswer: "5", note: "", schemaVersion: 1 }],
        reports: [],
      },
    };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.schemaVersion).toBe(2);
    expect(parsed.backup.tables.days).toEqual([]);
    expect(parsed.backup.tables.profile[0]).toMatchObject({ league: { division: 0, weekKey: null }, preferences: { sound: false, theme: "dark", healthyMode: false } });
    const db = await openCortexDb(freshIdb());
    await importBackup(db, parsed.backup);
    expect(await db.cards.get("calc-01-001")).toMatchObject({ state: 2, scheduledDays: 1, longOk: false });
    expect(await db.mistakes.get("calc-01-002")).toMatchObject({ illusion: false, fixedAt: null });
    expect(await db.unitProgress.get("calculo/01-limites")).toMatchObject({ lessonDone: true, bossPassed: false });
    db.close();
  });

  it("nombra el archivo con la fecha local", () => {
    expect(backupFileName(new Date(2026, 9, 1, 23, 59))).toBe("cortex-2026-10-01.cortex-backup.json");
  });
});

describe("respaldos inválidos se rechazan sin tocar la base", () => {
  let valid: Backup;
  const mutate = (f: (b: Record<string, unknown>) => void) => {
    const copy = structuredClone(valid) as unknown as Record<string, unknown>;
    f(copy);
    return JSON.stringify(copy);
  };

  it.each<[string, () => string, RegExp]>([
    ["no es JSON", () => "hola", /no es un JSON válido/],
    ["JSON truncado", () => serializeBackup(valid).slice(0, 200), /no es un JSON válido/],
    ["de otra app", () => mutate((b) => (b.app = "otra")), /No es un respaldo de cortex/],
    ["formato desconocido", () => mutate((b) => (b.format = 2)), /Formato de respaldo 2 desconocido/],
    ["esquema del futuro", () => mutate((b) => (b.schemaVersion = 3)), /versión más nueva/],
    ["esquema 0", () => mutate((b) => (b.schemaVersion = 0)), /Versión de esquema inválida/],
    ["esquema -1", () => mutate((b) => (b.schemaVersion = -1)), /Versión de esquema inválida/],
    ["esquema 1.5", () => mutate((b) => (b.schemaVersion = 1.5)), /Versión de esquema inválida/],
    ["esquema como texto", () => mutate((b) => (b.schemaVersion = "1")), /Versión de esquema inválida/],
    ["falta una tabla", () => mutate((b) => delete (b.tables as Record<string, unknown>).cards), /tables\.cards/],
    ["tabla desconocida", () => mutate((b) => ((b.tables as Record<string, unknown>).trucos = [])), /trucos/],
    ["perfil inválido", () => mutate((b) => (((b.tables as { profile: { xpTotal: unknown }[] }).profile[0] ?? { xpTotal: 0 }).xpTotal = -5)), /profile\.0\.xpTotal/],
    ["sin perfil", () => mutate((b) => ((b.tables as Record<string, unknown>).profile = [])), /exactamente un perfil/],
    ["clave repetida", () => mutate((b) => { const t = b.tables as { achievements: unknown[] }; t.achievements = [{ id: "a", unlockedAt: 1, schemaVersion: 1 }, { id: "a", unlockedAt: 2, schemaVersion: 1 }]; }), /achievements: la clave "a" se repite/],
    ["registro sin clave", () => mutate((b) => ((b.tables as Record<string, unknown>).reports = [{ comment: "x", schemaVersion: 1 }])), /tables\.reports\.0\.id/],
    ["id autoincremental gigante", () => mutate((b) => ((b.tables as Record<string, unknown>).attempts = [{ id: Number.MAX_SAFE_INTEGER, schemaVersion: 1 }])), /tables\.attempts\.0\.id/],
  ])("%s", async (_name, make, expected) => {
    const db = await filledDb();
    valid = await exportBackup(db, "0.0.0", NOW);
    const before = await summarizeDb(db);
    const r = parseBackup(make());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" | ")).toMatch(expected);
    expect(await summarizeDb(db)).toEqual(before);
    db.close();
  });

  it("rechaza archivos más grandes que el límite", () => {
    const r = parseBackup("x".repeat(2048), 1024);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/el máximo es/);
  });
});

describe("tamaño del respaldo", () => {
  it("cuenta los bytes UTF-8 igual que TextEncoder (acentos, emoji, sustitutos sueltos)", () => {
    for (const text of ["", "hola", "límite ñ €", "racha 🔥 x", "\ud800 suelto", "fin \udc00"]) {
      expect(utf8ByteLength(text)).toBe(new TextEncoder().encode(text).length);
    }
  });

  it("se exporta compacto y un respaldo justo en el límite se puede importar", async () => {
    const db = await filledDb();
    const text = serializeBackup(await exportBackup(db, "0.0.0", NOW));
    expect(text).not.toMatch(/\n {2}/);
    const bytes = utf8ByteLength(text);
    expect(parseBackup(text, bytes).ok).toBe(true);
    expect(parseBackup(text, bytes - 1).ok).toBe(false);
    expect(backupSizeError(bytes, bytes)).toBeNull();
    expect(backupSizeError(bytes, bytes - 1)).toMatch(/el máximo es/);
    db.close();
  });
});

describe("lastActivity", () => {
  it("sin filas: null y 0 ilegibles", () => {
    expect(lastActivity({})).toEqual({ at: null, unreadable: 0 });
    expect(lastActivity({ attempts: [], sessions: [], gymResults: [] })).toEqual({ at: null, unreadable: 0 });
  });

  it("toma el máximo de las tres tablas", () => {
    expect(lastActivity({ attempts: [{ at: 10 }, { at: 30 }], sessions: [{ startedAt: 50 }], gymResults: [{ at: 20 }] })).toEqual({ at: 50, unreadable: 0 });
    expect(lastActivity({ attempts: [{ at: 10 }], gymResults: [{ at: 99 }] }).at).toBe(99);
  });

  it("una fecha mayor que el máximo de Date (1e300) es ilegible", () => {
    expect(lastActivity({ attempts: [{ at: 1e300 }, { at: 8.64e15 }, { at: 8.64e15 + 1 }] })).toEqual({ at: 8.64e15, unreadable: 2 });
  });

  it("fechas raras cuentan como ilegibles y no entran al máximo", () => {
    const r = lastActivity({
      attempts: [{ at: Number.NaN }, { at: "5" }, { at: -3 }, { at: 0 }, { at: Infinity }, { id: 1 }, null, 7, { at: 8 }],
      sessions: [{ startedAt: null }],
    });
    expect(r).toEqual({ at: 8, unreadable: 9 });
  });
});

describe("resumen con actividad", () => {
  it("un respaldo v1 viejo (migrateBackup) se resume con su actividad", () => {
    const v1 = {
      app: "cortex",
      format: 1,
      schemaVersion: 1,
      exportedAt: NOW.toISOString(),
      appVersion: "0.0.0",
      tables: {
        profile: [{ id: 1, xpTotal: 50, level: 1, currentStreak: 1, maxStreak: 1, streakFreezes: 0, preferences: { sound: false }, schemaVersion: 1 }],
        unitProgress: [],
        attempts: [{ id: 1, exerciseId: "calc-01-001", at: 1000, correct: true, timeMs: 9, confidence: 2, answer: "3", sessionId: null, schemaVersion: 1 }],
        cards: [],
        sessions: [{ id: 1, startedAt: 2000, endedAt: 3000, xpEarned: 1, kind: "daily", schemaVersion: 1 }],
        missions: [],
        records: [],
        ghosts: [],
        achievements: [],
        gymResults: [],
        mistakes: [],
        reports: [],
      },
    };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(summarizeBackup(parsed.backup)).toMatchObject({ lastActivityAt: 2000, unreadableDates: 0, xpTotal: 50 });
  });

  it("summarizeDevice lee el último valor de cada índice y coincide con el respaldo", async () => {
    const db = await filledDb();
    const device = await summarizeDevice(db);
    expect(device.lastActivityAt).toBe(summarizeBackup(await exportBackup(db, "0.0.0", NOW)).lastActivityAt);
    // El fixture trae una sesión con startedAt 0 (no es una fecha > 0): cuenta como ilegible.
    expect(device.unreadableDates).toBe(1);
    expect(importRisk(device, summarizeBackup(await exportBackup(db, "0.0.0", NOW)), NOW).level).toBe("alto");
    expect(device.counts).toEqual(await summarizeDb(db));
    db.close();
  });

  it("summarizeDevice cuenta las filas sin índice (at: null) como ilegibles", async () => {
    const db = await openCortexDb(freshIdb());
    await db.table("attempts").bulkAdd([{ exerciseId: "x", at: null }, { exerciseId: "y", at: 5 }]);
    const d = await summarizeDevice(db);
    expect(d).toMatchObject({ lastActivityAt: 5, unreadableDates: 1 });
    db.close();
  });

  it("summarizeDevice en una base vacía: null", async () => {
    const db = await openCortexDb(freshIdb());
    expect((await summarizeDevice(db)).lastActivityAt).toBeNull();
    db.close();
  });
});

describe("importRisk", () => {
  const NOW_R = new Date("2026-11-16T12:00:00.000Z");
  const counts = Object.fromEntries(DATA_TABLES.map((t) => [t, 0])) as Record<(typeof DATA_TABLES)[number], number>;
  const local: DeviceSummary = { counts, lastActivityAt: null, unreadableDates: 0 };
  const incoming = (o: Partial<BackupSummary> = {}): BackupSummary => ({
    exportedAt: "2026-11-15T12:00:00.000Z",
    appVersion: "0.0.0",
    counts,
    xpTotal: 0,
    level: 1,
    lastActivityAt: Date.parse("2026-11-15T11:00:00.000Z"),
    unreadableDates: 0,
    ...o,
  });

  it("fechas ilegibles en el respaldo: alto", () => {
    const r = importRisk(local, incoming({ unreadableDates: 2 }), NOW_R);
    expect(r.level).toBe("alto");
    expect(r.reasons.length).toBe(1);
  });

  it("exportedAt ilegible: alto", () => {
    expect(importRisk(local, incoming({ exportedAt: "ayer" }), NOW_R).level).toBe("alto");
    expect(importRisk(local, incoming({ exportedAt: "" }), NOW_R).level).toBe("alto");
  });

  it("exportedAt en el futuro: alto, con tolerancia de 5 minutos", () => {
    expect(importRisk(local, incoming({ exportedAt: "2026-11-16T12:04:00.000Z", lastActivityAt: null }), NOW_R).level).toBe("aviso");
    expect(importRisk(local, incoming({ exportedAt: "2026-11-16T12:06:00.000Z", lastActivityAt: null }), NOW_R).level).toBe("alto");
  });

  it("actividad posterior a su propio exportedAt: alto, con tolerancia", () => {
    const exp = Date.parse("2026-11-15T12:00:00.000Z");
    expect(importRisk(local, incoming({ lastActivityAt: exp + 4 * 60_000 }), NOW_R).level).toBe("aviso");
    expect(importRisk(local, incoming({ lastActivityAt: exp + 6 * 60_000 }), NOW_R).level).toBe("alto");
  });

  it("el dispositivo también falla cerrado: fechas ilegibles o actividad sin fecha", () => {
    expect(importRisk({ ...local, unreadableDates: 1 }, incoming(), NOW_R).level).toBe("alto");
    expect(importRisk({ ...local, counts: { ...counts, attempts: 3 }, lastActivityAt: null }, incoming(), NOW_R).level).toBe("alto");
    expect(importRisk({ ...local, counts: { ...counts, gymResults: 1 }, lastActivityAt: null }, incoming(), NOW_R).level).toBe("alto");
    expect(importRisk({ ...local, counts: { ...counts, attempts: 3 }, lastActivityAt: 5 }, incoming(), NOW_R).level).toBe("aviso");
  });

  it("la capa a gana sobre la regla: no se consulta decideImportRisk", () => {
    // La razón devuelta no es la del marcador de posición: la regla ni se consultó.
    expect(importRisk(local, incoming({ unreadableDates: 1 }), NOW_R).reasons.join(" ")).not.toContain("aún no está escrita");
  });

  it("acumula todas las razones de la capa a", () => {
    const r = importRisk(local, incoming({ unreadableDates: 1, exportedAt: "2026-12-31T00:00:00.000Z", lastActivityAt: Date.parse("2027-01-02T00:00:00.000Z") }), NOW_R);
    expect(r.level).toBe("alto");
    expect(r.reasons.length).toBe(3);
  });

  it("marcador de posición: sin regla de Carlo devuelve aviso, nunca ok", () => {
    const r = importRisk(local, incoming(), NOW_R);
    expect(r.level).toBe("aviso");
    expect(r.reasons).toEqual(["Compara las fechas antes de reemplazar: la regla del aviso aún no está escrita."]);
  });

  it.todo("regla de Carlo: dispositivo con actividad posterior al exportedAt del respaldo");
  it.todo("regla de Carlo: respaldo con menos intentos que el dispositivo");
  it.todo("regla de Carlo: respaldo con más de N días");
  it.todo("regla de Carlo: cuándo alto, cuándo aviso y cuándo ok (dispositivo vacío)");
});

describe("parseBackup acota los errores", () => {
  it("10 000 claves repetidas devuelven como mucho 20 errores cortos", () => {
    const rows = Array.from({ length: 10_000 }, () => ({ key: "x".repeat(500), at: 1 }));
    const text = JSON.stringify({ app: "cortex", format: 1, schemaVersion: 2, exportedAt: NOW.toISOString(), appVersion: "0", tables: { records: rows } });
    const r = parseBackup(text);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.length).toBeLessThanOrEqual(20);
    expect(r.errors.every((e) => e.length <= 201)).toBe(true);
  });
});
