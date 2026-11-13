# 01 · Roadmap por fases

Cada fase termina con la app **funcionando y usable**. Una fase no se cierra hasta cumplir su Definición de Hecho (DoH) y la checklist común de abajo.

## Checklist común de cierre (todas las fases)

- [ ] `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde
- [ ] `python scripts/verify_content.py` en verde
- [ ] Flujo principal probado a mano (y con Playwright cuando aplique)
- [ ] `ESTADO.md` actualizado (checklist, decisiones, bitácora)
- [ ] Commit con mensaje claro; etiqueta git `fase-N`
- [ ] Carlo hizo una sesión real de ~20 min y anotó qué se sintió aburrido o confuso
- [ ] Si la fase tocó la UI: probado en el iPad real (desde la Fase 3.5)
- [ ] Si tocó una superficie de seguridad: revisión de `experto-ciberseguridad` sin bloqueos

## Orden de materias (ajustable)

Carlo pidió empezar por **bases duras, fundamentos económicos y fundamentos de programación**. Orden propuesto:

| Fase | Contenido | Por qué en este lugar |
|---|---|---|
| 0 | Fundaciones técnicas | Todo se apoya aquí |
| 1 | Motor de aprendizaje + gamificación + unidad piloto | Sin enganche no hay hábito |
| 2 | Fundamentos de programación (Python + C) | Retroalimentación rápida, ancla la identidad de builder, y se reutiliza en las demás fases |
| 3 | Cálculo + Matemáticas discretas | Primeras bases duras. Tras el CP1, el **sprint del parcial** escribe primero las unidades del próximo examen real |
| 3.5 | v1.1 · iPad (PWA), Pizarra, Sync y coach vivo | Lleva el lápiz al iPad y une el progreso Mac ↔ iPad; entra después del sprint del parcial |
| 4 | Mecánica y electromagnetismo | Es de 1er semestre y cuesta; necesita Cálculo (va justo después) |
| 5 | Fundamentos económicos | Respiro conceptual y casos reales entre materias pesadas |
| 6 | Álgebra lineal | Base de ML |
| 7 | Cálculo multivariable | Gradientes y optimización |
| 8 | Ecuaciones diferenciales | Modelado y simulación |
| 9 | Probabilidad y estadística + Matemáticas avanzadas para la ingeniería | Cierra las bases duras |
| 10 | Gimnasio cognitivo completo | Expande lo mínimo entregado en la fase 1 |
| 11+ | Resto del plan, semestre por semestre | Backlog guiado por datos |

"Bases duras" = Matemáticas discretas, Cálculo, **Mecánica y electromagnetismo**, Álgebra lineal, Cálculo multivariable, Ecuaciones diferenciales, Probabilidad y estadística y Matemáticas avanzadas. Decisión de Carlo (2026-10-01): Mecánica y electromagnetismo entra pronto, como Fase 4; el resto conserva el orden propuesto.

---

## Fase 0 · Fundaciones

**Entregables**
- Proyecto Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui; pnpm; ESLint; Vitest; Playwright (solo un smoke test).
- Loader de contenido: lee `content/**` (MDX, YAML), lo valida con Zod según `05-formato-contenido.md` y construye un índice en build time.
- Soporte de matemáticas en MDX (remark-math + rehype-katex).
- Capa de datos local: Dexie (IndexedDB) con las tablas de `02-arquitectura.md`; exportar/importar respaldo JSON.
- Sistema visual base: tema oscuro primero, tokens, tipografía, componentes de HUD (barra de XP, racha, vidas).
- Pantalla de inicio que lista las materias desde `curriculum/plan-2020.json` y marca cuáles tienen contenido.
- Script `pnpm content:check` que corre validación Zod + `verify_content.py`.

**DoH:** `pnpm dev` muestra el inicio con las materias; el contenido de ejemplo se carga sin errores; se puede exportar e importar un respaldo.

## Fase 1 · Motor de aprendizaje

**Entregables**
- Reproductor de sesión: lección → práctica → jefe, con teclado como ruta principal.
- Renderers para todos los tipos de ejercicio excepto `codigo` (llega en la Fase 2): opción múltiple, numérico, simbólico, completar, ordenar, predecir salida (solo mostrar y comparar texto), autoevaluación.
- Verificación de respuestas: tolerancia numérica; equivalencia simbólica por evaluación en puntos aleatorios; entrada de fórmulas con MathLive.
- Repaso espaciado con FSRS (`ts-fsrs`), cola diaria, tarjetas generadas desde los ejercicios.
- Motor de gamificación completo según `03-gamificacion-y-enganche.md`: XP, niveles, rachas con congelamientos, misiones diarias, jefes con vidas y tiempo, fantasma, récords, liga personal, logros.
- Mapa de habilidades (grafo de conceptos con estados de dominio) por materia.
- Botón único "Empezar sesión de hoy" que arma repasos vencidos + 1 lección nueva + mini reto.
- Calibración de confianza (control de 3 niveles antes de revelar respuesta).
- Cuaderno de errores automático.
- Gimnasio cognitivo mínimo: 3 minijuegos (n-back, cálculo mental, secuencias lógicas).
- Unidad piloto jugable de punta a punta: `content/calculo/01-limites`.

**DoH:** Carlo puede completar la sesión diaria con la unidad piloto, ver XP, racha, fantasma y vencimientos de repaso; los motores (XP, FSRS wrapper, verificadores) tienen pruebas unitarias.

## Fase 2 · Fundamentos de programación (Python + C)

**Entregables de plataforma**
- Editor de código (CodeMirror 6).
- Ejecutor de Python en Web Worker con Pyodide, límite de tiempo y tests visibles/ocultos.
- Ejecutor de C: ruta API local que compila con `gcc` en directorio temporal con timeout, sin red, habilitada solo si `CORTEX_LOCAL=1` y host `localhost` (ver ADR-005).
- Mecánicas nuevas: *Debug Dojo* (encuentra el bug), problemas de Parsons (ordenar líneas de código), *Rastreo de memoria* para C (diagrama pila/heap paso a paso).

**Entregables de contenido (≈12 unidades, 15–25 ejercicios cada una, alineadas al programa sintético oficial)**
1. Variables, tipos y entrada/salida · 2. Condicionales · 3. Ciclos · 4. Funciones · 5. Arreglos y cadenas · 6. Apuntadores y memoria (C) · 7. Estructuras y diccionarios · 8. Archivos · 9. Recursión · 10. Pruebas y depuración · 11. Complejidad intuitiva · 12. Proyecto integrador (jefe final).

**DoH:** unidades 1–12 jugables, todas con jefe; todos los ejercicios de código pasan en el verificador contra su solución; el runner de C y el de Python tienen pruebas.

## Fase 3 · Cálculo + Matemáticas discretas

- **Cálculo:** límites, continuidad, derivadas (reglas, cadena, implícita), aplicaciones (optimización, razones relacionadas, aproximación lineal), integral definida e indefinida, Teorema Fundamental, técnicas de integración, aplicaciones de la integral. Alinear con el programa oficial.
- **Matemáticas discretas:** las 4 unidades del programa oficial: I lógica (equivalencias, inferencias y demostraciones, cuantificadores), II conjuntos (álgebra, cardinalidad, potencia y producto cartesiano), III enteros (divisibilidad, Euclides, inducción, sistemas de numeración) y IV estructuras discretas (álgebra booleana y Karnaugh, relaciones, orden y equivalencia, módulo n, grafos y árboles). En Cortex son 21 unidades. Conteo y recurrencias no están en el programa; entran al final como extra (unidades 22 y 23). Temario en `ESTADO.md`.
- Plataforma nueva: visualizaciones interactivas con Mafs (pendiente, secante→tangente, área bajo curva); simulador de tablas de verdad.
- **DoH:** ambas materias jugables con jefe por unidad y un jefe final cada una; simulacro de examen disponible.

### v1 · Equipo y coach (2026-11-10, antes del CP1)
Transversal de herramientas, no toca la app: equipo de 19 agentes (`docs/08`), comandos `/consejo`, `/equipo` y `/coach`, cercas de los agentes y el MCP de Cortex con métricas agregadas y KPIs institucionales (ADR-024 a ADR-026).

### Sprint del parcial de Cálculo (después del CP1)
Carlo tiene parcial de Cálculo en menos de 4 semanas. Antes de la Fase 3.5:
- **Temas y orden:** Carlo dice qué cubre el examen; el coach lee la fecha en Calendar, y `/consejo` (`experto-matematicas`, `pedagogo`, `cientifico-memoria`) ordena las unidades 00 a 09 según el examen y el tiempo disponible. Las 08 y 09 (Unidad IV) entraron el 2026-11-10 porque el 3.er parcial la cubre; la decisión y el orden están en `ESTADO.md`.
- **Por unidad:** `/nueva-unidad` → `pnpm content:check` → `/revisar-contenido`. Si faltan unidades previas, el `repaso_de` del jefe usa solo las que existen.
- **Cierre del ciclo:** simulacro unos días antes → parcial real → `/coach parcial calculo`, que registra la calificación y da el primer punto de calibración.

## Fase 3.5 · v1.1 · iPad (PWA), Pizarra, Sync y coach vivo
Se planea en detalle al arrancarla (modo plan + `/consejo`). Visión y catálogo de ideas en `docs/09`. Esqueleto:

**0. Deuda del sprint del parcial (antes del paso 1).** En las revisiones de las unidades 03 a 09 y del esquema de la 02 salieron arreglos que hoy el contenido esquiva desde el enunciado. Se pasaron aquí por decisión de Carlo el 2026-11-13. La lista detallada está en `ESTADO.md`, sección «Para la Fase 3.5 · deuda del sprint del parcial».
- **Entrada de respuestas** (`src/engine/answers/`):
  - `sen^(-1)` y `tan^(-1)` se leen como el recíproco, y `cos x^2` como $\cos(x)^2$, sin avisar;
  - con `\b` en los alias fallan las funciones pegadas a un número (`2sen(x)`);
  - el «−» tipográfico no se reconoce en los huecos, y los huecos de `completar` no aceptan ∞;
  - el separador de miles se lee mal;
  - faltan alias y funciones (`asec`, `acoth`, `ctg`…);
  - `±` en un `conjunto`;
  - la $y'$ implícita se compara fuera de la curva.
- **Verificador:** `verify_content.py` tiene que leer las respuestas igual que la app (alias y precedencia), y hay que documentar en `docs/07` las trampas de sympy (laterales de Piecewise y ramas de `integrate`).
- **Visuales y lección interactiva:**
  - etiqueta y fórmula ocultable en `grafica`;
  - funciones por partes;
  - huecos y saltos que hoy no se detectan;
  - `limite` con $e^{1/x}$;
  - un triángulo para la sustitución trigonométrica;
  - un `<Desvanecido>` que revele los pasos uno por uno.
- **Motor de práctica:** el ejemplo resuelto de `workedExampleFor` debe preferir el mismo tipo y el primer concepto, y no ofrecer uno más difícil que el ancla.

Este paso entra antes de los spikes porque el spike B (respuesta en el iPad) usa la misma entrada de respuestas. Cada arreglo va por `/equipo` con su prueba. Si cambia cómo se califica, hay que volver a correr `pnpm content:check` y `real-answers` sobre todo el contenido.

1. **VPS y build del iPad:**
   - VPS base: Caddy, TLS y firewall con 22, 80 y 443;
   - `pnpm build:pwa`, export estático **sin el runner de C** (`api/run-c` pasa a `route.local.ts`).
2. **Spikes en el iPad real**, y después **CP-A** de Carlo (go o no-go):
   - **A · tinta:** retraso de ~30 ms o menos respecto a Notas, 0 trazos perdidos en 100, sin marcas de palma en 5 min, nota de Carlo ≥ 4/5. La presión no cuenta (Pencil USB-C);
   - **B · respuesta:** Scribble vs MathLive con teclado virtual vs opciones;
   - **C · PWA:** instalación, modo avión y datos que sobreviven 8 días sin usarla.
3. **Eventos:**
   - registro de eventos con un reductor puro `applyEvent` (paso a paso = reconstrucción) y Dexie v3 con `uid` y la tabla `events`;
   - `progress.ts` sobre eventos y respaldo formato 2.

   Hoy hay estado no reproducible (cofre con azar real, misiones por dispositivo), así que el evento guarda el hecho.
4. **Tinta:**
   - códec puro y `<Pizarra>` web (Pointer Events, solo `pen` dibuja);
   - UI adaptada al iPad: botón para cada atajo, objetivos de al menos 44 pt, teclado virtual de MathLive;
   - manifiesto y service worker: nunca cachea `/api` ni la sync, y sin `skipWaiting` a media sesión;
   - la tinta aparece en `/cuaderno` y en la autopsia.
5. **Sync:** relay en el VPS (Node + `node:sqlite`, tokens con hash y revocables) y cliente de sync.
6. **Coach vivo:**
   - el MCP lee el relay;
   - herramienta `ink_page` (visión opt-in por petición);
   - KPIs como eventos con su pantalla;
   - catálogo de proyectos de la Ruta IA con nivel de rigor y el recomendador.
7. **Deploy** y simulacro de restauración. El guardián de seguridad revisa el relay, el MCP y el deploy.

**DoH:**
- Mac e iPad terminan con el mismo hash de progreso después de estudiar sin conexión en ambos.
- La tinta se ve en el cuaderno y el coach la lee si Carlo lo pide.
- Python funciona sin red en el iPad y C se salta con aviso.
- Revisión de seguridad aprobada, simulacro de restauración hecho y sesión real en los dos dispositivos.

**Después (sin fecha):** iPad nativo con Capacitor + PencilKit, cuando haya espacio para Xcode. Reutiliza la build estática, los eventos y el formato de la tinta.

## Pista paralela · Ruta de ingeniero en IA
A menor ritmo que las fases del plan IPN (p. ej. 1–2 sesiones por semana). Primer paso: una sesión de diseño con `/consejo` (`experto-ia`, `pedagogo`, `cientifico-memoria`, `linguista`) que proponga:
- módulos (ML, deep learning, apps con LLMs y evals, MLOps, lectura de papers en inglés técnico);
- proyectos como jefes, con pruebas y nivel de rigor R0–R4;
- prefijo de ids y ritmo.

Carlo lo aprueba. Mismo formato de contenido (`docs/05`) y la misma verificación.

## Fase 4 · Mecánica y electromagnetismo

- Temario **según el programa sintético oficial** (`curriculum/programas/mecanica-electromagnetismo.pdf`, todavía pendiente). Típicamente: cinemática, leyes de Newton, trabajo y energía, momento, electrostática, campo y potencial eléctrico, circuitos de corriente directa y magnetismo; no asumir sin verificar.
- Se apoya en Cálculo (Fase 3): derivadas para cinemática, integrales para trabajo y campos.
- Plataforma nueva (propuesta, se confirma al planear la fase): visuales de vectores, diagramas de cuerpo libre y simulaciones simples (proyectil, carga en un campo).
- Regla de unidades: toda respuesta numérica declara sus unidades y se verifica con código.
- **DoH:** materia jugable con jefe por unidad y jefe final; ejercicios cuantitativos verificados con código.

## Fase 5 · Fundamentos económicos

- Escasez y costo de oportunidad, oferta y demanda, elasticidad, equilibrio, excedentes, estructuras de mercado, costos e ingresos marginales, PIB, inflación, desempleo, política monetaria y fiscal, comercio internacional.
- Simuladores: curvas de oferta/demanda arrastrables, calculadora de elasticidad, tablero macro con series de ejemplo.
- Regla de datos reales: cualquier cifra de México o del mundo lleva fuente y fecha en el ejercicio; si no se puede verificar, se usa un caso hipotético y se marca como tal.
- **DoH:** materia jugable; todos los ejercicios cuantitativos verificados con código.

## Fase 6 · Álgebra lineal
Sistemas de ecuaciones, matrices y determinantes, espacios vectoriales, transformaciones lineales, valores y vectores propios, ortogonalidad y mínimos cuadrados, descomposiciones (con SVD como puente a ML). Visual interactivo de transformaciones 2D (arrastrar la base). Ejercicios con NumPy vía Pyodide.

## Fase 7 · Cálculo multivariable
Funciones de varias variables, derivadas parciales, gradiente (y su conexión directa con descenso de gradiente), regla de la cadena multivariable, optimización con y sin restricciones, integrales múltiples, campos vectoriales y teoremas integrales según programa.

## Fase 8 · Ecuaciones diferenciales
Primer orden (separables, lineales, exactas), modelado, segundo orden, transformada de Laplace, sistemas lineales, métodos numéricos (Euler, RK4) con simulaciones en Python.

## Fase 9 · Probabilidad y estadística + Matemáticas avanzadas para la ingeniería
Probabilidad, variables aleatorias, distribuciones, esperanza y varianza, inferencia, regresión. Matemáticas avanzadas **según programa sintético oficial** (típicamente análisis de Fourier, variable compleja o similares; no asumir sin verificar).

## Fase 10 · Gimnasio cognitivo completo
Ver `06-gimnasio-cognitivo.md`: memoria, lógica, cálculo mental, pensamiento sistémico/creativo; dificultad adaptativa; perfil cognitivo semanal.

## Fase 11+ · Resto del plan
Una materia = datos + contenido, sin cambios de plataforma salvo mecánicas nuevas. Orden sugerido: Algoritmos y estructuras de datos → Análisis y diseño de algoritmos → Fundamentos de IA → Aprendizaje de máquina → Redes neuronales → Visión artificial / Lenguaje natural → el resto por semestre. Proponer el orden con Carlo antes de arrancar.

## Transversales (se entregan cuando su fase los necesite)
- Simulacros de examen cronometrados por materia.
- PWA y uso offline → pasó a la Fase 3.5.
- Estadísticas semanales y "tú de hace 30 días" (re-aplicar el diagnóstico).
- Respaldo automático con File System Access API (solo en la Mac: Safari en iPad no la tiene; ahí el relay cumple esa función).
