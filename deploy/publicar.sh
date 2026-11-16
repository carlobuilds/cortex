#!/usr/bin/env bash
# Publica la PWA de Cortex en cortex.carlogarza.dev (ADR-029). La corre Carlo en su Mac:
#   bash deploy/publicar.sh                  build limpia + revisión + guarda de esquema + rsync
#   bash deploy/publicar.sh --primera        primera publicación (el sitio aún no tiene version.json)
#   bash deploy/publicar.sh --kill-sw        igual, pero publica el kill switch en lugar de sw.js (E5)
#   bash deploy/publicar.sh --solo-preparar  todo menos la consulta remota y el rsync (para probar en local)
#   bash deploy/publicar.sh --forzar         sigue aunque la consulta del version.json falle o dé 404/otro código.
#                                            Con --forzar NO se comprueba el esquema publicado en ese caso (si la
#                                            consulta sí responde con un esquema mayor, igual se niega).
# Un 404 sin --primera se niega: Traefik responde su propio 404 si el contenedor no está healthy, y eso no
# prueba que sea la primera vez. Con --primera se niega si el sitio YA publica un version.json.
# Variable opcional: CORTEX_VPS = alias SSH del VPS (por defecto hanami-vps). La ruta remota es fija.
set -euo pipefail

SITIO_URL="https://cortex.carlogarza.dev"
forzar=0
kill_sw=0
solo_preparar=0
primera=0
for arg in "$@"; do
  case "$arg" in
    --forzar) forzar=1 ;;
    --kill-sw) kill_sw=1 ;;
    --solo-preparar) solo_preparar=1 ;;
    --primera) primera=1 ;;
    *) echo "Argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."
umask 022
if [ "$primera" -eq 1 ] && [ -n "$(git tag -l 'publicado-*')" ]; then
  echo "Indicaste --primera pero ya existen etiquetas publicado-*; no es la primera publicación. Quita --primera." >&2
  exit 1
fi
export NEXT_TELEMETRY_DISABLED=1
# NO exportar NODE_ENV=production: haría que `pnpm install` se salte las devDependencies.

# 1. Lo publicado debe ser exactamente lo commiteado (incluidos archivos nuevos sin seguimiento).
sucio="$(git status --porcelain --untracked-files=all -- src public content scripts next.config.ts package.json pnpm-lock.yaml tsconfig.json postcss.config.mjs pnpm-workspace.yaml)"
if [ -n "$sucio" ]; then
  if [ "$solo_preparar" -eq 1 ]; then
    echo "AVISO (solo-preparar): árbol sucio. Una publicación real se negaría:" >&2
    echo "$sucio" >&2
  else
    echo "Me niego a publicar: hay cambios sin commit en src, public, content, scripts, next.config.ts, package.json, pnpm-lock.yaml, tsconfig.json, postcss.config.mjs o pnpm-workspace.yaml:" >&2
    echo "$sucio" >&2
    exit 1
  fi
fi

# 2. Dependencias exactas, build desde cero y revisión de out/ (E1).
pnpm install --frozen-lockfile
rm -rf out
pnpm build:pwa
pnpm exec tsx scripts/check-out-cli.ts

# 3. version.json = {sha, buildId, schemaVersion}.
sha="$(git rev-parse HEAD)"
manifiestos="$(find out/_next/static -mindepth 2 -maxdepth 2 -name _buildManifest.js)"
if [ -z "$manifiestos" ] || [ "$(printf '%s\n' "$manifiestos" | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "No pude determinar el buildId: se esperaba exactamente un out/_next/static/<id>/_buildManifest.js." >&2
  exit 1
fi
build_id="$(basename "$(dirname "$manifiestos")")"
case "$build_id" in ''|*[!A-Za-z0-9_-]*) echo "buildId inválido: '$build_id'" >&2; exit 1 ;; esac
schema="$(pnpm exec tsx -e "import { SCHEMA_VERSION } from './src/db/schema'; process.stdout.write(String(SCHEMA_VERSION));")"
case "$schema" in ''|*[!0-9]*) echo "SCHEMA_VERSION no es un entero: '$schema'" >&2; exit 1 ;; esac
printf '{"sha":"%s","buildId":"%s","schemaVersion":%s}\n' "$sha" "$build_id" "$schema" > out/version.json
echo "version.json: $(cat out/version.json)"
echo "Esquema local (SCHEMA_VERSION): $schema"

