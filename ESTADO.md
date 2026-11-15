# ESTADO · Tablero vivo de Cortex

**Fase actual:** 3 · Cálculo + Matemáticas discretas, en curso en la rama `fase-3-calculo-discretas` (plan aprobado por Carlo el 2026-10-13). Las Fases 0, 1 y 2 están implementadas y verificadas; sigue pendiente su cierre formal: sesión real de Carlo de ~20 min por fase, `/cerrar-fase` y etiquetas `fase-0`, `fase-1`, `fase-2` (no bloquea la Fase 3). **Orden acordado el 2026-11-10:** v1 (equipo y coach, hecho) → CP1 → sprint del parcial de Cálculo → Fase 3.5 (v1.1: iPad PWA, pizarra, sync y coach vivo) → resto de Cálculo y Discretas.
**Última actualización:** 2026-11-10 · **v1 · Equipo y coach** hecho: 19 agentes en `.claude/agents/` (`docs/08`), comandos `/consejo`, `/equipo` y `/coach`, cercas probadas en `.claude/hooks/` y el MCP de Cortex (`mcp/cortex/`) con métricas agregadas, perfil de habilidades, resultados institucionales y calibración (ADR-024 a ADR-026). Aporte de Carlo nuevo: `weeklyVerdict` en `src/engine/coach-metrics.ts`. Sigue el **CP1** de Carlo (probar `/estilo`, la lección de límites con su visual y un simulacro de Programación) y luego el **sprint del parcial**: Carlo tiene parcial de Cálculo en menos de 4 semanas. Siguen pendientes los aportes de la Fase 3 (convención de la tabla de verdad en `src/engine/logic/convention.ts` y reglas del simulacro en `CONFIG.exam`) y los tres opcionales del rediseño marcados `TODO(Carlo)`. Fase 3: la plataforma está completa (pasos 1 a 6: visuales, lógica y grafos, respuestas ampliadas, tipos nuevos y simulacro de examen).

## Decisiones tomadas (Carlo, 2026-10-01)
- Plataforma: **web app** (Next.js).
- Uso: **solo Carlo, local-first** (sin cuentas ni backend). *Revisada por ADR-025 (2026-11-10): desde la v1.1 hay un relay de sync propio en el VPS de Carlo.*
- Contenido: **todo pre-escrito**, sin IA en tiempo de ejecución.
- Enganche: **rachas y XP, jefes y retos, repaso espaciado, competir contra sí mismo**.
- Gimnasio cognitivo: **memoria y retención, razonamiento lógico, cálculo mental y velocidad, pensamiento sistémico y creativo**.
- Lenguajes de práctica en Fundamentos de programación: **Python y C**.
- Materias para empezar: **bases duras, fundamentos económicos y fundamentos de programación**.

## Decisiones tomadas (Carlo, 2026-10-01, primer prompt)
- Nombre: **Cortex, definitivo**. El id interno `APP_ID = 'cortex'` no cambia nunca (ver `docs/00`).
- Tiempo diario: **15–25 min** (lo usa la Fase 1 en `src/engine/config.ts`).
- "Bases duras" incluye **Mecánica y electromagnetismo**, y entra pronto: **Fase 4**, justo después de Cálculo + Discretas. Las fases siguientes se recorren una (ver `docs/01`).
- Orden de fases de contenido: **el de `docs/01`**, con el ajuste anterior.
- Materias que más cuestan: **Cálculo, Matemáticas discretas, Mecánica y electromagnetismo, Fundamentos de programación**. Semestre: se asume 1º (no indicó otro).
- Plan de la Fase 0 aprobado tal cual, con sus decisiones técnicas D1–D8:
  - D1: tablas y campos de Dexie en inglés, con equivalencias en `docs/02`.
  - D2: corregir los docs que se contradicen (Node, `docs/00`, `docs/02`, `docs/05`).
  - D3: el flujo de contenido usa `pnpm content:check` (incluye `verify_content.py`); se cambia en `CLAUDE.md` y los comandos cuando exista (paso 7).
  - D4: `agentRules: false` para que `next dev` no reescriba `CLAUDE.md`.
  - D5: se acepta el GET anónimo de `next dev` a registry.npmjs.org (revisión de versión, solo en desarrollo).
  - D6: componentes de lección provisionales sin estado en la Fase 0.
  - D7: importar un respaldo = reemplazo total atómico tras confirmar.
  - D8: tokens de modo claro definidos ahora; el interruptor llega en la Fase 1.

## Decisiones de la Fase 1 que tomó Claude (revisables por Carlo)
Carlo pidió el 2026-10-02 dejar listas las Fases 1 y 2 sin pausas; estas interpretaciones caben en los rangos de `docs/03` y se afinan en `src/engine/config.ts` tras la sesión real:
- Las preguntas del jefe no dan XP sueltas: la recompensa llega al aprobar (completa la 1.ª vez, 10 % después) + 25 si le ganas al fantasma. Perder no quita XP.
- Mini quiz de lección: 5 preguntas fáciles (con 4, el 80 % exigía 100 %).
- Misión mínima "1 repaso completo" = vaciar la cola del calentamiento con al menos 1 tarjeta. Doble misión para reparar = 6 aciertos (o repaso completo + 3).
- Modo sano: tras 90 min activos en el día, ya no suma XP ni racha y lo avisa.
- Cosméticos: títulos por nivel y marcos del HUD (del cofre); el tema claro es preferencia, no premio.
- Un récord que crece mientras lo rompes (XP del día/semana, aciertos seguidos) se celebra una vez por periodo.
- Los tipos que no se pueden jugar se omiten de práctica, repaso y jefes (desde la Fase 2 se juegan los 11; si el runner de C no está activo, los ejercicios de C se saltan con aviso).

## Decisiones de la Fase 2 que tomó Claude (revisables por Carlo)
- Temario de las 12 unidades de programación propuesto por Claude (`content/programacion/conceptos.yaml`) mientras no esté el programa sintético oficial: todas las lecciones llevan `programa_ref: "pendiente"` y se realinean cuando Carlo lo ponga en `curriculum/programas/`.
- Python y C lado a lado en cada unidad (Python para la idea, C para la memoria); la unidad 6 (apuntadores) y los rastreos de pila/heap son solo de C.
- Los ejercicios de código (`codigo`, `depurar`, `parsons`, `rastreo_memoria`) no entran al mini quiz de la lección (que es de calentamiento); sí a práctica, repaso y jefes.
- Debug Dojo: primero eliges la línea con el error (sin costo si fallas, te lo dice) y luego corriges; se califica con las pruebas, no con el texto.
- Parsons: vale el orden exacto o cualquier otro que pase todas las pruebas; en Python la sangría cuenta.
- Jefes: ~30 % de las preguntas son repaso de unidades anteriores (dificultad 2–4, como mucho un ejercicio largo de código), elegidas por `scripts/fill-boss-review.py` de forma reproducible. El de la unidad 12 se anuncia como jefe final de la materia.
- Límites de ejecución: 6 s por corrida en Python (se reinicia el worker), 3 s y 64 KB de salida en C.

## Decisiones tomadas (Carlo, 2026-10-03 · rediseño de interfaz)
Carlo pidió mejorar la UI/UX con Stitch (proyecto "Cortex — Rediseño", `projects/5107797018426403734`): diseño en Stitch → su visto bueno en 3 puntos de control → código en la rama `rediseno-ui`.
- Alcance: navegación y shell, Inicio, lección y flujo de estudio, mapa de maestría, estados y consistencia.
- **Dirección visual nueva** (reemplaza ADR-016): "Arcano", híbrido consola pro (Linear/Raycast) × juego premium. Acento violeta, glow **sutil** solo en lo que se gana o se vive; el jefe con barra de vida segmentada. En sus palabras: "no un libro, sino conciso e interactivo; densidad solo donde deba ir información".
- Tema: **sigue al sistema** (`prefers-color-scheme`) con selector rápido en el header; ambos temas pasan AA.
- Prioridad: escritorio (teclado primero); el móvil debe funcionar bien.
- Rutas de estudio (quiz, práctica, jefe, sesión) con **header de foco**: migas + "Salir Esc" en lugar de la nav; el HUD se queda.
- **Paleta de comandos ⌘K** sin dependencias nuevas.
- Los textos de los mockups de Stitch son solo referencia: en la app todo texto sale de los datos reales.

## Decisiones tomadas (Carlo, 2026-10-13 · plan de la Fase 3)
Carlo aprobó el plan de la Fase 3 con estas tres decisiones, que el plan proponía por defecto:
- **Programas oficiales como puerta:** la plataforma (pasos 1–6) va primero porque no depende del temario. Antes de escribir Cálculo debe existir `curriculum/programas/calculo.pdf`, y antes de Discretas, `matematicas-discretas.pdf`; si no están, Claude se detiene y pregunta. Motivo: los números de unidad son permanentes (el id `calc-03-007` lleva el `03` de su carpeta), así que el temario no se puede corregir renumerando.
- **Orden:** Cálculo primero (ya tiene piloto y la Fase 4 depende de él), luego Matemáticas discretas.
- **Ritmo:** un solo plan con tres puntos de control de Carlo: CP1 plataforma, CP2 Cálculo, CP3 Discretas.

## Decisiones tomadas (Carlo, 2026-11-10 · temario de Cálculo)
Carlo aprobó el temario alineado con `curriculum/programas/calculo.pdf` (IIA, plan 2020). Reemplaza el temario propuesto en el plan de la fase:
- **00 funciones** (Unidad I oficial) va **antes** del piloto: el `01` ya es `01-limites` y sus ids son permanentes. La interfaz dirá «Unidad 00».
- 01 límites (II, 2.1 a 2.3; ya existe) · 02 continuidad y asíntotas (II, 2.3.1 y 2.4) · 03 la derivada (III, 3.1) · 04 reglas de derivación (III, 3.2.1) · 05 cadena, implícita y orden superior (III, 3.2.2 a 3.2.4) · 06 razones relacionadas y diferencial (III, 3.3 y 3.4) · 07 máximos, mínimos, gráficas y optimización (III, 3.5) · 08 antiderivadas, sustitución y por partes (IV, 4.1 a 4.3) · 09 trigonométricas, sustitución trigonométrica y fracciones parciales (IV, 4.4 y 4.5) · 10 integral definida, Teorema Fundamental e integración numérica (V, 5.1 y 5.2) · 11 aplicaciones de la integral (V, 5.3; jefe final).
- Como en el programa, todas las técnicas de integración van antes de la integral definida.
- **Logaritmos siempre con base:** en lo que ve y escribe el estudiante (enunciados, opciones, pistas, explicaciones, lecciones y respuestas oficiales) nunca va `log` solo: se escribe `ln`, `log10`, `log2` o `log(x, b)`, salvo en notación asintótica ($O(\log n)$), donde la base no importa. Motivo: la app y sympy leen `log` como logaritmo natural, pero en clase y en Stewart `log x` es base 10. No cambia código; la regla está en `docs/05` y en la `notacion` de Cálculo.

## Decisiones tomadas (Carlo, 2026-11-13 · temario de Discretas)
Puerta de temario del paso 9, en la sesión de Discretas (worktree `discretas-857e48`, rama `claude/discretas-857e48`), contra `curriculum/programas/matematicas-discretas.pdf` (sin versionar). `/consejo` con `experto-matematicas`, `pedagogo` y `arquitecto-razonamiento`: los tres «aprobado con cambios».
- **Temario: 21 unidades + 2 extra** (`content/matematicas-discretas/conceptos.yaml`, 132 conceptos). Entre paréntesis, la sección del programa:
  - **I Lógica:** 01 proposiciones (1.1.1) · 02 equivalencias, álgebra y variantes de la condicional (1.1.2 a 1.1.4) · 03 inferencias y demostración directa (1.2.1) · 04 demostración condicional e indirecta (1.2.2) · 05 predicados y cuantificadores (1.3.1 y 1.3.2) · 06 inferencias con cuantificadores (1.3.3).
  - **II Conjuntos:** 07 conjuntos (2.1) · 08 cardinalidad, potencia y producto cartesiano (2.2 y 2.3).
  - **III Enteros:** 09 divisibilidad (3.1, 3.2.1 y 3.2.2) · 10 mcd, Euclides, Bézout y TFA (3.2.3 a 3.2.5) · 11 inducción (3.3) · 12 sistemas de numeración (3.4).
  - **IV Estructuras discretas:** 13 álgebra booleana (4.1.1 a 4.1.3) · 14 circuitos y Karnaugh (4.1.4 y 4.1.5) · 15 relaciones y funciones (4.2.1 a 4.2.3) · 16 propiedades y orden (4.2.4, 4.3.1 y 4.3.2) · 17 equivalencia (4.3.3 y 4.3.4) · 18 módulo n (4.4) · 19 grafos, Euler y Hamilton (4.5.1 y 4.5.2) · 20 BFS, DFS y Dijkstra (4.5.3 y 4.5.4) · 21 árboles binarios (4.5.5; jefe final del programa).
  - **Extra, fuera del programa** (Carlo los quiso al final): 22 conteo y combinatoria · 23 recurrencias. El programa no los trae, aunque `docs/01` los mencionaba.
- **Cómo se cortó:** nada de fusiones, porque con 3 ejercicios por concepto y un tope de 25 caben unas 8 ideas por unidad. Carlo eligió 21 sobre las 19 de `experto-matematicas`: relaciones y grafos van en tres unidades cada uno. La contrapositiva va a la 02 porque se justifica con ≡. La demostración directa cierra la 03, y la 04 enseña un solo esquema: «supón, deriva, descarga». Las inferencias con cuantificadores (práctica oficial 1) tienen unidad propia.
- **Se agrega al programa, avisado:** Euclides extendido y Bézout (los necesitan el inverso módulo n y la unicidad del TFA), inducción fuerte (un concepto) y cuantificadores anidados (los usan inyectiva y suprayectiva).
- **Notación** (la línea completa está en `notacion`):
  - S∘R = «primero R, luego S», como g∘f. Carlo pidió «la más común»; es la de Rosen.
  - ⊆ y ⊊, nunca ⊂; ℕ incluye el 0 y ℤ⁺ no.
  - Reglas de inferencia con abreviatura (MP, MT, SH, SD…).
  - Álgebra booleana con +, · y x̄; sus tablas van en 0/1 desde 000.
  - Grafos: camino, recorrido, trayectoria, circuito y ciclo, cada uno con su significado.
- **3.er parcial de Discretas:** Unidad IV, semana del 23 al 27 de noviembre de 2026, la misma del de Cálculo.
  - Se escriben las 9 unidades de la IV **en el orden del programa** (13 → 21), una tras otra, con el visto bueno de Carlo al esquema y a los arreglos de cada una.
  - A fondo solo se estudian 3 o 4 (de la 13 a la 16); las demás sirven para práctica y simulacro.
  - Las 01–12, 22 y 23 van después del parcial.
- **Mientras falten las unidades I a III:**
  - cada lección de la IV recuerda en pocas líneas lo previo: las leyes de la lógica para la 13, el producto cartesiano para la 15 y Euclides extendido para la 18;
  - el mapa de maestría mostrará bloqueados esos prerrequisitos, el mismo síntoma que con la 00 y la 02 de Cálculo.
- **Huecos de la plataforma.** El contenido los esquiva; son propuestas para `/equipo` después del parcial, junto a la deuda de la Fase 3.5:
  - **Tabla de verdad:** la convención es una sola para toda la app (`convention.ts`), así que no puede ser V/F para la lógica y 0/1 desde 000 para el álgebra booleana. La 13 y la 14 no usan `tabla_verdad`: las tablas van en la lección y las respuestas son un conjunto de índices de minitérminos, un número o una opción.
  - **Gramática de fórmulas:** no lee `+`, `·`, `x̄` ni la yuxtaposición, y lee `^` como ∧ (`formula.ts:50`), cuando en C y en Python es XOR.
  - **`conjunto`:** no acepta conjuntos de conjuntos (`sets.ts:60`). No sirve para 𝒫(A), el conjunto cociente ni las particiones.
  - **Visual `grafo`:** dibuja en círculo y sin pesos. Falta uno por niveles (Hasse y árboles binarios) y uno con pesos (Dijkstra).
  - **`ordenar`:** no se verifica por código (`verify_content.py:660`) y acepta un solo orden. Los órdenes de visita van como `completar` con `verificar.python`.
  - **Tipos nuevos que propone `arquitecto-razonamiento`:**
    - `derivacion`: bloques con grafo de dependencias, donde cuenta cualquier orden válido;
    - `justificar`: la regla se elige de un menú y las líneas se dan como números;
    - `formula`: comparar por equivalencia lógica con el parser de `src/engine/logic/`;
    - `testigo`: acepta cualquier valor que cumpla un predicado.
  - **Jefe final:** la app anuncia así al jefe de la última unidad que exista (`boss-runner.tsx:71`). Mientras se escribe la IV será la última escrita, y cuando existan las extra será la 23, no la 21.
  - **Sigue pendiente de Carlo:** la convención de la tabla de verdad de su clase (`TODO(Carlo)` en `convention.ts`).

## Decisiones tomadas (Carlo, 2026-11-10 · equipo, coach, KPIs, iPad y sync)
Brainstorm con Claude en modo plan; plan aprobado el mismo día.
- **Equipo de agentes** (ADR-024): subagentes de Claude Code que asesoran y desarrollan, **todos en Opus**, invocados solo por nombre, en **un solo worktree** (un escritor a la vez). La app sigue **sin IA en tiempo de ejecución**.
- **Dominios del equipo:**
  - pedagogía y entrenamientos;
  - retención;
  - esfuerzo y rendimiento cognitivo;
  - recompensas;
  - razonamiento y rigor formal;
  - lenguaje: psico y neurolingüística con evidencia (no PNL), inglés técnico, redacción en español, comunicación técnica, lenguajes formales y NLP;
  - interacción;
  - matemáticas;
  - IA;
  - finanzas: Fundamentos económicos, finanzas personales como educación, IA en finanzas y economía de la IA;
  - ciberseguridad: proteger Cortex, aprender ciberseguridad y seguridad de IA.
- **Coach:**
  - modos: revisión semanal, post-mortem de parciales reales y mentoría de carrera en IA, con proyectos según habilidades y rigor;
  - se conecta por **MCP**;
  - ve **solo agregados**, más Google Calendar en solo lectura. Sin Classroom: no hay conector y Carlo prefiere que no.
- **KPIs institucionales:** calificaciones reales capturadas a mano (sin automatizar el SAES) y calibradas contra los simulacros.
- **iPad + Apple Pencil:**
  - el iPad es para todo lo escrito a mano y la Mac para el código; hay un solo progreso entre los dos;
  - Pencil USB-C o 1.ª gen., sin presión ni hover;
  - **pizarra primero**, sin reconocer la letra en la app;
  - **v1.1 como PWA.** La vía nativa (Capacitor + PencilKit) queda fuera de v1.1 hasta que haya espacio para Xcode en la Mac.
- **Sync:** relay propio en el **VPS de Hostinger** de Carlo, **HTTPS + token por dispositivo**, sin E2EE (el VPS ve el progreso en claro; riesgo aceptado).
- **Alcance:** plan IPN **+ Ruta de ingeniero en IA en paralelo**, a ritmo menor.
- **Orden:** v1 (equipo y coach) → CP1 → **sprint del parcial de Cálculo** (examen en menos de 4 semanas) → Fase 3.5 = v1.1, todo junto → lo demás.

## Decisiones tomadas (Carlo, 2026-11-10 · sprint del parcial de Cálculo)
- **Examen:** 3.er parcial de Cálculo, **semana del 23 al 27 de noviembre de 2026** (no está en Google Calendar; la dio Carlo). Faltan unos 13 días.
- **Cobertura:** Unidades **I a IV** del programa oficial (funciones, límites y continuidad, la derivada e integral indefinida). En Cortex son las unidades 00 a 09; ya existe la 01.
- **Alcance:** el sprint se amplía de 00–07 a **00–09** (`docs/01`).
- **Orden de escritura:** derivada primero, por peso del examen: **03 → 04 → 05 → 07 → 06 → 08 → 09 → 02**. La **00 (funciones) queda fuera del sprint**. Así se resuelve el choque del `/consejo` (matemáticas y pedagogo contra memoria): `currentUnits` (`src/engine/session.ts:28`) solo recorre las unidades que existen, así que escribir fuera de orden no rompe la sesión diaria. Lo único que la desviaría es una 00 escrita, que mandaría a funciones antes que a límites.
- **Cuántas:** todas las del orden, una tras otra. Según `cientifico-memoria`, a fondo solo se estudian las 3 o 4 primeras: la última nueva en D−12 (≈ 11 a 15 de noviembre) y el simulacro en D−6 (≈ 17 a 21 de noviembre). Las demás sirven para práctica y para el simulacro.

