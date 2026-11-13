#!/usr/bin/env bash
# Prueba el servidor de AWS (DRA-51) sin AWS: arma el paquete, lo levanta en Docker como lo haría
# el EC2 (con variables de prueba en lugar de Parameter Store) y comprueba lo que protege nginx y
# que los datos sobreviven al apagado. Lo corre la CI; en local, detenga antes la red Besu de
# desarrollo (usa la misma subred de Docker): cd infra && docker compose --profile besu down
#
#   probar-servidor.sh <backend.jar>
set -euo pipefail
JAR=$(realpath "${1:?Uso: probar-servidor.sh <backend.jar>}")
AQUI=$(cd "$(dirname "$0")" && pwd)
PRUEBA=$(mktemp -d)
export PROYECTO=prueba-servidor
PUERTO=8090
SECRETO=secreto-de-prueba
fallas=0

compose() {
  docker compose --project-name "$PROYECTO" --project-directory "$PRUEBA/app/infra" \
    -f "$PRUEBA/app/infra/docker-compose.yml" -f "$PRUEBA/app/infra/aws/servidor/docker-compose.qa.yml" \
    --env-file "$PRUEBA/plataforma.env" --profile besu --profile ipfs "$@"
}
limpiar() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  # Las claves de Besu las crea un contenedor: se borran con uno para no depender de permisos.
  docker run --rm -v "$PRUEBA:/prueba" alpine rm -rf /prueba/app >/dev/null 2>&1 || true
  rm -rf "$PRUEBA"
}
trap limpiar EXIT

comprobar() { # comprobar <descripción> <esperado> <obtenido>
  if [ "$2" = "$3" ]; then
    echo "  ok    $1"
  else
    echo "  FALLA $1: se esperaba «$2» y se obtuvo «$3»"
    fallas=$((fallas + 1))
  fi
}
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
rpc() { # rpc <método>
  curl -s -H "X-Origen-Secreto: $SECRETO" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"$1\",\"params\":[],\"id\":1}" "http://127.0.0.1:$PUERTO/rpc"
}
verificar_desde() { # verificar_desde <X-Forwarded-For que llega de CloudFront>
  codigo -H "X-Origen-Secreto: $SECRETO" -H "X-Forwarded-For: $1" \
    "http://127.0.0.1:$PUERTO/api/verificacion/codigo/NOEXISTE"
}

echo "== Paquete"
"$AQUI/empaquetar.sh" "$JAR" "$PRUEBA/paquete.tar.gz"
mkdir -p "$PRUEBA/app"
tar -xzf "$PRUEBA/paquete.tar.gz" -C "$PRUEBA/app"
cat > "$PRUEBA/plataforma.env" <<FIN
DB_PASSWORD='clave-de-base-de-prueba'
PLATAFORMA_CLAVE_HMAC_DNI='$(openssl rand -hex 32)'
PLATAFORMA_ADMIN_CONTRASENA='Admin2026!'
ORIGEN_SECRETO='$SECRETO'
NGINX_PUERTO='$PUERTO'
PLATAFORMA_PORTAL_URL='https://portal.ejemplo'
FIN

echo "== Primer despliegue"
"$PRUEBA/app/infra/aws/servidor/levantar.sh" "$PRUEBA/plataforma.env" >/dev/null

echo "== nginx solo atiende a CloudFront"
comprobar "sin el encabezado secreto: 403" 403 "$(codigo "http://127.0.0.1:$PUERTO/api/salud")"
comprobar "con un secreto falso: 403" 403 "$(codigo -H 'X-Origen-Secreto: otro' "http://127.0.0.1:$PUERTO/api/salud")"
comprobar "con el secreto: 200" 200 "$(codigo -H "X-Origen-Secreto: $SECRETO" "http://127.0.0.1:$PUERTO/api/salud")"
comprobar "fuera de /api y /rpc: 404" 404 "$(codigo -H "X-Origen-Secreto: $SECRETO" "http://127.0.0.1:$PUERTO/otra")"

