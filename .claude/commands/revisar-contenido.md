---
description: Revisión adversarial a ciegas de una unidad o materia de contenido
argument-hint: <ruta>   (p. ej. content/calculo/01-limites)
---

Revisa el contenido en `$ARGUMENTS` en tres pasos.

**1. Verificación automática.** Corre `pnpm content:check $ARGUMENTS` (incluye `verify_content.py`) y repórtame los resultados.

**2. Resolución a ciegas.** Lanza un subagente (Agent) **que no lea las respuestas**. Debe recibir únicamente, por cada ejercicio de `ejercicios.yaml` con tipo `numerico`, `simbolico`, `opcion_multiple`, `seleccion_multiple`, `completar`, `ordenar`, `predecir_salida`, `tabla_verdad` o `conjunto`: el `id`, el `enunciado`, las `opciones`, el `texto` o la `formula` si los hay, y el `visual` si lo hay (sus parámetros son parte del enunciado). Nada de `respuesta`, `correcta`, `correctas`, `valores`, `respuestas`, `explicacion`, `pistas` ni `verificar`. En `seleccion_multiple` avísale que puede haber varias correctas; en `tabla_verdad`, que conteste la columna final en orden canónico (VV, VF, FV, FF…). El subagente resuelve cada uno por su cuenta (puede usar Python/sympy) y devuelve una tabla `id → respuesta`. Después tú compara con las respuestas oficiales y lista **toda discrepancia**, investigando si es un error del enunciado, una ambigüedad o una respuesta mal escrita. Para los ejercicios `codigo`, el subagente escribe su propia solución desde el enunciado y se ejecuta contra los tests.

**3. Checklist de lección.** Revisa `leccion.mdx` con la checklist de `docs/07-calidad-y-verificacion.md` (capa 4): precisión de cada afirmación, notación, cobertura del programa, ejemplos justificados, ≥ 3 ejercicios por concepto nuevo, originalidad, datos con fuente.

Entrega: tabla de discrepancias (si hay), lista de problemas de lección con severidad (error, mejora) y los arreglos que propones. No modifiques archivos hasta que yo apruebe, salvo errores objetivos de respuesta que el verificador ya confirme.
