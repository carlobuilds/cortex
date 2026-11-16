#!/usr/bin/env python3
"""Cerca del agente resolutor-a-ciegas (hook PreToolUse sobre Bash).

El resolutor solo puede usar Bash para calcular. Esta cerca bloquea (exit 2)
cualquier comando que intente leer el repo: rutas del proyecto, carpetas con
contenido o respuestas, archivos YAML/MDX y comandos de exploración.

Es una barrera contra accidentes de un agente cooperativo, no un sandbox:
un comando ofuscado a propósito podría evadirla. Falla cerrada: si no puede
leer la llamada, bloquea.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROJECT = REPO.parent

# El intérprete del venv del repo sí se permite: tiene sympy.
VENV_PYTHON = re.compile(
    r"(?:" + re.escape(str(REPO)) + r"/)?\.venv/bin/python(?:3(?:\.\d+)?)?(?![\w/])"
)

REPO_DIRS = (
    "content|tests|scripts|src|e2e|curriculum|respaldos|diario|public|out|"
    r"\.next|\.git|\.claude|\.venv|node_modules|test-results|playwright-report|mcp"
)

FORBIDDEN: list[tuple[re.Pattern[str], str]] = [
    (re.compile(re.escape(str(PROJECT)), re.IGNORECASE), "rutas del proyecto"),
    (re.compile(r"0IPN/Cortex", re.IGNORECASE), "rutas del proyecto"),
    (re.compile(r"(?<![\w-])(?:\./|\.\./)*(?:" + REPO_DIRS + r")/"), "carpetas del repo"),
    (re.compile(r"\.\./"), "subir de carpeta"),
    (re.compile(r"\.(?:ya?ml|mdx)\b", re.IGNORECASE), "archivos de contenido"),
    (
        re.compile(r"\b(?:ejercicios|jefe|leccion|catalogo|conceptos|answer)\.\w+", re.IGNORECASE),
        "archivos de contenido",
    ),
    (
        re.compile(r"(?:^|[\s;&|(`])(?:ls|find|grep|egrep|rg|ag|fd|tree|locate|mdfind|git|stat)\b"),
        "explorar archivos",
    ),
    (re.compile(r"\b(?:os\.listdir|os\.walk|os\.scandir|glob\.glob|Path\(['\"]\.['\"]\))"), "explorar archivos"),
]

# `cd` solo hacia carpetas temporales.
CD = re.compile(r"(?:^|[\s;&|(])cd(?:\s+([^\s;&|)]+))?")
TEMP_PREFIXES = ('"$TMPDIR', "$TMPDIR", '"${TMPDIR', "${TMPDIR", "/tmp", "/private/tmp", "/var/folders", '"$d"', "$d")


def deny(reason: str) -> None:
    print(
        f"cerca-ciega: bloqueado ({reason}). Resuelve solo con el enunciado que recibiste; "
        "calcula con .venv/bin/python -I o en una carpeta de mktemp -d.",
        file=sys.stderr,
    )
    sys.exit(2)


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        deny("no pude leer la llamada")
        return
    if not isinstance(data, dict):
        deny("la llamada no es un objeto")
        return

    if data.get("tool_name") != "Bash":
        deny(f"herramienta no permitida: {data.get('tool_name')!r}")
    command = (data.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command.strip():
        deny("comando vacío")
        return

    text = VENV_PYTHON.sub("PYTHON", command)

    for match in CD.finditer(text):
        target = match.group(1)
        if target is None or not target.startswith(TEMP_PREFIXES):
            deny("cd fuera de una carpeta temporal")

    for pattern, reason in FORBIDDEN:
        if pattern.search(text):
            deny(reason)

    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # falla cerrada: un error nunca deja pasar la llamada
        deny(f"error interno de la cerca: {type(error).__name__}")
