import { describe, expect, it } from "vitest";
import { calibrationReport, institutionalFileSchema, institutionalResultSchema } from "./institutional";

const parcial = { materia: "calculo", evaluacion: "parcial-2", calificacion: 7, escala: 10, fecha: "2026-11-20" } as const;

describe("institutionalResultSchema", () => {
  it("acepta un parcial válido y una nota opcional", () => {
    expect(institutionalResultSchema.safeParse(parcial).success).toBe(true);
    expect(institutionalResultSchema.safeParse({ ...parcial, nota: "entró regla de la cadena" }).success).toBe(true);
  });

  it("rechaza calificaciones fuera de escala, evaluaciones desconocidas y campos extra", () => {
    expect(institutionalResultSchema.safeParse({ ...parcial, calificacion: 11 }).success).toBe(false);
    expect(institutionalResultSchema.safeParse({ ...parcial, escala: 20 }).success).toBe(false);
    expect(institutionalResultSchema.safeParse({ ...parcial, evaluacion: "quiz" }).success).toBe(false);
    expect(institutionalResultSchema.safeParse({ ...parcial, fecha: "20/11/2026" }).success).toBe(false);
    expect(institutionalResultSchema.safeParse({ ...parcial, respuesta: "x" }).success).toBe(false);
  });

  it("exige el formato del archivo", () => {
    expect(institutionalFileSchema.safeParse({ formato: 1, resultados: [parcial] }).success).toBe(true);
    expect(institutionalFileSchema.safeParse({ formato: 2, resultados: [] }).success).toBe(false);
  });
});

describe("calibrationReport", () => {
  const exams = [
    { subjectId: "calculo", day: "2026-10-01", score: 0.95 }, // fuera de la ventana de 21 días
    { subjectId: "calculo", day: "2026-11-10", score: 0.7 },
    { subjectId: "calculo", day: "2026-11-15", score: 0.8 },
    { subjectId: "programacion", day: "2026-11-16", score: 0.4 },
  ];
  const practice = [
    { subjectId: "calculo", day: "2026-11-18", correct: true },
    { subjectId: "calculo", day: "2026-11-19", correct: false },
    { subjectId: "calculo", day: "2026-11-25", correct: true }, // después del examen
  ];

  it("compara la calificación real con el último simulacro de la ventana", () => {
    const r = calibrationReport([parcial], exams, practice);
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0]!;
    expect(row.real).toBeCloseTo(0.7);
    expect(row.lastExam).toEqual({ day: "2026-11-15", daysBefore: 5, score: 0.8 });
    expect(row.examsInWindow).toBe(2);
    expect(row.practiceAccuracy).toBe(0.5);
    expect(row.delta).toBeCloseTo(-0.1);
    expect(r.summary.n).toBe(1);
    expect(r.summary.meanAbsError).toBeCloseTo(0.1);
    expect(r.summary.bias).toBeCloseTo(-0.1);
  });

  it("sin simulacro previo no inventa delta", () => {
    const r = calibrationReport([{ ...parcial, materia: "matematicas-discretas" }], exams, practice);
    expect(r.rows[0]).toMatchObject({ lastExam: null, delta: null, practiceAccuracy: null });
    expect(r.summary).toEqual({ n: 0, meanAbsError: null, bias: null });
  });
});
