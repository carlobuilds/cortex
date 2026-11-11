# 08 · Equipo de agentes

Cortex se construye y se revisa con un equipo de **subagentes de Claude Code** (`.claude/agents/`). Además hay un **coach** que asesora a Carlo con sus propios datos. Todo esto vive en el desarrollo: **la app no tiene IA en tiempo de ejecución** (ADR-024).

Para que Claude Code encuentre los agentes, los comandos y el MCP, ábrelo **en la carpeta `cortex/`**, no en la de arriba (`0IPN/Cortex`): desde ahí los agentes no se encuentran (verificado el 2026-11-10). Los agentes nuevos o editados aparecen al abrir una sesión nueva. `cortex/.claude/launch.json` trae los mismos servidores de vista previa (`cortex` y `cortex-verificacion`).

## Roster

Los 19 agentes usan `model: opus` y se invocan **solo por nombre**, desde los comandos o cuando Carlo lo pide. Con tantas descripciones parecidas, la delegación automática se equivocaría. Ninguno tiene la herramienta `Agent`: la orquestación vive en la sesión principal.

### Ciencia del aprendizaje (asesores, solo lectura)

| Agente | Frontera |
|---|---|
| `pedagogo` | Diseño instruccional: anatomía de lección y unidad, ejemplos desvanecidos, alineación con el programa oficial, estructura de la Ruta IA |
| `cientifico-memoria` | Recuperación, espaciado y FSRS, intercalado, calibración e ilusión de saber |
| `cientifico-cognitivo` | Carga cognitiva, dificultad deseable, flow, fatiga, práctica deliberada, planes de entrenamiento, gimnasio |
| `disenador-motivacion` | Recompensas y gamificación ética (`docs/03`); revisa todo cambio a mecánicas |
| `arquitecto-razonamiento` | Tipos de razonamiento, Polya, pistas socráticas, autoexplicación, niveles de rigor formal (R0–R4, propuesta) |
| `linguista` | Psico y neurolingüística con evidencia (no PNL), claridad en español, inglés técnico, comunicación técnica |
| `disenador-interaccion` | Lápiz, toque y teclado, HIG de Apple, accesibilidad, latencia, sistema Arcano |

### Expertos de dominio (asesores)

| Agente | Frontera |
|---|---|
| `experto-matematicas` | Rigor, notación y verificación con sympy en todas las bases duras |
| `experto-ia` | ML, deep learning, NLP, lenguajes formales; «Conexiones»; diseño de la Ruta IA y su catálogo de proyectos |
| `experto-finanzas` | Fundamentos económicos, finanzas personales (educación, nunca asesoría), IA en finanzas, economía de la IA |
| `experto-ciberseguridad` | **Guardián con poder de bloqueo** sobre las superficies de seguridad; también contenido de ciberseguridad y de seguridad de IA |

`experto-matematicas`, `experto-ia` y `experto-ciberseguridad` tienen `Bash` para comprobar cosas, nunca para editar.

### Desarrollo (escriben, uno a la vez)

| Agente | Rutas propias |
|---|---|
| `dev-motor` | `src/engine/**` |
| `dev-sync` | `src/db/**`, `src/sync/**`, `relay/**`, `mcp/**` |
| `dev-ipad` | `src/components/ink/**`, manifiesto, service worker, `spikes/**` |
| `dev-interfaz` | el resto de `src/components/**`, `src/app/**`, `src/lib/**`, `e2e/**` |
| `dev-infra` | `deploy/**`, `next.config.ts`, scripts de build. Nunca entra al VPS: escribe runbooks que Carlo ejecuta |
| `autor-contenido` | `content/**`, siempre por `/nueva-unidad` |

### Calidad y persona

| Agente | Qué hace |
|---|---|
| `resolutor-a-ciegas` | Resuelve ejercicios sin ver respuestas (capa 3 de `docs/07`). Solo `Bash`, con cerca |
| `coach` | Revisión semanal, post-mortem de parciales reales y mentoría de carrera. Ve solo agregados por el MCP de Cortex y su calendario (solo lectura) |

### Se reutilizan sin archivo propio
- `pr-review-toolkit:code-reviewer`: revisa todo diff.
- `pr-review-toolkit:silent-failure-hunter`: datos, sync y MCP.
- `pr-review-toolkit:pr-test-analyzer`.
- Explore y Plan.

Los expertos nuevos entran cuando llegue su fase; por ejemplo, `experto-fisica` en la Fase 4.

## Reglas del worktree único
Todo el equipo trabaja en la misma carpeta, sin worktrees aislados, para que la experiencia de desarrollo sea simple:
1. **Un solo escritor a la vez.** Los asesores, que solo leen, sí corren en paralelo.
2. **Cada dev escribe solo en sus rutas.** `/equipo` revisa `git diff --name-only` y le regresa al dev lo que quede fuera.
3. **Archivos de la sesión principal:** solo ella toca `ESTADO.md`, `docs/`, `CLAUDE.md`, `.claude/`, `.mcp.json` y `pnpm-lock.yaml`. Una dependencia nueva solo entra con ADR.
4. **Commit al terminar cada paso.** Lo hace la sesión principal después de la revisión; los agentes no hacen commit, push ni cambio de rama.
5. **Comandos compartidos:** `pnpm build`, `dev` y `test:e2e` solo los corre el escritor activo, porque `.next` y los puertos son compartidos.
6. **Credenciales y VPS:** Claude nunca escribe tokens ni credenciales, y los cambios en el VPS los ejecuta Carlo.

