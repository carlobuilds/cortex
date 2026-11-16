---
description: Crea una unidad de contenido (lección + ejercicios + jefe) con el equipo y la verifica
argument-hint: <materia>/<NN-nombre-unidad>   (p. ej. calculo/02-continuidad)
---

Crea la unidad `$ARGUMENTS` en `content/` con el equipo.

Experto según la materia:

| Materia | Experto |
|---|---|
| calculo, matematicas-discretas, algebra-lineal, calculo-multivariable, ecuaciones-diferenciales, probabilidad-estadistica, matematicas-avanzadas | `experto-matematicas` |
| programacion, materias de IA, ML, NLP o teoría de la computación | `experto-ia` |
| fundamentos-economicos y finanzas | `experto-finanzas` |
| ciberseguridad y seguridad de IA | `experto-ciberseguridad` |
| mecanica-electromagnetismo | `experto-matematicas` hasta que exista `experto-fisica` (avísale a Carlo) |

Pasos:

1. **Esquema.** Lee:
   - `docs/04-pedagogia.md`, `docs/05-formato-contenido.md` y `docs/07-calidad-y-verificacion.md`;
   - `curriculum/programas/<materia>.pdf`; si no existe, avísame y usa `programa_ref: "pendiente"`;
   - `content/<materia>/conceptos.yaml`.

   Propón un esquema corto: temas y secciones del programa, conceptos nuevos con prerrequisitos, orden, mezcla de tipos de ejercicio y de razonamiento, y si es parte del **sprint del parcial**, qué entra al examen.

2. **Revisión del esquema en paralelo**, en un solo mensaje: el experto de la materia, `pedagogo` y `arquitecto-razonamiento`. Sintetiza sus veredictos. Si hay bloqueo o conflicto, pregúntame antes de seguir.

3. **Escritura.** Lanza a `autor-contenido` con el esquema aprobado. Él escribe:
   - los conceptos nuevos en `conceptos.yaml`;
   - `leccion.mdx`, con la anatomía completa y contenido original de 15–25 min;
   - `ejercicios.yaml`: de 15 a 25 ejercicios en escalera 1–5, variedad de tipos y `verificar` independiente en cada respuesta numérica o simbólica, con ids `<prefijo>-<NN>-<NNN>`;
   - `jefe.yaml`: 6 preguntas o más, al menos una de dificultad 4 o más, y entre 25 y 35 % de `repaso_de` de unidades previas que ya existan.

   Si el prefijo de ids es nuevo, regístralo tú en `ESTADO.md`.

4. **Verificación.** Lanza a `verificador` con `pnpm content:check content/<materia>` y confirma con su resumen que quedó en verde. No te quedes solo con lo que reportó el autor.

5. **Resumen corto:** ejercicios por tipo, dificultad y tipo de razonamiento, lo que quedó en revisión manual y, si faltan unidades previas para el repaso del jefe, cuáles. Sugiéreme correr `/revisar-contenido content/$ARGUMENTS`.

No inventes cifras ni datos reales: si hacen falta, cita fuente y fecha o usa un caso hipotético.
