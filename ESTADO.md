# ESTADO · Tablero vivo de Cortex

**Fase actual:** 3 · Cálculo + Matemáticas discretas, en curso en la rama `fase-3-calculo-discretas` (plan aprobado por Carlo el 2026-10-13). Las Fases 0, 1 y 2 están implementadas y verificadas; sigue pendiente su cierre formal: sesión real de Carlo de ~20 min por fase, `/cerrar-fase` y etiquetas `fase-0`, `fase-1`, `fase-2` (no bloquea la Fase 3). **Orden acordado el 2026-11-10:** v1 (equipo y coach, hecho) → CP1 → sprint del parcial de Cálculo (contenido completo el 2026-11-13: unidades 01 a 09) → Fase 3.5 (v1.1: iPad PWA, pizarra, sync y coach vivo) → resto de Cálculo y Discretas.
**Última actualización:** 2026-11-16 · Flujo más barato (ADR-027): modelos por agente, `verificador` en Haiku y este tablero sin ADRs ni bitácora (ahora en `docs/adrs.md` y `docs/bitacora.md`). Sigue el **iPad mínimo antes del parcial** (decisiones del 2026-11-16). Antes: el sprint del parcial de Cálculo quedó completo el 2026-11-13 (unidades 01 a 09) y la Unidad IV de Discretas el 2026-11-15 (13 a 21); ver la bitácora.

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
- **Equipo de agentes** (ADR-024; modelos revisados por ADR-027 el 2026-11-16): subagentes de Claude Code que asesoran y desarrollan, **todos en Opus**, invocados solo por nombre, en **un solo worktree** (un escritor a la vez). La app sigue **sin IA en tiempo de ejecución**.
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

## Decisiones tomadas (Carlo, 2026-11-16 · flujo más barato e iPad antes del parcial)
Plan aprobado el mismo día (`~/.claude/plans/quiero-hacer-algunos-cambios-sprightly-dolphin.md`).
- **Modelos por agente** (ADR-027, recorte balanceado): Opus en `experto-matematicas`, `experto-ciberseguridad` y `autor-contenido`; Sonnet en los demás (asesores y `coach` con `effort: medium`); `resolutor-a-ciegas` en Sonnet; `verificador` nuevo en Haiku. ADRs y bitácora fuera de este archivo (`docs/adrs.md`, `docs/bitacora.md`).
- **iPad mínimo antes del parcial** (23 al 27 de noviembre): se adelantan de la Fase 3.5 el paso 1 (`build:pwa` sin runner de C), el spike C (PWA en el iPad real), lo táctil mínimo del paso 4 y un despliegue mínimo. Pizarra, eventos, relay, sync y coach vivo siguen después del parcial, en su orden.
- **Dominio:** `cortex.carlogarza.dev`, detrás del Traefik compartido del VPS (mismo patrón que Hanami: red `traefik-public`, certresolver `letsencrypt`). DNS en Hostinger.
- **Acceso:** sitio **público sin indexar** (solo archivos estáticos; los datos viven en el dispositivo).
- **Entrada en el iPad:** solo pantalla y Pencil → teclado matemático en pantalla y botón visible para cada atajo.
- **Progreso:** puente con el respaldo que ya existe (reemplaza todo), **con aviso** antes de pisar actividad más reciente (ADR-028, temporal hasta el relay).

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
  - [x] 09-tecnicas-integracion (2026-11-13)
  - [x] 02-continuidad-asintotas (2026-11-13). **Con esta se cierra el sprint del parcial**: las unidades 01 a 09 están escritas y revisadas. La 00 queda fuera del sprint, como se decidió el 2026-11-10.
- [ ] Matemáticas discretas
  - [x] Puerta de temario (paso 9, 2026-11-13): el programa oficial en `curriculum/programas/matematicas-discretas.pdf`, el temario aprobado por Carlo y `conceptos.yaml` completo (132 conceptos en 23 unidades: 21 del programa y 2 extra)
  - [x] Unidad IV para el 3.er parcial, en orden 13 → 21: [x] 13 (2026-11-13) · [x] 14 (2026-11-14) · [x] 15 (2026-11-14) · [x] 16 (2026-11-14) · [x] 17 (2026-11-14) · [x] 18 (2026-11-14) · [x] 19 (2026-11-15) · [x] 20 (2026-11-15) · [x] 21 (2026-11-15)
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
- **Adelantado antes del parcial (iPad mínimo, decisión del 2026-11-16):**
  - [x] Flujo más barato: modelos por agente, `verificador` y tablero adelgazado (ADR-027)
  - [x] `/consejo` de la parte iPad (`experto-ciberseguridad` + `disenador-interaccion`, 2026-11-16): objeción sin bloqueo en los dos; requisitos E1–E9 del guardián (el primer `publicar.sh` no corre sin ellos) y lista táctil, en la bitácora
  - [x] Registro DNS `A cortex → 76.13.106.210`, TTL 300, sin sobrescribir la zona (MCP de Hostinger, 2026-11-16; `dig` en 1.1.1.1 y 8.8.8.8 ya responde)
  - [x] `pnpm build:pwa` sin runner de C (`route.local.ts` + `pageExtensions`, 2026-11-16): `out/` sin `api/`, revisada por `scripts/check-out-cli.ts`; la Mac conserva el runner
  - [x] PWA instalable y sin conexión: manifiesto, íconos, `appleWebApp`, service worker solo en la build del iPad (2026-11-16; la prueba con Caddy, Safari y Python sin red queda para B5)
  - [ ] Uso táctil: teclado matemático en pantalla con puntero grueso, botón visible por atajo, objetivos ≥ 44 pt, e2e WebKit de iPad
  - [ ] Puente de respaldo con aviso (ADR-028, `importRisk` es aporte de Carlo)
  - [ ] `deploy/` (compose con Caddy detrás de Traefik, encabezados, `publicar.sh`, runbook) probado con Docker local; Carlo lo levanta en el VPS
  - [ ] CP-iPad de Carlo: instalar, importar, sesión de 20 min, modo avión, al día siguiente
- **Después del parcial, en su orden:**
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

## ADRs y bitácora
- **ADRs de implementación (ADR-009 en adelante):** [`docs/adrs.md`](docs/adrs.md). Los ADR-001 a 008 están en `docs/02`.
- **Bitácora:** [`docs/bitacora.md`](docs/bitacora.md), lo más nuevo arriba. Cuando este archivo dice «ver bitácora», es ahí.
- Se separaron el 2026-11-16 para que leer este tablero al inicio de cada sesión no cueste 160 KB (ADR-027).
