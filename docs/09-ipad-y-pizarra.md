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

## v1.1 mínima: el iPad antes del parcial (2026-11-16)
Adelantada de la Fase 3.5 (`docs/01`). Lo que ya existe:
- **PWA** en `https://cortex.carlogarza.dev`: pública y sin indexar (ADR-029). Se instala desde Safari con Compartir → Agregar a inicio.
- **Sin conexión:** el service worker precarga unos 58 MB, entre páginas, estáticos, Pyodide y fuentes. Python corre sin red.
  - Cada versión nueva se baja en segundo plano y se aplica al cerrar y reabrir la app.
  - Ajustes dice cuándo está «Listo para usar sin conexión».
- **Solo pantalla y Pencil:** «Modo de entrada» en Ajustes (Automático, Táctil o Teclado y ratón).
  - Botones de 44 pt y teclado de fórmulas de MathLive con su botón.
  - «Escribir a mano o con teclado de texto», un campo nativo que acepta Scribble.
  - Barra de sangría y símbolos en el editor de código, y botón visible para cada atajo.
- **Puente de progreso** (ADR-028), temporal hasta el sync: **un dispositivo a la vez**.
  - De la Mac al iPad: Exportar en la Mac → AirDrop («Solo contactos») → «En mi iPad» en Archivos → Importar **dentro de la app instalada**. Safari y la app de inicio no comparten datos.
  - De vuelta: en el iPad, «Compartir (AirDrop)» → la Mac importa.
  - Antes de reemplazar, el diálogo compara la última actividad y avisa si se perdería algo. La regla del aviso es aporte de Carlo (`decideImportRisk`).

**Límites:**
- C no corre en el iPad: se practica en la Mac.
- No hay pizarra.
- No hay fusión: importar reemplaza todo.
- El campo de MathLive no acepta Scribble.
- **Nunca** «eliminar la app» ni «Borrar datos del sitio», porque borran la IndexedDB. Si algo falla, primero exporta.

### CP-iPad (Carlo, en el iPad real)
Los umbrales marcados «propuesto» son de `disenador-interaccion`; ajústalos si no te parecen.

0. **En la Mac:** exporta el respaldo.
1. **Safari, sin instalar:** abre el sitio (HTTPS sin aviso) y espera «Listo» en Ajustes (propuesto: menos de 3 min con wifi). **No importes aquí.**
2. **Instalar:** Compartir → Agregar a inicio y abre desde el ícono. Debe verse sin barra de Safari, con su ícono y con la barra de estado legible.
3. **Importar dentro de la app instalada:** intentos, XP y racha deben coincidir con la Mac. El aviso solo sale si la regla detecta algo, con el foco en Cancelar.
   - Prueba también la vuelta con «Compartir (AirDrop)». Si falla, anótalo y usa Descargar.
4. **Sesión de 20 min solo con toques:** opción múltiple, numérico, simbólico, completar, ordenar, Python, Cálculo relámpago, Secuencias, confianza y cofre. Ninguna acción debe pedir teclado, y no debe aparecer Esc, ⏎ ni H.
5. **Modo avión:** cierra la app y reábrela.
   - Debe abrir sin pantalla en blanco y la sesión debe ser jugable.
   - El teclado de fórmulas debe mostrar √, ∫ y π.
   - «Probar» de Python debe dar resultado (propuesto: menos de 10 s).
   - Lo que hagas debe persistir.
6. **Al día siguiente:** todo intacto. Exporta y repite la ida a la Mac.

Lo que solo se ve en el iPad, cada punto con su criterio:
- **a. Modo Automático:** la interfaz debe salir táctil sola. Si no, pon «Táctil» y anótalo.
- **b. Teclados:** ninguno se abre antes del primer toque. En simbólico debe salir el de fórmulas y no el del sistema.
- **c. Teclado sin tapar:** Comprobar y Pista quedan sobre el teclado, en vertical, en horizontal y al rotar.
- **d. Envío:** ¿la tecla ↵ del teclado de fórmulas envía la respuesta?
- **e. Scribble** (Ajustes de iPadOS → Apple Pencil): en el campo de texto escribe `x^2+1`, `sqrt(2)/2`, `1/3` y `oo`. Meta: 8 de 10 sin corregir.
- **f. Gimnasio:** 20 respuestas en 60 s sin volver a tocar el campo.
- **g. Texto sin autocorrección:** lo que escribas llega sin mayúscula inicial ni autocorrección, en el numérico y en el código.
- **h. Barra de código:** escribe un `def` con `if` y sangrías, y el teclado no se cierra.
- **i. Deslizar para volver:** desde un ejercicio y a medio simulacro. Anota si saca del examen.
- **j. Respuesta al toque:** el estado `:active` se nota al tocar.
- **k. Zoom:** al pellizcar no sube la barra, y al cerrar el teclado no queda hueco.
- **l. Precisión:** acierta 19 de 20 toques y no hay toques fantasma con la palma.

El resultado va a la bitácora.

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
- **La UI asumía teclado:** se resolvió para la v1.1 mínima (B3, 2026-11-16) con el modo táctil. Falta confirmarlo en el iPad real con el CP-iPad.
- **Escribir a mano es más lento:** cada intento se etiqueta con su método de entrada para no sesgar FSRS ni los récords.
