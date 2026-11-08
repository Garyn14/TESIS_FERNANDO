#!/usr/bin/env bash
# Levanta (o actualiza) la plataforma completa en el servidor de AWS (DRA-51): red Besu, IPFS,
# PostgreSQL, backend y nginx. Lo llama desplegar.sh en cada arranque del servidor y en cada
# despliegue; también sirve para probar el paquete en local (probar-local.sh).
#
#   levantar.sh <archivo de variables>
#
# Es repetible: la red Besu y la clave de IPFS se generan solo la primera vez y quedan en el disco,
# junto con los datos. Si el .jar cambió, reinicia el backend.
set -euo pipefail
VARIABLES=$(realpath "${1:?Uso: levantar.sh <archivo de variables>}")
APP=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$APP"

[ -d infra/besu/red ] || infra/besu/generar-red.sh
[ -f infra/ipfs/red/swarm.key ] || infra/ipfs/generar-clave.sh

# COMPOSE_ADICIONAL: solo en las pruebas locales (infra/aws/pruebas), para sumar el CloudFront simulado.
adicional=()
[ -n "${COMPOSE_ADICIONAL:-}" ] && adicional=(-f "$COMPOSE_ADICIONAL")
compose() {
  docker compose --project-name "${PROYECTO:-plataforma}" --project-directory infra -f infra/docker-compose.yml \
    -f infra/aws/servidor/docker-compose.qa.yml "${adicional[@]}" --env-file "$VARIABLES" \
    --profile besu --profile ipfs "$@"
}
compose up -d --remove-orphans

# El .jar se monta como archivo: si cambió, el contenedor sigue con el anterior hasta reiniciarlo.
huella=$(sha256sum backend.jar | cut -d' ' -f1)
if [ "$(cat .backend.sha256 2>/dev/null)" != "$huella" ]; then
  compose restart backend
  echo "$huella" > .backend.sha256
fi

# Espera a que la API responda a través de nginx, igual que la verá CloudFront.
set -a
# shellcheck disable=SC1090
. "$VARIABLES"
set +a
for _ in $(seq 1 90); do
  if curl -sf -H "X-Origen-Secreto: $ORIGEN_SECRETO" "http://127.0.0.1:${NGINX_PUERTO:-80}/api/salud" >/dev/null; then
    echo "Plataforma lista."
    exit 0
  fi
  sleep 5
done
echo "La plataforma no respondió en 7 minutos y medio. Estado de los contenedores:" >&2
compose ps >&2
compose logs --tail 40 backend >&2
exit 1