## Decisiones pendientes (preguntar a Carlo)
- [ ] Programas sintéticos que faltan: programacion, mecanica-electromagnetismo, fundamentos-economicos (los de Cálculo y Discretas ya están; la carpeta oficial es `escom.ipn.mx/docs/oferta/uaIIA2020/`). Versionar o no los PDF: el `.gitignore` deja la decisión en Carlo; por ahora no se versionan.
- [ ] Confirmar el semestre actual (se asumió 1º; Carlo cursa Cálculo este semestre).
- [x] Sprint del parcial: temas, fecha y orden de escritura decididos por Carlo el 2026-11-10 (ver «Decisiones tomadas · sprint del parcial de Cálculo»).
- [ ] Unidad 00 (funciones): escribirla después del parcial, o antes como diagnóstico en papel si Carlo lo pide.
- [ ] Simulacro del parcial (propuesta de `pedagogo`, sin tocar código):
  - D−6 (≈ 17 nov): `/materias/calculo/simulacro` con las unidades 03–07.
  - D−5: la 01, la 02, la 08 y la 09.
  - En papel: las autoevaluaciones de cada unidad, con reloj y su rúbrica, porque el parcial califica el procedimiento.
  - D−2 o D−3: un simulacro completo, que es el que lee `calibration_report`.
  - Falta que Carlo lo confirme.
- [ ] Inversas de sech, csch y coth: el programa (1.3.4) no las excluye y la 05 no las cubre. arcsec, arccsc y arccot entraron solo en la tabla de la 05, con nota de convención (decisión de Carlo, 2026-11-12). Falta saber qué convención de rango usa su curso.
- [ ] Mientras no exista la 00, el mapa de maestría marca `regla-cadena`, `derivada-trig-inversa` y `derivada-hiperbolica-inversa` como bloqueados por `composicion-funciones`, `trigonometricas-inversas` y `hiperbolicas-inversas`. Es el mismo síntoma que con la 02.
- [ ] Mientras no exista la 02, el mapa de maestría muestra `derivabilidad-continuidad` como bloqueado por `continuidad-punto` (`src/engine/mastery.ts:59`). Solo es visual, pero confunde durante el sprint.
- [x] Arreglos de `01-limites` que propuso `/revisar-contenido`: Carlo los aprobó y se aplicaron el 2026-11-10 (ver bitácora).
- [ ] Pulido de `01-limites` que quedó fuera de esos arreglos: aceptar sinónimos en `completar` (p. ej. «divisor» por «factor» en 011) o dejar huecos de una sola respuesta; cerrar el gancho del auto con la velocidad de $s(t)=t^2$; la pista de 003, que casi regala la respuesta; 009 y 020 etiquetados como `0/0` aunque son $\infty-\infty$ e $\infty\cdot0$; `duracion_min: 25` con 4 ejemplos más.
- [ ] `weeklyVerdict` (aporte de Carlo): umbrales de semana «sólida», «para ajustar» y «de alerta».
- [ ] Niveles de rigor formal R0–R4 (propuesta de `arquitecto-razonamiento`): aprobarlos o ajustarlos antes del recomendador de proyectos.
- [ ] Ruta IA: módulos, prefijo de ids y ritmo (sesión de diseño con `/consejo`).
- [ ] Para la Fase 3.5: dominio o subdominio del VPS; si `fase-3-calculo-discretas` se fusiona a `main` antes; si la pizarra se activa por defecto en la Mac; cuánto tiempo se guarda la tinta; regla del cofre cuando dos dispositivos lo abren sin conexión.
- [ ] Vía nativa del iPad: espacio para Xcode y cuenta de Apple (gratis caduca cada 7 días; Developer Program 99 USD/año).

## Para la Fase 3.5 · deuda del sprint del parcial (motor, verificador y visuales)
Carlo decidió el 2026-11-13 pasar estas propuestas a la siguiente fase del plan (`docs/01`, Fase 3.5, antes del paso 1). Durante el sprint, el contenido las esquiva desde el enunciado. Cada arreglo va por `/equipo` con su prueba. Si un cambio afecta cómo se califica, hay que volver a correr `pnpm content:check` y `real-answers` sobre todo el contenido.
- [ ] Propuestas para el motor que salieron de la revisión de `03-derivada` (2026-11-11):
  - que un `simbolico` acepte el prefijo «y =» (hoy mathjs lo lee como asignación y la app responde con un mensaje confuso; la 03 lo esquiva en el enunciado);
  - que `asNumber` (`src/engine/answers/text.ts:20`) acepte el signo «−» tipográfico (U+2212), como ya hace `math.ts`: hoy un «−4» pegado en un hueco de `completar` se califica mal;
  - `workedExampleFor` (`src/engine/flow.ts:88`): además del ejemplo más cercano por debajo del nivel, preferir el mismo `tipo` (ya estaba propuesto en la bitácora del 2026-11-10). Además, `runners.tsx:215` puede servir justo el ejercicio cuya solución se acaba de mostrar (FSRS anota un acierto falso), y el comentario «ya visto si se puede» de `flow.ts:85` no se cumple.
- [ ] Propuestas de la revisión del esquema de `04-reglas-derivacion` (2026-11-11), para la entrada de respuestas:
  - **Importante para la 05:** `math.ts` lee `2x cos x^2` y `sec x^2` como $\cos(x)^2$ y $\sec(x)^2$, así que una respuesta correcta de regla de la cadena escrita sin paréntesis se califica mal **en silencio**. Mientras no se arregle, los enunciados de la 05 piden paréntesis (`cos(x^2)`).
  - `senx` y `senhx` son inválidos, aunque `sinx` y `cosx` pasan; faltan los alias `cosec`, `ctg` y `cotg`.
  - Con `\b` en `ALIASES` y en `/\bln\(/` (`math.ts:28-31` y `:73`), una función pegada a un número no se traduce: `2sen(x)`, `2senh(x)`, `2arcsen(x)` y `6ln(x)` salen inválidos (no cuentan como intento, pero el mensaje no sugiere el `*`). El arreglo probable es `(?<![A-Za-z_])`. Mientras tanto, la 04 pide «`*` entre un número y una función».
  - `workedExampleFor`: cuando hay empate de dificultad, preferir el ejercicio que contenga el primer concepto del fallado (propuesta de `pedagogo` en la revisión de la 04, con su prueba en `mechanics.test.ts`).
- [ ] Propuestas de la revisión del esquema de `05-cadena-implicita` (2026-11-12):
  - **Grave:** `sin^(-1)(x)` y `sen^(-1)(x)` se leen como $1/\operatorname{sen}x$ sin avisar (`math.ts:45` y `:72`), justo en la unidad que enseña que $\operatorname{sen}^{-1}=\operatorname{arcsen}$. Conviene rechazarlos con «¿quisiste decir arcsen(x)?». Mientras tanto, la 05 lo advierte en cada enunciado.
  - Faltan los alias `asen`, `argsenh`, `argcosh` y `argtanh`. `ln|x|` no funciona (choca con FN_NO_PARENS); hoy se escribe `ln(abs(x))`.
  - `parse_expr` de `verify_content.py` lee `arcsin`, `arcsen` y `arctan` como productos de letras, y `cos x^2` como $\cos(x^2)$, mientras la app lo lee como $\cos(x)^2$. Hay que alinearlo con los alias de la app.
  - Una $y'$ implícita se compara en puntos que no están sobre la curva (`symbolic.ts:41-48`), así que una respuesta correcta simplificada con la ecuación sale como distinta. Por eso la 05 pide derivar sin simplificar y la $y''$ va en un punto. A futuro: un modo de equivalencia «sobre la curva».
  - Que `content:check` exija `variables` en los `simbolico` que lleven `y`.
  - En un `conjunto`, un elemento con `±` (`(0, ±sqrt(3))`) se compara como texto y se califica mal sin aviso (`sets.ts:44-51`). Conviene un error explícito: «escribe cada punto por separado». La 05 lo advierte en el enunciado.
- [ ] Separador de miles (revisión de la 07, 2026-11-12): `evaluateNumber` (`math.ts:137-138`) lee «10,000» como 10 y lo califica como incorrecto, sin avisar. En México se escribe así, de modo que afecta a cualquier respuesta de 1000 o más. Propuesta: que `^\d{1,3}(,\d{3})+$` dé «inválido» con el mensaje «¿Es separador de miles? Escribe 10000». Mientras tanto, los enunciados lo advierten (07-014).
- [ ] Visual `grafica` en ejercicios (revisión del esquema de la 07, 2026-11-12): el pie siempre dice «Gráfica de $f(x)=$…» y muestra la fórmula (`visuals.ts:248-253`). Si se pregunta por $f'$, el pie lo contradice, y además regala la fórmula. Mientras tanto, la 07 llama $f$ a la función dibujada y $g$ a la incógnita ($g'=f$). Propuesta para el motor: un parámetro de etiqueta (`f'`) y uno para ocultar la fórmula. Es un cambio de código: va por `/equipo` (dev-interfaz o dev-motor), con su prueba y el ajuste en `docs/05`.
- [ ] Propuestas de la 08 y del esquema de la 09 (2026-11-12):
  - La app no tiene `asec`, `arcsec`, `arccsc`, `arccot` ni `acoth`, así que la 09 no puede pedir respuestas con arcsec. En su lugar usa formas con atan o ln, válidas en el intervalo más grande.
  - En un `numerico`, la frase «con el π de la calculadora, no 3.14» no se puede hacer cumplir si el error de usar 3.14 es menor que la tolerancia (08-019). Ahí se quitó la frase y la tolerancia bajó a 0.0005.
  - `workedExampleFor`: si falla un ancla y no hay otro ejercicio de d1 del mismo concepto, muestra uno más difícil. Por ejemplo, al fallar el 08-001 sale el 08-011, que es d3.
  - Un visual de triángulo rectángulo para la sustitución trigonométrica (no existe en `docs/05`). Es cambio de código: va por `/equipo`.
  - En `verify_content.py`, un `integrate` que devuelve Piecewise tiene que elegir la rama con un punto del intervalo; `.args[0][0]` puede tomar la equivocada. Conviene documentarlo en `docs/07`.
- [ ] Alinear `verify_content.py` con la app (revisión de la 05):
  - `parse_expr` de `verify_content.py` no conoce `sen`, `senh`, `e` ni `log10`: la `respuesta` oficial va en sintaxis de sympy (`sin`, `exp(x)`, `log(x, 10)`). Conviene alinearlo con los alias de la app.
- [ ] Propuestas de la revisión de la 09 y del esquema de la 02 (2026-11-12 y 2026-11-13):
  - `tan^(-1)` también se lee como $1/\tan$ sin avisar (`math.ts:45` y `:72`), igual que `sen^(-1)`. La 09 lo advierte en el cierre de cada `simbolico`.
  - En `completar`, ∞ en un hueco solo pasa si se escribe `oo` literal. `∞`, `inf` o `-∞` salen incorrectos sin aviso, y `verify_content.py` no lo detecta (`text.ts:19-23`). Propuesta: que `asNumber` acepte ∞. Mientras tanto, la 02 pide ∞ solo en `numerico`.
  - `numerico` acepta `1/0` y `10^400` como ∞.
  - Los visuales `grafica` y `limite` no dibujan funciones por partes (`math.ts:13-20`).
  - `grafica` solo detecta huecos en múltiplos de 1/2 del dominio y no ve saltos chicos.
  - `limite` con $e^{1/x}$ en 0 se desborda y dice «no se acerca a ningún valor».
  - `FadedInteractive` (`lesson-interactive.tsx:73`) muestra todos los pasos a la vez, así que un paso posterior puede regalar un hueco anterior. Propuesta: revelarlos uno por uno.
  - sympy 1.14: `limit(Piecewise, x, a, '-')` devuelve $f(a)$, y `limit` sin dirección calcula solo el lateral derecho. Hay que documentarlo en `docs/07`; mientras tanto, los laterales se verifican con $x=a\pm h$ y $h$ positivo.
- [ ] Contenido, después del sprint:
  - la regla de la 08 «en la segunda ronda usa el mismo tipo de $u$» no detecta el bucle del 09-023;
  - el 08-015 (códigos 1-2-3) convive en el repaso con el triaje de 6 preguntas de la 09. Hay que valorar con `cientifico-memoria` si confunde;
  - el pulido de `01-limites` que sigue en «Decisiones pendientes».

## Prefijos de ids de ejercicio
| Materia | Prefijo |
|---|---|
| calculo | `calc` |
| programacion | `prog` |
| matematicas-discretas | `disc` |
| fundamentos-economicos | `econ` |
| algebra-lineal | `alg` |
| calculo-multivariable | `cmv` |
| ecuaciones-diferenciales | `edo` |
| probabilidad-estadistica | `prob` |
| matematicas-avanzadas | `mav` |
| mecanica-electromagnetismo | `mec` |

## Fases

### Fase 0 · Fundaciones
- [x] Next.js + TS estricto + Tailwind + shadcn/ui + pnpm
- [x] ESLint, Vitest, Playwright (smoke)
- [x] Loader de contenido con Zod + índice en build
- [x] MDX con KaTeX
- [x] Capa Dexie + exportar/importar respaldo
- [x] Sistema visual base y componentes de HUD
- [x] Inicio con materias desde `plan-2020.json`
- [x] `pnpm content:check`

### Fase 1 · Motor de aprendizaje
Plan (2026-10-02, rama `fase-1-motor`): 1) motor puro en `src/engine/` con pruebas · 2) Dexie v2 (tabla `days`, perfil y tarjetas FSRS completas) con migración probada y respaldo v1→v2 · 3) capa de progreso (`recordAnswer` y compañía, una transacción) · 4) texto enriquecido de ejercicios y catálogo estático · 5) renderers + confianza + MathLive · 6) práctica, jefe y sesión del día · 7) lección interactiva, mapa, cuaderno, progreso y ajustes · 8) gimnasio · 9) piloto `calculo/01-limites` + e2e.
- [x] Reproductor de sesión (lección → práctica → jefe): `/sesion` (calentamiento → misión → reto → cierre, reanudable), `/materias/[m]/[u]/{quiz,practica,jefe}`
- [x] Renderers de ejercicios (sin `codigo`): opción múltiple, numérico, simbólico, completar, ordenar, predecir salida, autoevaluación
- [x] Verificadores de respuesta + MathLive (`src/engine/answers/`, mathjs `number` con lista blanca; MathLive con fuentes locales)
- [x] FSRS y cola de repaso (`src/engine/srs.ts`, `/repaso`; "ilusión de saber" primero)
- [x] Motor de gamificación (XP, niveles, rachas con congelamiento y reparación, misiones, cofres con probabilidades visibles, jefes con vidas/tiempo/oleadas, fantasma, récords, liga personal, logros)
- [x] Mapa de habilidades (`/materias/[m]/mapa`)
- [x] Botón "Empezar sesión de hoy" (panel "Hoy" del inicio)
- [x] Calibración de confianza (teclas 1/2/3 antes del resultado) y cuaderno de errores (`/cuaderno`)
- [x] Gimnasio mínimo (n-back, cálculo mental, secuencias; `/gimnasio`)
- [x] Unidad piloto `calculo/01-limites` jugable (21 ejercicios, revisión a ciegas de los 7 nuevos sin discrepancias)
- [ ] Cierre formal: sesión real de ~20 min de Carlo y etiqueta `fase-1` (pendiente de Carlo)

### Fase 2 · Fundamentos de programación (Python + C)
Plan (2026-10-02, rama `fase-2-programacion`): 1) CodeMirror 6 y Pyodide local (sin CDN) · 2) formato: tests `oculto`, tipos `depurar`, `parsons` y `rastreo_memoria` en Zod, `verify_content.py`, paridad y docs/05 · 3) runner de Python en Web Worker con límite de tiempo · 4) runner de C (ruta local con candados de ADR-005) · 5) renderers de código, Debug Dojo, Parsons y rastreo · 6) unidades 1–12 con jefes (`programa_ref: "pendiente"` hasta tener el PDF) y revisión a ciegas · 7) e2e y DoH.
- [x] Editor CodeMirror, runner Pyodide (local, Web Worker, límite de tiempo), runner C local (candados de ADR-005)
- [x] Debug Dojo, Parsons, Rastreo de memoria (formato, verificador independiente, interfaz) y tests ocultos
- [x] Unidades 1–12 con jefes: 236 ejercicios (79 de código, 24 Debug Dojo, 12 Parsons, 7 rastreos de memoria, 35 de predecir salida y 79 de otros tipos), 12 jefes con repaso entrelazado; revisión a ciegas sin discrepancias
- [ ] Cierre formal: sesión real de ~20 min de Carlo y etiqueta `fase-2` (pendiente de Carlo)

### Fase 3 · Cálculo + Matemáticas discretas
Plan (2026-10-13, rama `fase-3-calculo-discretas`): 0) rama y registro · 1) prueba de Mafs con criterios y ADR-021 · 2) `<Visual>` real con parámetros de texto y visuales de Cálculo (`grafica`, `limite`, `secante-tangente`, `riemann`) · 3) motor de lógica y simulador de tablas de verdad; dibujo de grafos · 4) respuestas: funciones nuevas en el evaluador, ∞, enteros exactos, `salvo_constante`, `muestreo`, `completar` verificable, `verificar.python` con enumeración, límite de tiempo en sympy y prueba de ida y vuelta de las respuestas oficiales · 5) tipos `tabla_verdad`, `conjunto`, `seleccion_multiple` y campo `visual` en ejercicios · 6) simulacro de examen · **CP1** · 7) puerta de temario de Cálculo · 8) Cálculo 02 en adelante · **CP2** · 9) Matemáticas discretas · **CP3** · 10) e2e, docs, ADR y cierre.
- [x] Prueba de Mafs y ADR-021 (aceptado con reglas de uso)
- [x] `<Visual>` real y visuales de Cálculo (`grafica`, `limite`, `secante-tangente`, `riemann`); la lección de límites ya lleva uno
- [x] Motor de lógica, simulador de tablas de verdad y dibujo de grafos (`<Visual id="tabla-verdad">` y `<Visual id="grafo">`)
- [x] Respuestas ampliadas y prueba de ida y vuelta (`src/content/real-answers.test.ts`)
- [x] Tipos `tabla_verdad`, `conjunto`, `seleccion_multiple` y `visual` en ejercicios (se juegan en `/estilo`; aún no hay contenido que los use)
- [x] Simulacro de examen (`/materias/[materia]/simulacro`; reglas iniciales en `CONFIG.exam`, pendientes de Carlo)
- [ ] **CP1 · Plataforma** (pendiente de Carlo): `pnpm check`, `pnpm build` y e2e en verde el 2026-11-10; falta que Carlo pruebe `/estilo`, la lección de límites con su visual y un simulacro de Programación
- [x] Puerta de temario de Cálculo (paso 7): programa oficial en `curriculum/programas/calculo.pdf`, temario aprobado por Carlo y `conceptos.yaml` completo (76 conceptos en 12 unidades)
- [ ] Cálculo: unidades 00 y 02 a 11 (la `01-limites` ya está completa como piloto de la Fase 1). Sprint del parcial, en orden 03 → 04 → 05 → 07 → 06 → 08 → 09 → 02:
  - [x] 03-derivada (2026-11-11)
  - [x] 04-reglas-derivacion (2026-11-11)
  - [x] 05-cadena-implicita (2026-11-12)
  - [x] 07-maximos-minimos (2026-11-12)
  - [x] 06-razones-diferencial (2026-11-12)
  - [x] 08-antiderivadas (2026-11-12)
  - [ ] 09 · [ ] 02
- [ ] Matemáticas discretas
  - [x] Puerta de temario (paso 9, 2026-11-13): el programa oficial en `curriculum/programas/matematicas-discretas.pdf`, el temario aprobado por Carlo y `conceptos.yaml` completo (132 conceptos en 23 unidades: 21 del programa y 2 extra)
  - [ ] Unidad IV para el 3.er parcial, en orden 13 → 21: [x] 13 (2026-11-13) · [x] 14 (2026-11-14) · [x] 15 (2026-11-14) · [x] 16 (2026-11-14) · [x] 17 (2026-11-14) · [ ] 18 · [ ] 19 · [ ] 20 · [ ] 21
  - [ ] Deuda: los jefes de la IV no tienen el 25–35 % de repaso de las unidades I–III, porque aún no existen. Cuando se escriban, se agrega sin cambiar ids.
  - [ ] Unidades 01 a 12, después del parcial
  - [ ] Extra: 22 conteo · 23 recurrencias
