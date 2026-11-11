# 09 · iPad y Pizarra

## La idea
Carlo estudia con la compu y una libreta de papel: dos dispositivos, y la mitad del razonamiento queda fuera de Cortex. Con el **iPad y el Apple Pencil** todo lo que se piensa a mano entra a la app: apuntes, derivaciones, algoritmos, rastreos y diagramas. La **Mac** se queda con lo que se teclea, que es el código.

> **Diseña en el iPad, implementa en la Mac.**

## Expectativas honestas (`docs/06`, mismo espíritu)
- Escribir a mano no es magia:
  - el estudio famoso de notas a mano contra laptop (Mueller y Oppenheimer, 2014) se replicó con diferencias pequeñas o nulas (Morehead, Dunlosky y Rawson, 2019);
  - en EEG, escribir a mano muestra más conectividad cerebral que teclear (van der Weel y van der Meer, 2024), pero conectividad no es lo mismo que aprender más.
- Lo sólido:
  - el **efecto de generación**: la mano no transcribe, resume y deriva;
  - el **efecto de dibujar** (Wammes, Meade y Fernandes, 2016);
  - en matemáticas, teclear fórmulas mete fricción y escribirlas a mano no.
- **Conclusión de diseño:** el valor está en que la tinta te obligue a **generar**, no en reconocer tu letra.

## Decisiones (Carlo, 2026-11-10)
- **v1.1:** PWA instalable servida desde el VPS con HTTPS. El iPad la necesita para el service worker y para instalarla.
- **Vía nativa** (Capacitor + PencilKit): cuando haya espacio para Xcode en la Mac. Reutiliza la build estática, los eventos y el formato de la tinta; solo cambia la superficie de captura.
- **Pencil:** USB-C o 1.ª gen., sin hover ni gestos, y el USB-C **sin presión**. El grosor va por velocidad o es fijo; la paleta va en pantalla.
- **Pizarra primero:** **no se reconoce la letra** en la app. La respuesta final va con opciones, MathLive (con teclado virtual) o Scribble. Desde el coach, Claude puede ver la tinta si Carlo lo pide (v1.1, opt-in en cada petición).
- **Un solo progreso** entre iPad y Mac, sincronizado por un relay propio en el VPS de Hostinger (HTTPS + token por dispositivo, sin E2EE; ADR-025).

## Catálogo del brainstorm (priorizado)

### Pizarra · MVP de v1.1
- Panel de tinta junto a cada ejercicio:
  - **horizontal:** enunciado a un lado y pizarra al otro;
  - **vertical:** pizarra abajo.
- **Herramientas:** pluma, borrador de trazo, deshacer y rehacer, 3 colores, fondo cuadriculado, rayado o en blanco.
- **Solo el lápiz dibuja;** el dedo hace scroll o zoom y la palma no deja marcas.
- **La tinta se guarda con el intento** y vuelve en el cuaderno de errores y en la autopsia del jefe: «así lo pensaste».

### Siguiente
- **«Primero a mano»:** en dificultad 4 o más, la respuesta se habilita tras escribir. Aporte de Carlo: `requiresInkFirst()`.
- **Página en blanco:** 2 min de recuerdo libre de un tema al abrir la sesión; luego comparas con el resumen de 3 líneas y te autoevalúas.
- **Ejemplo desvanecido a mano:** escribes el paso que falta y lo comparas con el oficial.
- **Reto Feynman a mano**, con rúbrica.
- **Modo Polya** para dificultad 4–5: cuatro zonas (entender → plan → ejecutar → revisar), con preguntas guía pre-escritas.
- **Algoritmos a mano:** pseudocódigo, diagrama de flujo y tabla de rastreo. El boceto aparece junto al editor cuando implementas en la Mac.
- **Rastreo de memoria de C** dibujado: pila y heap.
- **Apuntes de clase** por unidad, ligados al mapa de conceptos.

### Inducir a razonar (sin IA en la app)
- **Etiqueta `razonamiento` por ejercicio** (deductivo, inductivo, abductivo, analógico, causal-sistémico, probabilístico, algorítmico, espacial, metacognitivo) y un radar de razonamiento junto al perfil cognitivo.
- **Pistas socráticas** que preguntan en vez de decir.
- **«¿Por qué?»** cuando aciertas con confianza baja (autoexplicación, a mano).
- **Derivaciones con un error plantado** (un Debug Dojo de mate), contraejemplos y estimar antes de calcular.

### Coach
- **Calibración** simulacro → parcial real (ya en v1, `calibration_report`).
- **Proyectos según tu perfil y tu rigor:** v1 con señales crudas; v1.1 con el catálogo de la Ruta IA y los niveles R0–R4.
- **Con visión (v1.1):** revisa tus pasos escritos sin darte la respuesta.

### Después, solo con evidencia de que hace falta
- Reconocimiento local de dígitos o LaTeX para calificar desde la tinta.
- Repetición del trazo.
- App nativa.

## Riesgos conocidos (detalle en el plan de la Fase 3.5)
- **Latencia del lápiz en Safari:** se mide en el spike A contra la app Notas. Si no convence, la pizarra sale para usos menos exigentes y la vía nativa se adelanta.
- **La UI asume teclado:** el selector de confianza solo dice «Esc para corregir», `math-field.tsx` tiene el teclado virtual en `manual` y hay controles de 32 px por debajo de los 44 pt.
- **Escribir a mano es más lento:** cada intento se etiqueta con su método de entrada para no sesgar FSRS ni los récords.
