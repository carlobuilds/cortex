---
description: Ejecuta un paso de la fase con el equipo — el dev dueño implementa, se verifica, se revisa y se hace commit
argument-hint: <paso del plan de la fase actual>
---

Ejecuta con el equipo el paso: **$ARGUMENTS**

1. **Contexto.** Lee `ESTADO.md` y el plan aprobado de la fase. Confirma en 2 líneas qué entrega el paso y cómo se verifica. Si el paso no está en el plan aprobado, detente y pregúntale a Carlo.

2. **Dueño por rutas** (un solo escritor a la vez):

   | Rutas | Dueño |
   |---|---|
   | `src/engine/**` | `dev-motor` |
   | `src/db/**`, `src/sync/**`, `relay/**`, `mcp/**` | `dev-sync` |
   | `src/components/ink/**`, manifiesto, service worker, `spikes/**` | `dev-ipad` |
   | el resto de `src/components/**`, `src/app/**`, `src/lib/**`, `e2e/**` | `dev-interfaz` |
   | `deploy/**`, `next.config.ts`, scripts de build | `dev-infra` |
   | `content/**` | `autor-contenido` (vía `/nueva-unidad`) |
   | `ESTADO.md`, `docs/`, `CLAUDE.md`, `.claude/`, `pnpm-lock.yaml` | la sesión principal |

   Si el paso cruza dueños, pártelo en subpasos secuenciales.

3. **Consejo previo** solo si el paso toca seguridad, datos de Carlo, mecánicas o temario: corre `/consejo` con el paso y espera la decisión de Carlo si hay bloqueo.

4. **Implementa.** Lanza al dev dueño con:
   - el paso;
   - los criterios de aceptación;
   - las rutas permitidas;
   - lo que decidió el consejo.

   Mientras escribe, nadie más escribe.

5. **Alcance.** Corre `git status --short` y `git diff --name-only`. Todo archivo fuera de las rutas del dueño se le regresa para que lo explique o lo deshaga. Nunca descartes cambios de Carlo sin preguntarle.

6. **Verifica** con `/verificar` (lo que aplique: `pnpm check`, `pnpm content:check`, `pnpm test:e2e`). Si algo falla, el dev lo arregla y se repite este punto.

7. **Revisión:**
   - siempre `pr-review-toolkit:code-reviewer` sobre el diff;
   - si toca datos, sync o MCP, también `pr-review-toolkit:silent-failure-hunter`;
   - si toca una superficie de seguridad, `experto-ciberseguridad`, cuyo **bloqueo** detiene el commit.

   Corre en paralelo las revisiones independientes.

8. **Cierra:**
   - actualiza la checklist y la bitácora de `ESTADO.md`;
   - haz commit con mensaje en español (`feat:`, `fix:`, `docs:`, `content:`, `test:`), sin push;
   - resume en 3 líneas qué quedó, qué falta y qué debe probar Carlo (sobre todo lo que solo se ve en el iPad real).
