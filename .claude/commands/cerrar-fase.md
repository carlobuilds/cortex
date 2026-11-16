---
description: Cierra la fase actual de Cortex con su checklist y etiqueta git
---

1. Lee `ESTADO.md` y la Definición de Hecho de la fase actual en `docs/01-roadmap-fases.md`.
2. Corre `/verificar` (lo ejecuta `verificador`) y confirma que todo esté en verde. Si algo falla, detente y repórtalo.
3. Recorre la checklist común de cierre de `docs/01` punto por punto y dime cuáles cumples y cuáles no, con evidencia: salida de comandos, archivos, pruebas. Si la fase tocó la UI, confirma que se probó en el iPad real.
4. Si hay contenido nuevo, confirma que se corrió `/revisar-contenido` sobre él.
5. Si la fase tocó una superficie de seguridad (runner de C, MCP, hooks, dependencias, relay, VPS, PWA), lanza a `experto-ciberseguridad` sobre el diff de la fase. Un **bloqueo** impide cerrar.
6. Pídeme una sesión real de ~20 min y espera mis notas («¿qué fue aburrido o confuso?») antes de cerrar. Con mis notas, propón ajustes a `src/engine/config.ts` o al contenido; si son mecánicas, pásalos por `/consejo`.
7. Solo cuando yo confirme:
   - actualiza `ESTADO.md` (fase actual, checklist, decisiones) y agrega la entrada en `docs/bitacora.md` (máximo unas 8 líneas: qué, evidencia, hallazgos; el detalle va al commit);
   - haz commit;
   - crea la etiqueta `fase-N`.
8. Resume en 5 líneas qué quedó, qué sigue y qué decisiones necesito tomar para la siguiente fase. Sugiéreme `/coach semana` si hace más de 7 días del último informe en `diario/`.
