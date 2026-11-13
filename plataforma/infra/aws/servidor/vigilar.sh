#!/usr/bin/env bash
# Vigilante del servidor (DRA-68). Cada minuto revisa las partes que necesita la verificación y
# publica en CloudWatch una métrica por parte (1 = funciona, 0 = no). Las alarmas del módulo de
# Terraform (monitoreo.tf) avisan por correo si una parte falla en dos ventanas seguidas de 5
# minutos, o si el vigilante deja de reportar (servidor caído). Corre cada minuto y no cada 5: así
# cada ventana recibe unos 5 reportes, y un retraso de segundos no la deja vacía (visto en QA).
#
#   Plataforma   el backend responde su salud, que incluye la base de datos
#   Blockchain   la red Besu sigue produciendo bloques (con menos de 3 validadores se detiene)
#   IPFS         el contenedor del IPFS está sano
#   DiscoUsado   porcentaje usado del disco
#
# Lo ejecuta el temporizador plataforma-vigilante (lo instala desplegar.sh si el monitoreo está
# activo). Lee AMBIENTE y REGION de /etc/plataforma/ambiente; las pruebas los pasan como variables.
set -uo pipefail
if [ -z "${AMBIENTE:-}" ] && [ -f /etc/plataforma/ambiente ]; then
  # shellcheck disable=SC1091
  . /etc/plataforma/ambiente
fi
: "${AMBIENTE:?Falta AMBIENTE}" "${REGION:?Falta REGION}"
PROYECTO=${PROYECTO:-plataforma}
# Último bloque visto, para saber si la cadena avanza entre una revisión y la siguiente.
ESTADO=${VIGILANTE_ESTADO:-/var/lib/plataforma-vigilante}

contenedor() {
  docker ps --filter "label=com.docker.compose.project=$PROYECTO" \
    --filter "label=com.docker.compose.service=$1" --format '{{.Names}}' | head -n 1
}
sano() { # el contenedor existe y su healthcheck dice healthy
  [ -n "$1" ] && [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$1" 2>/dev/null)" = healthy ]
}

# Las consultas salen desde el contenedor de nginx, que está en la red interna (ningún otro
# servicio publica puertos) y trae wget.
nginx=$(contenedor nginx)
interna() { [ -n "$nginx" ] && docker exec "$nginx" wget -q -O - -T 10 "$@" 2>/dev/null; }

plataforma=0
interna http://backend:8080/actuator/health | grep -q '"status":"UP"' && plataforma=1

# El bloque más alto entre los 4 nodos: si un nodo cae pero la red sigue, no es una falla.
bloque=-1
for n in 1 2 3 4; do
  hex=$(interna --header 'content-type: application/json' \
    --post-data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
    "http://besu-nodo$n:8545" | sed -n 's/.*"result":"0x\([0-9a-fA-F]*\)".*/\1/p')
  [ -n "$hex" ] && [ $((16#$hex)) -gt "$bloque" ] && bloque=$((16#$hex))
done
anterior=$(cat "$ESTADO/bloque" 2>/dev/null || echo -1)
blockchain=0
if [ "$bloque" -ge 0 ]; then
  # Un bloque cada 2 s: en un minuto la cadena tiene que haber avanzado (unos 30 bloques). La primera vez basta con
  # que responda.
  { [ "$anterior" -lt 0 ] || [ "$bloque" -gt "$anterior" ]; } && blockchain=1
  mkdir -p "$ESTADO" && echo "$bloque" > "$ESTADO/bloque"
fi

ipfs=0
sano "$(contenedor ipfs)" && ipfs=1

disco=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')

metrica() { echo "MetricName=$1,Dimensions=[{Name=Ambiente,Value=$AMBIENTE}],Value=$2,Unit=$3"; }
aws cloudwatch put-metric-data --region "$REGION" --namespace DRA-Satipo --metric-data \
  "$(metrica Plataforma "$plataforma" Count)" "$(metrica Blockchain "$blockchain" Count)" \
  "$(metrica IPFS "$ipfs" Count)" "$(metrica DiscoUsado "$disco" Percent)"
echo "Plataforma=$plataforma Blockchain=$blockchain (bloque $bloque) IPFS=$ipfs DiscoUsado=$disco%"
