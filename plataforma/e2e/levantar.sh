#!/usr/bin/env bash
# Levanta un entorno limpio y real para la prueba de punta a punta: PostgreSQL vacío en el puerto
# 5433, la red Besu local (si no está levantada) con un RegistroDocumentos recién desplegado, el
# backend en el 8080 (con la sesión de 1 minuto para probar la expiración) y el frontend en el 5173.
# Detener con Ctrl+C.
set -euo pipefail
cd "$(dirname "$0")/.."

# Red Besu (HU06): se levanta si no responde.
if ! curl -s -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545 >/dev/null; then
  [ -d infra/besu/red ] || infra/besu/generar-red.sh
  (cd infra && docker compose --profile besu up -d --wait)
fi
(cd e2e && npm install --silent)
CONTRATO=$(cd e2e && node preparar-blockchain.cjs)
echo "Contrato RegistroDocumentos: $CONTRATO"

docker rm -f e2e-pg >/dev/null 2>&1 || true
docker run -d --name e2e-pg -e POSTGRES_DB=plataforma -e POSTGRES_USER=plataforma \
  -e POSTGRES_PASSWORD=plataforma -p 5433:5432 postgres:17-alpine >/dev/null
until docker exec e2e-pg pg_isready -U plataforma >/dev/null 2>&1; do sleep 1; done

(cd backend && ./mvnw -q package -DskipTests)
DB_URL=jdbc:postgresql://localhost:5433/plataforma PLATAFORMA_ADMIN_CONTRASENA='Admin2026!' \
  PLATAFORMA_ADMIN_NOMBRE='Garyn Huarhuachi Ramos' SESION_INACTIVIDAD=1m \
  PLATAFORMA_CONTRATO_DIRECCION="$CONTRATO" \
  java -jar backend/target/plataforma-backend-*.jar &
BACKEND=$!
(cd frontend && npx vite --port 5173 --strictPort) &
FRONTEND=$!
trap 'kill $BACKEND $FRONTEND; docker rm -f e2e-pg >/dev/null' EXIT

until curl -s localhost:8080/api/salud >/dev/null; do sleep 1; done
echo "Entorno listo. En otra terminal: node e2e/sprint1.cjs <carpeta de capturas>"
wait
