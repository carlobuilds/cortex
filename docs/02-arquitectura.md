# 02 · Arquitectura

## Stack

| Capa | Elección | Nota |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript estricto | Rutas de API locales para el runner de C |
| UI | Tailwind + shadcn/ui | Teclado primero, el tema sigue al sistema (claro u oscuro; ADR-020) |
| Estado | React (UI) + Dexie `liveQuery` (datos) | Zustand quedó fuera (ADR-017): no hizo falta |
| Persistencia | Dexie sobre IndexedDB | Respaldo JSON exportable |
| Contenido | MDX + YAML en `content/` | Validado con Zod |
| Matemáticas | KaTeX (render), MathLive (entrada), mathjs (evaluación) | |
| Gráficas | Mafs (matemáticas interactivas; ADR-021), Recharts (estadísticas de progreso, aún sin instalar) | Mafs solo se importa en `components/visuals/plot-frame.tsx` |
| Repaso espaciado | `ts-fsrs` | |
| Código | CodeMirror 6, Pyodide en Web Worker, `gcc` local para C | |
| Pruebas | Vitest (motores), Playwright (flujos clave) | |
| Verificación de contenido | `scripts/verify_content.py` (sympy + ejecución) | |
| Coach | MCP propio por stdio (`@modelcontextprotocol/sdk`) | Solo agregados; ADR-026 |

Si alguna librería ya no se mantiene o hay una mejor al momento de implementar, Claude Code lo propone y registra un ADR nuevo antes de cambiar.

## Estructura del repo

```
cortex/
  CLAUDE.md  ESTADO.md  README.md  PRIMER-PROMPT.md
  docs/
  curriculum/        plan-2020.json, programas/
  content/           <materia>/{conceptos.yaml, NN-unidad/{leccion.mdx, ejercicios.yaml, jefe.yaml}}
  scripts/           verify_content.py, content-check.ts, lib/ (Python multiplataforma, paridad YAML)
  src/
    app/             rutas: / · /sesion · /repaso · /gimnasio · /progreso · /cuaderno · /ajustes · /estilo · /catalogo.json
                     /materias/[materia] (+ /mapa, /simulacro) · /materias/[materia]/[unidad] (+ /quiz, /practica, /jefe)
    content/
      schema/        esquemas Zod de docs/05 (puro)
      core/          índice, reglas cruzadas, lector YAML, API de componentes de lección y de visuales (puro)
      loader.ts      lee content/ del disco · server.ts (solo servidor) · mdx.ts (MDX + KaTeX + guardia)
    db/              esquema Dexie y guarda de versión, respaldo, hooks de React
    content/rich-text.ts  texto de ejercicios (Markdown + KaTeX) · core/study-catalog.ts (catálogo del navegador)
    components/      ui (shadcn/ui) · hud · lessons · visuals · subjects · settings · layout · study · gym · pages
    engine/          config, xp, niveles, racha, fsrs, misiones, cofre, liga, récords, logros, jefes, simulacro (exam), flujo,
                     maestría, sesión, answers/ (verificadores), plot (geometría de los visuales), logic/ (fórmulas y tablas
                     de verdad), graph (grafos), gym/ (puro TS, sin React)
    db/              (además) migrations.ts (v1→v2) · progress.ts (reglas del motor en una transacción)
    runners/         python-worker.mjs + python-client.ts (Pyodide local), c-runner.ts (servidor) + c-client.ts
    app/api/run-c/   ruta local del runner de C (ADR-005)
    lib/  styles/
  tests/             pruebas con Python (paridad, content:check) y stubs
  e2e/               Playwright (smoke)
  .claude/agents/     equipo de 19 subagentes (docs/08)
  .claude/commands/   /fase, /consejo, /equipo, /nueva-unidad, /revisar-contenido, /verificar, /cerrar-fase, /coach
  .claude/hooks/      cercas de los agentes (resolutor, coach, infra)
  mcp/cortex/         MCP del coach: métricas agregadas y resultados institucionales (ADR-026)
  .mcp.json           registra el MCP `cortex` para Claude Code
  respaldos/ diario/  datos personales de Carlo para el coach (fuera de git)
```

**Regla de oro:** `src/engine/` no importa React ni el DOM. Es lógica pura, probada con Vitest. Así las mecánicas se pueden afinar sin romper la UI.

## Modelo de datos (Dexie)

Los nombres de tablas y campos van **en inglés** porque son identificadores de código (regla de `CLAUDE.md`; decisión D1 de Carlo, 2026-10-01). La columna "Concepto" da la equivalencia en español. Las claves del contenido (`content/**/*.yaml` y front matter) siguen en español: son el formato de contenido de `05-formato-contenido.md`.

