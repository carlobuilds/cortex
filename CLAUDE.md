# CLAUDE.md · Reglas del proyecto Cortex

Cortex es una app web **local-first** de un solo usuario (Carlo) para estudiar toda la carrera de Ingeniería en IA del IPN (plan 2020) con lecciones, práctica, repaso espaciado, jefes, gamificación y un gimnasio cognitivo, más una Ruta de ingeniero en IA en paralelo. Corre en la Mac (con el runner de C) y, desde la v1.1, en el iPad como PWA con pizarra para el Apple Pencil (`docs/09`). El objetivo es que sea difícil de soltar **sin** manipular.

## Antes de hacer cualquier cosa
1. Lee `ESTADO.md` (fase actual, decisiones pendientes, checklist). Los ADRs viven en `docs/adrs.md` y la bitácora en `docs/bitacora.md`: léelos solo en la parte que la tarea necesite (busca por número de ADR o por fecha), no completos.
2. Lee los docs que apliquen a la tarea: `docs/00` a `docs/09` (el equipo de agentes está en `docs/08`). Son la fuente de verdad. Si el código y los docs se contradicen, para y pregúntale a Carlo cuál manda.
3. Trabaja **una fase a la vez**, según `docs/01-roadmap-fases.md`. No adelantes entregables de fases posteriores salvo que Carlo lo pida.

## Cómo trabajar una fase
1. Entra en modo plan, propón el plan detallado (archivos, orden, riesgos) y espera aprobación. Si toca temario, mecánicas, datos o seguridad, pásalo antes por `/consejo`.
2. Implementa en pasos pequeños con `/equipo` (dev dueño → verificación → revisión); commit al terminar cada paso con mensaje claro en español (`feat:`, `fix:`, `docs:`, `content:`, `test:`).
3. Cierra con `/cerrar-fase`: checklist común de `docs/01`, `ESTADO.md` actualizado, etiqueta git `fase-N`.
4. Nunca marques algo como hecho sin haberlo ejecutado y visto pasar (pruebas, `verify_content.py`, o el flujo a mano). Si no pudiste verificarlo, dilo.

## Reglas de contenido (críticas)
- **Correcto antes que bonito.** Toda respuesta numérica/simbólica se verifica con `scripts/verify_content.py` mediante una vía **independiente** (sympy, Python o ejecutar la solución). No pongas `verificar: 3` copiando tu propio cálculo.
- **Alinea con el programa oficial** de la materia (`curriculum/programas/<id>.pdf`). Si no existe, pídeselo a Carlo antes de escribir la materia, o marca `programa_ref: "pendiente"` y avisa.
- **Contenido original.** No copies ejercicios, texto ni estructura de libros, exámenes o apuntes.
- **Datos reales con fuente y fecha**, o claramente hipotéticos ("Supón que..."). Nunca inventes cifras.
- Sigue `docs/05-formato-contenido.md` y las plantillas de `content/_plantillas/`. Los ids de ejercicio no se reutilizan ni se renumeran; los retirados llevan `retirado: true`.
- Después de escribir una unidad: corre `pnpm content:check content/<materia>` (incluye `verify_content.py`, esquemas Zod, compilación MDX/KaTeX y paridad YAML) y luego `/revisar-contenido` (resolución a ciegas por un subagente) antes de darla por buena.
- Una unidad completa = lección + 15–25 ejercicios en escalera de dificultad 1–5 con **variedad de tipos** + jefe de ≥ 6 preguntas (incluye entrelazado de unidades previas).

