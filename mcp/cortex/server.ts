import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { scoredSessions, weeklyMetrics, weeklyVerdict } from "@/engine/coach-metrics";
import { dayKey } from "@/engine/dates";
import { calibrationReport, EVALUATIONS, type InstitutionalResult, institutionalResultSchema } from "@/engine/institutional";
import { subjectSkills } from "@/engine/skill-profile";
import { appendResult, coachInputFrom, type CortexPaths, DataError, loadCatalog, loadLatestBackup, readResults } from "./data";

/**
 * MCP de Cortex para el coach (ADR-026): privacidad por construcción. Cada herramienta devuelve
 * solo agregados calculados por el motor puro; ninguna devuelve textos de respuestas, notas del
 * cuaderno, reportes ni tinta. Lo comprueba `tests/mcp/cortex-mcp.test.ts`.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (payload: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] });

const fail = (error: unknown): ToolResult => ({
  content: [{ type: "text", text: error instanceof DataError ? error.message : `Error interno del MCP de Cortex: ${(error as Error).message}` }],
  isError: true,
});

const guard =
  <A>(fn: (args: A) => unknown) =>
  async (args: A): Promise<ToolResult> => {
    try {
      return ok(await fn(args));
    } catch (error) {
      return fail(error);
    }
  };

export interface ServerOptions {
  readonly paths: CortexPaths;
  /** Reloj inyectable para pruebas. */
  readonly now?: () => number;
}

