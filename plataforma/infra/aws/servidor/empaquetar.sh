#!/usr/bin/env bash
# Arma el paquete que se despliega en el servidor de AWS (DRA-51): la carpeta infra (docker compose,
# scripts de Besu e IPFS y esta configuración, sin Terraform) y el backend.jar. No incluye las claves de la red
# Besu ni de IPFS: se generan en el servidor la primera vez y nunca salen de él.
#
#   empaquetar.sh <backend.jar> <paquete.tar.gz>
set -euo pipefail
JAR=$(realpath "${1:?Uso: empaquetar.sh <backend.jar> <paquete.tar.gz>}")
SALIDA=$(realpath -m "${2:?Uso: empaquetar.sh <backend.jar> <paquete.tar.gz>}")
PLATAFORMA=$(cd "$(dirname "$0")/../../.." && pwd)

TEMPORAL=$(mktemp -d)
trap 'rm -rf "$TEMPORAL"' EXIT
tar -C "$PLATAFORMA" --exclude='infra/besu/red' --exclude='infra/besu/tmp' \
  --exclude='infra/ipfs/red' --exclude='infra/.env' \
  --exclude='infra/aws/modulos' --exclude='infra/aws/qa' --exclude='infra/aws/cuenta' -cf - infra | tar -C "$TEMPORAL" -xf -
cp "$JAR" "$TEMPORAL/backend.jar"
tar -C "$TEMPORAL" -czf "$SALIDA" infra backend.jar
echo "Paquete listo: $SALIDA ($(du -h "$SALIDA" | cut -f1))"
