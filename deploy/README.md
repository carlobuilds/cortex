# Despliegue de Cortex (ADR-029)

Cortex se publica como **sitio estático** en `https://cortex.carlogarza.dev`: un contenedor Caddy (solo lectura, sin puertos publicados) en `/docker/cortex/` del VPS, detrás del **Traefik compartido** (red `traefik-public`, certresolver `letsencrypt`). No hay backend, token ni datos tuyos en el servidor: todo vive en la IndexedDB del dispositivo. El sitio es público pero **sin indexar** (`robots.txt`, `X-Robots-Tag`).

**Claude nunca entra al VPS.** Todo lo del VPS lo ejecutas tú con este documento y le devuelves la salida.

Archivos: `docker-compose.yml` y `Caddyfile` (van al VPS), `docker-compose.local.yml` (solo Mac), `publicar.sh` (solo Mac). Caddy: `2.11.7-alpine` fijado por digest.

## Antes de empezar

1. **DNS (ya existe):** `A cortex.carlogarza.dev → 76.13.106.210`, creado el 2026-11-16 con el OK de Carlo. Comprobar: `dig +short cortex.carlogarza.dev`.
2. **Alias SSH:** el script usa `hanami-vps` (o la variable `CORTEX_VPS`). Confirma que entra con llave y sin root.
3. **Traefik y el healthcheck:** Traefik **ignora el contenedor mientras no esté `healthy`**: sin router ni certificado hasta entonces (y Traefik responde su propio 404). El healthcheck pega a `/healthz`, que no depende del contenido de `sitio/`; tarda hasta ~30 s.

## Una sola vez (primer despliegue)

Orden obligatorio: la guarda de esquema lee `version.json` por HTTPS, y la primera vez se le avisa con `--primera`.

1. En el **VPS** (el dueño debe ser el usuario con el que entra SSH, para que `rsync` pueda escribir):

```sh
docker network ls --filter name=traefik-public     # debe existir (la crea el Traefik compartido)
mkdir -p /docker/cortex/sitio          # si /docker es de root, usa en su lugar:
# sudo install -d -o "$(id -un)" -g "$(id -gn)" /docker/cortex /docker/cortex/sitio
ls -ld /docker/cortex /docker/cortex/sitio         # el dueño debe ser tu usuario SSH, no root
```

2. Desde la **Mac**, en la raíz del repo:

```sh
scp deploy/docker-compose.yml deploy/Caddyfile hanami-vps:/docker/cortex/
```

3. En la **Mac**, con el árbol commiteado:

```sh
bash deploy/publicar.sh --primera
```

4. En el **VPS**:

```sh
cd /docker/cortex
docker compose pull && docker compose up -d
docker ps --filter name=cortex-pwa          # debe decir "Up ... (healthy)" en ~30 s; hasta entonces Traefik no lo enruta
docker logs cortex-pwa --tail 20            # sin "error"; los avisos de HTTP/2 y /3 son normales
```

5. Desde la **Mac** (espera a `healthy` y ~1 minuto a que Traefik obtenga el certificado):

```sh
curl -sI https://cortex.carlogarza.dev                  # 200, certificado válido, strict-transport-security, content-security-policy, x-robots-tag: noindex, nofollow, noarchive, sin "server:"
curl -sI https://cortex.carlogarza.dev/api/run-c        # 404
curl -s https://cortex.carlogarza.dev/version.json      # {"sha":...,"buildId":...,"schemaVersion":...}
```

Pega la salida de todo esto a Claude.

## Cada publicación

En la **Mac**, con el árbol limpio (todo commiteado):

```sh
bash deploy/publicar.sh
```

Hace, en orden:

