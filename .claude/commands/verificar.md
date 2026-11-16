---
description: Corre todas las verificaciones disponibles (código y contenido) con el agente verificador
---

Lanza a `verificador` (Haiku, ADR-027) con los comandos que apliquen, en este orden, para que la salida larga no entre a esta sesión:

1. `pnpm content:check` (esquemas Zod, compilación MDX/KaTeX, paridad YAML y `verify_content.py`), o `pnpm content:check content/<materia>` si la tarea tocó una sola materia.
2. `pnpm check` (lint, typecheck, `test` y `test:content`).
3. Si la tarea tocó flujos de UI: `pnpm test:e2e`. Si el Chromium de Playwright no se puede instalar (p. ej. en un contenedor), dile que apunte `CORTEX_CHROMIUM_PATH` a un Chromium existente.
4. Si la tarea tocó la build o la PWA: `pnpm build` y, cuando exista, `pnpm build:pwa`.

`build`, `dev` y `test:e2e` comparten `.next` y puertos: pídeselos solo cuando ningún dev esté escribiendo.

Con su resumen, para cada falla indica archivo, causa probable y el arreglo que propones; si necesitas más contexto, lee tú la línea exacta del archivo o la salida completa que dejó en su carpeta temporal. Si todo pasa, dilo en una línea. No marques nada como «hecho» en `ESTADO.md` si algo falló.
