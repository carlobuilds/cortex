import type { SemesterGroup } from "@/content/core/home-model";
import { SubjectCard } from "./subject-card";

/** Un semestre del mapa: numeral en mono a la izquierda, materias compactas a la derecha. */
export function SemesterSection({ group, tracks }: { group: SemesterGroup; tracks: Readonly<Record<string, string>> }) {
  const id = `semestre-${group.n}`;
  return (
    <section aria-labelledby={id} className="grid gap-3 border-t pt-5 md:grid-cols-[6rem_minmax(0,1fr)]">
      <header>
        <h3 id={id} className="sr-only">
          Semestre {group.n}
        </h3>
        <p aria-hidden className="font-mono text-3xl leading-none font-semibold text-border-strong tabular-nums">
          {String(group.n).padStart(2, "0")}
        </p>
        <p className="eyebrow mt-1">{group.credits} créditos</p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} trackName={tracks[s.track ?? ""] ?? null} />
        ))}
      </ul>
    </section>
  );
}
