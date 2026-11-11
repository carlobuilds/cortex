---
description: Revisión adversarial a ciegas de una unidad o materia de contenido, con el equipo
argument-hint: <ruta>   (p. ej. content/calculo/01-limites)
---

Revisa el contenido en `$ARGUMENTS` en tres pasos.

**1. Verificación automática.** Corre `pnpm content:check $ARGUMENTS` (incluye `verify_content.py`) y repórtame los resultados.

**2. Resolución a ciegas con `resolutor-a-ciegas`.**

- **Qué le pasas.** Tú lees `ejercicios.yaml` y le pasas **únicamente** los ejercicios de tipo `numerico`, `simbolico`, `opcion_multiple`, `seleccion_multiple`, `completar`, `ordenar`, `predecir_salida`, `tabla_verdad`, `conjunto` y `codigo`. De cada uno:
  - `id` y `tipo`;
  - `enunciado`;
  - `opciones`, y `texto` o `formula` si los hay;
  - el `visual` si lo hay, porque sus parámetros son parte del enunciado;
  - en `codigo`, también el lenguaje y la firma pedida.
- **Qué nunca le pasas:** `respuesta`, `correcta`, `correctas`, `valores`, `respuestas`, `explicacion`, `pistas`, `verificar`, `solucion` ni `tests`.
- **Avisos que le das:**
  - en `seleccion_multiple`, que puede haber varias correctas;
  - en `tabla_verdad`, que conteste la columna final en orden canónico (VV, VF, FV, FF…).
- **Qué hace él:** resuelve por su cuenta (su cerca le impide leer el repo) y devuelve una tabla `id → respuesta` con su confianza.
- **Qué haces después:**
  - compara con las respuestas oficiales;
  - lista **toda discrepancia** e investiga si es un error del enunciado, una ambigüedad o una respuesta mal escrita;
  - en `codigo`, corre su solución contra los tests de la unidad.

**3. Checklist de lección en paralelo**, en un solo mensaje:
- el experto de la materia (ver la tabla de `/nueva-unidad`): precisión, notación y cobertura del programa;
- `linguista`: claridad y ambigüedad, incluidos los enunciados con discrepancias del paso 2;
- `pedagogo`: anatomía, ejemplos justificados, al menos 3 ejercicios por concepto nuevo y escalera.

Todos usan la capa 4 de `docs/07-calidad-y-verificacion.md`, más originalidad y datos con fuente.

**Entrega:**
- tabla de discrepancias, si hay;
- problemas de la lección con su severidad (error o mejora) y quién lo encontró;
- los arreglos que propones.

No modifiques archivos hasta que yo apruebe, salvo errores objetivos de respuesta que el verificador ya confirme.