| Tabla | Concepto | Clave | Contenido |
|---|---|---|---|
| `meta` | metadatos | `key` | `schemaVersion` de la base (guarda contra bases de una versión más nueva) |
| `profile` | perfil | `id=1` | xpTotal, level, currentStreak, maxStreak, streakFreezes, preferences |
| `unitProgress` | progreso de unidad | `unitKey` (`materia/unidad`) | status (new, seen, practiced, mastered, expert), bestBoss, bossAttempts |
| `attempts` | intentos | autoincrement | exerciseId, at, correct, timeMs, confidence (1–3), answer, sessionId |
| `cards` | tarjetas | `exerciseId` | estado FSRS (due, stability, difficulty, reps, lapses, lastReview) |
| `sessions` | sesiones | autoincrement | startedAt, endedAt, xpEarned, kind (daily, free, boss, exam, gym) |
| `missions` | misiones | `key` (`fecha/slot`) | kind, target, progress, completed |
| `records` | récords | `key` | mejor valor y fecha (precisión, velocidad, racha de aciertos, por unidad) |
| `ghosts` | fantasmas | `context` | serie de eventos del mejor intento para comparar en vivo |
| `achievements` | logros | `id` | fecha de desbloqueo |
| `gymResults` | resultados del gimnasio | autoincrement | game, domain, level, score, at |
| `mistakes` | cuaderno de errores | `exerciseId` | veces falladas, última respuesta, nota propia |
| `reports` | reportes | autoincrement | exerciseId, comentario de Carlo (para corregir contenido) |
| `days` | días (v2) | `day` (`AAAA-MM-DD`) | XP, respondidos, correctos, repasos, misión mínima, combo, tiempo activo, cofre y sesión del día |

Fechas en milisegundos desde epoch; días como `AAAA-MM-DD` en hora local. Cada registro guarda `schemaVersion`. Migraciones de Dexie obligatorias y probadas; la versión 1 del esquema no se edita nunca (una versión nueva se agrega encima).

## Decisiones (ADR resumidos)

**ADR-001 · Local-first sin backend** (*revisado por ADR-025: desde la v1.1 se agrega un relay de sync propio en el VPS de Carlo; los datos siguen viviendo primero en cada dispositivo*). Un solo usuario. Elimina cuentas, hosting y costos. Riesgo: perder datos si se borra el almacenamiento del navegador → respaldo JSON manual en F0 y automático (File System Access API) como transversal. Alternativa descartada: Supabase (útil si hay multiusuario; se puede añadir después porque `engine/` y `db/` están aislados).

**ADR-002 · Contenido en archivos del repo.** Versionable con git, revisable por diff, verificable por script. Alternativa descartada: base de datos de contenido (opacidad, sin revisión).

**ADR-003 · Verificación de contenido con código.** Toda respuesta cuantitativa se valida con sympy o ejecutando una solución. Es la contramedida al riesgo de errores en contenido pre-escrito. Ver `07-calidad-y-verificacion.md`.

**ADR-004 · Python en Pyodide.** Corre en el navegador, aislado, sin servidor. Carga de ~10 MB la primera vez; se cachea. NumPy disponible para Álgebra lineal y ML.

**ADR-005 · C con `gcc` local.** Pyodide no compila C. Para una app local de un solo usuario, una ruta API que compila y ejecuta con timeout es la opción más fiel (misma experiencia que su clase). Salvaguardas obligatorias: solo con `CORTEX_LOCAL=1` y host `localhost`; directorio temporal único; `timeout` duro (p. ej. 5 s) y límite de salida; sin red si el sistema lo permite (p. ej. `unshare -n` en Linux); se borra el directorio al terminar; nunca expuesta en un despliegue público. Alternativa para despliegue web: C compilado a WASM; se evalúa solo si algún día se publica.

**ADR-006 · FSRS en vez de SM-2.** Mejor retención con menos repasos y buena librería TS. Parámetros por defecto, retención objetivo 0.90 (configurable).

**ADR-007 · Equivalencia simbólica numérica en cliente.** Para respuestas algebraicas: se evalúan la respuesta del usuario y la oficial en N puntos aleatorios del dominio (evitando singularidades) y se comparan con tolerancia. Se complementa con formatos de forma canónica cuando el ejercicio los pide. El verificador de Python hace la comprobación fuerte con sympy al escribir el ejercicio.

**ADR-008 · Mecánicas puras y afinables.** XP, niveles, ligas y dificultad adaptativa viven en `engine/` con constantes en un solo archivo `engine/config.ts`. Afinar la "adictividad" no debería tocar componentes.

## Rendimiento y UX técnica
- Retroalimentación de respuesta < 100 ms; animaciones < 200 ms.
- Índice de contenido generado en build; las lecciones se cargan por ruta.
- Atajos: `Enter` comprobar, `N` siguiente, `H` pista, `1/2/3` confianza, `Esc` salir.
- Accesibilidad: contraste AA, foco visible, `prefers-reduced-motion` respetado, sonido opcional y apagado por defecto.

## Seguridad
Guardián: `experto-ciberseguridad` revisa todo cambio a estas superficies; su bloqueo detiene el paso (`docs/08`).
- **Runner de C** (ADR-005): solo local; la build del iPad lo excluye y jamás se despliega.
- **MCP de Cortex** (ADR-026): local por stdio; solo devuelve agregados (prueba de privacidad con marcadores); solo lee `respaldos/` y escribe `diario/resultados.yaml` con validación.
- **Cercas de los agentes** (`.claude/hooks/`): fallan cerradas y tienen pruebas; son barreras contra accidentes, no un sandbox.
- **Desde la v1.1:** relay en el VPS (TLS y HSTS, tokens con hash y revocables por dispositivo, límites de tamaño y tasa; sin E2EE, el VPS ve el progreso en claro: riesgo aceptado en ADR-025) y PWA (CSP, el service worker nunca cachea `/api` ni la sync).
- El contenido MDX es de confianza (lo escribimos nosotros), pero no se habilita HTML arbitrario de fuentes externas.
- Sin telemetría. Hoy ningún dato sale de la máquina, salvo los agregados que el coach lee en Claude Code y, desde la v1.1, la sync con el relay propio.
