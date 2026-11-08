#!/usr/bin/env bash
# Pruebas de punta a punta de los sprints contra el servidor de AWS (DRA-54), sin AWS: cada sprint
# corre en un servidor nuevo, armado con el mismo paquete que se despliega en el EC2, detrás de un
# CloudFront simulado (cloudfront-local.conf.template) en los puertos 5173 y 5174.
#
#   infra/aws/pruebas/de-punta-a-punta.sh "1 2 3 4 5 6" [carpeta de capturas]   (desde plataforma/)
#
# La billetera de prueba firma por /rpc, como MetaMask en QA, y el QR apunta al portal simulado.
# Requisitos: los de e2e/regresion.sh (Java 21, Node 22, Playwright, SOLC_RUTA si hace falta) y la
# red Besu de desarrollo detenida, porque usa la misma subred de Docker:
#   cd infra && docker compose --profile besu down
set -uo pipefail
SPRINTS=${1:?Indique los sprints, por ejemplo "1 2 3 4 5 6"}
CAPTURAS=${2:-/tmp/e2e-aws}
cd "$(dirname "$0")/../../.." || exit 1
PLATAFORMA=$(pwd)
TRABAJO=$(mktemp -d)
export PROYECTO=prueba-aws
APP="$TRABAJO/app"
VARIABLES="$TRABAJO/plataforma.env"
export COMPOSE_ADICIONAL="$PLATAFORMA/infra/aws/pruebas/docker-compose.prueba.yml"

compose() {
  docker compose --project-name "$PROYECTO" --project-directory "$APP/infra" \
    -f "$APP/infra/docker-compose.yml" -f "$APP/infra/aws/servidor/docker-compose.qa.yml" \
    -f "$COMPOSE_ADICIONAL" --env-file "$VARIABLES" --profile besu --profile ipfs "$@"
}
apagar() {
  [ -f "$VARIABLES" ] && compose down -v --remove-orphans >/dev/null 2>&1
  # Las claves de Besu las crea un contenedor: se borran con uno para no depender de permisos.
  [ -d "$APP" ] && docker run --rm -v "$TRABAJO:/t" alpine rm -rf /t/app >/dev/null 2>&1
  rm -rf "$APP"
}
trap 'apagar; rm -rf "$TRABAJO"' EXIT

echo "== Construir el backend, el frontend y el portal"
(cd backend && ./mvnw -q -B package -DskipTests ${MAVEN_AJUSTES:+-s "$MAVEN_AJUSTES"}) || exit 1
(cd frontend && npm run -s build >/dev/null) || exit 1
(cd portal && npm run -s build >/dev/null) || exit 1
(cd e2e && npm install --silent) || exit 1
infra/aws/servidor/empaquetar.sh backend/target/plataforma-backend-*.jar "$TRABAJO/paquete.tar.gz" || exit 1
mkdir -p "$TRABAJO/estado"
echo '{"mensaje":"El ambiente de PRUEBA está apagado o encendiéndose. Intente nuevamente en unos minutos.","campos":{}}' \
  > "$TRABAJO/estado/apagado.json"

resumen=()
for n in $SPRINTS; do
  echo "== Sprint $n: servidor nuevo"
  apagar
  mkdir -p "$APP"
  tar -xzf "$TRABAJO/paquete.tar.gz" -C "$APP"
  # Los valores del modo de prueba de e2e/levantar.sh: sesión de 1 minuto, sincronización cada 3 s
  # y plazo de firma de 2 minutos.
  cat > "$VARIABLES" <<FIN
DB_PASSWORD='$(openssl rand -hex 16)'
PLATAFORMA_CLAVE_HMAC_DNI='$(openssl rand -hex 32)'
PLATAFORMA_ADMIN_CONTRASENA='Admin2026!'
PLATAFORMA_ADMIN_NOMBRE='Garyn Huarhuachi Ramos'
ORIGEN_SECRETO='$(openssl rand -hex 20)'
NGINX_PUERTO='8090'
PLATAFORMA_PORTAL_URL='http://localhost:5174'
BESU_RPC_PUBLICA='http://localhost:5173/rpc'
SESION_INACTIVIDAD='1m'
PLATAFORMA_SINCRONIZACION_INTERVALO='3s'
PLATAFORMA_FIRMA_PLAZO='2m'
PRUEBAS_DIR='$PLATAFORMA/infra/aws/pruebas'
SITIO_PLATAFORMA='$PLATAFORMA/frontend/dist'
SITIO_PORTAL='$PLATAFORMA/portal/dist'
SITIO_ESTADO='$TRABAJO/estado'
FIN
  "$APP/infra/aws/servidor/levantar.sh" "$VARIABLES" >/dev/null || { resumen+=("Sprint $n: no levantó"); continue; }

  # El contrato se despliega a través de /rpc, como lo hará el disparador Encender (DRA-52).
  contrato=$(cd e2e && BESU_RPC_URL=http://127.0.0.1:5173/rpc node preparar-blockchain.cjs) ||
    { resumen+=("Sprint $n: no se desplegó el contrato"); continue; }
  bloque=$(node -p 'require("./e2e/.despliegue.json").bloque')
  printf "PLATAFORMA_CONTRATO_DIRECCION='%s'\nPLATAFORMA_CONTRATO_BLOQUE_INICIAL='%s'\n" "$contrato" "$bloque" >> "$VARIABLES"
  "$APP/infra/aws/servidor/levantar.sh" "$VARIABLES" >/dev/null || { resumen+=("Sprint $n: no relanzó"); continue; }

  echo "== Sprint $n: prueba"
  salida="$CAPTURAS/sprint$n"
  rm -rf "$salida"; mkdir -p "$salida"
  E2E_CONTENEDOR_PG="$PROYECTO-postgres-1" E2E_CONTENEDOR_IPFS="$PROYECTO-ipfs-1" \
    BESU_RPC_URL=http://127.0.0.1:5173/rpc NODE_PATH=$(npm root -g) \
    timeout 900 node "e2e/sprint$n.cjs" "$salida" > "$salida/salida.log" 2>&1
  resumen+=("Sprint $n: $(grep -E 'FALL|pasos correctos' "$salida/salida.log" | tail -1)")
  echo "${resumen[-1]}"
done

# Con el último servidor todavía encendido: rutas de CloudFront y aviso de servidor apagado.
if [ -f "$VARIABLES" ]; then
  echo "== CloudFront: rutas y aviso de servidor apagado"
  mkdir -p "$CAPTURAS/cloudfront"
  NODE_PATH=$(npm root -g) node infra/aws/pruebas/cloudfront.cjs "$CAPTURAS/cloudfront" "$PROYECTO-nginx-1" \
    > "$CAPTURAS/cloudfront/salida.log" 2>&1
  resumen+=("CloudFront: $(grep -E 'FALL|pasos correctos' "$CAPTURAS/cloudfront/salida.log" | tail -1)")
fi

echo
echo "== Resumen (capturas y registros en $CAPTURAS)"
printf '%s\n' "${resumen[@]}"
! printf '%s\n' "${resumen[@]}" | grep -qv 'pasos correctos'