## Comandos

| Comando | Cuándo |
|---|---|
| `/fase` | Retomar la fase actual: plan, decisiones pendientes y siguiente paso |
| `/consejo <tema>` | Al planear o en pasos riesgosos (temario, mecánicas, datos, seguridad): 2–4 asesores en paralelo y una tabla de veredictos |
| `/equipo <paso>` | Implementar un paso del plan aprobado: dev dueño → verificación → revisión → commit |
| `/nueva-unidad <materia>/<NN-unidad>` | Esquema revisado por el experto, `pedagogo` y `arquitecto-razonamiento` → escribe `autor-contenido` → `content:check` |
| `/revisar-contenido <ruta>` | `resolutor-a-ciegas` + checklist en paralelo del experto, `linguista` y `pedagogo` |
| `/coach [semana \| parcial <materia> \| carrera]` | Revisión semanal, post-mortem de un examen real o mentoría de carrera |
| `/verificar`, `/cerrar-fase` | Igual que antes; al cerrar, el guardián revisa las superficies de seguridad |

## Cercas (hooks `PreToolUse` en `.claude/hooks/`)

`tools` no puede limitar Bash por comando ni Read por ruta, así que tres agentes llevan una cerca en Python:

| Cerca | Agente | Bloquea |
|---|---|---|
| `cerca-ciega.py` | `resolutor-a-ciegas` | Rutas del proyecto, carpetas con contenido o respuestas, archivos YAML y MDX, `ls`/`find`/`grep`/`git`, y `cd` fuera de carpetas temporales. Permite `.venv/bin/python -I` (sympy) |
| `cerca-coach.py` | `coach` | Leer o escribir fuera de `diario/` y cualquier respaldo crudo |
| `cerca-infra.py` | `dev-infra` | `ssh`, `scp`, `sftp`, `rsync` remoto, llaves SSH y la API de Hostinger |

- **Fallan cerradas:** si no encuentran el script, no entienden la llamada o tienen un error interno, salen con código 2 y la llamada se bloquea.
- **Funcionan desde las dos raíces:** el lanzador del frontmatter las busca en `$CLAUDE_PROJECT_DIR` y en `$CLAUDE_PROJECT_DIR/cortex`.
- **Tienen pruebas:** `tests/content/agent-hooks.test.ts` las cubre, porque necesitan Python.
- **Límite:** son barreras contra accidentes de agentes cooperativos, no un sandbox. Un comando ofuscado a propósito podría evadirlas.

## El MCP de Cortex (ADR-026)
- **Servidor:** `mcp/cortex/`, por stdio, registrado en `.mcp.json` como `cortex` (`pnpm --silent mcp:cortex`). La primera vez, Claude Code pide aprobarlo.
- **Fuente en v1:** el respaldo más reciente de `respaldos/`. Carlo lo exporta desde Ajustes. En v1.1 la fuente será el relay.
- **Privacidad por construcción:** el motor puro (`src/engine/coach-metrics.ts`, `skill-profile.ts`, `institutional.ts`) calcula **solo agregados**, y la capa de datos copia campo por campo, nunca registros enteros. Una prueba con cadenas marcadoras comprueba que ninguna salida trae respuestas, notas, reportes ni tinta.

| Herramienta | Qué devuelve |
|---|---|
| `weekly_metrics` | Constancia, minutos, XP contra tu promedio, acierto, retención contra objetivo, calibración, ilusión de saber, conceptos débiles, jefes, simulacros, gimnasio y tarjetas vencidas. Más el veredicto de `weeklyVerdict` |
| `skill_profile` | Dominio por concepto y unidad, y señales de rigor (por dificultad, por tipo, difíciles y al primer intento) |
| `institutional_results` | Calificaciones reales de `diario/resultados.yaml` |
| `record_institutional_result` | Agrega una calificación (valida con Zod, materia del plan y sin duplicados) |
| `calibration_report` | Último simulacro de los 21 días previos contra la calificación real: error medio y sesgo |

**Aporte de Carlo:** `weeklyVerdict` en `src/engine/coach-metrics.ts` queda como `TODO(Carlo)`. Ahí defines qué es una semana sólida, una para ajustar y una de alerta. Mientras devuelva `"pendiente"`, el coach no inventa veredicto.

**Calendario:** el coach lee Google Calendar (solo lectura) para encontrar exámenes. Crear eventos lo hace la sesión principal, solo con el sí de Carlo.

## Costo
Todo corre en Opus, por decisión de Carlo. Para que no se dispare:
- `/consejo` convoca como mucho 4 asesores, y solo al planear o en pasos riesgosos;
- las revisiones de `/equipo` se lanzan en paralelo y solo las que aplican.

Cambiar el modelo de un agente es una línea de su frontmatter.

## Agregar un agente
1. Copia la plantilla de cualquier asesor: frontmatter con `description` «Invocar solo por nombre…», y las secciones Misión, Lee primero, Criterios, Entrega y Límites.
2. Dale solo las herramientas que necesita. Si escribe, define sus rutas propias y agrégalas a la tabla de `/equipo`.
3. Regístralo en esta tabla y en `ESTADO.md`.
