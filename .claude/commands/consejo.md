---
description: Consulta en paralelo a 2–4 asesores del equipo sobre un tema o un plan y sintetiza sus veredictos
argument-hint: <pregunta | ruta de un plan | paso de fase>
---

Convoca al consejo asesor sobre: **$ARGUMENTS**

1. **Encuadra.** Escribe en una línea la pregunta exacta y lista los archivos que los asesores deben leer (plan, unidad, componente, constantes). Si `$ARGUMENTS` es vago, pregúntale a Carlo antes de gastar agentes.

2. **Elige de 2 a 4 asesores** con esta tabla. Cada uno cuesta un agente entero (los de ciencia del aprendizaje y lenguaje corren en Sonnet; `experto-matematicas` y `experto-ciberseguridad`, en Opus; ADR-027), así que no convoques de más:

   | Si el tema toca… | Asesores |
   |---|---|
   | lección, unidad, temario, alineación, Ruta IA | `pedagogo` + el experto de la materia |
   | retención, repaso, FSRS, calibración, intercalado | `cientifico-memoria` |
   | esfuerzo, duración de sesión, fatiga, gimnasio, plan de entrenamiento | `cientifico-cognitivo` |
   | XP, rachas, cofres, misiones, logros, ligas, fantasma | `disenador-motivacion` |
   | pistas, tipos de razonamiento, rigor, prompts de pizarra | `arquitecto-razonamiento` |
   | redacción, ambigüedad, inglés técnico, comunicación | `linguista` |
   | interfaz, iPad, lápiz, toque, accesibilidad, latencia | `disenador-interaccion` |
   | runner de C, MCP, hooks, dependencias, relay, VPS, PWA, datos personales | `experto-ciberseguridad` (**obligatorio** si aplica) |
   | matemáticas · IA, ML, NLP o computación · economía y finanzas | `experto-matematicas` · `experto-ia` · `experto-finanzas` |

3. **Lánzalos en paralelo, en un solo mensaje** (varias llamadas a Agent con su `subagent_type`). A todos les das el mismo brief:
   - la pregunta;
   - los archivos a leer;
   - las restricciones del proyecto que apliquen;
   - el pedido de responder con su formato de «Entrega»: veredicto + hasta 5 puntos con evidencia + recomendación.

   Los asesores no editan nada.

4. **Sintetiza** para Carlo:
   - tabla `Asesor | Veredicto | Punto clave | Recomendación`;
   - en qué coinciden;
   - en qué chocan y por qué;
   - tu recomendación y su costo.

5. **Decide con Carlo.** Si hay un **bloqueo** o un conflicto real, pregúntale con AskUserQuestion (opciones concretas, la recomendada primero). No apliques cambios ni anotes decisiones en `ESTADO.md` hasta que él elija.

Usa `/consejo` al planear y en pasos riesgosos (seguridad, datos, mecánicas, temario). No para cada paso pequeño.
