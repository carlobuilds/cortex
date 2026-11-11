---
description: Sesión con el coach — revisión semanal, post-mortem de un parcial real o mentoría de carrera en IA
argument-hint: semana | parcial <materia> | carrera
---

Sesión de coach en modo: **$ARGUMENTS** (si viene vacío, usa `semana`).

1. **Datos frescos.** El MCP de Cortex lee el respaldo más reciente de `respaldos/`.
   - Revisa solo el **nombre y la fecha** de los archivos con `ls -t respaldos/`. **No abras su contenido**: el coach ve agregados, y tú tampoco necesitas los datos crudos.
   - Si no hay respaldo o el más nuevo tiene más de 7 días, pídele a Carlo que lo exporte desde `/ajustes` y lo guarde en `respaldos/` antes de seguir.
   - Si el servidor `cortex` no aparece entre los MCP de la sesión, avísale que lo active (está en `.mcp.json`; la primera vez Claude Code pide aprobarlo).

2. **Lanza a `coach`** con el modo, la fecha de hoy y, en `parcial`, la materia. En `parcial`, el coach le pedirá a Carlo los datos del examen: pásale las respuestas tal como las dé.

3. **Al terminar**, muéstrale a Carlo:
   - el resumen del coach en 3–5 líneas;
   - la ruta del informe en `diario/`.

4. **Seguimiento con permiso:**
   - si el coach propone bloques en el calendario, pregúntale a Carlo y créalos solo con su sí;
   - si propone cambios a la app, al contenido o a las mecánicas, ofrece llevarlos a `/consejo`. El coach no cambia nada fuera de `diario/`.
