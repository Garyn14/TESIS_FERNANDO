#!/usr/bin/env bash
# Genera la clave de enjambre (swarm key) de la red IPFS privada en red/swarm.key (no se versiona).
# Solo los nodos que tengan esta misma clave pueden conectarse entre sí (RNF03).
set -euo pipefail

cd "$(dirname "$0")"
if [[ -f red/swarm.key && "${1:-}" != "--forzar" ]]; then
  echo "La clave ya existe en $(pwd)/red/swarm.key. Usa --forzar para regenerarla." >&2
  exit 1
fi
mkdir -p red
{
  echo "/key/swarm/psk/1.0.0/"
  echo "/base16/"
  od -An -tx1 -N32 /dev/urandom | tr -d ' \n'
  echo
} > red/swarm.key
chmod 644 red/swarm.key
echo "Clave de enjambre generada en $(pwd)/red/swarm.key"
