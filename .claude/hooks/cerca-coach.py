#!/usr/bin/env python3
"""Cerca del agente coach (hook PreToolUse sobre Read, Glob, Grep, Write y Edit).

El coach ve los datos de Carlo solo como agregados del MCP de Cortex. Con
herramientas de archivos solo puede tocar `diario/` (sus informes y los KPIs),
y nunca un respaldo crudo. Falla cerrada: si no puede leer la llamada, bloquea.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DIARIO = (REPO / "diario").resolve()
PATH_TOOLS = {"Read", "Write", "Edit", "NotebookEdit"}
SEARCH_TOOLS = {"Glob", "Grep"}


def deny(reason: str) -> None:
    print(
        f"cerca-coach: bloqueado ({reason}). Solo puedes leer y escribir en diario/; "
        "los datos de estudio llegan por las herramientas del MCP de Cortex.",
        file=sys.stderr,
    )
    sys.exit(2)


def inside_diario(raw: str, cwd: Path) -> bool:
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = cwd / candidate
    resolved = candidate.resolve()
    return resolved == DIARIO or DIARIO in resolved.parents


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        deny("no pude leer la llamada")
        return
    if not isinstance(data, dict):
        deny("la llamada no es un objeto")
        return

    tool = data.get("tool_name")
    tool_input = data.get("tool_input") or {}
    cwd = Path(data.get("cwd") or REPO)

    if tool in PATH_TOOLS:
        raw = tool_input.get("file_path") or tool_input.get("notebook_path")
        if not isinstance(raw, str) or not raw:
            deny("falta la ruta")
            return
        if raw.endswith(".cortex-backup.json") or "respaldos" in Path(raw).parts:
            deny("los respaldos crudos no se leen")
        if not inside_diario(raw, cwd):
            deny(f"ruta fuera de diario/: {raw}")
        sys.exit(0)

    if tool in SEARCH_TOOLS:
        pattern = str(tool_input.get("pattern") or "")
        base = tool_input.get("path")
        if ".." in pattern or "cortex-backup" in pattern or "respaldos" in pattern:
            deny("patrón no permitido")
        if isinstance(base, str) and base:
            if not inside_diario(base, cwd):
                deny(f"ruta fuera de diario/: {base}")
        elif tool == "Grep" or not (pattern.startswith("diario/") and inside_diario("diario", cwd)):
            deny("busca dentro de diario/ (usa path o un patrón que empiece con diario/)")
        sys.exit(0)

    deny(f"herramienta no permitida: {tool!r}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # falla cerrada: un error nunca deja pasar la llamada
        deny(f"error interno de la cerca: {type(error).__name__}")
