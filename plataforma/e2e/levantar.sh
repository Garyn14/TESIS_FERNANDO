#!/usr/bin/env bash
# Levanta un entorno limpio y real para la prueba de punta a punta: PostgreSQL vacío en el puerto
# 5433, la red Besu local (si no está levantada) con un RegistroDocumentos recién desplegado, el
# backend en el 8080 y el frontend en el 5173, y un nodo IPFS privado vacío en el 5002 (HU17).
# Detener con Ctrl+C.
#
#   ./e2e/levantar.sh          -> para la prueba automática: la sesión expira en 1 minuto
#   ./e2e/levantar.sh demo     -> para la demostración (revisión del sprint): sesión de 30 minutos
#                                 y datos para importar las billeteras de prueba en MetaMask
set -euo pipefail
cd "$(dirname "$0")/.."
MODO=${1:-prueba}

# Requisitos: se comprueban antes de empezar, para fallar con un motivo claro.
falta() { echo "Falta un requisito: $1" >&2; exit 1; }
# Maven usa el Java de JAVA_HOME si está definido; si no, el java del PATH.
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/}java"
version_java=$("$JAVA_BIN" -XshowSettings:properties -version 2>&1 | sed -n 's/.*java.specification.version = //p')
[ "${version_java%%.*}" -ge 21 ] 2>/dev/null ||
  falta "Java 21 o superior (Maven usaría $JAVA_BIN, versión ${version_java:-desconocida}). En Ubuntu/WSL: sudo apt install openjdk-21-jdk y, si JAVA_HOME está definido, apúntalo a /usr/lib/jvm/java-21-openjdk-amd64"
version_node=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
[ "$version_node" -ge 22 ] || falta "Node.js 22 o superior (versión actual: ${version_node})"
docker info >/dev/null 2>&1 || falta "Docker en ejecución (enciende Docker Desktop y activa la integración con WSL)"
INACTIVIDAD=$([ "$MODO" = demo ] && echo 30m || echo 1m)
# Sincronización con la blockchain (HU18): en la prueba, cada 3 segundos y con un plazo de firma de
# 2 minutos, para no esperar los 15 minutos de producción.
SINCRONIZACION=$([ "$MODO" = demo ] && echo 30s || echo 3s)
PLAZO_FIRMA=$([ "$MODO" = demo ] && echo 15m || echo 2m)

# Red Besu (HU06): se levanta si no responde.
if ! curl -s -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545 >/dev/null; then
  [ -d infra/besu/red ] || infra/besu/generar-red.sh
  (cd infra && docker compose --profile besu up -d --wait)
fi
# Dependencias de un clon nuevo: se instalan solo si faltan.
for proyecto in contracts frontend; do
  [ -d "$proyecto/node_modules" ] || (echo "Instalando dependencias de $proyecto…" && cd "$proyecto" && npm ci --silent)
done
(cd e2e && npm install --silent)
CONTRATO=$(cd e2e && node preparar-blockchain.cjs)
BLOQUE_INICIAL=$(node -p 'require("./e2e/.despliegue.json").bloque')
echo "Contrato RegistroDocumentos: $CONTRATO"

docker rm -f e2e-pg >/dev/null 2>&1 || true
docker run -d --name e2e-pg -e POSTGRES_DB=plataforma -e POSTGRES_USER=plataforma \
  -e POSTGRES_PASSWORD=plataforma -p 5433:5432 postgres:17-alpine >/dev/null
until docker exec e2e-pg pg_isready -U plataforma >/dev/null 2>&1; do sleep 1; done

# Nodo IPFS privado vacío (HU17), con la clave de enjambre y la configuración de infra/ipfs. Su API
# solo escucha en 127.0.0.1.
[ -f infra/ipfs/red/swarm.key ] || infra/ipfs/generar-clave.sh
docker rm -f e2e-ipfs >/dev/null 2>&1 || true
docker run -d --name e2e-ipfs -e LIBP2P_FORCE_PNET=1 -e IPFS_SWARM_KEY_FILE=/red/swarm.key \
  -v "$PWD/infra/ipfs/red:/red:ro" -v "$PWD/infra/ipfs/init:/container-init.d:ro" \
  -p 127.0.0.1:5002:5001 ipfs/kubo:v0.43.1 >/dev/null
until curl -sf -X POST localhost:5002/api/v0/id >/dev/null 2>&1; do sleep 1; done

(cd backend && ./mvnw -q package -DskipTests)
# Clave del HMAC del DNI (HU08, RF17): una nueva en cada arranque, porque la base también es nueva.
# En AWS se guarda en el gestor de secretos (RNF03).
CLAVE_HMAC=$(node -p 'require("crypto").randomBytes(32).toString("hex")')
DB_URL=jdbc:postgresql://localhost:5433/plataforma PLATAFORMA_ADMIN_CONTRASENA='Admin2026!' \
  PLATAFORMA_ADMIN_NOMBRE='Garyn Huarhuachi Ramos' SESION_INACTIVIDAD=$INACTIVIDAD \
  PLATAFORMA_CONTRATO_DIRECCION="$CONTRATO" PLATAFORMA_CLAVE_HMAC_DNI="$CLAVE_HMAC" \
  PLATAFORMA_IPFS_URL=http://localhost:5002 PLATAFORMA_CONTRATO_BLOQUE_INICIAL="$BLOQUE_INICIAL" \
  PLATAFORMA_SINCRONIZACION_INTERVALO=$SINCRONIZACION PLATAFORMA_FIRMA_PLAZO=$PLAZO_FIRMA \
  java -jar backend/target/plataforma-backend-*.jar &
BACKEND=$!
(cd frontend && npx vite --port 5173 --strictPort) &
FRONTEND=$!
trap 'kill $BACKEND $FRONTEND; docker rm -f e2e-pg e2e-ipfs >/dev/null' EXIT

until curl -s localhost:8080/api/salud >/dev/null; do sleep 1; done
if [ "$MODO" = demo ]; then
  node -e '
    const d = require("./e2e/.despliegue.json")
    console.log(`
Demostración lista en http://localhost:5173  (Administrador: admin / Admin2026!)

En MetaMask (billeteras SOLO de prueba, sin valor):
  1. Agregue la red manualmente o deje que la plataforma la proponga:
     Plataforma DRA Satipo · RPC http://localhost:8545 · chainId 20260 · moneda DRA
  2. Importe la cuenta del Administrador del contrato con esta clave privada:
     ${d.billeteras.administrador.clave}
  3. Dirección para registrar como billetera del director:
     ${d.billeteras.director.direccion}
Contrato RegistroDocumentos: ${d.contrato}`)'
else
  echo "Entorno listo. En otra terminal: node e2e/sprint1.cjs <carpeta de capturas>"
fi
wait
