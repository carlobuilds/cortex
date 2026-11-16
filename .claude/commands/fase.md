---
description: Retoma la fase actual de Cortex según ESTADO.md
---

1. Lee `CLAUDE.md`, `ESTADO.md` y los docs de `docs/` relevantes para la fase actual (incluido `docs/08-equipo-de-agentes.md`).
2. Dime en 3 líneas: fase actual, qué falta (checklist de `ESTADO.md`) y cuál es el siguiente paso lógico.
3. Si hay «Decisiones pendientes» que bloqueen el siguiente paso, pregúntamelas primero (máximo 4, de opción múltiple si se puede).
4. Entra en modo plan para el siguiente bloque de trabajo. Si toca temario, mecánicas, datos o seguridad, pasa el borrador por `/consejo` antes de pedirme aprobación. Espera mi aprobación antes de escribir código.
5. Implementa cada paso con `/equipo`: dev dueño, verificación, revisión y commit. Nunca dos escritores a la vez.

No adelantes entregables de fases futuras.