- [ ] Cierre formal: sesión real de ~20 min de Carlo y etiqueta `fase-3`

### v1 · Equipo y coach (2026-11-10)
- [x] 19 agentes en `.claude/agents/` (todos en Opus, solo por nombre, sin `Agent`) y `docs/08`
- [x] Cercas `cerca-ciega`, `cerca-coach` y `cerca-infra` (fallan cerradas; `tests/content/agent-hooks.test.ts`)
- [x] Comandos nuevos `/consejo`, `/equipo`, `/coach`; actualizados `/nueva-unidad`, `/revisar-contenido`, `/fase`, `/cerrar-fase`
- [x] MCP de Cortex (`mcp/cortex/`, `.mcp.json`) con 5 herramientas y prueba de privacidad con marcadores; `src/engine/coach-metrics.ts`, `skill-profile.ts`, `institutional.ts` con pruebas; el mapa de maestría usa `conceptEvidence` del motor
- [x] `.claude/launch.json` dentro de `cortex/`, para que las sesiones abiertas ahí levanten la vista previa (`cortex` en 3000 y `cortex-verificacion` en 3200)
- [x] El mapa de maestría con `conceptEvidence` del motor, probado en el navegador (puerto 3200): sin datos, todo «Sin ver»; tras acertar `calc-01-001`, «Límites por sustitución directa» pasa a «Vista» y lo demás sigue igual; sin errores de consola
- [x] Carlo decidió abrir sus sesiones en `cortex/` (no se enlazan los agentes a la carpeta de arriba)
- [x] Prueba con los agentes reales (2026-11-10, sesión del app movida a `cortex/`; detalle en la bitácora):
  - **Descubrimiento:** abierta en `0IPN/Cortex`, Agent respondió `Agent type 'resolutor-a-ciegas' not found` y no había `mcp__cortex__*`. Al mover la sesión a `cortex/` aparecieron los 19 agentes y las 5 herramientas del MCP. En esa sesión movida, los comandos de `.claude/commands/` no quedaron como skills («Unknown skill: revisar-contenido»), así que se siguieron a mano; en una sesión abierta directo en `cortex/` deberían salir como `/revisar-contenido` y demás (sin verificar).
  - **MCP:** a mano, `pnpm --silent mcp:cortex` respondió `initialize` (`cortex` 1.0.0) y `tools/list` con las 5 herramientas. Dentro de la sesión, `weekly_metrics` respondió «No hay respaldos en respaldos/. Exporta uno desde Ajustes de Cortex y guárdalo en esa carpeta.» No se llamó `record_institutional_result`.
  - **Cercas:** `resolutor-a-ciegas` con `cat content/calculo/01-limites/ejercicios.yaml` → «cerca-ciega: bloqueado (carpetas del repo). Resuelve solo con el enunciado que recibiste; calcula con .venv/bin/python -I o en una carpeta de mktemp -d.» `coach` con Read de `ESTADO.md` → «cerca-coach: bloqueado (ruta fuera de diario/: …/cortex/ESTADO.md). Solo puedes leer y escribir en diario/; los datos de estudio llegan por las herramientas del MCP de Cortex.» En los dos se encontró el script (no salió el respaldo «no encontré el hook»), y el resolutor sí pudo usar `.venv/bin/python -I`.
  - **`/revisar-contenido content/calculo/01-limites`:** `content:check` en verde (21 ejercicios: 15 por código, 6 manuales). Resolutor a ciegas: 20/20 (todos menos la autoevaluación 010), **0 discrepancias**. Checklist: `experto-matematicas`, `linguista` y `pedagogo` dieron **objeción** sin bloqueo; los arreglos esperan a Carlo en «Decisiones pendientes».
  - **`/consejo` «¿qué temas del parcial de Cálculo priorizo con < 4 semanas?»:** `experto-matematicas`, `pedagogo` y `cientifico-memoria`, los tres con objeción condicional; la tabla de veredictos está en la bitácora.
  - **Arreglo en `.claude/` (`5b58e8d`):** `/revisar-contenido` no decía qué pasarle al resolutor en `ordenar` (los `elementos` vienen en el orden correcto, que es la respuesta) ni en `predecir_salida` (el `codigo`). `agent-hooks.test.ts` sigue en 36/36.
- [ ] `/coach semana` con un respaldo real: no hay `respaldos/` en `cortex/`. Carlo exporta uno desde Ajustes y lo guarda en `cortex/respaldos/`; luego `/coach semana` debe escribir su informe en `diario/`.
- [ ] `weeklyVerdict` (aporte de Carlo)

### Fase 3.5 · v1.1 · iPad (PWA), Pizarra, Sync y coach vivo
Esqueleto en `docs/01`; plan detallado al arrancarla, después del sprint del parcial.
- [ ] VPS base y `pnpm build:pwa` sin runner de C
- [ ] Spikes A (tinta), B (respuesta) y C (PWA) en el iPad real → CP-A de Carlo
- [ ] Eventos, Dexie v3 y respaldo formato 2
- [ ] Pizarra web, UI para iPad, manifiesto y service worker; tinta en el cuaderno y la autopsia
- [ ] Relay en el VPS y cliente de sync
- [ ] Coach vivo: MCP sobre el relay, `ink_page`, KPIs en la app, recomendador con catálogo de la Ruta IA
- [ ] Deploy, simulacro de restauración y cierre

### Fase 4 · Mecánica y electromagnetismo
### Fase 5 · Fundamentos económicos
### Fase 6 · Álgebra lineal
### Fase 7 · Cálculo multivariable
### Fase 8 · Ecuaciones diferenciales
### Fase 9 · Probabilidad y estadística + Matemáticas avanzadas
### Fase 10 · Gimnasio cognitivo completo
### Fase 11+ · Resto del plan

## ADRs de implementación
Complementan los ADR-001 a 008 de `docs/02`. Cada uno se escribe en el commit del paso que lo implementa.

**ADR-009 · Toolchain** (paso 2). Versiones exactas (`saveExact`): Next 16.3.8 con Turbopack, React 19.3.0, TypeScript 6.0.3, Tailwind 4.3.3, pnpm 10.28.0 (`packageManager`), Node `^22.12 || ^24 || >=26` (`engines` + `engineStrict`; `.nvmrc` 24). La configuración de pnpm vive en `pnpm-workspace.yaml`; solo `esbuild` puede correr scripts de instalación (`sharp`, `unrs-resolver` y `fsevents` se ignoran explícitamente). `tsconfig.json` completo (`strict`, `noUncheckedIndexedAccess`, `allowJs: false`, `types: ["node"]`) para que Next no lo reescriba. `typecheck = next typegen && tsc --noEmit` (sin `typegen`, `next-env.d.ts` no existe en un clon limpio). *Descartado:* TS 7 (sin API de JS; `typescript-eslint` exige < 6.1), ESLint 10 (rompe `eslint-plugin-react` 7.37.5), Node 20 (Vitest 5 exige ^22.12; fuera de soporte), `create-next-app` (se niega a correr en una carpeta con archivos y usa `next/font/google`). Se revisa cuando `eslint-config-next` soporte ESLint 10 y `typescript-eslint` soporte TS 7.

**ADR-010 · Sin telemetría y red mínima** (paso 2). `NEXT_TELEMETRY_DISABLED=1` como prefijo en los scripts (`shellEmulator: true` hace que funcione también en cmd/PowerShell). `dev` y `start` con `-p 3000` fijo: si el puerto está ocupado Next falla en vez de mudarse a otro puerto (otro origen = otra IndexedDB = "perder" los datos). `agentRules: false` evita que `next dev` escriba en `CLAUDE.md`. Fuentes Geist locales (paquete `geist`); `next/font/google` queda prohibido (descarga en build). Excepción aceptada (D5): `next dev` consulta la versión más nueva en registry.npmjs.org (GET anónimo, sin datos de Carlo, solo en desarrollo). `dev`, `start` y `start:e2e` escuchan solo en `localhost` (`-H localhost`, revisión 2): sin eso Next escucha en todas las interfaces y cualquiera en la misma red podría abrir la app o los endpoints de desarrollo; el origen sigue siendo `http://localhost:3000`. *Descartado:* `.env` (git lo ignora), `next telemetry disable` global (no viaja con el repo), puerto automático.

**ADR-011 · Loader único e índice en build** (paso 5). `buildIndex` (puro, `src/content/core/`) valida y arma el índice desde textos crudos; `readRawContent` (fs) es una capa delgada; `server.ts` (`server-only` + `cache` de React) lo expone a las páginas y lanza `ContentValidationError` si hay errores, así que **el build falla con contenido inválido**. `content:check` usará el mismo loader. YAML con la librería `yaml` en modo 1.1, ajustada a PyYAML (`y`/`n` como texto, `09` y `1e3` como texto, `.` como texto); si la librería cambia sus regex, falla en voz alta. `CORTEX_CONTENT_ROOT` permite apuntar a otra raíz (pruebas). `verify_content.py` no se modifica. `tsx` 4.23.15 (dev) ejecuta `scripts/content-check.ts` y las pruebas de contenido sin paso de compilación y con los mismos alias y ESM que la app. *Descartado:* un JSON generado en prebuild (otro artefacto que envejece), gray-matter/js-yaml, reescribir sympy en TS.

**ADR-012 · MDX y matemáticas** (paso 6). `@mdx-js/mdx` 3.1.1 con `compileSync` + `runSync` (síncrono, en el servidor), `remark-gfm` (sin él las tablas de las lecciones salen como texto), `remark-math` y `rehype-katex` con `strict: "error"`; `katex` fijo en 0.16.47 (la versión de la que depende `rehype-katex` 7.0.1: una sola versión, CSS y HTML coinciden). `rehype-katex` nunca lanza: sus mensajes se elevan a error con la línea del archivo (el front matter se cambia por líneas vacías). Una guardia propia rechaza componentes no registrados, `import`/`export`, expresiones `{…}` en el texto, `{...spread}` y barras simples dentro de `{[...]}`, y valida con KaTeX las fórmulas de los atributos. Componentes provisionales sin estado (D6) con `<details>` nativo. *Descartado:* next-mdx-remote 6 (su `blockJS` borra `pasos={[...]}` en silencio), `@next/mdx` (`content/` está fuera de `app/` y Turbopack exige plugins serializables), `evaluate` asíncrono, katex 0.18.

**ADR-014 · Dexie v1 con guarda de versión** (paso 9). Dexie 4.4.6 con las 12 tablas de `docs/02` más `meta` (`src/db/schema.ts`); `SCHEMA_HISTORY` es append-only y la v1 tiene una prueba de "foto" que impide editarla. `populate` crea `meta.schemaVersion = 1` y el perfil en ceros con sonido apagado; los hooks `creating`/`updating` estampan `schemaVersion` en cada registro. **Guarda:** antes de abrir, una sonda sin esquema (Dexie en modo dinámico no hace upgrade y, si la base no existe, lanza `NoSuchDatabaseError` sin crearla) lee la versión nativa y `meta.schemaVersion`; si alguna es mayor que la de la app, lanza `FutureSchemaError` sin tocar nada. Comprobado: sin la guarda, una instancia v1 abre en silencio una base v2 (y si a la base le falta un índice de la v1, Dexie la parcharía). **Sin reapertura automática** (revisión 2): `CortexDb` se crea con `autoOpen: false` y, si otra pestaña pide subir la versión o borrar la base (`versionchange`), cierra su conexión y queda cerrada (`closedElsewhere`); ante cualquier cierre (también si el navegador borra los datos del sitio) la UI pide recargar (`DbClosedError`). Sin esto, la reapertura automática de Dexie se saltaba la guarda: una pestaña vieja parchaba la base v2 y le escribía datos v1. Además, `CortexDb` recibe una fábrica de IndexedDB que solo deja abrir su versión nativa exacta: si otra pestaña sube la versión justo después de la sonda, el reintento sin versión (y el parche) de Dexie fallan antes de tocar nada (`openCortexDb` lo convierte en `FutureSchemaError`); la smoke 6 reprodujo esa carrera 1 de cada 8 veces sin el candado. Como Dexie cierra la base al ocultar la página (bfcache) y ya no la reabriría, `Dexie.disableBfCache = true`. `getDb()` es perezoso y solo del navegador; `useProfile()` empieza en `loading` en servidor y en el primer render (sin errores de hidratación). Pruebas con `fake-indexeddb` (una IndexedDB nueva por prueba). En React, `dexie-react-hooks` (`useLiveQuery`, el enlace oficial del `liveQuery` que ya nombra `docs/02`). *Descartado:* confiar en `VersionError` o en `db.verno`, revisar `meta` después de abrir (Dexie ya pudo parchear), `fake-indexeddb/auto` global.

**ADR-015 · Respaldo v1** (paso 10). Archivo `cortex-AAAA-MM-DD.cortex-backup.json` en JSON compacto (fecha local; ya lo ignora `.gitignore`) con `{app: "cortex", format: 1, schemaVersion, exportedAt, appVersion, tables}` y las 12 tablas de datos (`meta` no viaja: se regenera). `parseBackup` valida TODO antes de tocar la base y nunca lanza: tamaño máximo (100 MB por defecto; el panel revisa `file.size` antes de leer el archivo), JSON, app, formato, esquema (rechaza versiones futuras y valores no enteros), las 12 tablas exactas, perfil estricto (exactamente uno), claves primarias presentes y únicas (las autoincrementales ≤ 2³¹−1: un id cercano a 2⁵³ agotaría para siempre el generador de claves); las tablas de las Fases 1+ solo exigen clave y `schemaVersion` (no se pierde nada que la fase agregue). `migrateBackup` lleva respaldos viejos a la versión actual (identidad en v1). `importBackup` reemplaza todo en una transacción `rw` atómica, conservando ids (D7); la confirmación vive en la UI. Si un respaldo exportado pasa del máximo, se descarga igual pero el aviso lo dice (la app nunca da por buena una copia que no podría importar). *Descartado:* fusionar (ambiguo con FSRS y rachas), `dexie-export-import` (otra dependencia y formato opaco), respaldo automático (transversal futuro).

**ADR-016 · UI base "Consola arcade"** (*reemplazado por ADR-020*; paso 11; dirección elegida por Carlo: híbrido Consola de laboratorio × Arcade). La lectura es consola (fondo azul-tinta, superficies con borde de 1 px, retícula de puntos, etiquetas mono `// MAYÚSCULAS`, números del HUD en Geist Mono); lo que se toca o se gana es arcade (`.arcade`: sombra sólida desplazada, se hunde 2 px al presionar; chips sólidos de XP, racha y vida). Acento menta fósforo; XP amarillo eléctrico; racha naranja; vida/peligro coral. Tokens en OKLCH **solo** en `src/app/globals.css` (oscuro por defecto y claro definido; D8), mapeados a los nombres de shadcn/ui; `src/styles/tokens.test.ts` exige AA (4.5:1 texto, 3:1 interfaz) en 24 pares por tema (22 en el paso 11; la revisión 2 agregó `--xp-text`, el ámbar para XP como texto pequeño, que en el tema claro no llegaba a 4.5:1). `prefers-reduced-motion` anula transiciones y el desplazamiento arcade; foco visible global; enlace "Saltar al contenido". shadcn/ui sobre Radix (`radix-ui`), transcrito de la fuente oficial (el registro no responde desde el contenedor) con `components.json` para usar la CLI en la máquina de Carlo; sin variantes `dark:` (los tokens cambian por tema). KaTeX CSS en el layout (local). Dependencias nuevas: radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css. *Descartado:* Base UI, componentes propios desde cero, interruptor de tema en F0, `color-mix` en OKLCH con `transparent` (tiñe de rojo).

**ADR-017 · Dependencias de la Fase 1** (paso 1 de la F1). `ts-fsrs` 5.4.2 (FSRS-6, el de `docs/02`; tarjetas planas en IndexedDB y traducción a `Date` solo dentro de `engine/srs.ts`; sin "fuzz" para que las pruebas sean exactas). `mathjs` 15.2.0 importado como `mathjs/number` (sin complejos: `sqrt(-1)` da `NaN` y ese punto se descarta; lista blanca de funciones y símbolos para que una respuesta no pueda llamar `import`, `evaluate`, etc.). `mathlive` 0.111.0 para escribir fórmulas (fuentes servidas en local). `unified` 11 + `remark-parse` 11 + `remark-rehype` 11 + `hast-util-to-html` 9 (ya estaban en el árbol por `@mdx-js/mdx`; ahora explícitas) para dibujar el texto de los ejercicios con el mismo `remark-math` + `rehype-katex` estricto de las lecciones. *Descartado:* Zustand (el estado de UI cabe en React y los datos en Dexie; se agrega si un flujo lo pide), mathjs completo (complejos y BigNumber no hacen falta), un parser propio de Markdown (divergiría de lo que valida `content:check`).

**ADR-018 · Datos y UI de estudio** (F1). Esquema Dexie v2: tabla `days` (contadores por día local) y campos nuevos en perfil, tarjetas, errores y unidades, llenados por `migrations.ts` (las mismas funciones puras migran la base y los respaldos v1). Toda regla vive en `src/engine/`; `src/db/progress.ts` la aplica en UNA transacción por evento (`recordAnswer`, `completeLesson`, `finishBoss`, `recordGym`, cofre, liga). El navegador lee el contenido de `/catalogo.json` (estático, generado en el build) y dibuja el texto de los ejercicios con el pipeline de las lecciones (`rich-text.ts`; `content:check` lo valida en la capa 2). La misión del día se fija por día en `sessionStorage` para que la sesión se reanude al volver de leer la lección. Los componentes no llaman `Date.now()` al dibujar: `useMinute`/`useToday` (`useSyncExternalStore`). *Descartado:* pasar el catálogo como props de cada página (lo necesitan casi todas), HTML pre-dibujado en el JSON (pesaría megas), Zustand.

**ADR-019 · Runners y editor de código** (F2). *Editor:* CodeMirror 6 (`@codemirror/{state,view,commands,language,lang-python,lang-cpp}` + `@lezer/highlight`), colores con los tokens del sistema visual; `Ctrl/Cmd+Enter` envía; `Esc` y luego `Tab` sale del editor (por eso `Esc` dentro del editor no saca de la página). *Python (ADR-004):* `pyodide` 314.0.7 servido desde `public/vendor/pyodide/` (copiado por `scripts/vendor-assets.ts`, ~13 MB, sin CDN) en un Web Worker de módulo; el arnés (`src/runners/python-harness.ts`) reproduce `run_python_tests` de verify_content.py y evalúa cada expresión aparte; límite de 6 s por ejecución terminando el worker. *C (ADR-005):* `/api/run-c` solo con `CORTEX_LOCAL=1` (lo ponen `pnpm dev`, `pnpm start` y `start:e2e`), host localhost (contra DNS rebinding), mismo origen, `Sec-Fetch-Site` y encabezado propio (fuerza CORS previo); compila con las mismas banderas que el verificador en una carpeta temporal única, una ejecución a la vez, 3 s y 64 KB por ejecución (mata el grupo de procesos), `ulimit` de CPU y archivos, y sin red ni escritura fuera de su carpeta con `sandbox-exec` (macOS) o `unshare -rn` (Linux, si hay espacios de nombres). La calificación vive en `src/engine/code/` y una prueba corre TODAS las soluciones del repo en ambos runners (y exige que plantillas y códigos con bug fallen). *Descartado:* Pyodide por CDN (rompe local-first), C a WASM (otro compilador, otra semántica que la de su clase; se reconsidera solo si la app se publica), `eval` de C en el servidor sin aislamiento.