1. Se niega si `src/`, `public/`, `content/`, `scripts/`, `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `postcss.config.mjs` o `pnpm-workspace.yaml` tienen cambios sin commit o archivos nuevos sin seguimiento.
2. `pnpm install --frozen-lockfile`, `rm -rf out`, `pnpm build:pwa` y la revisión de `out/` (sin runner de C ni `child_process`).
3. Escribe `out/version.json` con `{sha, buildId, schemaVersion}`.
4. Lee el `version.json` publicado **por HTTPS** y se niega si su `schemaVersion` es mayor que el de esta build.
5. Comprueba que todo `out/` sea legible por todos (el contenedor corre como 1000:1000) y lo sube a `/docker/cortex/sitio/` (ruta fija) con `--delete-after --delay-updates`.
6. Al terminar imprime, **sin ejecutarlo**, `git tag publicado-<fecha-hora> <sha>`: córrelo para tener el punto de rollback.

Opciones:

- Sin `--primera`, un **404** al pedir `version.json` hace que se niegue (Traefik responde su propio 404 si el contenedor no está healthy; no prueba que sea la primera vez). Una falla de red o TLS también.
- `--primera`: solo para la primera publicación. Acepta 404 o falla de red/TLS y se niega si el sitio ya publica un `version.json`.
- `--forzar`: sigue aunque la consulta falle o dé 404/otro código; con él **no** se comprueba el esquema publicado. Si la consulta sí responde con un esquema mayor, igual se niega.
- `--solo-preparar`: hace todo menos la consulta remota y el `rsync` (para probar en local; con árbol sucio solo avisa).
- El iPad recibe la versión nueva en la siguiente apertura. Un cambio **solo** del `Caddyfile` no llega al iPad hasta que haya una build nueva (las respuestas en caché guardan sus encabezados).

## Probar el mismo contenedor en la Mac

```sh
rm -rf out && pnpm build:pwa
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml up -d --force-recreate
# http://localhost:3300
pnpm test:e2e:pwa
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml down
```

`docker-compose.local.yml` solo cambia tres cosas: publica `127.0.0.1:3300 → 8080`, monta `../out` en `/srv` (solo lectura) y **crea** la red `traefik-public` (no externa), así que no hace falta `docker network create`. Tras un `rm -rf out` usa `--force-recreate`: el montaje queda apuntando a la carpeta borrada. `pnpm test:e2e:pwa` detiene y arranca `cortex-pwa` para simular el modo avión en WebKit.

## Kill switch y rollback (E5)

**Reglas que no se rompen:**

- **Nunca** «eliminar la app» del iPad ni «Borrar datos del sitio» (Ajustes de Safari): borra la IndexedDB, que es la **única copia** de tus datos.
- **Nunca** `Clear-Site-Data: "storage"` ni `"*"`. A lo sumo `"cache"`.
- `docker compose down` **no** arregla un iPad con el service worker instalado: el worker sigue sirviendo la copia local sin pedir nada al servidor.
- Caddy nunca manda `Service-Worker-Allowed`.

**Si una build deja el service worker roto (pantalla en blanco, no actualiza):**

1. Si la app abre, **exporta primero desde el iPad** (Ajustes). Si no abre, usa el respaldo más reciente de la Mac.
2. **Cierra Cortex en el iPad por completo** (que no quede ninguna sesión abierta).
3. En la Mac: `bash deploy/publicar.sh --kill-sw`. Hace la build completa, reemplaza `out/sw.js` por `scripts/sw-kill.js` (nunca un `out/` parcial), lo revisa y sube.
4. Abre Cortex en el iPad con conexión. Safari detecta el `sw.js` nuevo, borra las cachés `cortex-*`, se da de baja y recarga. **No toca la IndexedDB.**
5. Comprueba tus datos (intentos, XP, racha). Después arregla hacia adelante y publica una build normal: el sitio volverá a registrar el service worker.

**Rollback (volver a una build anterior):** solo si el `SCHEMA_VERSION` (`src/db/schema.ts`) de esa build es **igual** al publicado. Una build vieja con esquema menor lanza `FutureSchemaError` en los dispositivos que ya migraron, y `publicar.sh` se niega. Si el esquema subió, **se arregla hacia adelante**.

```sh
curl -s https://cortex.carlogarza.dev/version.json          # sha y schemaVersion publicados
git switch --detach publicado-AAAAMMDD-HHMM                       # la etiqueta de la build buena; árbol limpio
pnpm install --frozen-lockfile
bash deploy/publicar.sh
git switch -
pnpm install --frozen-lockfile
```

**Respuesta a incidentes:** un XSS en Cortex puede escribir en CacheStorage (por el `'unsafe-inline'` que el export de Next exige hoy) y esa caché dura **hasta la siguiente build o el kill switch**. Si sospechas de uno: kill switch, corrige y publica una build nueva (cada build usa una caché nueva y borra las viejas).

## Apagar

En el VPS:

```sh
cd /docker/cortex && docker compose down        # NUNCA con -v
```

Apaga el sitio, pero un iPad con el service worker instalado seguirá funcionando con su copia local. Para retirarlo del iPad: kill switch **antes** de apagar.

## Actualizar Caddy

Elige una versión estable con al menos 2 semanas de publicada, `docker pull caddy:<x.y.z>-alpine`, copia el digest de `docker buildx imagetools inspect caddy:<x.y.z>-alpine`, edítalo en `docker-compose.yml`, pásalo por `experto-ciberseguridad` y repite el `scp` y `docker compose pull && docker compose up -d`.

## Riesgos residuales (ADR-029)

- La CSP lleva `'unsafe-inline'` en scripts (Next lo exige hoy): un XSS podría escribir en CacheStorage hasta la siguiente build o el kill switch. Deuda con caducidad **antes del token de sync**.
- El sitio es público: el nombre aparece en Certificate Transparency y llegarán escáneres; se acepta porque es estático y sin datos tuyos.
