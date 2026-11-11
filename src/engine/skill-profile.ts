import { type ConceptEvidence, conceptMastery, type Mastery, MASTERY_ORDER } from "./mastery";

/**
 * Perfil de habilidades (coach, ADR-026): dominio por concepto y por unidad más señales crudas de
 * rigor (acierto por dificultad y por tipo de ejercicio). Puro: recibe tipos estructurales que
 * cumplen tanto el catálogo de estudio como los registros de Dexie.
 *
 * La puntuación de rigor (niveles R0–R4) llega en v1.1, cuando Carlo apruebe los niveles.
 */

export interface ExerciseFacts {
  readonly subjectId: string;
  readonly unitKey: string;
  readonly conceptos: readonly string[];
  readonly dificultad: number;
  readonly tipo: string;
}

export interface UnitFacts {
  readonly key: string;
  readonly title: string;
  /** Conceptos que introduce la lección. */
  readonly concepts: readonly string[];
  readonly exerciseIds: readonly string[];
}

export interface SubjectFacts {
  readonly id: string;
  readonly name: string;
  readonly concepts: readonly { readonly id: string; readonly name: string }[];
  readonly units: readonly UnitFacts[];
}

export interface AttemptFacts {
  readonly exerciseId: string;
  readonly at: number;
  readonly correct: boolean;
}

export interface UnitProgressFacts {
  readonly unitKey: string;
  readonly status: string;
  readonly bestBoss: number | null;
  readonly bossPassed: boolean;
  readonly lessonDone: boolean;
}

export interface CardFacts {
  readonly exerciseId: string;
  readonly longOk: boolean;
}

const emptyEvidence = (): { -readonly [K in keyof ConceptEvidence]: ConceptEvidence[K] } => ({
  lessonDone: false,
  attempts: 0,
  correct: 0,
  bossPassed: false,
  longReviewOk: false,
});

/**
 * Evidencia por concepto de una materia (la misma regla que usa el mapa de maestría):
 * lección completada, intentos y aciertos, jefe aprobado y repaso largo acertado.
 */
export function conceptEvidence(
  subject: Pick<SubjectFacts, "id" | "units">,
  exercises: Readonly<Record<string, Pick<ExerciseFacts, "subjectId" | "conceptos">>>,
  attempts: readonly AttemptFacts[],
  progress: readonly Pick<UnitProgressFacts, "unitKey" | "lessonDone" | "bossPassed">[],
  cards: readonly CardFacts[],
): Map<string, ConceptEvidence> {
  const done = new Set(progress.filter((p) => p.lessonDone).map((p) => p.unitKey));
  const passed = new Set(progress.filter((p) => p.bossPassed).map((p) => p.unitKey));
  const longOk = new Set(cards.filter((c) => c.longOk).map((c) => c.exerciseId));
  const ev = new Map<string, ReturnType<typeof emptyEvidence>>();
  const get = (id: string) => {
    let e = ev.get(id);
    if (!e) ev.set(id, (e = emptyEvidence()));
    return e;
  };
  for (const u of subject.units) {
    for (const c of u.concepts) if (done.has(u.key)) get(c).lessonDone = true;
    for (const id of u.exerciseIds) {
      const ex = exercises[id];
      if (!ex) continue;
      for (const c of ex.conceptos) {
        if (passed.has(u.key)) get(c).bossPassed = true;
        if (longOk.has(id)) get(c).longReviewOk = true;
      }
    }
  }
  for (const a of attempts) {
    const ex = exercises[a.exerciseId];
    if (!ex || ex.subjectId !== subject.id) continue;
    for (const c of ex.conceptos) {
      const e = get(c);
      e.attempts++;
      if (a.correct) e.correct++;
    }
  }
  return ev;
}

export interface Rate {
  readonly attempts: number;
  /** Fracción de aciertos (0–1) o `null` sin intentos. */
  readonly accuracy: number | null;
}

export interface ConceptSkill extends Rate {
  readonly id: string;
  readonly name: string;
  readonly mastery: Mastery;
}

