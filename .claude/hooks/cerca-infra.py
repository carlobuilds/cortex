#!/usr/bin/env python3
"""Cerca del agente dev-infra (hook PreToolUse sobre Bash).

dev-infra escribe archivos de despliegue y runbooks; los cambios en el VPS los
ejecuta Carlo. Esta cerca bloquea (exit 2) conexiones remotas, generación de
llaves y llamadas a la API de Hostinger. Falla cerrada.
"""

from __future__ import annotations

import json
import re
import sys

FORBIDDEN: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?:^|[\s;&|(`])(?:ssh|scp|sftp|mosh|ssh-copy-id|ssh-keygen|ssh-add)\b"), "conexión o llaves SSH"),
    (re.compile(r"(?:^|[\s;&|(`])rsync\b[^\n]*\s[\w.@-]+:"), "rsync remoto"),
    (re.compile(r"(?:curl|wget|http|https?://)[^\n]*hostinger", re.IGNORECASE), "API de Hostinger"),
]


def deny(reason: str) -> None:
    print(
        f"cerca-infra: bloqueado ({reason}). Escribe el paso en deploy/RUNBOOK.md para que Carlo lo ejecute.",
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
    command = (data.get("tool_input") or {}).get("command")
    if not isinstance(command, str):
        deny("comando ilegible")
        return
    for pattern, reason in FORBIDDEN:
        if pattern.search(command):
            deny(reason)
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # falla cerrada: un error nunca deja pasar la llamada
        deny(f"error interno de la cerca: {type(error).__name__}")
