#!/usr/bin/env bash
# Prueba de aislamiento de la red IPFS privada (DRA-46). Levanta dos nodos temporales e intenta
# conectarlos al nodo de la plataforma:
#   - uno SIN la clave de enjambre  -> debe ser rechazado
#   - uno CON la misma clave        -> debe conectarse
# Requiere el servicio "ipfs" del docker compose en ejecución.
set -euo pipefail

cd "$(dirname "$0")"
KUBO_IMAGE="${KUBO_IMAGE:-ipfs/kubo:v0.43.1}"
RED_DOCKER="${RED_DOCKER:-plataforma_plataforma}"
NODO="${NODO:-plataforma-ipfs-1}"
DIRECCION="/ip4/172.30.0.20/tcp/4001/p2p/$(docker exec "$NODO" ipfs id -f '<id>')"

limpiar() { docker rm -f ipfs-prueba-sin-clave ipfs-prueba-con-clave >/dev/null 2>&1 || true; }
trap limpiar EXIT

intentar() {
  local nombre=$1; shift
  docker run -d --name "$nombre" --network "$RED_DOCKER" "$@" "$KUBO_IMAGE" >/dev/null
  for _ in $(seq 1 30); do docker logs "$nombre" 2>&1 | grep -q "Daemon is ready" && break; sleep 2; done
  docker exec "$nombre" timeout 25 ipfs swarm connect "$DIRECCION" >/dev/null 2>&1
}

if intentar ipfs-prueba-sin-clave; then
  echo "FALLA: un nodo sin la clave de enjambre pudo conectarse" >&2
  exit 1
fi
echo "Nodo sin clave de enjambre: rechazado"

if ! intentar ipfs-prueba-con-clave -e LIBP2P_FORCE_PNET=1 -e IPFS_SWARM_KEY_FILE=/red/swarm.key \
  -v "$(pwd)/red:/red:ro" -v "$(pwd)/init:/container-init.d:ro"; then
  echo "FALLA: un nodo con la misma clave de enjambre no pudo conectarse" >&2
  exit 1
fi
echo "Nodo con la misma clave de enjambre: conectado"
