import { describe, expect, it } from "vitest";
import { conceptEvidence, type ExerciseFacts, type SubjectFacts, subjectSkills } from "./skill-profile";

const exercises: Record<string, ExerciseFacts> = {
  e1: { subjectId: "calculo", unitKey: "calculo/01-limites", conceptos: ["limite"], dificultad: 1, tipo: "numerico" },
  e2: { subjectId: "calculo", unitKey: "calculo/01-limites", conceptos: ["limite"], dificultad: 2, tipo: "numerico" },
  e3: { subjectId: "calculo", unitKey: "calculo/01-limites", conceptos: ["limite", "infinito"], dificultad: 4, tipo: "simbolico" },
  x1: { subjectId: "programacion", unitKey: "programacion/01-x", conceptos: ["limite"], dificultad: 5, tipo: "codigo" },
};

const subject: SubjectFacts = {
  id: "calculo",
  name: "Cálculo",
  concepts: [
    { id: "limite", name: "Límite" },
    { id: "infinito", name: "Límites al infinito" },
    { id: "derivada", name: "Derivada" },
  ],
  units: [{ key: "calculo/01-limites", title: "Límites", concepts: ["limite", "infinito"], exerciseIds: ["e1", "e2", "e3"] }],
};

const attempts = [
  { exerciseId: "e1", at: 1, correct: true },
  { exerciseId: "e2", at: 2, correct: true },
  { exerciseId: "e3", at: 3, correct: false },
  { exerciseId: "e3", at: 4, correct: true },
  { exerciseId: "x1", at: 5, correct: true }, // otra materia: no cuenta
];
const progress = [{ unitKey: "calculo/01-limites", status: "mastered", bestBoss: 0.9, bossPassed: true, lessonDone: true }];

describe("conceptEvidence", () => {
  it("junta lección, intentos, jefe y repaso largo por concepto, solo de la materia", () => {
    const ev = conceptEvidence(subject, exercises, attempts, progress, [{ exerciseId: "e1", longOk: true }]);
    expect(ev.get("limite")).toEqual({ lessonDone: true, attempts: 4, correct: 3, bossPassed: true, longReviewOk: true });
    expect(ev.get("infinito")).toEqual({ lessonDone: true, attempts: 2, correct: 1, bossPassed: true, longReviewOk: false });
  });
});

describe("subjectSkills", () => {
  const s = subjectSkills(subject, exercises, attempts, progress, []);

  it("da el dominio de cada concepto con la regla del mapa", () => {
    expect(s.concepts.map((c) => [c.id, c.mastery])).toEqual([
      ["limite", "mastered"],
      ["infinito", "seen"],
      ["derivada", "new"],
    ]);
    expect(s.masteryCounts).toEqual({ new: 1, seen: 1, practiced: 0, mastered: 1, expert: 0 });
    expect(s.units).toEqual([{ key: "calculo/01-limites", title: "Límites", status: "mastered", bestBoss: 0.9, bossPassed: true }]);
  });

  it("separa el acierto en difíciles del acierto al primer intento", () => {
    expect(s.rigor.hard).toEqual({ attempts: 2, accuracy: 0.5 });
    expect(s.rigor.hardFirstTry).toEqual({ attempts: 1, accuracy: 0 });
    expect(s.rigor.byDifficulty.find((d) => d.difficulty === 3)).toEqual({ difficulty: 3, attempts: 0, accuracy: null });
    expect(s.rigor.byType).toEqual([
      { type: "numerico", attempts: 2, accuracy: 1 },
      { type: "simbolico", attempts: 2, accuracy: 0.5 },
    ]);
  });
});
