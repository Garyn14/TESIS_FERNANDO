#!/usr/bin/env bash
# Levanta un entorno limpio y real para la prueba de punta a punta: PostgreSQL vacío en el puerto
# 5433, el backend en el 8080 (con la sesión de 1 minuto para probar la expiración) y el frontend
# en el 5173. Detener con Ctrl+C.
set -euo pipefail
cd "$(dirname "$0")/.."

docker rm -f e2e-pg >/dev/null 2>&1 || true
docker run -d --name e2e-pg -e POSTGRES_DB=plataforma -e POSTGRES_USER=plataforma \
  -e POSTGRES_PASSWORD=plataforma -p 5433:5432 postgres:17-alpine >/dev/null
until docker exec e2e-pg pg_isready -U plataforma >/dev/null 2>&1; do sleep 1; done

(cd backend && ./mvnw -q package -DskipTests)
DB_URL=jdbc:postgresql://localhost:5433/plataforma PLATAFORMA_ADMIN_CONTRASENA='Admin2026!' \
  PLATAFORMA_ADMIN_NOMBRE='Garyn Huarhuachi Ramos' SESION_INACTIVIDAD=1m \
  java -jar backend/target/plataforma-backend-*.jar &
BACKEND=$!
(cd frontend && npx vite --port 5173 --strictPort) &
FRONTEND=$!
trap 'kill $BACKEND $FRONTEND; docker rm -f e2e-pg >/dev/null' EXIT

until curl -s localhost:8080/api/salud >/dev/null; do sleep 1; done
echo "Entorno listo. En otra terminal: node e2e/sprint1.cjs <carpeta de capturas>"
wait