# 4. Kill switch: build completa, solo cambia sw.js.
if [ "$kill_sw" -eq 1 ]; then
  cp scripts/sw-kill.js out/sw.js
  echo "sw.js reemplazado por scripts/sw-kill.js (kill switch)."
fi
pnpm exec tsx scripts/check-out-cli.ts

# 5. Todo out/ debe ser legible por «otros» (el contenedor corre como 1000:1000; sin --chmod de rsync).
# Turbopack deja chunks en 664 y umask no lo corrige: se normaliza y luego se comprueba.
chmod -R u+rwX,go=rX out
ilegible="$(find out \( -type f ! -perm -444 \) -o \( -type d ! -perm -555 \) -o -perm -020 -o -perm -002)"
if [ -n "$ilegible" ]; then
  echo "Hay archivos o carpetas de out/ sin lectura para todos o escribibles por grupo/otros:" >&2
  echo "$ilegible" | head -20 >&2
  exit 1
fi

if [ "$solo_preparar" -eq 1 ]; then
  echo "--solo-preparar: out/ listo y revisado; no se consultó el sitio ni se hizo rsync."
  exit 0
fi

# 6. Guarda de esquema: nunca publicar un SCHEMA_VERSION menor que el publicado (sería un rollback de esquema
#    y la build vieja lanzaría FutureSchemaError en los dispositivos que ya migraron). Se lee por HTTPS.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
omitir() { # $1 = motivo
  echo "$1" >&2
  if [ "$forzar" -eq 1 ]; then
    echo "--forzar: sigo SIN comprobar el esquema publicado." >&2
  else
    echo "Me niego (--forzar sigue sin comprobar el esquema publicado)." >&2
    exit 1
  fi
}
if codigo="$(curl -q -sS --proto '=https' --max-time 20 -o "$tmp" -w '%{http_code}' "$SITIO_URL/version.json")"; then
  case "$codigo" in
    404)
      if [ "$primera" -eq 1 ]; then
        echo "version.json no existe en el sitio y indicaste --primera: sigo."
      else
        omitir "El sitio respondió 404 a version.json. Si es la primera publicación usa --primera (un 404 también lo da Traefik si el contenedor no está healthy)."
      fi ;;
    200)
      remoto="$(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).schemaVersion; if(!(Number.isSafeInteger(v)&&v>=1)) process.exit(3); process.stdout.write(String(v));' "$tmp")" || {
        echo "El version.json publicado no es válido. Me niego (revísalo a mano)." >&2; exit 1; }
      if [ "$primera" -eq 1 ]; then
        echo "Indicaste --primera pero el sitio ya publica un version.json (esquema $remoto). Me niego; quita --primera." >&2
        exit 1
      fi
      if [ "$remoto" -gt "$schema" ]; then
        echo "Me niego: el sitio publica schemaVersion $remoto y esta build trae $schema (rollback de esquema). Arregla hacia adelante." >&2
        exit 1
      fi
      echo "Esquema publicado: $remoto; esta build: $schema. Sigo." ;;
    *) omitir "El sitio respondió HTTP $codigo al pedir version.json." ;;
  esac
else
  if [ "$primera" -eq 1 ]; then
    echo "No pude consultar $SITIO_URL/version.json (red o TLS) y indicaste --primera: sigo."
  else
    omitir "No pude consultar $SITIO_URL/version.json (red, DNS o certificado)."
  fi
fi

# 7. Subida. Ruta remota fija: nunca viene de una variable.
destino="${CORTEX_VPS:-hanami-vps}"
case "$destino" in -*|*@-*|*[!A-Za-z0-9._@-]*) echo "CORTEX_VPS inválido: '$destino'" >&2; exit 1 ;; esac
rsync -az --delete-after --delay-updates out/ "$destino:/docker/cortex/sitio/"
echo "Publicado ($build_id, esquema $schema). Comprueba: curl -s $SITIO_URL/version.json"
echo "Para marcar esta versión como punto de rollback (NO se ejecutó):"
echo "  git tag publicado-$(date +%Y%m%d-%H%M) $sha"