echo "== /rpc público solo con ETH, NET y WEB3"
comprobar "eth_chainId responde 20260 (0x4f24)" '"0x4f24"' "$(rpc eth_chainId | grep -o '"result":"[^"]*"' | cut -d: -f2)"
comprobar "qbft_* no habilitado" '"Method not enabled"' "$(rpc qbft_getValidatorsByBlockNumber | grep -o '"message":"[^"]*"' | cut -d: -f2)"
comprobar "txpool_* no habilitado" '"Method not enabled"' "$(rpc txpool_besuStatistics | grep -o '"message":"[^"]*"' | cut -d: -f2)"
comprobar "GET /rpc rechazado" 403 "$(codigo -H "X-Origen-Secreto: $SECRETO" "http://127.0.0.1:$PUERTO/rpc")"

echo "== HU20: el límite por IP cuenta la IP real del visitante (la última de X-Forwarded-For)"
for _ in $(seq 10); do verificar_desde 198.51.100.7 >/dev/null; done
comprobar "consulta 11 del mismo visitante: 429" 429 "$(verificar_desde 198.51.100.7)"
comprobar "otro visitante no se ve afectado: 200" 200 "$(verificar_desde 203.0.113.9)"
comprobar "falsificar X-Forwarded-For no evita el límite" 429 "$(verificar_desde '203.0.113.50, 198.51.100.7')"
comprobar "ni culpa a otra IP" 200 "$(verificar_desde '198.51.100.7, 203.0.113.60')"

echo "== Ningún otro servicio publica puertos"
comprobar "solo nginx publica un puerto" "$PROYECTO-nginx-1" \
  "$(docker ps --filter "label=com.docker.compose.project=$PROYECTO" --format '{{.Names}} {{.Ports}}' | grep -- '->' | cut -d' ' -f1 | xargs)"

echo "== Relanzar sin cambios y apagar/encender conservan los datos"
compose exec -T postgres psql -U plataforma -tAc \
  "insert into area(codigo, nombre) values ('PERSIST', 'Área de prueba de persistencia')" >/dev/null
bloque_antes=$(($(rpc eth_blockNumber | grep -o '"result":"[^"]*"' | cut -d'"' -f4)))
"$PRUEBA/app/infra/aws/servidor/levantar.sh" "$PRUEBA/plataforma.env" >/dev/null
compose stop >/dev/null
"$PRUEBA/app/infra/aws/servidor/levantar.sh" "$PRUEBA/plataforma.env" >/dev/null
comprobar "la base conserva sus datos" "Área de prueba de persistencia" \
  "$(compose exec -T postgres psql -U plataforma -tAc "select nombre from area where codigo = 'PERSIST'")"
bloque_despues=$(($(rpc eth_blockNumber | grep -o '"result":"[^"]*"' | cut -d'"' -f4)))
comprobar "la cadena de Besu continúa (no vuelve al bloque 0)" si "$([ "$bloque_despues" -ge "$bloque_antes" ] && echo si || echo no)"
comprobar "la cuenta inicial del Administrador sigue existiendo" admin \
  "$(compose exec -T postgres psql -U plataforma -tAc "select nombre_usuario from usuario where nombre_usuario = 'admin'")"

echo "== DRA-66: volcado de PostgreSQL antes de la copia del disco"
VOLCADOS="$PRUEBA/volcados"
for _ in 1 2 3 4; do
  VOLCADOS="$VOLCADOS" "$PRUEBA/app/infra/aws/servidor/volcar-base.sh" >/dev/null
  sleep 1 # los nombres llevan la fecha al segundo
done
comprobar "se conservan solo los 3 volcados más recientes" 3 "$(find "$VOLCADOS" -name 'plataforma-*.dump' | wc -l | tr -d ' ')"
comprobar "no quedan volcados a medias" 0 "$(find "$VOLCADOS" -name '*.parcial' | wc -l | tr -d ' ')"
ultimo=$(find "$VOLCADOS" -name 'plataforma-*.dump' | sort | tail -n 1)
# El volcado se restaura en una base aparte y trae los datos: es una copia portable de verdad.
compose exec -T postgres createdb -U plataforma restaurada
compose exec -T postgres pg_restore -U plataforma -d restaurada < "$ultimo"
comprobar "el volcado se restaura y trae los datos" "Área de prueba de persistencia" \
  "$(compose exec -T postgres psql -U plataforma -d restaurada -tAc "select nombre from area where codigo = 'PERSIST'")"

echo "== DRA-68: el vigilante publica en CloudWatch si cada parte funciona"
# aws simulado: guarda lo que se publicaría en CloudWatch.
mkdir -p "$PRUEBA/bin"
cat > "$PRUEBA/bin/aws" <<'FIN'
#!/usr/bin/env bash
echo "$*" > "$PRUEBA_METRICAS"
FIN
chmod +x "$PRUEBA/bin/aws"
vigilar() {
  PATH="$PRUEBA/bin:$PATH" PRUEBA_METRICAS="$PRUEBA/metricas" AMBIENTE=prueba REGION=us-east-2 \
    VIGILANTE_ESTADO="$PRUEBA/vigilante" "$PRUEBA/app/infra/aws/servidor/vigilar.sh" >/dev/null
}
valor() { # valor <métrica>: lo último que publicó el vigilante
  grep -o "MetricName=$1,Dimensions=\[{Name=Ambiente,Value=prueba}\],Value=[0-9]*" "$PRUEBA/metricas" | sed 's/.*Value=//'
}
vigilar
comprobar "publica en el espacio DRA-Satipo de la región del servidor" 1 \
  "$(grep -c -- '--region us-east-2 --namespace DRA-Satipo' "$PRUEBA/metricas")"
comprobar "con todo funcionando: plataforma 1" 1 "$(valor Plataforma)"
comprobar "con todo funcionando: IPFS 1" 1 "$(valor IPFS)"
sleep 6
vigilar
comprobar "la cadena avanza: blockchain 1" 1 "$(valor Blockchain)"
comprobar "informa el disco usado (0 a 100)" 1 "$(valor DiscoUsado | awk '$1 >= 0 && $1 <= 100 {print 1}')"
# Con 2 de 4 validadores, QBFT no llega a 3 votos y deja de producir bloques.
compose stop besu-nodo3 besu-nodo4 >/dev/null 2>&1
vigilar
sleep 6
vigilar
comprobar "con la red detenida: blockchain 0" 0 "$(valor Blockchain)"
compose stop ipfs backend >/dev/null 2>&1
vigilar
comprobar "con el IPFS detenido: IPFS 0" 0 "$(valor IPFS)"
comprobar "con el backend detenido: plataforma 0" 0 "$(valor Plataforma)"

if [ "$fallas" -gt 0 ]; then
  echo "$fallas comprobaciones fallaron."
  compose logs --tail 40 backend nginx
  exit 1
fi
echo "Todas las comprobaciones pasaron."