export function createCortexServer({ paths, now = Date.now }: ServerOptions): McpServer {
  const server = new McpServer({ name: "cortex", version: "1.0.0" });
  const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

  const source = (file: string, exportedAt: string) => ({ respaldo: file, exportadoEl: exportedAt });

  server.registerTool(
    "weekly_metrics",
    {
      title: "Métricas de la semana",
      description:
        "Agregados de estudio de una semana (lunes a domingo): días con estudio, minutos, XP contra tu promedio, acierto, " +
        "retención real en repasos contra el objetivo, calibración por confianza, «ilusión de saber», 5 conceptos más débiles, " +
        "jefes, simulacros, gimnasio y tarjetas vencidas. Incluye el veredicto de weeklyVerdict («pendiente» si Carlo no lo ha definido).",
      inputSchema: { semana: z.string().regex(DAY).optional().describe("Cualquier día de la semana a revisar (AAAA-MM-DD). Por defecto, hoy.") },
      annotations: readOnly,
    },
    guard(({ semana }: { semana?: string }) => {
      const { file, backup } = loadLatestBackup(paths);
      const { catalog, conceptNames } = loadCatalog(paths);
      const metrics = weeklyMetrics(coachInputFrom(backup), catalog.exercises, conceptNames, semana ?? dayKey(now()), now());
      return { fuente: source(file, backup.exportedAt), veredicto: weeklyVerdict(metrics), metricas: metrics };
    }),
  );

  server.registerTool(
    "skill_profile",
    {
      title: "Perfil de habilidades",
      description:
        "Dominio por concepto y por unidad (sin ver, vista, practicada, dominada, maestría) y señales crudas de rigor: acierto por " +
        "dificultad 1–5, por tipo de ejercicio, en dificultad 4–5 y al primer intento. Sirve para recomendar proyectos a la medida.",
      inputSchema: { materia: z.string().optional().describe("Id de la materia (p. ej. calculo). Sin ella, todas las que tienen contenido.") },
      annotations: readOnly,
    },
    guard(({ materia }: { materia?: string }) => {
      const { file, backup } = loadLatestBackup(paths);
      const { catalog } = loadCatalog(paths);
      const input = coachInputFrom(backup);
      const subjects = catalog.subjects.filter((s) => !materia || s.id === materia);
      if (materia && subjects.length === 0) throw new DataError(`La materia ${materia} no tiene contenido en Cortex todavía.`);
      const units = (s: (typeof subjects)[number]) => s.units.map((u) => ({ key: u.key, title: u.title, concepts: u.concepts, exerciseIds: u.exerciseIds }));
      return {
        fuente: source(file, backup.exportedAt),
        materias: subjects.map((s) =>
          subjectSkills({ id: s.id, name: s.name, concepts: s.concepts, units: units(s) }, catalog.exercises, input.attemptFacts, input.progress, input.cardFacts),
        ),
      };
    }),
  );

  server.registerTool(
    "institutional_results",
    {
      title: "Resultados institucionales",
      description: "Calificaciones reales registradas (parciales, finales, ETS, extraordinarios) desde diario/resultados.yaml, ordenadas por fecha.",
      inputSchema: { materia: z.string().optional().describe("Filtra por id de materia del plan 2020.") },
      annotations: readOnly,
    },
    guard(({ materia }: { materia?: string }) => {
      const { resultados } = readResults(paths);
      return { resultados: resultados.filter((r) => !materia || r.materia === materia).sort((a, b) => a.fecha.localeCompare(b.fecha)) };
    }),
  );

  server.registerTool(
    "record_institutional_result",
    {
      title: "Registrar resultado institucional",
      description:
        "Agrega una calificación real a diario/resultados.yaml. Confirma los valores con Carlo antes de llamarla. " +
        "No sobrescribe: si ya existe la misma materia, evaluación y fecha, devuelve un error.",
      inputSchema: {
        materia: z.string().describe("Id de la materia en curriculum/plan-2020.json (p. ej. calculo)."),
        evaluacion: z.enum(EVALUATIONS),
        calificacion: z.number().min(0),
        escala: z.union([z.literal(10), z.literal(100)]).describe("10 o 100, como venga en el SAES o la boleta."),
        fecha: z.string().regex(DAY).describe("Fecha del examen (AAAA-MM-DD)."),
        nota: z.string().max(500).optional().describe("Contexto breve que Carlo quiera dejar (temas, condiciones)."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    guard((args: InstitutionalResult) => {
      const parsed = institutionalResultSchema.safeParse(args);
      if (!parsed.success) throw new DataError(`Resultado inválido: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")}`);
      const { planSubjects } = loadCatalog(paths);
      if (!planSubjects.has(parsed.data.materia)) throw new DataError(`La materia ${parsed.data.materia} no está en el plan 2020.`);
      const file = appendResult(paths, parsed.data);
      return { guardado: parsed.data, total: file.resultados.length, archivo: "diario/resultados.yaml" };
    }),
  );

  server.registerTool(
    "calibration_report",
    {
      title: "Calibración simulacro → examen real",
      description:
        "Para cada calificación real: el último simulacro de la materia en los 21 días previos, el acierto en práctica de la " +
        "misma ventana y la diferencia real − simulacro. Resume el error medio y el sesgo (¿Cortex sobrestima o subestima?).",
      inputSchema: { materia: z.string().optional().describe("Filtra por id de materia.") },
      annotations: readOnly,
    },
    guard(({ materia }: { materia?: string }) => {
      const { resultados } = readResults(paths);
      const { file, backup } = loadLatestBackup(paths);
      const { catalog } = loadCatalog(paths);
      const input = coachInputFrom(backup);
      const exams = scoredSessions(input, catalog.exercises, "exam").map((s) => ({ subjectId: s.subjectId, day: s.day, score: s.score }));
      const practice = input.attemptFacts.flatMap((a) => {
        const subjectId = catalog.exercises[a.exerciseId]?.subjectId;
        return subjectId && a.mode !== "exam" ? [{ subjectId, day: dayKey(a.at), correct: a.correct }] : [];
      });
      const report = calibrationReport(
        resultados.filter((r) => !materia || r.materia === materia),
        exams,
        practice,
      );
      return { fuente: source(file, backup.exportedAt), ...report };
    }),
  );

  return server;
}
