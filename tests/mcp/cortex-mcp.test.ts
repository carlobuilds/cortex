import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildStudyCatalog } from "@/content/core/study-catalog";
import { loadContent } from "@/content/loader";
import type { CortexPaths } from "../../mcp/cortex/data";
import { createCortexServer } from "../../mcp/cortex/server";
import { buildCoachBackup, MARKERS } from "../fixtures/coach-backup";

const REPO = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const NOW = new Date(2026, 10, 10, 12).getTime();
const TOOLS = ["calibration_report", "institutional_results", "record_institutional_result", "skill_profile", "weekly_metrics"];

type CallResult = { content: { type: string; text?: string }[]; isError?: boolean };
const textOf = (r: CallResult) => r.content.map((c) => c.text ?? "").join("\n");

async function connect(paths: CortexPaths): Promise<Client> {
  const server = createCortexServer({ paths, now: () => NOW });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "prueba", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

describe("MCP de Cortex", () => {
  let tmp: string;
  let paths: CortexPaths;
  let client: Client;
  const outputs: string[] = [];
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as CallResult;
    outputs.push(textOf(r));
    return r;
  };
  const json = (r: CallResult) => JSON.parse(textOf(r)) as Record<string, unknown>;

  beforeAll(async () => {
    const { index } = loadContent(REPO);
    const calc = buildStudyCatalog(index!).subjects.find((s) => s.id === "calculo")!.units[0]!;
    tmp = mkdtempSync(join(tmpdir(), "cortex-mcp-"));
    paths = { repoRoot: REPO, backupsDir: join(tmp, "respaldos"), diarioDir: join(tmp, "diario") };
    mkdirSync(paths.backupsDir);
    const backup = buildCoachBackup({ calc: calc.exerciseIds.slice(0, 3), calcUnit: calc.key }, NOW);
    writeFileSync(join(paths.backupsDir, "cortex-2026-11-10.cortex-backup.json"), JSON.stringify(backup));
    client = await connect(paths);
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it("expone exactamente las 5 herramientas del coach", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOLS);
  });

  it("weekly_metrics devuelve agregados y el veredicto pendiente", async () => {
    const r = await call("weekly_metrics", { semana: "2026-11-10" });
    expect(r.isError).toBeFalsy();
    const body = json(r) as { veredicto: string; metricas: { studyDays: number; minutes: number; illusion: { count: number }; exams: unknown[] } };
    expect(body.veredicto).toBe("pendiente");
    expect(body.metricas.studyDays).toBe(2);
    expect(body.metricas.minutes).toBe(40);
    expect(body.metricas.illusion.count).toBe(1);
    expect(body.metricas.exams).toHaveLength(1);
  });

  it("skill_profile devuelve el dominio de Cálculo", async () => {
    const r = await call("skill_profile", { materia: "calculo" });
    const body = json(r) as { materias: { subjectId: string; concepts: unknown[] }[] };
    expect(body.materias.map((m) => m.subjectId)).toEqual(["calculo"]);
    expect(body.materias[0]!.concepts.length).toBeGreaterThan(0);
  });

  it("registra un resultado real, lo lee y lo calibra contra el simulacro", async () => {
    const saved = await call("record_institutional_result", { materia: "calculo", evaluacion: "parcial-2", calificacion: 7, escala: 10, fecha: "2026-11-12" });
    expect(saved.isError).toBeFalsy();
    expect(readFileSync(join(paths.diarioDir, "resultados.yaml"), "utf8")).toMatch(/^# Resultados institucionales/);

    const dupe = await call("record_institutional_result", { materia: "calculo", evaluacion: "parcial-2", calificacion: 8, escala: 10, fecha: "2026-11-12" });
    expect(dupe.isError).toBe(true);

    const list = json(await call("institutional_results")) as { resultados: unknown[] };
    expect(list.resultados).toHaveLength(1);

    const report = json(await call("calibration_report", { materia: "calculo" })) as { rows: { lastExam: { score: number } | null; delta: number | null }[] };
    expect(report.rows[0]!.lastExam?.score).toBe(0.5);
    expect(report.rows[0]!.delta).toBeCloseTo(0.2);
  });

  it("rechaza materias fuera del plan y calificaciones fuera de escala", async () => {
    expect((await call("record_institutional_result", { materia: "astrologia", evaluacion: "final", calificacion: 9, escala: 10, fecha: "2026-12-01" })).isError).toBe(true);
    expect((await call("record_institutional_result", { materia: "calculo", evaluacion: "final", calificacion: 12, escala: 10, fecha: "2026-12-01" })).isError).toBe(true);
  });

  it("ninguna salida contiene texto libre del respaldo (privacidad por construcción)", () => {
    const all = outputs.join("\n");
    expect(outputs.length).toBeGreaterThanOrEqual(8);
    for (const marker of Object.values(MARKERS)) expect(all).not.toContain(marker);
  });

  it("explica en español cuando no hay respaldo o el YAML está roto", async () => {
    const empty = mkdtempSync(join(tmpdir(), "cortex-mcp-vacio-"));
    try {
      const bare = await connect({ repoRoot: REPO, backupsDir: join(empty, "respaldos"), diarioDir: join(empty, "diario") });
      const r = (await bare.callTool({ name: "weekly_metrics", arguments: {} })) as CallResult;
      expect(r.isError).toBe(true);
      expect(textOf(r)).toContain("No hay respaldos");

      mkdirSync(join(empty, "diario"));
      writeFileSync(join(empty, "diario", "resultados.yaml"), "formato: 1\nresultados: [ {materia: calculo, ");
      const broken = (await bare.callTool({ name: "institutional_results", arguments: {} })) as CallResult;
      expect(broken.isError).toBe(true);
      expect(textOf(broken)).toContain("no es YAML válido");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("MCP de Cortex por stdio (el comando real de .mcp.json)", () => {
  it("arranca con pnpm --silent mcp:cortex y lista sus herramientas", { timeout: 60_000 }, async () => {
    const transport = new StdioClientTransport({ command: "pnpm", args: ["--silent", "mcp:cortex"], cwd: REPO, stderr: "pipe" });
    const client = new Client({ name: "prueba-stdio", version: "1.0.0" });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(TOOLS);
    } finally {
      await client.close();
    }
  });
});