**ADR-020 · Sistema visual "Arcano"** (rediseño 2026-10; reemplaza a ADR-016; dirección elegida por Carlo en Stitch, variante B "Arcano" con el jefe de la variante C y glow sutil). 90 % consola pro (superficies grafito con tinte violeta, bordes de 1 px, un acento, etiquetas sans en sentence-case de ≥ 12 px con `.eyebrow`; mono solo para números, código y kbd) y 10 % juego premium solo en lo que se gana o se vive (`.glow` con `--glow-color` por semántica: brand, `glow-xp`, `glow-life`, `glow-success`; `.raised` para capas). Acento violeta (`--brand` #9D8FF9 oscuro / #5F4BD0 claro); `--success` menta separa "correcto" de "acción"; `--brand-soft` para lo seleccionado; XP oro, racha naranja, vida/peligro coral. Las intensidades (`--glow-a`, `--shadow-a`, `--bg-glow-a`, `--highlight-a`) viven en los bloques de tema: en claro el glow es 0 % y la profundidad son sombras teñidas. `.arcade` (sombra desplazada) → `.tactile` (1 px al presionar); sin retícula de puntos. Radios 6/8/12/16 (chip/control/panel/hero), `text-caption` (12 px) y `text-label` (13 px). Tokens OKLCH **solo** en `src/app/globals.css`; `tokens.test.ts` exige AA en 34 pares por tema (los 24 de antes + `surface-3`, `brand-soft`, `success` y lecturas sobre `surface-2`); los valores se validaron antes con la misma matemática en un script aparte. `color-mix` siempre en sRGB (en OKLCH con `transparent` tiñe de rojo, ADR-016). *Descartado:* "Fósforo pro" (menta sin glow: casi sin sensación de juego), "HUD cian" (glow marcado y ruido de marcas de esquina), copiar el HTML de Stitch (no respeta teclado, AA ni los componentes existentes).

**ADR-021 · Visuales de lección con Mafs** (F3, pasos 1 y 2). `mafs` 0.21.0 en versión exacta, ya previsto en `docs/02`. Su última versión estable es de 2024-10, así que no se aceptó por defecto sino contra seis criterios, cada uno con evidencia: (1) React 19.3 sin errores de consola ni de hidratación en `/estilo` y en una lección; pnpm avisa que su dependencia `use-resize-observer` 9.1.0 declara soporte hasta React 18, pero volver a medir funciona (la gráfica pasó de 607 a 301 y a 246 px al cambiar el ancho); una sola versión de `katex` en el lockfile (ADR-012) y ningún script de instalación. (2) Se importa y se dibuja en Node, que es como `content:check` y Vitest renderizan las lecciones. (3) Render determinista **solo con ancho automático**: Mafs numera los patrones de su cuadrícula con un contador del módulo (`cartesian-N`), así que con ancho fijo o con `ssr` el HTML cambia entre renders y no coincidiría al hidratar; con ancho automático el servidor deja el contenedor vacío y la gráfica se dibuja al montar. La invariante de los pasos pasa con un visual dentro de la lección de límites. (4) Cero red: `mafs/core.css` no tiene `url()` ni `@import`, y de 30 recursos cargados ninguno salió de `localhost`; `mafs/font.css` no se importa (la fuente es Geist). (5) Dentro de un paso oculto (`hidden="until-found"`) no dibuja nada y al mostrarse el paso aparece con el ancho correcto. (6) Colores por tokens en ambos temas: las variables `--mafs-*` apuntan a los tokens en un bloque **sin capa** de `globals.css` (el CSS de Mafs tampoco tiene capa, y una regla sin capa le gana a cualquiera dentro de `@layer`). **Reglas de uso:** Mafs solo se importa en `src/components/visuals/plot-frame.tsx`; siempre `width="auto"`, nunca `ssr`; `pan` y `zoom` apagados, para que la vista no sea enfocable ni se quede con ← → del lector por pasos. `src/components/visuals/mafs-criteria.test.tsx` fija los criterios 2 a 4 y avisa si un Mafs nuevo deja de numerar ids. **Diseño:** un solo `<Visual id … />` con parámetros de texto (`f`, `dominio`, `rango`, `a`, `n`, `titulo`), sin ampliar los tipos de la guardia; `src/content/core/visuals.ts` (puro) dice qué usa cada visual y los resuelve a números, y la guardia lo llama para reportar cada problema con su línea. La geometría es nuestra y pura (`src/engine/plot.ts`): muestreo por tramos que no une los dos lados de un salto o una asíntota (una función continua cambia cada vez menos al bisecar; un salto no), huecos en los múltiplos de 1/2 del dominio, sumas de Riemann, Simpson y una estimación numérica de límites laterales que distingue finito, infinito (también el lento, como ln x) y oscilación. El servidor escribe una frase que describe cada visual (función en LaTeX con `toTex`), que es lo que se lee sin JS y con lector de pantalla. El control principal es un `<input type="range">` nativo con `aria-valuetext`; nada se anima solo. La conclusión (a qué valor se acerca, cuál es la tangente) aparece cuando el usuario se acerca lo suficiente, no de entrada. *Descartado:* SVG propio desde cero (queda como salida: bastaría reescribir `plot-frame.tsx`; se descartó porque Mafs ya trae vectores, transformaciones y campos que piden las Fases 4, 6 y 7), `Plot.OfX` de Mafs para la curva (une los dos lados de una asíntota y no marca huecos), un componente MDX por visual o props numéricas (obligaban a ampliar la guardia), y una tabla de valores dentro del visual de límite (la lección piloto y sus pruebas cuentan exactamente una tabla).

**ADR-022 · Respuestas y tipos de la Fase 3** (F3, pasos 4 y 5). *Una regla, dos implementaciones:* cada cambio de formato toca Zod, `verify_content.py`, la paridad y `docs/05`, y la respuesta oficial de cada ejercicio debe salir correcta en el verificador del navegador (`src/content/real-answers.test.ts`). *Tipos nuevos:* `tabla_verdad` guarda la columna en orden **canónico** (todas verdaderas primero; la 1.ª variable cambia más despacio) y la pantalla decide orden y símbolos (`convention.ts`), así cambiar la convención no invalida ninguna respuesta; `conjunto` compara elementos por valor (números a 12 cifras, pares como tuplas, texto sin espacios) y exige `verificar`; `seleccion_multiple` exige marcar todas y solo las correctas, y su `verificar` da un booleano por opción (la lista paralela detecta opciones desalineadas). *Vía independiente para la lógica:* Python lee la misma gramática con un lector propio y **sympy.logic** evalúa; `tests/content/logic-parity.test.ts` exige que ambos lean igual un corpus (si se cambia la gramática, se cambian los dos y se amplía el corpus). *`visual` en ejercicios:* solo `grafica` y `grafo`, y el grafo sin selección de vértices, porque los demás visuales y esa selección anuncian la respuesta. *Descartado:* evaluar la tabla con el intérprete de la app también en Python (no sería independiente), escribir la tabla en el orden de pantalla (atar las respuestas a una preferencia visual), tolerancia por elemento en conjuntos (los elementos de un conjunto discreto son exactos).

**ADR-023 · Simulacro de examen** (F3, paso 6). Motor puro `src/engine/exam.ts` (`planExam`, avance, saltar, entregar, tiempo, `examResult`) con las reglas en `CONFIG.exam`; ruta `/materias/[materia]/simulacro` con header de foco. *Armado:* por turnos entre unidades (empieza en una al azar para no favorecer siempre a la primera) y, dentro de cada unidad, la banda de dificultad con más faltante respecto a la mezcla; orden final de fácil a difícil; reparto con `apportion` (el mayor residuo de los jefes, ahora compartido). *Sin retroalimentación:* `ExerciseCard` con `reveal={false}` (botón "Responder", sin pistas; sí pide confianza, que alimenta la "ilusión de saber"). *Persistencia al final y en una transacción* (`finishExam`): nada se escribe mientras dura el examen (salir a medias no deja rastro); al entregar, cada respuesta pasa por `recordAnswer` con `mode: "exam"` (mismo XP que la práctica, sin bono), queda una sesión `exam` y el récord `best:exam:<materia>`. `"exam"` es un valor nuevo de `AttemptMode`: solo texto, sin migración de Dexie ni cambio al respaldo (los intentos se validan sueltos). *Esc no sale a medio examen* (`data-escape-guard`; "Salir" sí), porque perder 24 min por una tecla es peor que una tecla que no responde. *Descartado:* guardar cada respuesta al momento (dejaría intentos de un examen sin terminar y XP sin "entregar"), navegar libremente entre preguntas (saltar al final de la fila cubre el caso real con mucho menos estado), vidas en el simulacro (un examen no termina por tres errores).

**ADR-024 · Equipo de agentes y coach** (2026-11-10; decisión de Carlo).
- **Agentes:** 19 subagentes de Claude Code en `.claude/agents/`, todos `model: opus`, invocados solo por nombre desde los comandos. Con muchas descripciones parecidas, la delegación automática fallaría. Ninguno lleva `Agent`, así que orquesta la sesión principal.
- **Grupos:**
  - ciencia del aprendizaje (7 asesores de solo lectura);
  - expertos de dominio (4; `experto-ciberseguridad` es guardián con poder de bloqueo);
  - desarrollo (6, cada uno con rutas propias, un escritor a la vez en un solo worktree);
  - `resolutor-a-ciegas`;
  - `coach`.
- **Cercas:** `tools` no limita Bash por comando ni Read por ruta, así que tres agentes llevan hooks `PreToolUse` en Python (`.claude/hooks/`). Se lanzan con un `sh -c` que los busca en `$CLAUDE_PROJECT_DIR` y en `$CLAUDE_PROJECT_DIR/cortex`. Fallan cerradas (código 2 si falta el script, si la llamada no se entiende o ante cualquier error) y tienen 36 pruebas. Son barreras contra accidentes, no un sandbox.
- **Reutilización:** la revisión de código usa `pr-review-toolkit` en lugar de agentes propios.
- **Detalle:** `docs/08`. La app sigue sin IA en tiempo de ejecución.

**ADR-025 · Alcance: iPad, relay propio, KPIs y Ruta IA** (2026-11-10; decisión de Carlo; revisa ADR-001).
- **iPad:** Cortex llega al iPad en la v1.1 como **PWA** servida desde el VPS de Carlo con HTTPS, con pizarra para el Apple Pencil sin reconocimiento de letra (`docs/09`). La vía nativa (Capacitor + PencilKit) queda para después de la v1.1, cuando haya espacio para Xcode.
- **Sync:** el progreso se une con un **relay propio** en el VPS de Hostinger, **sin E2EE**: HTTPS + token con hash, revocable y por dispositivo. Carlo acepta que el VPS vea su progreso en claro.
- **Runner de C:** nunca se despliega (ADR-005).
- **Alcance nuevo:** entran los KPIs institucionales y la Ruta de ingeniero en IA como pista paralela.
- **Alternativas descartadas:**
  - E2EE, más seguro pero con la fricción de una frase por dispositivo;
  - nube de terceros, que rompe la regla de «sin terceros»;
  - respaldo manual por AirDrop, que mete fricción y riesgo de pisar datos.

**ADR-026 · MCP de Cortex para el coach** (2026-11-10).
- **Servidor:** `mcp/cortex/` por stdio, con `@modelcontextprotocol/sdk` 1.32.2 en versión exacta (publicada el 2026-10-23, más de dos semanas antes). Lo registra `.mcp.json` como `cortex` y lo arranca `pnpm --silent mcp:cortex`, que corre `tsx mcp/cortex/main.ts`.
- **Fuente en v1:** el respaldo más reciente de `respaldos/`; en v1.1 será el relay.
- **Privacidad por construcción:**
  - el motor puro calcula solo agregados: `coach-metrics.ts`, `skill-profile.ts` (`conceptEvidence` ahora también lo usa el mapa de maestría) e `institutional.ts`;
  - la capa de datos copia campo por campo, nunca un registro entero;
  - una prueba con cadenas marcadoras en respuestas, notas, reportes y fantasmas comprueba que ninguna salida las trae.
- **Herramientas:** `weekly_metrics`, `skill_profile`, `institutional_results`, `record_institutional_result` (escritura atómica en `diario/resultados.yaml`, Zod, materia del plan y sin duplicados) y `calibration_report` (último simulacro de los 21 días previos contra la calificación real).
- **Límite conocido:** el simulacro no guarda las preguntas sin contestar, así que su puntaje puede sobrestimar. Se corrige en la v1.1 con eventos.
- **Datos fuera de git:** `diario/` y `respaldos/`.

**ADR-013 · Nomenclatura** (paso 1, decisión D1). Código, tablas y campos de IndexedDB en inglés, con equivalencias en `docs/02`. Las claves de YAML y del front matter siguen en español (son el formato de contenido). Los componentes MDX conservan su nombre en español porque son la API del contenido (`Predice` se implementa como `PredictPrompt`). Las URL van en español porque son interfaz. `APP_ID = 'cortex'` es inmutable (nombre de la base y marca de los respaldos); renombrar la app solo cambia `APP_NAME`. *Descartado:* todo en español (contradice `CLAUDE.md`) o una capa de traducción.

## Bitácora
- 2026-11-14 · **Unidad `matematicas-discretas/17-equivalencia`** (3.er parcial; Unidad IV, 4.3.3 y 4.3.4).
  - *Esquema:* v1, aprobado por Carlo; revisado por M, P y A. Sin congruencia ni ≡, porque son de la 18. Ninguna respuesta es un conjunto de conjuntos: las clases se piden como `conjunto` plano, número de clases, tamaños o pares.
  - *Escrita* por `autor-contenido`: lección de unos 20 min (1,110 palabras), 20 ejercicios 4/5/5/3/3 (19 por código y 1 manual) y jefe de 10 más 4 de repaso de la 15 y la 16 (`disc-16-017`, `disc-16-022`, `disc-16-009` y `disc-15-024`), con 1,800 s.
    - Un cambio contra el esquema en el repaso: `disc-16-009` va con el 012 en lugar de la matriz con el 005, porque el 005 no está en el jefe.
    - Se agregaron a la `notacion` de `conceptos.yaml` $[a]$ y $A/R$.
  - *`/revisar-contenido`:*
    - a ciegas, 19/19;
    - checklist M, L y P con objeción: el desvanecido de §6 se contestaba leyendo sus otros pasos; los huecos del 017 («la clase más grande», cuando hay dos) y del 016 («alguna clase», que se lee como «una sola») tenían dos lecturas; el enunciado del 012 regalaba la conclusión.
  - *Arreglos:* Carlo aprobó «errores + mejoras» (`arreglos-17.md`).
    - El 012 se rediseñó: ahora pide decidir si es de equivalencia.
    - Segunda ronda a ciegas: 5/5. En el 012, la sesión principal agregó «junto con su inverso»: agregar solo $(2,5)$ no la vuelve transitiva.
  - *Evidencia:*
    - `pnpm content:check` en verde (6 unidades y 145 ejercicios; la 18 está escrita, sin commit);
    - `pnpm test`: 1182;
    - `pnpm lint`;
    - lección en el puerto 3200: 112 fórmulas, 0 `.katex-error` y sin errores de consola;
    - el jefe arranca con 14 preguntas.
  - *Hallazgos para `/equipo` después del parcial* (de M, en la revisión de los esquemas 20 y 21):
    - `same_value` de `verify_content.py` da falso al comparar palabras como «ab» consigo mismas, porque `parse_expr` parte los símbolos;
    - la app lee «5,040» como 5.04 (la coma es decimal);
    - no iguala «−» con «-», ni «×» con «*».
- 2026-11-14 · **Unidad `matematicas-discretas/16-propiedades-orden`** (3.er parcial; Unidad IV, 4.2.4, 4.3.1 y 4.3.2). Sesión nueva de Discretas: worktree `objective-stonebraker-808a0b`, rama `claude/objective-stonebraker-808a0b`, adelantada por fast-forward a `ad076b5`.
  - *Esquema:* v1, aprobado por Carlo; revisado por M, P y A.
    - Las cinco propiedades se refutan con un testigo.
    - Orden parcial y total.
    - Hasse por niveles en KaTeX, porque el visual `grafo` va en círculo.
    - Extremos, con la hipótesis «finito no vacío» escrita.
  - *Escrita* por `autor-contenido`: lección de 25 min (1,662 palabras), 25 ejercicios 6/5/7/4/3 (24 por código y 1 manual) y jefe de 10 más 4 de repaso de la 14 y la 15 (`disc-15-009`, `disc-15-022`, `disc-15-013` y `disc-14-019`), con 1,840 s.
  - *`/revisar-contenido`:*
    - a ciegas, 24/24, con dos lecturas dobles: los huecos del 025 pedían un número pero se leían como lista, y el 017 dependía de que $0\mid0$;
    - checklist M, L y P con objeción: «el Hasse vale *solo* en finitos», que es falso; un paso del desvanecido de §9 se contestaba con la gramática; el 008 se parecía al $R_1$ de Rosen.
  - *Arreglos:* Carlo aprobó «errores + mejoras» (`arreglos-16.md`). Entre ellos:
    - la opción del 017 pasa a $\mathbb Z-\{0\}$;
    - un $R$ nuevo en el 008;
    - una demostración corta con $\subseteq$ en §5;
    - «cadena» queda solo para el subconjunto totalmente ordenado;
    - el 014 entra al jefe en lugar del 018, para que el par de intercalado con el 15-009 quede completo. Su matriz se reetiquetó para no repetir la cadena $(2,1),(1,4)\to(2,4)$ del 15-022.

    Segunda ronda a ciegas: 8/8.
  - *Evidencia:*
    - `pnpm content:check` en verde (4 unidades, 100 ejercicios, 90 por código);
    - `pnpm test`: 1134;
    - `pnpm lint`;
    - lección en el puerto 3200: 164 fórmulas, 0 `.katex-error` y sin errores de consola;
    - el jefe arranca con 14 preguntas en 3 oleadas.
  - *Para la 09:* fijar en la `notacion` si $a\mid b$ exige $a\neq0$ (la bibliografía del programa lo exige), porque el 003 y el 017 de la 16 dependen de eso.
- 2026-11-14 · **Unidad `matematicas-discretas/15-relaciones`** (3.er parcial; Unidad IV, 4.2.1 a 4.2.3).
  - *Esquema:* v1, aprobado por Carlo; revisado por M, P y A.
    - Convención: $S\circ R$ = «primero $R$», y su matriz es $M_R\odot M_S$.
    - $f^{-1}$ siempre es relación; es función ⇔ $f$ es biyectiva.
    - Hay un ejemplo resuelto de demostrar inyectiva y suprayectiva.
  - *Escrita:* lección de 25 min (1,521 palabras), 25 ejercicios 7/5/7/3/3 (24 por código y 1 manual) y jefe de 10 más 4 de repaso de la 13 y la 14.
  - *`/revisar-contenido`:*
    - a ciegas, 24/24;
    - checklist M, L y P con objeción: la `respuesta_modelo` del 020 no cumplía su rúbrica; dobles lecturas en el 025 y el 010; el desvanecido de «no suprayectiva» no pedía la demostración; la explicación del 021 daba tres respuestas del 024 en el jefe.
  - *Arreglos:* Carlo aprobó «errores + mejoras» (`arreglos-15.md`, 14 puntos). Segunda ronda a ciegas: 5/5.
  - *Evidencia:*
    - `pnpm content:check` en verde;
    - `pnpm test`: 1107;
    - `pnpm lint`;
    - lección y jefe en el puerto 3200: 211 fórmulas, 0 `.katex-error` y sin errores de consola.
  - *Huecos de la plataforma nuevos:*
    - el pie que la app pone bajo un `grafo` de ejercicio lista sus aristas como pares, así que no se puede pedir leer los pares de un digrafo; el 008 pide leer la matriz;
    - el visual `grafo` no dibuja lazos.
  - *Entorno:* `tests/content/agent-hooks.test.ts` («carpeta de arriba») falla solo en el worktree, porque ahí la carpeta de arriba es `.claude/worktrees`. Los hooks y la prueba no cambiaron desde `1ddb6fd`; en la copia principal debe pasar.
- 2026-11-14 · **Unidad `matematicas-discretas/14-circuitos-karnaugh`** (3.er parcial; Unidad IV, 4.1.4 y 4.1.5).
  - *Esquema:* v1, aprobado por Carlo, revisado por M, P y A. Los datos salen de un minimizador por fuerza bruta (implicantes primos y todas las coberturas mínimas) y M los rehízo con el suyo.
  - *Originalidad (M):* se cambiaron el Ejemplo 3.5 de Mano y el hexágono cíclico de los libros, que aparecían como ejercicio. El invernadero de 6 minitérminos que se había pensado era imposible.
  - *«No importa»:* Carlo confirmó que su clase usa las condiciones d(…). Entran un párrafo y el 014.
  - *Escrita:* lección de 25 min (1,697 palabras), 25 ejercicios 6/5/7/4/3 (23 por código, con la plantilla `K` de M en Python puro, y 2 manuales) y jefe de 11 propias más 4 de repaso de la 13 (27 %).
  - *`/revisar-contenido`:*
    - a ciegas, 24/24;
    - checklist M, L y P, los tres con objeción:
      - en el jefe, la explicación del 024 regalaba el 023 (el jefe muestra la explicación después de cada respuesta);
      - el desvanecido del paso 3 regalaba la elección;
      - «solo si» admitía dos lecturas en el 020;
      - el «excepto» en el 025;
      - «literales» podía leerse como literales distintas.
  - *Arreglos:* Carlo aprobó «errores + mejoras» (`arreglos-14.md`, 16 puntos). Sale el 024 del jefe y entran el 018 y el 014. Segunda ronda a ciegas: 7/7.
  - *Evidencia:*
    - `pnpm content:check` en verde;
    - `pnpm test`: 1080;
    - `pnpm lint`;
    - lección y jefe en el puerto 3200: 178 fórmulas, 0 `.katex-error` y sin errores de consola.
  - *Huecos de la plataforma nuevos (se suman a los de la sección de Discretas):*
    - no hay visual de circuitos (van como lista de compuertas);
    - el jefe muestra la explicación de cada pregunta antes de la siguiente, así que dos ejercicios cuyo contenido se cruza no pueden ir en el mismo jefe.
- 2026-11-13 · **Unidad `matematicas-discretas/13-algebra-booleana`** (3.er parcial de Discretas; Unidad IV, 4.1.1 a 4.1.3).
  - *Esquema:* revisado por `experto-matematicas`, `pedagogo` y `arquitecto-razonamiento`, los tres «aprobado con cambios»; v1 aprobada por Carlo. Notas en `esquema-13.md`, en la carpeta de notas del grupo.
  - *Cambios del esquema:*
    - el ejemplo de la sección 5, el 007 y el 022 se cambiaron para no repetir el Ejemplo 2.1 de Mano;
    - un distractor del 022 resultó verdadero por sustitución;
    - al 021 le faltaba la conmutativa;
    - el jefe no cubría `funcion-booleana`.
  - *Escrita* por `autor-contenido`: lección de 25 min (1,686 palabras), 25 ejercicios 5/5/7/5/3 (19 verificados por código, por enumeración, y 6 manuales) y jefe de 10 sin repaso, porque no hay unidades previas de Discretas.
  - *Formato:*
    - sin `tabla_verdad`, porque su convención V/F choca con el 0/1 del álgebra booleana;
    - respuestas como índices de minitérminos, columnas 0/1 u opciones;
    - el 024 se verifica en 𝒫({a,b,c}), no solo en {0,1}.
  - *`/revisar-contenido`:*
    - a ciegas, 24/24 sin discrepancias;
    - checklist de M (objeción por originalidad: el 015 era el Ejemplo 2.4 de Mano y el 014 usaba la función del 2.5), L (objeción por la redacción del 023, con dos lecturas que cambiaban la respuesta) y P (el 008 no decía cuáles eran las correctas, porque `WorkedExample` no muestra las opciones).
  - *Arreglos:* Carlo aprobó «errores + mejoras» (`arreglos-13.md`, 15 puntos). Segunda ronda a ciegas de los 8 ejercicios cambiados: 8/8.
  - *Pruebas:* el contenido de Discretas obligó a actualizar las pruebas que fijan qué materias tienen contenido (`loader.test.ts`, `server.test.ts`, `home-model.test.ts`, `src/app/materias/page.test.tsx` y `e2e/smoke.spec.ts`). Solo cambian de 2 a 3 materias; no cambia la app.
  - *Evidencia:*
    - `pnpm content:check` en verde;
    - `pnpm test`: 1053;
    - `pnpm lint`;
    - e2e: 12/12 en smoke, study y exam;
    - lección y práctica en el puerto 3200: 200 fórmulas KaTeX, 0 `.katex-error` y sin errores de consola.
  - *Hallazgo, no de Discretas:* `e2e/exam.spec.ts` falla de vez en cuando cuando el simulacro de Cálculo saca el `ordenar` de arcsenh de la 05. `plain()` de `e2e/answer.ts:63` no reconoce el texto de KaTeX. Falló en la primera corrida completa y pasó al repetir. Arreglo pendiente, por `/equipo` con `dev-interfaz`.
- 2026-11-13 · **F3 paso 9: puerta de temario de Matemáticas discretas** (sesión de Discretas, worktree `discretas-857e48`, rama `claude/discretas-857e48`; corre en paralelo con el sprint del parcial de Cálculo).
  - *Rama:* el worktree se había cortado de `7f150cb`, 21 commits detrás de `fase-3-calculo-discretas`. Como no tenía commits propios, se adelantó por fast-forward a `1ddb6fd`.
  - *Programa:* `matematicas-discretas.pdf`, con el mismo sha256 que registró el paso 7 (`a41a6a17…6c03db`). Se leyó con un extractor de zlib, porque no hay `pdftoppm`. Las horas suman T 81, P 27 y AA 32; hay un 3.3.4 y un 3.3.5 que en realidad son de 3.2, y un 4.4.5 que es de 4.5.
  - *Cuadernillo de clase de Carlo* (`0IPN/Matemáticas discretas/Cuadernillo1 2026.pdf`): son imágenes escaneadas. PDFKit las convierte a PNG desde `osascript -l JavaScript`. Es la Unidad I: derivaciones por método directo, demostración condicional e indirecto, y argumentos en español para formalizar. Mezcla `~`/`¬` y `&`/`∧`. Sus ejercicios vienen de libros y no se copian.
  - *`/consejo`:* `experto-matematicas`, `pedagogo` y `arquitecto-razonamiento` dieron los tres «aprobado con cambios»:
    - no fusionar unidades;
    - partir la de cuantificadores;
    - pasar la demostración directa a la 03;
    - Bézout entra, avisado;
    - corregir las horas del borrador, que sumaban 117 en lugar de 108;
    - faltaban hipótesis: mcd·mcm = |ab|, Euler exige un grafo conexo y `%` falla con negativos;
    - en la plataforma faltan piezas para la Unidad IV.
  - *Choque:* 19 unidades (`experto-matematicas`) contra 21 (`pedagogo`). Carlo eligió 21 y las 2 extra.
  - *Decisiones de Carlo:* el 3.er parcial es de la Unidad IV, en la semana del 23 al 27 de noviembre; las unidades se escriben en el orden del programa, todas; la composición con la convención más común. El detalle está en «Decisiones tomadas · temario de Discretas».
  - *Hecho:*
    - `content/matematicas-discretas/conceptos.yaml`, con 132 conceptos, la `notacion` y un bloque por unidad con su sección del programa;
    - un prerrequisito entre materias: `calculo:composicion-funciones`;
    - en `docs/01`, la línea de Discretas, alineada con el programa.
  - *Evidencia:*
    - `pnpm content:check content/matematicas-discretas` en verde (0 errores y 0 avisos);
    - `pnpm content:check` sin ruta en verde (19 unidades y 410 ejercicios; los 12 avisos son los `programa_ref` pendientes de Programación, que ya estaban);
    - la materia sin unidades no aparece en la app (`hasContent` es falso).
  - *Notas de la sesión:* borrador, programa en texto y esquemas en `~/Library/Application Support/Claude/side-session-notes/local_a6e0852a-c7ca-4753-87c7-0928b0b431e1/`.
- 2026-11-12 · **Unidad `calculo/08-antiderivadas`** (sprint del parcial; Unidad IV, 4.1 antiderivada, 4.2 sustitución y 4.3 partes).
  - **Esquema:** objeción sin bloqueo de matemáticas, pedagogía y razonamiento.
    - Competencia del programa: «resuelve la integral a partir de su tipología». Por eso la lección cierra con un **triaje** de 3 preguntas en orden (tabla → sustitución → partes) que la 09 extiende a 6.
    - Primera unidad con `salvo_constante`. Reglas de formato:
      - `variables: [x]` y C mayúscula;
      - argumentos de ln positivos o con intervalo dado, y `ln(abs(u))`;
      - la respuesta en la forma del intervalo más grande;
      - el valor absoluto se califica con numéricos en $x<0$ y con el contraejemplo de las dos constantes (025).
  - **Contenido (lo escribió `autor-contenido`):**
    - 25 ejercicios: 10 completar, 7 simbólicos, 3 de selección múltiple, 2 de opción múltiple, 2 numéricos y 1 autoevaluación.
    - Escalera 5/5/7/5/3; los 5 conceptos tienen 3 o más ejercicios.
    - Anclas 001–005 con un solo concepto.
    - Lección de 1,698 palabras con front matter (tope 1,700).
    - Jefe con 8 propias y 3 de repaso (calc-05-010, calc-07-016 y calc-06-019; la 06 y la 07 entran por primera vez a un repaso), 1600 s y oleadas 3/5/3.
  - **`/revisar-contenido`:**
    - **A ciegas:** 24/24. Después de los arreglos, 14/14, y otra vez el 015 y el 024. La app acepta todas las formas del resolutor (`+0.5`, la forma factorizada del 018 y `64/5`).
    - **Checklist:** los tres dieron objeción, sin respuestas erróneas.
    - **Arreglos aplicados con el sí de Carlo («Errores + mejoras»):**
      - criterios con sus dos mitades en el 009 y el 024, y el 015 amarrado a «la primera pregunta del triaje que diga sí»;
      - la opción del 017 que se contradecía;
      - la hipótesis $f'\neq0$ en el 022;
      - ln|x| + C en cada intervalo, con constantes que pueden ser distintas de cada lado;
      - el Predice con «los dos»;
      - el 023 pasó a $e^{-x}\operatorname{sen}3x$, porque $e^{-\theta}\cos2\theta$ es de Stewart 7.1;
      - el triaje con orden explícito y «salvo un factor constante»;
      - «no se integra factor por factor»;
      - desvanecidos que piden un paso real;
      - el 021 revisado en $x=e$;
      - senh practicado en el 002;
      - tolerancia de 0.0005 en el 019.
    - En `conceptos.yaml`, `integrales-inmediatas` suma el prerrequisito `derivada-hiperbolica`.
  - **Evidencia:**
    - `content:check content/calculo` en verde: 174 ejercicios, 141 por código y 33 manuales.
    - `test:content` 313/313 y `real-answers` 271/271.
    - En `localhost:3000`: 206 fórmulas KaTeX sin error, y los 6 huecos de los dos desvanecidos se califican bien.
- 2026-11-12 · **Unidad `calculo/06-razones-diferencial`** (sprint del parcial; 3.3 razones de cambio relacionadas y 3.4 diferencial).
  - **Esquema:** objeción sin bloqueo de matemáticas, pedagogía y razonamiento.
    - Lección con presupuesto por sección; quedó en 1,633 palabras, unos 25 min.
    - Método de 6 pasos con la «regla de las dos sustituciones»: lo que vale en todo instante va antes de derivar; lo del instante, después.
    - Contextos originales, verificados con sympy: prensa de tortillas, cámara de un auto autónomo, rollo de papel térmico, proyector y lata.
    - En los ejercicios, dx se escribe `h`, como el incremento de la notación, porque `verify_content.py` parte `dx` en d·x.
    - Unidades y π fuera de los huecos; tolerancias que rechazan el valor de la calculadora en la aproximación lineal.
    - Primer razonamiento causal-sistémico de Cálculo.
  - **Contenido (lo escribió `autor-contenido`):**
    - 25 ejercicios: 8 completar, 8 numéricos, 4 de selección múltiple, 2 simbólicos, 2 de opción múltiple y 1 autoevaluación. Escalera 5/5/7/5/3; 4 conceptos con 3 o más ejercicios de dificultades distintas.
    - Jefe con 8 propias, 4 de razones relacionadas y 4 de 3.4, y 3 de repaso (calc-03-006, calc-05-014 y calc-04-017; el repaso solo puede venir de unidades con número menor), 1590 s.
  - **`/revisar-contenido`:**
    - a ciegas: 24/24 y, tras los arreglos, 15/15, sin discrepancias y con todos los signos bien;
    - checklist de los tres con objeción y sin respuestas erróneas.
    - Con el sí de Carlo se aplicó:
      - la Conexión dice $\Delta y\approx f'(x)\,dx$, porque $dy$ es exacta;
      - el 014 pide el entero cubo perfecto más cercano;
      - «exacta» desambiguada en el 025;
      - formatos y tolerancias con π de calculadora y sin `±`;
      - el 024 con 40 m, porque se parecía al 3.42 de Larson;
      - `## Errores comunes` en la lección;
      - el 023 pide armar el modelo del anillo;
      - el 006 se convirtió en un problema tipo escalera, tablón de 2.6 m (5-12-13);
      - el jefe con más de 3.4.
  - **Evidencia:**
    - `content:check content/calculo` en verde (149 ejercicios, 121 por código y 28 manuales);
    - `test:content` 313/313;
    - `real-answers` 247/247;
    - el visual `secante-tangente` de $\sqrt[3]{x}$ en 8 marca 0.0833 = 1/12 en `localhost:3000`, sin errores de KaTeX.
- 2026-11-12 · **Unidad `calculo/07-maximos-minimos`** (sprint del parcial; 3.5 completa: criterios, gráficas y optimización).
  - **Convenciones (decidió Carlo):** «convexa» = ∪ y «cóncava» = ∩, como su profesor; punto crítico solo interior. Las dos van en la `notacion`.
  - **Esquema:** objeción sin bloqueo de matemáticas, pedagogía y razonamiento.
    - Una función hilo, $(x+1)^3(x-3)$, recorre críticos, $[a,b]$, tablas de $f'$ y $f''$, segundo criterio y trazado.
    - Gancho original del costo por lote; el planteamiento de la optimización es calificable (el modelo evaluado en un punto, el dominio, el candidato y el valor).
    - En las gráficas, $f$ es la función dibujada y $g$ la incógnita, porque el pie muestra la fórmula.
    - Los intervalos se piden por sus bordes en `completar`, nunca como pares.
    - Definiciones con sus hipótesis: valor extremo, primer criterio con $f$ continua, inflexión con tangente.
  - **Contenido (lo escribió `autor-contenido`):**
    - lección de unas 2,340 palabras (~25–28 min, un poco más que la 05);
    - 25 ejercicios: 9 completar, 4 numéricos, 4 de opción múltiple, 3 de conjunto, 3 de selección múltiple, 1 simbólico y 1 autoevaluación. Por dificultad, 5/5/7/5/3; 7 conceptos, cada uno con 3 o más ejercicios de dificultades distintas;
    - jefe con 8 propias (las 7 cubren los conceptos) y 3 de repaso (calc-05-009, calc-04-016 y calc-03-020), 1560 s.
  - **`/revisar-contenido`:**
    - a ciegas: 24/24 y, tras los arreglos, 12/12, sin discrepancias;
    - checklist de los tres con objeción y sin respuestas erróneas.
    - Con el sí de Carlo se aplicó:
      - la lección recortada;
      - el ejemplo de «el único crítico pide un intervalo» corregido, con $x^2+\frac2x$;
      - el 023 cambiado, porque era casi el 4.21 de Stewart: ahora $x^2+9y^2=9$ con $(2,0)$;
      - en el 014, «sin separador de miles»;
      - en el 020, «tiende al mínimo desde todo $c_0$»;
      - la hipótesis $f'(c)=0$ en el Ojo y el Feynman;
      - el 006 sin filtrar el modelo;
      - desvanecidos que retiran la clasificación y la justificación;
      - en el jefe, el 015 (concavidad) en lugar del 022.
    - Las asíntotas oblicuas se quedan para la 02.
  - **Evidencia:**
    - `content:check content/calculo` en verde (124 ejercicios, 99 por código y 25 manuales);
    - `test:content` 313/313;
    - `real-answers` 223/223;
    - la lección se abrió en `localhost:3000` sin errores de KaTeX.
- 2026-11-12 · **Unidad `calculo/05-cadena-implicita`** (sprint del parcial; 3.2.2 a 3.2.4 más las inversas de 3.2.1).
  - **Notación (decidió Carlo):** dy/dx en la cadena y la implícita; arcsenh, arccosh y arctanh.
  - **Esquema:** objeción sin bloqueo de matemáticas, pedagogía y razonamiento. Integra:
    - prueba de la cadena con φ, como bloque opcional;
    - dominios y signos de las inversas, suponiendo derivabilidad;
    - formato que la app sí puede calificar: dy/dx implícita solo en curvas polinomiales y sin simplificar con la ecuación; d²y/dx² en un punto; curvas implícitas como pares;
    - una línea de sintaxis en cada simbólico;
    - anclas de un solo concepto;
    - retropropagación con números, tabla de (f∘g)′ y (g∘f)′, (f⁻¹)′(b) y f⁽¹⁰⁾(0) inductivo;
    - autoevaluación de arccos.
  - **Contenido (lo escribió `autor-contenido`):**
    - lección de 160 líneas, unos 21–25 min;
    - 25 ejercicios: 8 numéricos, 7 simbólicos, 4 completar, 2 de opción múltiple, 1 de selección múltiple, 1 ordenar, 1 autoevaluación y 1 conjunto. Por dificultad, 5/5/7/5/3; los 6 conceptos con 3 o más de dificultades distintas;
    - jefe con 9 propias y 3 de repaso (calc-04-025, calc-03-024 y calc-01-019), 1260 s.
  - **`/revisar-contenido`:**
    - a ciegas: 24/24 y, tras los arreglos, 15/15, sin discrepancias;
    - checklist de los tres con objeción y sin respuestas erróneas;
    - con el sí de Carlo se aplicó:
      - 007 → $x^{\ln x}$ en $e$ (la fórmula ingenua daba lo mismo en 1);
      - frase falsa del 023;
      - ejemplo de d²y/dx² implícita;
      - lección recortada, con el esbozo como opcional;
      - 013 ya no filtra un término de la respuesta;
      - 025 sin `±`;
      - notación dy/dx;
      - en 008, $\operatorname{sen}^{-1}=\operatorname{arcsen}$ explícito;
      - desvanecidos con el paso modelado;
      - 010 de tres capas y 005 con cadena;
      - regla única «cada producto lleva `*`».
    - arcsec, arccsc y arccot entran solo en la tabla, con nota de convención (decisión de Carlo).
  - **Evidencia:**
    - `content:check content/calculo` en verde (99 ejercicios, 77 por código y 22 manuales);
    - `test:content` 313/313;
    - `real-answers` 199/199;
    - la lección se abrió en `localhost:3000` sin errores de KaTeX.
  - **Calendario:** con D−12 cumplido, la 05 es la última unidad que se estudia a fondo antes del parcial. Las que siguen (07, 06, 08, 09 y 02) sirven para práctica y simulacro.
- 2026-11-11 · **Unidad `calculo/04-reglas-derivacion`** (sprint del parcial, 3.2.1 del programa, sin regla de la cadena).
  - **Esquema:** objeción sin bloqueo de `experto-matematicas`, `pedagogo` y `arquitecto-razonamiento`. Lo que entró:
    - demostraciones completas solo del producto, $e^x$ y sen;
    - $\ln x$ por definición con $u=h/x$ y $v=\ln(1+u)$;
    - cociente por el recíproco;
    - respuestas en sintaxis de sympy y de la app;
    - anclas por concepto para `workedExampleFor`;
    - 4 tablas de valores, verificación con una secante, contraejemplos y diferenciación automática con pares;
    - clásicos de libro evitados.
  - **Unidad:** la escribió `autor-contenido`:
    - lección de 25 min y 170 líneas;
    - 25 ejercicios: 6 numéricos, 5 simbólicos, 5 de completar, 3 de opción múltiple, 3 de conjunto, 2 de selección múltiple y 1 autoevaluación. Por dificultad, 4/6/7/5/3;
    - jefe con 8 propias y 3 de repaso (calc-03-009, calc-03-019 y calc-01-014), 1155 s.
  - **`/revisar-contenido`:**
    - a ciegas: 23 de 23 y, tras los arreglos, 16 de 16, sin discrepancias;
    - checklist: matemáticas aprueba, pedagogo y lingüista dan objeción leve; sin errores de respuesta;
    - con el sí de Carlo se aplicaron:
      - «se ve en la 02» → «aquí se acepta»;
      - «secante» → «cociente de diferencias» cuando no es la recta, porque choca con $\sec x$;
      - 021 en positivo («marca las que fallan»);
      - Ojo de 5 viñetas y bloque «Cómo se escribe en la app»;
      - dominio de la potencia y de $\log_b$;
      - formato de respuestas;
      - en el jefe, $\ln x$ (013) y 01-014 en lugar de 01-005, que se respondía de memoria;
      - el 025 nuevo, $5^x-4\log_2x$.
    - La notación suma sech, csch y coth, `sec(x)^2` y `log(x, b)`.
  - **Evidencia:**
    - `content:check content/calculo` en verde (74 ejercicios, 55 por código y 19 manuales);
    - `test:content` 313/313;
    - `real-answers.test.ts` 175/175;
    - lección y ejercicio 011 (tabla en `array`) vistos en `localhost:3000`, sin errores de KaTeX.
- 2026-11-11 · **Unidad `calculo/03-derivada`** (sprint del parcial, 3.1 del programa: todo por definición).
  - **Esquema:** lo revisaron `experto-matematicas`, `pedagogo` y `arquitecto-razonamiento`. Los tres dieron objeción sin bloqueo y sus cambios se integraron:
    - pasos intermedios calificables (cociente simplificado con `variables: [x, h]`);
    - problemas de varios pasos;
    - ejemplo de trozos con el contraste del salto;
    - recuadro de continuidad, porque la 02 no existe;
    - laterales con `h` positivo y `real_root`;
    - pistas socráticas.
  - **La escribió** `autor-contenido`:
    - lección de 25 min con el gancho del auto de la 01, $s(t)=3t^2-t^3/3$, que da $v(3)=9$ m/s;
    - 24 ejercicios: 6 numéricos, 6 de opción múltiple, 5 simbólicos, 2 de completar, 2 de conjunto, 1 de ordenar con gráfica, 1 de selección múltiple y 1 autoevaluación. Por dificultad, 2/6/7/6/3. Cada concepto tiene 3 o más ejercicios de dificultades distintas;
    - jefe con 7 propias y 3 de repaso (calc-01-003, 006 y 018), 1200 s.
  - **`/revisar-contenido`:**
    - resolutor a ciegas: 23 de 23, 0 discrepancias;
    - checklist con objeción de los tres, sin bloqueo;
    - con el sí de Carlo se aplicaron 5 errores:
      - 022 coincidía con un ejercicio publicado de Stewart; ahora es $x^2-x$ con corte en 3, respuesta (5, −9);
      - la rúbrica del 021 decía «solo ahí»;
      - enunciados ambiguos en 017 (velocidad con signo), 024 (valores de $a$, no puntos) y 008 (comparar con signo);
    - y las mejoras: enunciados de 002, 004, 009, 010, 014, 015, 019 y 020; la lección recortada (Predice y Conexión) con el desarrollo y el porqué de cada paso; el 008 pasa a `recta-tangente`; en el jefe, el 011 en lugar del 009.
    - La notación de Cálculo suma $f'_{+}(a)$, $f'_{-}(a)$ y $\Delta x = h$ (con el sí de Carlo).
  - **Evidencia:**
    - `content:check content/calculo` en verde (49 ejercicios, 33 por código, 16 manuales);
    - `test:content` 313/313;
    - re-resolución a ciegas de los 12 cambiados: 12 de 12, 0 discrepancias;
    - la lección abierta en `localhost:3000` (servidor de otra sesión): el visual `secante-tangente` dice «pendiente ≈ 9», sin errores de KaTeX.
  - **Nota técnica:** con `dynamicParams = false`, un `next dev` ya corriendo no ve una unidad nueva (404) hasta que se toca la página de la unidad.
  - **Para el motor:** propuestas en «Decisiones pendientes».
- 2026-11-10 · **Arranca el sprint del parcial de Cálculo.** Google Calendar no tiene eventos de «parcial» ni de «examen» antes del 15 de diciembre, así que Carlo dio la fecha a mano. Respondió cobertura, fecha, orden, alcance y cuántas unidades escribir (ver «Decisiones tomadas · sprint del parcial de Cálculo»). No hay `respaldos/`, así que `/coach semana` sigue pendiente.
- 2026-11-10 · **Arreglos de `01-limites`** (aprobados por Carlo tras `/revisar-contenido`). Los escribió `autor-contenido` con una especificación cuyos números se comprobaron antes con sympy.
  - **Lección:**
    - ejemplos nuevos: laterales, límite notable ($\operatorname{sen}5x/2x$) y encontrar δ;
    - «Al infinito» y el `<Desvanecido>` usan otras funciones, para que dejen de ser copia de 004 y 006; los huecos ahora piden números (16 y 1/8);
    - leyes de los límites y sustitución directa con sus hipótesis;
    - corregidas las frases de 0/0, la tabla y la notación O;
    - «Nivel experto» avisa que está fuera del programa y pasó antes del cierre;
    - `programa_ref` precisa qué parte de 2.3 cubre;
    - «sen» en vez de `\sin`.
  - **Ejercicios:**
    - 002 y 007 retirados;
    - 010, 011, 012, 018 y 021 corregidos;
    - `verificar` de 017 y 021 por una vía independiente (017 evita el error de `Piecewise`);
    - nuevos 022 a 027: gráfica con hueco, `floor` con salto en `seleccion_multiple`, tabla de $(e^x-1)/x$, $x\to-\infty$ y dos de ε–δ.
    - Quedan 25 activos: 14 numéricos, 6 de opción múltiple, 2 de completar y 1 de ordenar, 1 de autoevaluación y 1 de selección múltiple. Por dificultad 5/8/8/3/1, y todos los conceptos con 3 o más.
  - **Jefe:** sale 004 y entra 018 (laterales); siguen 6 preguntas.
  - **Evidencia:**
    - `content:check` en verde (25 ejercicios: 17 por código, 8 manuales);
    - `pnpm test:content` 313/313;
    - resolutor a ciegas 13/13 en lo nuevo y lo cambiado, 0 discrepancias;
    - e2e `smoke` y `study` 10/10 (la lección con 1 tabla y 2 huecos, el jefe con 6);
    - 022 y 023 vistos en `localhost:3000/ejercicios/…` sin contestar: el hueco en (1, 2) y los saltos de `floor` se dibujan, sin errores de consola.
  - **Fuera de estos arreglos:** el pulido en «Decisiones pendientes».
- 2026-11-10 · **Prueba del equipo con agentes reales** (casilla de la v1). Sesión del app que arrancó en `0IPN/Cortex` y se movió a `cortex/`.
  - **Pasos y evidencia:** en la casilla «Prueba con los agentes reales» de la v1. Pasaron descubrimiento, MCP, cercas, `/revisar-contenido` y `/consejo`. `/coach semana` queda pendiente porque no hay respaldo. El CLI sigue sin sesión (`claude auth status` → `"loggedIn": false`).
  - **`/revisar-contenido`, checklist:**
    - `experto-matematicas` recalculó las 21 respuestas por otra vía (Taylor, `cancel`, x = 1/t, `solveset`) y todas salen bien;
    - los tres revisores coinciden en la calificación de `completar` y del `<Desvanecido>`, la notación «sen», la frase de 0/0 y los conceptos con menos de 3 ejercicios;
    - `pedagogo` añade que la práctica y el jefe repiten los ejemplos de la lección;
    - arreglos propuestos en «Decisiones pendientes»; no se tocó `content/`.
  - **`/consejo`, veredictos:**

    | Asesor | Veredicto | Punto clave | Recomendación |
    |---|---|---|---|
    | `experto-matematicas` | Objeción condicional | La Unidad III pesa más (21.5 de 81 h con docente; 3.5, optimización, 9 h); el tronco es 03 → 04 → 05; «00 a 07» no basta si entra la IV | Carlo dice qué secciones entran; si es solo la III: 03 → 04 → 05 → 07 → 06 |
    | `pedagogo` | Objeción condicional | 06 y 07 son lo que pide la competencia de la III; el simulacro (12 × 120 s, solo respuesta final) no mide problemas de varios pasos | Sin temario, empezar por 02; diagnóstico de 5 problemas en papel antes de la III |
    | `cientifico-memoria` | Objeción condicional | En el sprint caben 2–4 unidades nuevas; `currentUnits` manda a la primera unidad no dominada por número | Última unidad nueva en D−12, simulacro en D−6, `requestRetention` en 0.90 |

    - *Coinciden:* sin saber qué entra y la fecha no se puede priorizar; «00 a 07» es una suposición.
    - *Chocan:* matemáticas y pedagogo ordenan por peso del examen (07 antes que 06, y 00 al final o solo como diagnóstico); memoria pide escribir en orden de número, porque la sesión diaria manda a la primera unidad sin dominar y una 00 escrita se pondría antes que la 01.
    - Decide Carlo con la cobertura del parcial.
  - **Hallazgos técnicos:**
    - sympy 1.14 da mal los límites laterales de `Piecewise` en el punto de corte: `limit(Piecewise((x**2, x<1), (3*x-1, True)), x, 1, '-')` devuelve 2 (es 1); con `x = 1 - h` y `h` positivo sale 1. Hay que evitarlo en los `verificar` de la unidad 02. El de `calc-01-017` no usa `Piecewise`.
    - Propuestas para el motor, que decide Carlo:
      - desempatar el calentamiento con un barajado por día (hoy se desempata por id y salen bloques por unidad, `srs.ts:124`);
      - que `planExam` prefiera ejercicios nunca intentados;
      - que `workedExampleFor` tome el ejemplo más cercano por debajo del nivel y no use autoevaluaciones (`flow.ts:90`).
- 2026-11-10 · **v1 · Equipo y coach** (ADR-024 a ADR-026).
  - **Brainstorm y plan con Carlo:**
    - equipo de agentes;
    - coach por MCP;
    - KPIs reales;
    - iPad con Pencil como PWA en la v1.1 y nativa después;
    - sync por relay propio en el VPS;
    - Ruta IA en paralelo;
    - sprint del parcial de Cálculo antes de la v1.1.
  - **Hecho:**
    - 19 agentes y `docs/08`;
    - 3 cercas;
    - 3 comandos nuevos y 4 actualizados;
    - MCP con 5 herramientas;
    - 3 módulos puros del motor;
    - `docs/09` con la visión del iPad y el catálogo del brainstorm.
  - **Evidencia:**
    - `pnpm check` en verde (lint, tipos, 860 pruebas unitarias y 277 de contenido) antes de agregar la prueba de las cercas;
    - 36 pruebas de las cercas;
    - 25 pruebas nuevas de motor y MCP, incluida la de privacidad y una que arranca el servidor real por stdio con el comando de `.mcp.json`.
  - **No verificado aún:** los agentes reales y el MCP dentro de una sesión de Claude Code, porque esta sesión no carga agentes nuevos a media sesión. Queda en la checklist de v1.
  - **Después, el mismo día:** Carlo decidió abrir sus sesiones en `cortex/`. El mapa de maestría con el motor nuevo quedó probado en el navegador (un acierto mueve solo su concepto a «Vista»). El CLI sigue sin sesión, así que la prueba de los agentes reales queda para la primera sesión abierta en `cortex/`.
- 2026-11-10 · Decisión de Carlo: logaritmos **siempre con base** en todo lo que ve y escribe el estudiante (regla en `docs/05`, sección de funciones del verificador). Sin cambios de código. Revisado en todo `content/`: los `log` sin base que hay son de notación asintótica (`$O(\log n)$` en Programación 11 y en la conexión de `01-limites`), la excepción de la regla porque ahí la base no importa; el único `log(` evaluable es `log(1024, 2)` en un `verificar` de Programación, que ya lleva base. La ayuda del campo de fórmulas no menciona logaritmos.
- 2026-11-10 · F3 paso 7, cierre: Carlo aprobó el temario con `00-funciones` (ver «Decisiones tomadas · temario de Cálculo»). `content/calculo/conceptos.yaml` tiene ahora 76 conceptos agrupados por unidad, con un comentario que da la sección del programa oficial: 12 de funciones, los 7 del piloto, y 7, 6, 5, 6, 4, 7, 5, 4, 8 y 5 para las unidades 02 a 11. Los ids del piloto no cambian. Solo ganan prerrequisitos de funciones: `limite-intuitivo` ← `funcion-representaciones` y `limite-notable-seno` ← `funciones-trigonometricas`. La lección `01-limites` lleva esos dos en `prerrequisitos` y `programa_ref: "Cálculo, Unidad II (2.1 a 2.3)"`, que antes decía «pendiente». La `notacion` pide escribir la base de los logaritmos (ver decisión pendiente sobre `log`). No se crearon carpetas de unidad: una carpeta sin sus tres archivos no pasa `content:check`, así que cada una nace en el paso 8 con su lección. *Revisado al diseñar:* los prerrequisitos solo afectan al mapa, que los dibuja como nodos fantasma (no se pueden enfocar y no bloquean la práctica); en ⌘K el grupo «Unidades» va antes que «Conceptos», así que los conceptos nuevos con «límite» no le quitan el primer lugar a la lección piloto (e2e de la paleta). El logro del Teorema Fundamental depende del jefe de la unidad 10, no de un id de concepto. *Para el paso 8:* (1) con `00` delante, `fill-boss-review.py calculo` le pondrá repaso al jefe de `01`, y la e2e 9 (`e2e/study.spec.ts`, que cuenta 6 preguntas) tendrá que cambiar; (2) ningún título de unidad nueva debe llevar «límites». `pnpm content:check` en verde: 0 errores; los 12 avisos son los `programa_ref` pendientes de Programación. `pnpm check` en verde (835 pruebas unitarias y 277 de contenido) y las e2e afectadas (8, 9, 10, 16 y 20: sesión, jefe del piloto, mapa en celular, lección por pasos y paleta) en verde en el puerto 3100.
- 2026-11-10 · F3 paso 7: puerta de temario de Cálculo; programas conseguidos y propuesta de temario. *Programas:* no estaban en la Mac (solo material de clase: Tareas 1 y 2 de Cálculo, cuadernillo 1 de Discretas). Con permiso de Carlo se descargaron de la biblioteca oficial de ESCOM (`escom.ipn.mx/docs/oferta/uaIIA2020/`) `calculo_IIA2020.pdf` (138 835 B, sha256 `eebb3ec8…294355`) y `matematicasDiscretas_IIA2020.pdf` (134 757 B, sha256 `a41a6a17…6c03db`): programa sintético y de estudios de IIA, semestre I, vigentes desde enero de 2020, firmados por ESCOM y UPIIC (Coahuila). Quedaron como `calculo.pdf` y `matematicas-discretas.pdf`, sin versionar. Las Tareas 1 y 2 de Carlo (funciones, Stewart, que está en la bibliografía) coinciden con la Unidad I. *Unidades oficiales de Cálculo:* I Funciones algebraicas y trascendentes (representaciones; monotonía, simetría y periodicidad; inversas; exponenciales, logarítmicas, trigonométricas e inversas, hiperbólicas e inversas; transformaciones) · II Límites y continuidad (gráfica y numérica, analítico, indeterminadas, unilaterales, trigonométricos, infinitos y en el infinito con asíntotas horizontales, verticales y oblicuas, continuidad en un punto y en un intervalo) · III Derivada y aplicaciones (razón de cambio, reglas para algebraicas y trascendentes, cadena, implícita, orden superior, razones relacionadas, diferencial, criterios de 1.ª y 2.ª derivada, gráficas, optimización) · IV Técnicas de integración (antiderivada, sustitución, partes, trigonométricas y sustitución trigonométrica, fracciones parciales) · V Integral definida y aplicaciones (propiedades, TFC, trapecio y Simpson, área entre curvas, volúmenes por discos, arandelas y capas, longitud de arco y área de superficie). *Diferencias con el temario propuesto:* (1) falta toda la Unidad I; (2) el programa pone todas las técnicas de integración antes de la integral definida; (3) temas que no estaban: asíntotas oblicuas, integración numérica, área de superficie, derivadas de hiperbólicas. El piloto `01-limites` cubre II.1 a II.3 sin asíntotas y trae ε–δ, que el programa no pide. *Propuesta a Carlo:* `00-funciones` antes del piloto (las expresiones regulares aceptan `00`; la interfaz diría «Unidad 00»; el repaso entrelazado le agregaría preguntas al jefe de `01` y la e2e 9, que cuenta 6, tendría que cambiar) · 02 continuidad y asíntotas · 03 la derivada · 04 reglas de derivación · 05 cadena, implícita y orden superior · 06 razones relacionadas y diferencial · 07 máximos, mínimos, gráficas y optimización · 08 antiderivadas, sustitución y por partes · 09 trigonométricas, sustitución trigonométrica y fracciones parciales · 10 integral definida, TFC e integración numérica · 11 aplicaciones de la integral (jefe final). *Discretas, para el paso 9:* I Lógica · II Conjuntos · III Números enteros (divisibilidad, Euclides, teorema fundamental de la aritmética, inducción, sistemas de numeración) · IV Estructuras discretas (álgebras booleanas y Karnaugh, relaciones, orden y equivalencia, enteros módulo n y teorema chino del residuo, grafos y árboles). No trae conteo ni recurrencias, que el temario propuesto sí; el sintético numera dos veces la III (el de estudios dice IV). *Leer PDFs en esta Mac:* no hay `poppler` ni `pypdf`, y `swift` falla por un error de las Command Line Tools; PDFKit desde `osascript -l JavaScript` sí extrae el texto.
- 2026-11-10 · F3 paso 6: simulacro de examen (ADR-023). *Motor* `src/engine/exam.ts` (puro, 15 pruebas): `planExam` reparte por turnos entre las unidades elegidas y, dentro de cada una, toma la banda de dificultad con más faltante; orden de fácil a difícil; máximo `maxLong` ejercicios largos de código; avance sin retroalimentación, saltar (al final de la fila), entregar, tiempo agotado y `examResult` (por unidad y por concepto, el más débil primero). `apportion` (mayor residuo) sale de `waveSizes` y lo comparten jefes y simulacro. *Persistencia:* `finishExam` guarda todo al entregar y en una transacción: cada respuesta por `recordAnswer` con `mode: "exam"` (mismo XP que la práctica, sin bono), sesión `exam`, errores al cuaderno y récord `best:exam:<materia>` (2 pruebas con IndexedDB falsa). *Interfaz:* `exam-runner.tsx` (configurar con unidades, examen con reloj, contador, Saltar `S` y Entregar con confirmación, resultado con desglose, tu respuesta en lo fallado y botón al repaso de hoy); `ExerciseCard` con `reveal={false}` ("Responder", sin pistas, sin decir si acertaste); Esc no saca a medio examen (`data-escape-guard`); S no salta mientras eliges la confianza. Entradas: tarjeta en la página de la materia y "Simulacro de examen · <materia>" en ⌘K. `docs/02` y `docs/03` al día. *Tu parte (TODO(Carlo)):* las reglas de `CONFIG.exam` (12 preguntas, 120 s por pregunta, 30/40/30, aprueba con 60 %, 1 largo) son un valor inicial razonable; ajústalas a tus parciales. *Verificado en la vista previa sin tocar tus datos:* en `localhost:3000` solo se miró la configuración, se contestó una pregunta (avanzó sin revelar nada), se saltó otra con S, Esc no sacó y se salió con "Salir"; la IndexedDB quedó con 0 intentos y 0 sesiones de examen. El examen completo se juega en la e2e (puerto 3100, otro origen). *Hallazgos al probar:* (1) el ayudante de e2e nunca contestaba mal un `ordenar` (siempre lo ordenaba); salió porque el simulacro baraja con la hora. Ahora entrega el orden barajado, que la app nunca muestra ya ordenado; el spec del simulacro pasó 12 veces seguidas. (2) La sección de ejemplos de `/estilo` desbordaba 17 px a 320 px (el selector no se envolvía); corregido. (3) `tests/lint-boundaries.test.ts` fallaba a veces con la máquina ocupada: su primera prueba arranca ESLint en frío y pasaba de los 5 s; ahora tiene 30 s. (4) `ExamQuestion` heredaba `id` en lugar de `exerciseId` y una prueba se quedaba en un ciclo infinito: lo atrapó la propia prueba antes de llegar a la interfaz. *Evidencia:* `pnpm check` en verde (lint, typecheck, 835 unitarias y 277 de contenido); `pnpm build` y e2e 24/24 (nuevas: `exam.spec.ts` con el examen completo, Esc, saltar, desglose, récord y tiempo agotado con el reloj de Playwright; `/materias/programacion/simulacro` en la prueba de desborde a 320 y 375 px). El `NoFallbackError` que imprime el servidor en la prueba del 404 es el registro interno de Next al servir una ruta inexistente; la prueba pasa. *Revisión de seguridad automática:* la del commit del paso 5 no se completó (el plugin recibió HTTP 401; detalle en `~/.claude/security/log.txt`).
- 2026-11-10 · F3 paso 5: tipos nuevos de ejercicio. *Primera parte (commit `7f150cb`):* esquemas Zod de `tabla_verdad` (la columna se comprueba contra el intérprete de la app), `conjunto` y `seleccion_multiple`, campo `visual` (solo `grafica` y `grafo`: los demás anuncian su conclusión) y calificación en `check.ts`. *Segunda parte:* `verify_content.py` los verifica por otra vía: la tabla la recalcula **sympy.logic** con un lector propio de la misma gramática; los conjuntos se comparan sin orden contra lo que da `verificar` (`1/2` y `0.5` son el mismo elemento; pares como tuplas); en `seleccion_multiple`, `verificar` da un booleano por opción. Prueba nueva `tests/content/logic-parity.test.ts`: 45 fórmulas válidas y 12 inválidas leídas igual por la app y por Python (cada símbolo y palabra, precedencia, asociatividad, letras `y`/`o`/`v` como conector o variable, constantes que sympy simplifica y NFKC). Seis casos nuevos de paridad Zod ↔ Python y tres casos buenos y tres malos en `content-check.test.ts`. *Interfaz* (`src/components/study/math-types.tsx`): selección múltiple con casillas y teclas A, B, C…; conjunto con vista previa en vivo («Leo {…} · n elementos») y errores de lectura que no gastan el intento; tabla de verdad con un grupo de radio por fila, una parada de Tab por fila, V/F o 1/0 que llenan y bajan solas, ↑/↓ entre filas y la respuesta esperada «de arriba abajo» en el orden y los símbolos de `convention.ts`. El visual del enunciado va debajo con su descripción; el grafo se dibuja **fijo** (`interactive={false}`), porque elegir un vértice muestra su grado. `/estilo` tiene una sección jugable con cuatro ejemplos (`demo-exercises.ts`), validados por el esquema real, el verificador de la app y una comprobación aparte (divisibilidad, grados contados en el grafo, raíces sustituidas). `docs/05` (tipos, gramática y orden canónico, conjuntos, `visual`), plantilla de ejercicios, `/revisar-contenido` y la prueba de ida y vuelta cubren los tres tipos. *Sin cambios a propósito:* el mini quiz y `fill-boss-review.py` ya los aceptan (no son ejercicios largos de código). *Bug encontrado al probar en el navegador:* en la tabla de verdad el foco bajaba de fila con `requestAnimationFrame`; al teclear rápido (o con la pestaña oculta) la siguiente tecla caía en la misma fila. Ahora el foco se mueve en el acto (las filas no cambian de lugar) y la e2e lo cubre. *Incidente:* `.next/dev/types/routes.d.ts`, escrito por el `next dev` que ya corría, estaba truncado y rompía `pnpm typecheck` (el tsconfig lo incluye); se reemplazó con el que genera `next typegen`. Si vuelve a pasar, basta reiniciar `pnpm dev`. *Evidencia:* `pnpm check` en verde (lint, typecheck, 816 unitarias y 277 de contenido); e2e nueva `e2e/math-types.spec.ts` en verde (correcto, incorrecto, conjunto ilegible y tabla incompleta, solo con teclado, sin errores de consola); en la vista previa, los cuatro ejemplos jugados con teclado y la tabla sin desborde a 375 px. Una corrida de las unitarias falló una vez en la prueba de zonas de ESLint (corre ESLint en frío) y pasó al repetirla; no se volvió a ver.
- 2026-10-13 · F3 paso 4: respuestas ampliadas (la app y `verify_content.py` con la misma regla). *Evaluador de la app:* `sen`, `arcsen`/`arcsin`, `arctan`/`arctg`, hiperbólicas e inversas, `binomial(n, k)` y `C(n, k)`, `P(n, k)`, `mod`, `gcd`, `lcm`, `min`, `max`; infinito como `oo`, `∞`, `inf` o `infinito` (con ayuda en el campo numérico). *Enteros exactos:* con tolerancia 0 y respuesta entera, el margen relativo de 1e-9 se topa por debajo de 0.5; antes, con 10⁹ o más, se aceptaba el entero de al lado. En Python dos enteros se comparan sin pasar por float. *`simbolico`:* `salvo_constante: true` para antiderivadas (acepta cualquier constante, escrita como `+ C` o no) y `muestreo: { desde, hasta, enteros }` para expresiones que no existen entre −3 y 6 o que solo valen en enteros. *Verificador de Python:* `completar` ya se puede verificar (`verificar` devuelve un valor por hueco), `opcion_multiple` acepta `valores` simbólicos y `verificar.python`, `verificar.python` tiene `itertools` y funciones sin efectos para verificar un conteo **enumerando** los casos, y cada expresión tiene un tope de 30 s (antes un `integrate` colgado detenía todo). *Prueba nueva* `src/content/real-answers.test.ts`: la respuesta oficial de cada ejercicio que se califica con texto (122 hoy) debe salir correcta en el verificador de la app. *Dos bugs que ya existían y salieron al escribir las pruebas:* `log10(100)` se leía como `log(10)·(100)` y daba 230.26 en vez de 2, y `log2(8)` daba 5.55 en vez de 3, **sin avisar**; `sech`, `csch` y `coth` fallaban con «variable h». La causa era la regla que permite escribir `sin x` sin paréntesis: un nombre debe ir antes que su prefijo. Ningún ejercicio actual los usaba. *Efecto en el contenido:* `prog-03-006` (opción múltiple con `verificar.python`) pasó de revisión manual a verificado por código, y sale bien: ahora son 181 verificados y 76 manuales. *Evidencia:* `pnpm check` en verde (lint, typecheck, 795 unitarias, 132 nuevas, y 213 de contenido, 3 nuevas que prueban cada regla de Python con su caso bueno, su caso malo y el corte por tiempo); `pnpm content:check` en verde (13 unidades, 257 ejercicios); e2e 21/21. La ubicación de la prueba de ida y vuelta cambió respecto al plan (`src/content/` en lugar de `tests/content/`): no necesita Python y así corre con las unitarias, en segundos.
- 2026-10-13 · F3 paso 3: lógica, tablas de verdad y grafos. *Motor (puro, con pruebas):* `src/engine/logic/formula.ts` lee fórmulas con símbolos (`¬ ∧ ∨ ⊕ → ↔`), ASCII (`~ & | -> <->`) y palabras (`no`, `y`, `o`); una `y`, `o` o `v` suelta es variable donde va una variable y conector donde va un conector, sin ambigüedad porque dos variables nunca van juntas. Precedencia de Rosen y `→` asociando a la derecha. Al escribir una fórmula pone paréntesis siempre que se mezclan conectores (`(p → q) ↔ (¬q → ¬p)`), porque la precedencia entre `→` y `↔` no se enseña igual en todos los cursos; lo escrito vuelve a leerse como la misma fórmula (probado con 108 fórmulas anidadas). `truth-table.ts` da la tabla en un orden canónico fijo (todas verdaderas primero) con las columnas intermedias de adentro hacia afuera, y clasifica en tautología, contradicción o contingencia. `convention.ts` decide solo cómo se muestra (símbolos y orden de filas) y lleva un `TODO(Carlo)`. `src/engine/graph.ts`: vecinos, grados y acomodo en círculo. *Visuales:* `<Visual id="tabla-verdad" formula="…">` (fórmula editable, botones para insertar símbolos, columnas intermedias opcionales, veredicto) y `<Visual id="grafo" vertices="…" aristas="…">` (SVG propio, llega dibujado desde el servidor; al elegir un vértice resalta sus aristas y lee su grado; con `dirigido="si"` dibuja flechas). `ResolvedVisual` pasó a ser una unión (función, tabla de verdad, grafo). *Hallazgos al probar en el navegador:* (1) el panel de vista previa estaba oculto y ahí `requestAnimationFrame` no corre, así que el cursor no se recolocaba tras insertar un símbolo: se cambió a `flushSync`, que no depende de que la pestaña se vea; (2) el selector de Riemann desbordaba su control a 320 px: los grupos de opciones ahora bajan de línea. *Evidencia:* `pnpm check` en verde (lint, typecheck, 663 unitarias, 78 nuevas, y 210 de contenido); `pnpm content:check` en verde; e2e 21/21. En el navegador: `(p → q) ∧ ¬q` da F, F, F, V; al escribir `(p -> q) <-> (no q -> no p)` da tautología; insertar `∨` deja el cursor después del símbolo y se puede seguir escribiendo; ← y → dentro de la tabla no llegan al lector por pasos; en el grafo de 5 vértices, `a` tiene grado 3 y vecinos b, c, e; en el dirigido, de `b` sale 1 y llega 1; a 320 px la tabla se desplaza dentro de su marco y la página no desborda; sin errores de consola nuevos. *Sobre el incidente del paso 2:* esta corrida completa no tuvo ningún proceso terminado; la diferencia fue apagar el servidor de vista previa antes y aparte, no en el mismo momento de lanzar las pruebas. Regla práctica: no apagar la vista previa mientras corre `pnpm check`.
- 2026-10-13 · F3 pasos 1 y 2: visuales de lección (ADR-021). *Mafs:* aceptado contra seis criterios, con dos hallazgos que fijan cómo se usa. (1) Numera los patrones de su cuadrícula con un contador del módulo, así que su SVG no puede venir del servidor: se usa siempre con ancho automático y nunca con `ssr`. (2) Su dependencia `use-resize-observer` declara soporte hasta React 18; pnpm solo avisa y en la práctica vuelve a medir bien con React 19. *Hecho:* `<Visual id … />` real con parámetros de texto y cuatro visuales (`grafica`, `limite`, `secante-tangente`, `riemann`); `src/content/core/visuals.ts` valida y resuelve los parámetros y la guardia reporta cada problema con su línea; `src/engine/plot.ts` con el muestreo por tramos, sumas de Riemann, Simpson y la estimación de límites laterales; `toTex` para escribir la función en la descripción que genera el servidor; estilos con tokens y el mapa de variables de Mafs sin capa; sección de visuales en `/estilo` con ambos temas; `docs/05` (sección "Visuales") y `docs/02`. La lección de límites lleva un `<Visual id="limite">` de su propia función, en el paso 2. *No se tocó* `content/_plantillas/leccion.mdx`: un visual es opcional y la plantilla es la anatomía que toda lección debe tener. *Bug que ya existía y salió al probar:* el evaluador de respuestas reescribía `log(x, 2)` como `log((x, 2))` y no se podía escribir un logaritmo con base; corregido con prueba de regresión. *Evidencia:* lint y typecheck limpios; 585 unitarias (77 nuevas: geometría, especificación de visuales, criterios de Mafs, guardia y regresión del logaritmo), entre ellas la invariante de los pasos con el visual ya dentro de la lección de límites; `pnpm content:check` en verde (13 unidades, 257 ejercicios); 210 de contenido; e2e 21/21. En el navegador (servidor de verificación, puerto 3200): cero errores de consola y de hidratación en `/estilo` (5 gráficas) y en la lección; 30 recursos cargados, ninguno fuera de `localhost`; el visual del paso oculto se dibuja al mostrarse (607 px) y se vuelve a medir a 375 px (301) y a 320 px (246), sin desborde horizontal; con el foco en el deslizador, End, ← y → mueven el control y la lección sigue en el paso 2; la conclusión del visual coincide con la lección (límite ≈ 6; la función no existe en x = 3); en `secante-tangente` con h = 0.05 la secante da ≈ 2.05 y la tangente ≈ 2; ⌊x⌋ se dibuja con punto relleno a la izquierda y hueco a la derecha de cada escalón; ambos temas revisados en captura. *Incidente al verificar:* en la primera corrida completa de `pnpm check`, un proceso de Vitest que corría `tests/content/content-check.test.ts` recibió SIGTERM a los 150 s (no fue una aserción; coincidió con apagar el servidor de vista previa). El repo no envía esa señal en ningún lado. La misma prueba pasó sola (18/18) y el proyecto de contenido completo pasó al repetirlo (210/210 en 299 s). Si vuelve a ocurrir, hay que investigarlo antes de repetir.
- 2026-10-10 · Cierre del rediseño "Arcano": el 2026-10-08 Carlo lo probó en local y pidió fusionarlo; `rediseno-ui` entró a `fase-2-programacion` como fast-forward (14 commits, hasta `7674f47`, sin commit de merge) y se subió a `origin`. Tras la fusión no se volvieron a correr `pnpm check` ni las e2e: el árbol es idéntico al que se probó en `rediseno-ui`. El 2026-10-10 se borró la rama local `rediseno-ui` (nunca tuvo rama remota). Pendiente: GitHub movió el repo a `carlobuilds/cortex` (mismas 4 ramas y commits que la dirección vieja, comprobado con `git ls-remote`); `origin` sigue apuntando a `BLOW3ED/cortex` y funciona por redirección hasta que Carlo lo cambie con `git remote set-url`.
- 2026-10-05 · Rediseño de interfaz "Arcano" (ADR-020), rama `rediseno-ui`, 14 commits. *Diseño:* proyecto de Stitch "Cortex — Rediseño" (`projects/5107797018426403734`); Carlo eligió en CP1 la variante "Arcano" + el jefe de "HUD cian" con glow sutil, aprobó en CP2 las pantallas de estudio (con header de foco y paleta ⌘K) y en CP3 el tema claro y el móvil; los textos de Stitch (inventados: "Tip de examen", "esencias de memoria", fechas 2024) no se copiaron: todo sale de datos reales. *Código:* tokens OKLCH nuevos validados antes con un script aparte (68 pares AA) y luego por `tokens.test.ts` (34 pares por tema); tema según el sistema con selector rápido y control en Ajustes (sin migración de Dexie: `"system"` es solo un valor más del tipo y del esquema del respaldo); primitivas de radix-ui transcritas a mano (Tooltip, Tabs, Dialog, Sheet, DropdownMenu, ToggleGroup) y estados (`LoadingState`, `EmptyState`, `StatTile`, `ProgressRing`, `Kbd`), sin dependencias nuevas; navegación con `aria-current`, barra inferior + hoja "Más" bajo `lg` y header de foco en las rutas de estudio; paleta Ctrl/⌘K (combobox ARIA, búsqueda sin acentos); inicio centrado en "Hoy" con la ruta de la sesión leída de `readToday` (la misma fuente que /sesion); /materias con el plan completo; **lección por pasos**: plugin de rehype (después de la guardia, con `steps: true`) + lector cliente con riel, →/←/V, foco al título, `aria-live`, `hidden="until-found"` (Ctrl+F) y la lección completa en el servidor; migas del servidor y Esc sin recarga (router); tarjeta de ejercicio, jefe, cierre del día y progreso reestilizados; mapa de maestría por unidad con layout por capas (camino más largo + baricentro) y aristas SVG; barrido de consistencia (`eyebrow`, bordes de 1 px, escala de texto, `PageHeader`); `/estilo` con ambos temas. *Hallazgos al verificar:* (1) un objeto exportado desde un módulo `"use client"` llega a un componente de servidor como referencia opaca y al expandirlo queda vacío (pasó con `THEME_BOOT` y con el mapa de componentes de los pasos): se arman del lado del servidor; (2) en una cuadrícula con columna `auto`, un texto con `truncate` empuja el ancho mínimo y desborda en el celular: columnas con `minmax(0,1fr)`; (3) con 6 destinos, la nav de escritorio no cabía junto al HUD extremo a 768–1023 px: aparece desde `lg`. *Aportes pendientes de Carlo (opcionales, marcados `TODO(Carlo)`):* si el calentamiento sin repasos cuenta como hecho en el anillo del inicio (`src/lib/session-route.ts`), si el final de la lección forma un paso "Cierre" (`src/content/lesson-steps.ts`) y cómo se ordenan los nodos del mapa (`src/lib/graph-layout.ts`). Evidencia: `pnpm check` en verde (lint, typecheck, 508 unitarias + 210 de contenido); `pnpm content:check` en verde (13 unidades, 257 ejercicios, `content/` sin cambios; la prueba de invariante compara el HTML con y sin pasos en las 13 lecciones); e2e 21/21 (6 nuevas: pasos, celular, navegación y hoja Más, tema según el sistema sin destello, paleta, migas y Esc sin recarga); sin desborde a 320/375 px; capturas revisadas en ambos temas, escritorio y celular, contra las pantallas aprobadas en Stitch.
- 2026-10-02 · F2 completa (rama `fase-2-programacion`): CodeMirror 6, Pyodide local en Web Worker, runner de C local con candados (ADR-019); tipos `depurar`, `parsons`, `rastreo_memoria` y pruebas `oculto` en Zod, `verify_content.py`, paridad, docs/05 y la interfaz; 12 unidades de programación con lección, 18–20 ejercicios y jefe cada una. Verificación independiente: `verify_content.py` corre cada solución (Python y C), exige que plantillas y códigos con bug fallen, que `depurar` cambie solo las líneas marcadas y comprueba cada respuesta de rastreo insertando un `printf` tras la línea. Revisión a ciegas por subagentes (resuelven sin ver respuestas; su código se corre contra TODAS las pruebas, también las ocultas): 0 discrepancias en las 12 unidades; sus observaciones de lección y redacción se aplicaron (p. ej. De Morgan con rango estricto, `%` con negativos en C, `%lf` en `scanf`, copia superficial, `v[-1]` como comportamiento indefinido, patrón de `realloc`, `feof`, EOF de `scanf`, cota O más ajustada). La revisión también destapó y se arreglaron: archivos que persistían entre corridas de Pyodide (ahora carpeta temporal por corrida) y dos fallas de `verify_content.py` (tolerancia con `inf`; ámbito de `eval` en comprensiones), con pruebas de regresión. Evidencia: `pnpm content:check` en verde (13 unidades, 257 ejercicios; solo avisos de `programa_ref` pendiente); `pnpm check` 392 + 210 (incluye correr todas las soluciones del repo en ambos runners); `pnpm build` (325 páginas estáticas); Playwright 15/15 (smoke, sesión del día, jefe, desborde y 5 nuevas: Python con Pyodide servido en local, C con el runner, Debug Dojo, Parsons y rastreo). Al correr las e2e se corrigieron dos pruebas (no la app): la sesión del día ahora empieza por programación y el ayudante de `ordenar` comparaba Markdown crudo con el DOM; la descarga de Pyodide se mide en el contexto porque ocurre dentro del Worker.
- 2026-10-02 · F1 pasos 2–9: Dexie v2 + capa de progreso; texto enriquecido y `/catalogo.json`; interfaz de estudio completa (tarjeta de ejercicio con teclado, confianza, pistas con costo, reporte; práctica adaptativa con ejemplo resuelto tras 2 errores; repaso FSRS; mini quiz; jefe con oleadas/vidas/tiempo/fantasma/autopsia; sesión del día con cofre y gancho para mañana; mapa, cuaderno, progreso con liga/récords/calibración/logros; gimnasio; tema claro; modo sano; `<Predice>`/`<Desvanecido>` interactivos). Prueba a mano en el navegador (puerto 3200) encontró y se arreglaron: tarjeta que se remontaba al responder, huecos dentro de código, récords que se celebraban en cada respuesta, quiz de 4 que exigía 100 %, salidas de MathLive (`sin ^2x`, `|x|`). Piloto: 7 ejercicios nuevos (21 en total), revisión a ciegas con subagente: 7/7 coinciden; se aclaró la redacción de calc-01-018 y 021. Evidencia: `pnpm check` 358 + 86; `pnpm content:check` en verde; `pnpm build` (24 rutas estáticas); Playwright 10/10 (7 de humo + sesión del día, jefe y desborde de las páginas nuevas a 320/375 px).
- 2026-10-02 · F1 paso 1: motor puro en `src/engine/` (config, azar con semilla, fechas, niveles, XP, verificadores de respuesta, FSRS, racha con congelamientos y reparación, día, misiones, cofre con probabilidades públicas, liga personal, récords, logros, jefes con oleadas/vidas/tiempo/fantasma/autopsia, flujo adaptativo, maestría, plan de la sesión y gimnasio: escalera, n-back, cálculo mental, secuencias). Evidencia: 58 pruebas nuevas en verde, `tsc` y `eslint` limpios.
- 2026-10-02 · `findPython` detecta el `.venv` del repo sin activarlo (orden: `CORTEX_PYTHON`, `.venv`, `python3`, `python`, `py -3`). La ruta sale del propio módulo (no de la carpeta actual) y usa `bin/python` o `Scripts\python.exe` según la plataforma; un enlace roto (Python base desinstalado) sí se prueba y aparece en lo que probó. `CORTEX_VENV` apunta a otro venv, solo para pruebas (como `CORTEX_CONTENT_ROOT`): las de runner falso y la de "sin Python" lo usan para no ver el `.venv` real. README y el error "sin Python" ya no piden activarlo. Evidencia en macOS (sin activar el venv; `python3` de Homebrew sin sympy): `pnpm check` 264 + 85; con solo `node` en el PATH, `content:check` en verde con Python 3.13 del venv; al apagar la detección fallan 5 pruebas (las 3 nuevas del venv y las 2 con Python real).
- 2026-10-02 · Smoke 6 en macOS (Playwright 1.63.0, chrome-headless-shell 153): fallaba 10/10 con "bloqueada: la pestaña vieja no soltó la base", pero la culpa no era de la pestaña vieja. La "otra pestaña" abría `/estilo`, una página de la app: su `ProfileHud` arranca su propia sonda, y `probeDb` llama a `close()` con dos lecturas en vuelo; según la especificación esa conexión no cuenta como cerrada hasta que terminan, así que Chromium dispara un `blocked` pasajero (la subida termina 1–2 ms después). La traza de Playwright (`retain-on-failure`) agrega ~10 ms de capturas que caen justo en esa ventana; en el contenedor Linux nunca se vio. Arreglo (solo la prueba): la subida se hace desde `/icon.svg` (mismo origen, sin layout ni sonda) y se exige que responda bien (un 404 traería la sonda de vuelta); el `onblocked` estricto se queda y ahora significa lo que dice. Evidencia en macOS: antes, 5/5 fallos; una copia sin traza y con 8–10 ms de espera tras `goto` falla 7/10 con `/estilo` (todas "bloqueada") y pasa 10/10 con `/icon.svg`; ya arreglada, 10/10 con la configuración del repo (traza encendida) y 10/10 + 10/10 sin traza con 8 y 10 ms de espera; una conexión retenida en la pestaña vieja sin manejador de `versionchange` sí la hace fallar con "bloqueada" (5/5); smoke 21/21 con `--repeat-each 3`; eslint y typecheck en verde. Rareza conocida (sin riesgo para los datos): como la sonda cierra con transacciones en vuelo, una subida de versión de la propia app en ese instante ve un `blocked` pasajero y Dexie avisa en consola (visto 2 de 6 veces en el diagnóstico, en una subida 5→10 en la misma pestaña). Se atiende, con su prueba, cuando llegue la primera migración real: cerrar la sonda al terminar sus transacciones o darle manejador de `versionchange`.
- 2026-10-02 · Arranque en macOS (Homebrew, Python 3.13): `pip install` global falla por PEP 668 (`externally-managed-environment`). README (paso 2), PRIMER-PROMPT y el error "sin Python" de `content:check` ahora recomiendan un venv en `.venv` (ya ignorado) y explican que hay que activarlo o definir `CORTEX_PYTHON`, porque `findPython` no busca en `.venv`. Evidencia en macOS con el venv activo: `pnpm check` 264 + 80; `pnpm content:check` en verde; sin Python en el PATH, el mensaje nuevo sale y termina en 1.
- 2026-10-01 · Verificación adversarial de los arreglos (workflow de 2 lentes con verificador; se reanudó tras un reinicio del contenedor): 5 de 7 hallazgos confirmados y arreglados, 2 descartados (también se mejoraron). **Datos:** si el navegador cierra la conexión a la fuerza ("Borrar datos del sitio", DevTools) la pestaña ya no queda "lista" con una conexión muerta: cualquier cierre pasa a "Recarga la página" (`DbClosedError`); la sonda usa `indexedDB.databases()` y no crea ni borra la base cuando no existe (en el primer arranque con dos pestañas, una borraba la base recién creada por la otra: 3–4 de 25 en Chromium, 30/30 en fake-indexeddb). **Interfaz:** un fallo al descargar ya no dice "no se puede importar"; el resultado de descargar desde el diálogo se ve dentro de él; racha compacta hasta `md`, "NV" oculto bajo 360 px y aviso de error corto en móvil (con nivel 100 y racha 1,240 el HUD cabe de 320 a 1024 px); prefijo `//` con respaldo `@supports` para Safari < 17.4. Evidencia: pruebas nuevas fallan sin cada arreglo (sonda del primer arranque, smoke 7 con `Storage.clearDataForOrigin`); `pnpm check` en verde; smoke 7/7 y 21/21 con `--repeat-each 3`.
- 2026-10-01 · Revisión adversarial final de la Fase 0 (workflow de 4 lentes: datos, interfaz, seguridad y fidelidad, cada una con verificador escéptico): 29 de 30 hallazgos confirmados y reproducidos; todos arreglados. **Datos:** una pestaña vieja ya no reabre sola una base más nueva (`autoOpen: false`, cierre ante `versionchange`, aviso de recargar) y `CortexDb` solo abre su versión nativa exacta (la smoke 6 reprodujo la carrera sonda → `open` 1 de cada 8 veces sin el candado; con él, 12/12); respaldo compacto con máximo de 100 MB, tamaño revisado antes de leer y aviso al exportar; ids autoincrementales ≤ 2³¹−1. **Seguridad:** la guardia MDX rechaza código en `<abbr title={…}>` (se ejecutaba en build y en `content:check`), imágenes Markdown (pedían a la red) y props heredadas (`toString`, `__proto__`); servidor solo en `localhost`. **Interfaz:** foco visible en botones y switch, nivel y racha con `role="img"`, sin desborde en 320 px (racha compacta en móvil, resumen y diálogo del respaldo), `scroll-padding` bajo el header fijo, foco al aviso tras importar, `//` fuera de los nombres accesibles, títulos de materia en h4, 404 en español, `--xp-text` AA. **Fidelidad:** pruebas de mayúsculas/enlaces y del venv portables a macOS/Windows (sin verificar en esas plataformas: aquí solo hay Linux), `tsx` y `dexie-react-hooks` registrados en ADR, tablas en inglés en docs/06 y 07, PRIMER-PROMPT marcado como histórico. Descartado en esta ronda: base borrada por fuera mientras la pestaña está abierta (la ronda siguiente mostró que sí había que atenderlo; ver abajo). Rareza conocida: `next start` registra `Error: Internal: NoFallbackError` al pedir una materia o unidad inexistente (`dynamicParams = false`); responde 404 bien y ya pasaba antes del cambio. Evidencia: `pnpm check` 262 + 80; `pnpm content:check` en verde; smoke 6/6 (y 24/24 con `--repeat-each 4`); `pnpm dev` responde 200 en las 6 rutas, 404 en una inexistente, y no deja archivos modificados; desde la IP de red ya no responde.
- 2026-10-01 · Paso 14: `/ajustes` con sonido (apagado por defecto; solo guarda la preferencia), estado de almacenamiento con botón para pedir que sea persistente, y respaldo: descargar, elegir archivo (botón propio en español), validar y comparar ahora vs respaldo, y reemplazar tras un diálogo con foco en Cancelar y la opción de descargar antes los datos actuales; errores con `role=alert`, avisos con `aria-live`. Los manejadores piden la base a `getDb()` (sin carreras tras recargar). Evidencia: `pnpm check` 242 + 79; smoke 4/4, incluido el caso 4: activar sonido → descargar (JSON `cortex`/1/1 con sonido activado) → borrar la base y recargar (sonido apagado) → importar → Cancelar enfocado, Esc no cambia nada → confirmar → sonido activado → un respaldo con esquema 2 se rechaza sin tocar nada; en 375 px no desborda ninguna página. Rareza del entorno documentada en la prueba: `setInputFiles` no carga archivos de rutas con "·" (se usan carpetas temporales ASCII).
- 2026-10-01 · Paso 13: inicio con el plan 2020 (`buildHomeModel` puro): hero con cifras, lecciones disponibles, mapa por semestre (numeral grande en mono; materias con contenido arcade y enlazadas, el resto apagadas, con fase o backlog) y catálogo de optativas; página `/materias/[materia]` (SSG, solo materias con contenido); `ProfileHud` lee el perfil de Dexie (mismo estado de carga en servidor y cliente; aviso visible si la base es de una versión más nueva). Evidencia: `pnpm check` en verde; smoke 3/3: 45 entradas y exactamente 2 con contenido, HUD real "Nivel 1 · 0 XP · Racha: empieza hoy", base `cortex` creada en IndexedDB, primer Tab al salto al contenido con foco visible, transiciones en 0 con movimiento reducido, recorrido solo con teclado inicio → Cálculo → Límites, 0 errores de consola/hidratación/HTTP; en 375 px no hay desborde (se corrigieron chips de optativas y de conceptos que no se partían).
- 2026-10-01 · Paso 12: HUD presentacional (`src/components/hud/`): `XpBar` en ticks (`role=progressbar`, acotada a [0, 1], `null` = cargando sin inventar valores), `LevelBadge`, `StreakChip` (en 0 dice "Empieza hoy"), `Lives` ("2 de 3 vidas") y `HudBar`; solo reciben números (la curva de niveles es de la Fase 1). Estados límite en `/estilo`, revisados en captura. Evidencia: 18 pruebas (aria, acotado de 1.5/-1/NaN/∞, plurales, carga sin números, ninguna palabra de culpa, toda animación detrás de `motion-safe`); `pnpm check` 233 + 79.
- 2026-10-01 · Paso 11: sistema visual "Consola arcade" (ADR-016) con la dirección que eligió Carlo; tokens OKLCH oscuro/claro, botón/tarjeta/chip/switch/diálogo de shadcn adaptados, `AppShell` con salto al contenido, catálogo vivo `/estilo` y página de lección con prosa de ~68ch y panel lateral. Evidencia: `pnpm check` en verde (215 + 79); 44 pruebas de contraste AA, 22 pares × 2 temas (y bajar un token hace fallar 3); capturas revisadas: en móvil (390 px) la lección no desborda (0 px) tras forzar `minmax(0,1fr)`; el encabezado ya no sale rojizo (`color-mix` en sRGB); la sombra arcade se ve en oscuro. Smoke 2/2.
- 2026-10-01 · Revisión adversarial de la capa de contenido (pasos 4–8): workflow de 4 lentes (paridad, MDX, robustez, pruebas) con verificador escéptico por lente; 22 de 34 hallazgos confirmados y reproducidos, más 7 del pipeline MDX que quedaron sin veredicto y se revisaron a mano. Arreglos: sumas del plan (`plan-inconsistente`), enteros escritos con decimales (`4.0`), lección con BOM, textos exactos solo entre comillas (`respuesta: 3.0` se perdía como 3), regex YAML idénticas a PyYAML (`-.5`, `0:30`, `2026-1-1`), un error en un archivo ya no apaga las reglas cruzadas de los demás, prerrequisitos de otra materia cargada, mensajes claros (`falta 'tipo'`, `retirado`, `verificar`, `lenguaje`); guardia MDX: línea exacta del paso/atributo, `\href` y comandos no confiables, barra simple antes de cualquier símbolo, solo literales en atributos, HTML sin atributos, `$` sin cerrar, HTML en atributos, props validadas contra `LESSON_API`, huecos `___` contra `respuestas` y dibujados como espacio visible; `content:check`: ruta canónica con `realpath` (mayúsculas/enlaces), solo `content[/materia[/unidad]]`, una sola ruta, el plan fuera de la capa 3; loader sigue enlaces simbólicos; pruebas: limpieza de temporales, PATH vacío para "sin Python", línea exacta, sonda de findPython y venv real, `server.ts`, plantilla exacta. Evidencia: `pnpm check` 167 + 79 (55 de paridad), `pnpm content:check` en verde, build ● 2 lecciones, smoke 2/2.
- 2026-10-01 · Paso 10: lógica de respaldo sin DOM (`src/db/backup.ts`, `backup-schema.ts`; ADR-015). Evidencia: `pnpm check` en verde (135 + 63). Pruebas: ida y vuelta con datos en las 12 tablas (ids incluidos) da tablas idénticas; base recién creada; el reemplazo borra lo ausente; una falla inyectada a la mitad deja la base exactamente igual; 15 respaldos inválidos (no JSON, truncado, otra app, formato 2, esquema 2/0/-1/1.5/"1", tabla faltante o desconocida, perfil inválido o ausente, clave repetida, registro sin clave) se rechazan con mensaje en español y los conteos intactos; límite de tamaño.
- 2026-10-01 · Paso 9: capa de datos local con Dexie v1 y guarda de versión (ADR-014). Evidencia: `pnpm check` en verde (114 + 63). Pruebas: foto del esquema v1; 13 tablas nativas con sus índices (versión nativa 10); `populate` deja el perfil en ceros con sonido apagado y no se repite al reabrir; `schemaVersion` estampado al crear y actualizar; la sonda no crea una base inexistente; una base del futuro (con una tabla nueva o sin un índice de la v1) da `FutureSchemaError` y su esquema nativo, conteos y ausencia de `$meta` quedan idénticos; una instancia ingenua sí la abriría (por eso existe la guarda); migración sintética v1 → v2 transforma y conserva datos; un error en una transacción `rw` deshace todo; importar el módulo en Node no toca IndexedDB.
- 2026-10-01 · Paso 8: paridad de reglas Zod ↔ `verify_content.py` (`tests/content/parity.test.ts`): 44 casos sobre una raíz mínima con una sola violación; en las reglas compartidas ambos dan la misma severidad y Python reporta la línea esperada; en las reglas "solo TS" la app da error y Python pasa. Evidencia: `pnpm test:content` 63/63 (46 de paridad); la raíz base está limpia en ambos; quitar el caso de `jefe-retirado` hace fallar la meta-prueba "un caso por regla del catálogo". `pnpm check` en verde (100 + 63).
- 2026-10-01 · Paso 7: `pnpm content:check [ruta]` en 4 capas (esquemas y reglas sobre el índice completo, render de cada lección, paridad YAML contra PyYAML real, `verify_content.py`); buscador de Python multiplataforma (`CORTEX_PYTHON`, `python3`, `python`, `py -3`, con timeout y exigiendo 3.11+ con sympy y PyYAML, salida en UTF-8). Paquete en `"type": "module"` (las dependencias de MDX son solo ESM). Pruebas separadas: `pnpm test` (rápidas) y `pnpm test:content` (con Python); `pnpm check` corre ambas. D3 aplicado: `CLAUDE.md`, `/verificar`, `/nueva-unidad`, `/revisar-contenido` y `docs/07` usan `pnpm content:check`. Evidencia: `pnpm content:check` en verde (capa 1: 0 errores; capa 2: 3 lecciones; capa 3: 9 YAML sin diferencias; capa 4: verde); `pnpm test:content` 17/17 sobre copias temporales del repo: real → 0; respuesta alterada → 1 en capa 4; `<Desconocido />` → 1 en capa 2 con la línea; LaTeX roto en `pregunta=` → 1 en capa 2; id duplicado → 1 en capas 1 y 4; ruta acotada solo reporta lo suyo; YAML leído distinto → 1 en capa 3; sin Python → 1 con instrucciones.
- 2026-10-01 · Paso 6: lecciones MDX con KaTeX estricto, tablas GFM, guardia de contenido y 9 componentes provisionales; ruta `/materias/[materia]/[unidad]` estática con `dynamicParams = false` (ADR-012). Evidencia: `pnpm check` en verde (100 pruebas): las 2 lecciones y la plantilla compilan, con `.katex`, 0 `.katex-error` y 1 tabla cada una, sin `$` crudos en atributos; 6 fixtures rotos fallan con la **línea exacta** del archivo (KaTeX en el cuerpo y en un atributo, componente desconocido, barra simple en `{[...]}`, `{…}` en el texto, `import`); los escapes de docs/05 (`\{`, `\$`, `\<`) funcionan. `pnpm build`: ● `/materias/calculo/01-limites` y ● `/materias/programacion/01-variables-y-tipos`. Smoke 2/2: la lección muestra > 10 fórmulas, la fuente `KaTeX_Main` carga y no hay respuestas HTTP ≥ 400.
- 2026-10-01 · Paso 5: loader (`src/content/loader.ts`), `buildIndex` puro con todas las reglas cruzadas (ids únicos globales, conceptos, ciclos, referencias de jefes, y las "solo TS": carpeta, NN del id, prefijo, `repaso_de` previo, jefe sin autoevaluación ni retirados), lector YAML compatible con PyYAML y `server.ts` (ADR-011). El inicio ya lee el índice. Evidencia: `pnpm check` en verde (88 pruebas: 23 de reglas con fixtures en memoria, CRLF/BOM = LF, contenido real con 0 errores y exactamente los 2 avisos de `programa_ref`); el lector YAML da lo mismo que PyYAML en `[x, y, n, Y, N]`, `09`, `1e3`, `1:30`, `.inf`; `pnpm build` genera `/` estático; con `CORTEX_CONTENT_ROOT` apuntando a una copia con un id duplicado, `pnpm build` **falla** con `ContentValidationError` y los 2 errores.
- 2026-10-01 · Paso 4: esquemas Zod 4.6.5 de docs/05 en `src/content/schema/` (plan, conceptos, front matter, ejercicios con despacho por `tipo` y por `lenguaje` en `codigo`, jefe), objetos estrictos y mensajes en español; catálogo de reglas con código estable y la severidad de `verify_content.py` (`src/content/rules/catalog.ts`). Evidencia: `pnpm test` 51/51, incluidos casos válidos/inválidos por regla y el contenido real (24 ejercicios, 2 jefes, 2 `conceptos.yaml`, 2 front matter y `plan-2020.json`) sin errores.
- 2026-10-01 · Paso 3: ESLint 9.39.5 (config de Next + `no-explicit-any`, `consistent-type-imports`, `next/font/google` prohibido, zonas puras sin React/Next/Dexie/DOM salvo `import type`), Vitest 5.0.3 (+ vite 8.3.2; JSX sin plugin) y Playwright 1.63.0 con un smoke contra `next start -p 3100`. Evidencia: `pnpm lint` 0 problemas; `pnpm test` 10/10; al vaciar las zonas puras fallan 4 pruebas de fronteras (la prueba sí detecta); `pnpm test:e2e` 1/1 con `CORTEX_CHROMIUM_PATH` apuntando al Chromium 1194 del contenedor (el CDN de Playwright no responde aquí). El smoke detectó un 404 real (`/favicon.ico`): se agregó `src/app/icon.svg`.
- 2026-10-01 · Paso 2: andamiaje Next 16.3.8 + React 19.3 + TS 6.0.3 estricto + Tailwind 4.3.3 + pnpm 10.28 (ADR-009, ADR-010). Evidencia: `pnpm install --frozen-lockfile` limpio sin scripts ignorados; con Node 20.20.2 pnpm rechaza la instalación (`engines`); `pnpm typecheck` y `pnpm build` en verde (`/` estático); `pnpm dev` responde 200 en `localhost:3000` con `lang="es-MX"`; un segundo `pnpm dev` falla con `EADDRINUSE` en vez de mudarse de puerto; con `CLAUDECODE=1` definido, `next dev` no creó `AGENTS.md` ni tocó `CLAUDE.md`; `tsconfig.json` sin cambios tras `typegen`, `build` y `dev`; `pnpm telemetry:check` → "You have opted-out"; `git add --renormalize .` sin cambios en `content/`; `verify_content.py` en verde.
- 2026-10-01 · Paso 1 de la Fase 0: decisiones de Carlo registradas; Mecánica y electromagnetismo como Fase 4 (`docs/01`, `docs/06`, `cortex_fase` en `plan-2020.json`); requisitos corregidos (Node 22.12+, pnpm 10.28) en README y PRIMER-PROMPT; `docs/00` (`APP_ID`), `docs/02` (tablas en inglés + `meta`), `docs/05` (`respuestas`, componentes provisionales, escapes, YAML 1.1, campos comunes). ADR-013. `verify_content.py` en verde (2 unidades, 24 ejercicios, 17/7, 2 avisos). Versiones verificadas antes de fijar: ESLint 10 incompatible con `eslint-plugin-react` 7.37.5 (peer `^9.7`); `typescript-eslint` 8.71 exige TS < 6.1; `rehype-katex` 7.0.1 depende de `katex ^0.16`; Vitest 5 exige Node ^22.12; `next dev` 16.3.8 escribe un bloque en `CLAUDE.md`/`AGENTS.md` (`generate-agent-files.js`) salvo con `agentRules: false`.
- 2026-10-01 · Repo base creado: docs, plan de estudios en datos, dos unidades de ejemplo verificadas (`calculo/01-limites`, `programacion/01-variables-y-tipos`), script de verificación y comandos de Claude Code.