## Reglas de código
- TypeScript estricto, sin `any` salvo justificación comentada.
- `src/engine/` es lógica pura: **sin React ni DOM**, con pruebas unitarias (Vitest). Todas las constantes de mecánicas (XP, niveles, ligas, dificultad) viven en `src/engine/config.ts`.
- Los datos viven en el navegador (Dexie/IndexedDB) y la app funciona completa sin red. La única salida permitida será la sincronización opcional con el relay propio de Carlo en su VPS (HTTPS + token por dispositivo, desde la v1.1; ADR-025). Sin telemetría, CDNs ni servicios de terceros. Toda migración de Dexie lleva prueba.
- El runner de C compila con `gcc` solo si `CORTEX_LOCAL=1` y el host es `localhost`, con directorio temporal, `timeout` y límite de salida (ver ADR-005). Nunca lo expongas fuera de local: la build del iPad (PWA) lo excluye y jamás se despliega en el VPS.
- Teclado primero en la Mac; lápiz y toque primero en el iPad (todo atajo tiene botón visible, objetivos ≥ 44 pt). Retroalimentación < 100 ms, respetar `prefers-reduced-motion`, sonido apagado por defecto.
- Antes de añadir una dependencia: ¿ya hay una en el stack de `docs/02`? Si no, justifica y registra un ADR en `docs/adrs.md` (con su línea en las decisiones de `ESTADO.md`).

## Equipo de agentes (detalle en `docs/08`)
- Abre Claude Code en `cortex/`: ahí viven `.claude/agents/`, `.claude/commands/`, `.claude/hooks/` y `.mcp.json`.
- Los agentes se invocan **solo por nombre** desde los comandos. Ninguno lanza otros agentes: orquesta la sesión principal.
- **Un solo escritor a la vez**, en sus rutas propias; los asesores (solo lectura) pueden correr en paralelo. `/equipo` revisa el alcance del diff.
- Solo la sesión principal toca `ESTADO.md`, `docs/`, `CLAUDE.md`, `.claude/`, `.mcp.json` y `pnpm-lock.yaml`, y solo ella hace commit (sin push).
- `experto-ciberseguridad` es guardián: su **bloqueo** detiene el paso hasta arreglarlo o que Carlo acepte el riesgo en un ADR.
- Claude nunca escribe tokens ni credenciales; los cambios en el VPS los ejecuta Carlo.
- El coach solo lee y escribe en `diario/`; nunca abras un respaldo crudo para él.

## Gamificación (resumen; detalle en `docs/03`)
Se premia **aprender** (recuperar, espaciar, esforzarse), no el tiempo en pantalla. Recompensas variables con probabilidades visibles. Rachas con perdón y sin mensajes de culpa. Siempre se debe poder parar tras cumplir la meta del día sin castigo. Nada de compras ni ventajas pagadas.

## Idioma
- Interfaz, contenido, docs y mensajes de commit: **español** (México), tono directo y cercano, sin relleno.
- Identificadores de código (variables, funciones, tipos): **inglés**.

## Qué NO hacer
- No inventes respuestas, fórmulas, cifras ni fuentes. Si dudas, verifica con código o pregunta.
- No tomes decisiones de producto grandes sin consultarlas (anótalas en "Decisiones pendientes" de `ESTADO.md`).
- No toques `content/` ya verificado sin volver a correr `pnpm content:check`.
- No agregues IA en tiempo de ejecución a la app (ni tutor ni reconocimiento de escritura en la nube): está fuera de alcance (ver `docs/00`). La IA vive en el equipo de agentes (`.claude/agents/`) y en el coach, que solo ve agregados por el MCP de Cortex (ADR-024, ADR-026).
- No hagas cambios destructivos (borrar datos de usuario, reescribir historia de git) sin pedir confirmación.

## Comandos útiles
- `pnpm content:check [ruta]` · verificar contenido completo (Zod + MDX/KaTeX + paridad YAML + `verify_content.py`)
- `python scripts/verify_content.py [ruta]` · solo la corrección de respuestas
- Slash commands en `.claude/commands/`: `/fase`, `/consejo`, `/equipo`, `/nueva-unidad`, `/revisar-contenido`, `/verificar`, `/cerrar-fase`, `/coach`
- `pnpm mcp:cortex` · el MCP del coach (registrado en `.mcp.json`; lo arranca Claude Code)
- Proyecto Next.js: `pnpm dev`, `pnpm check` (lint + typecheck + test + test:content), `pnpm test:e2e` (Playwright), `pnpm build`
