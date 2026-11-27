import { describe, expect, it } from "vitest";
import { type Answer, checkAnswer } from "@/engine/answers/check";
import { formatSet } from "@/engine/answers/sets";
import { loadContent } from "./loader";
import type { Exercise } from "./schema";

/*
 * Ida y vuelta de las respuestas oficiales: lo que está escrito en cada `ejercicios.yaml` tiene que
 * salir "correcto" en el MISMO verificador que usa la app. `verify_content.py` comprueba con sympy
 * que la respuesta sea verdadera; esta prueba comprueba que el navegador la sepa leer. Sin ella,
 * una `respuesta` que sympy entiende y la app no (`binomial(5, 2)` antes de la Fase 3) pasaba
 * `content:check` y dejaba el ejercicio imposible de acertar.
 */

const { index } = loadContent(process.cwd());
const exercises = Object.values(index?.content ?? {}).flatMap((subject) => subject.units.flatMap((unit) => unit.exercises));

/** La respuesta oficial, escrita como la escribiría el usuario. `null` = el tipo no se califica con texto. */
function officialAnswer(ex: Exercise): Answer | null {
  switch (ex.tipo) {
    case "opcion_multiple":
      return { kind: "choice", index: ex.correcta };
    case "numerico":
    case "simbolico":
      return { kind: "text", value: String(ex.respuesta) };
    case "predecir_salida":
      return { kind: "text", value: ex.respuesta };
    case "completar":
      return { kind: "blanks", values: ex.respuestas };
    case "ordenar":
      return { kind: "order", items: ex.elementos };
    case "seleccion_multiple":
      return { kind: "choices", indexes: ex.correctas };
    case "tabla_verdad":
      return { kind: "truth", values: ex.respuesta.map((v) => v === "V") };
    case "conjunto":
      // Como lo escribiría el usuario: entre llaves y separado por comas (o ∅).
      return { kind: "text", value: formatSet(ex.respuesta) };
    default:
      // Código, Debug Dojo, Parsons, rastreo (los corre `code-runners.test.ts`) y autoevaluación (la califica el usuario).
      return null;
  }
}

const checkable = exercises.flatMap((ex) => {
  const answer = officialAnswer(ex);
  return answer ? [{ ex, answer }] : [];
});

describe("respuestas oficiales en el verificador de la app", () => {
  it("hay contenido real que revisar", () => {
    expect(checkable.length).toBeGreaterThanOrEqual(100);
  });

  it.each(checkable.map(({ ex, answer }) => [ex.id, ex.tipo, ex, answer] as const))("%s (%s): la respuesta oficial sale correcta", (_id, _tipo, ex, answer) => {
    expect(checkAnswer(ex, answer)).toEqual({ status: "correct" });
  });

  it("una respuesta equivocada no pasa (la prueba no es trivial)", () => {
    const numeric = checkable.find(({ ex }) => ex.tipo === "numerico" && typeof ex.respuesta === "number");
    expect(numeric).toBeDefined();
    if (numeric?.ex.tipo === "numerico" && typeof numeric.ex.respuesta === "number") {
      expect(checkAnswer(numeric.ex, { kind: "text", value: String(numeric.ex.respuesta + 1) }).status).toBe("wrong");
    }
  });
});