export interface UnitSkill {
  readonly key: string;
  readonly title: string;
  readonly status: string;
  readonly bestBoss: number | null;
  readonly bossPassed: boolean;
}

export interface RigorSignals {
  readonly byDifficulty: readonly (Rate & { readonly difficulty: number })[];
  readonly byType: readonly (Rate & { readonly type: string })[];
  /** Ejercicios de dificultad 4–5. */
  readonly hard: Rate;
  /** Solo el primer intento de cada ejercicio de dificultad 4–5 (sin memoria de la respuesta). */
  readonly hardFirstTry: Rate;
}

export interface SubjectSkills {
  readonly subjectId: string;
  readonly name: string;
  readonly masteryCounts: Readonly<Record<Mastery, number>>;
  readonly units: readonly UnitSkill[];
  readonly concepts: readonly ConceptSkill[];
  readonly rigor: RigorSignals;
}

const rate = (attempts: number, correct: number): Rate => ({ attempts, accuracy: attempts ? correct / attempts : null });

interface Tally {
  attempts: number;
  correct: number;
}

function bump(map: Map<string, Tally>, key: string, correct: boolean): void {
  let t = map.get(key);
  if (!t) map.set(key, (t = { attempts: 0, correct: 0 }));
  t.attempts++;
  if (correct) t.correct++;
}

/** Perfil de una materia a partir del catálogo y del historial. */
export function subjectSkills(
  subject: SubjectFacts,
  exercises: Readonly<Record<string, ExerciseFacts>>,
  attempts: readonly AttemptFacts[],
  progress: readonly UnitProgressFacts[],
  cards: readonly CardFacts[],
): SubjectSkills {
  const ev = conceptEvidence(subject, exercises, attempts, progress, cards);
  const concepts = subject.concepts.map((c): ConceptSkill => {
    const e = ev.get(c.id) ?? emptyEvidence();
    return { id: c.id, name: c.name, mastery: conceptMastery(e), ...rate(e.attempts, e.correct) };
  });
  const masteryCounts = Object.fromEntries(MASTERY_ORDER.map((m) => [m, 0])) as Record<Mastery, number>;
  for (const c of concepts) masteryCounts[c.mastery]++;

  const byKey = new Map(progress.map((p) => [p.unitKey, p]));
  const units = subject.units.map((u): UnitSkill => {
    const p = byKey.get(u.key);
    return { key: u.key, title: u.title, status: p?.status ?? "new", bestBoss: p?.bestBoss ?? null, bossPassed: p?.bossPassed ?? false };
  });

  const byDifficulty = new Map<string, Tally>();
  const byType = new Map<string, Tally>();
  const hard: Tally = { attempts: 0, correct: 0 };
  const hardFirst: Tally = { attempts: 0, correct: 0 };
  const seen = new Set<string>();
  const ordered = [...attempts].sort((a, b) => a.at - b.at);
  for (const a of ordered) {
    const ex = exercises[a.exerciseId];
    if (!ex || ex.subjectId !== subject.id) continue;
    bump(byDifficulty, String(ex.dificultad), a.correct);
    bump(byType, ex.tipo, a.correct);
    if (ex.dificultad >= 4) {
      hard.attempts++;
      if (a.correct) hard.correct++;
      if (!seen.has(a.exerciseId)) {
        hardFirst.attempts++;
        if (a.correct) hardFirst.correct++;
      }
    }
    seen.add(a.exerciseId);
  }

  return {
    subjectId: subject.id,
    name: subject.name,
    masteryCounts,
    units,
    concepts,
    rigor: {
      byDifficulty: [1, 2, 3, 4, 5].map((d) => {
        const t = byDifficulty.get(String(d));
        return { difficulty: d, ...rate(t?.attempts ?? 0, t?.correct ?? 0) };
      }),
      byType: [...byType.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, t]) => ({ type, ...rate(t.attempts, t.correct) })),
      hard: rate(hard.attempts, hard.correct),
      hardFirstTry: rate(hardFirst.attempts, hardFirst.correct),
    },
  };
}
