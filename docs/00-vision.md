# 00 · Visión

## Qué es Cortex

Una app web personal para dominar **todas** las materias de Ingeniería en IA del IPN (plan 2020), una fase a la vez. Cada materia tiene lecciones, práctica, repaso espaciado y "jefes" que te obligan a demostrar que sí lo dominas. Además incluye un gimnasio cognitivo transversal.

Usuario único: Carlo. Corre en su Mac (con el runner de C) y, desde la v1.1, en su iPad como PWA con pizarra para el Apple Pencil (`docs/09`). Los dos comparten el progreso mediante un relay propio en su VPS, sin cuentas de terceros. La app no tiene IA en tiempo de ejecución: la IA vive en el equipo de agentes de desarrollo y en el coach (`docs/08`).

## Objetivo en una frase

Que abrir Cortex se sienta como abrir un videojuego que además te vuelve mejor ingeniero.

## Principios (en orden de prioridad)

1. **Correcto antes que bonito.** Un ejercicio con respuesta equivocada destruye la confianza en todo lo demás. Nada entra al repo sin pasar `scripts/verify_content.py`.
2. **Aprender de verdad, no solo "sentir" que aprendes.** Las mecánicas de enganche premian recuperar información de memoria, espaciar repasos y resolver con esfuerzo (ver `04-pedagogia.md`). Nada de XP por ver videos o leer.
3. **Enganche honesto.** Usamos las mismas palancas que los juegos (progreso visible, recompensas variables, metas cercanas, competencia), pero sin culpa manipuladora ni trampas de pago. Ver `03-gamificacion-y-enganche.md`.
4. **Fricción cero para empezar.** Un botón en la pantalla de inicio arma la sesión del día. Si empezar cuesta más de 3 segundos, falla.
5. **Local-first.** Tus datos viven en tus dispositivos y se pueden exportar e importar en cualquier momento. Desde la v1.1, el relay de tu VPS guarda una copia para sincronizar (HTTPS + token por dispositivo; el VPS la ve en claro, riesgo aceptado en ADR-025).
6. **Por fases, siempre usable.** Al final de cada fase la app funciona y se puede estudiar con ella.

## Alcance

**Dentro:** las materias del plan 2020 (empezando por bases duras, fundamentos económicos y fundamentos de programación), motor de aprendizaje, gamificación, repaso espaciado, gimnasio cognitivo, simulacros de examen, estadísticas de progreso. Desde la decisión del 2026-11-10: la **pizarra** con Apple Pencil en el iPad (PWA), la sincronización Mac ↔ iPad por un relay propio, los **KPIs institucionales** (calificaciones reales) y la **Ruta de ingeniero en IA** (pista paralela, a menor ritmo: proyectos, LLMs, MLOps, papers).

**Fuera (por ahora):** multiusuario, backend (salvo el relay de sync propio), login, pagos, IA en tiempo de ejecución en la app (tutor o reconocimiento de escritura en la nube). La app nativa del iPad espera a que haya espacio para Xcode, después de la v1.1. (La estructura no los impide; ver "Futuro" abajo.)

## Cómo sabremos que funciona (métricas personales)

- **Constancia:** estudiar ≥ 5 días por semana durante 4 semanas seguidas.
- **Retención:** la tasa de acierto en repasos espaciados se mantiene ≥ 85%.
- **Dominio real:** pasar jefes con ≥ 80% sin repetir más de 2 veces.
- **Transferencia:** mejores calificaciones o menos esfuerzo en las materias reales del semestre. Se mide con las calificaciones que registras con el coach (`diario/resultados.yaml`) y con la calibración simulacro → examen real (`calibration_report`, ADR-026).
- **Gusto:** tú dices que se te antoja abrirla (la métrica que no se puede falsear).

## Futuro (no construir ahora, no estorbar)

- Tutor dentro de la app con la API de Claude (opt-in, con tu propia llave). Hoy el coach vive en Claude Code y ve solo agregados (`docs/08`).
- Modo multiusuario para compañeros del IPN (requeriría backend y cuentas).
- Notificaciones (sin culpa, `docs/03`). La PWA ya está planeada para la v1.1 (`docs/01`, Fase 3.5).
- App nativa del iPad (Capacitor + PencilKit), cuando haya espacio para Xcode.
- Contenido de las demás materias, hasta cubrir los 8 semestres y las 14 optativas.

## Nombre

"Cortex" es el nombre definitivo (decisión de Carlo, 2026-10-01).

Si algún día cambia, se cambia solo el nombre visible (`APP_NAME`). El identificador interno `APP_ID = 'cortex'` **nunca cambia**: es el nombre de la base de datos local y la marca de los respaldos. Cambiarlo haría que la app ya no encuentre tus datos ni acepte tus respaldos.
