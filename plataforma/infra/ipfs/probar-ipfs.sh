#!/usr/bin/env bash
# Prueba de humo del nodo IPFS privado (DRA-46): comprueba que la red es privada y que un
# archivo subido se recupera íntegro por su CID. Uso: ./probar-ipfs.sh [URL de la API]
set -euo pipefail

API="${1:-http://localhost:5001}/api/v0"
falla() { echo "FALLA: $*" >&2; exit 1; }

# 1. Red privada: sin nodos de arranque ni pares conectados
bootstrap=$(curl -sf -X POST "$API/bootstrap/list" | jq '.Peers | length')
[[ "$bootstrap" == "0" ]] || falla "hay $bootstrap nodos de arranque configurados"
pares=$(curl -sf -X POST "$API/swarm/peers" | jq '(.Peers // []) | length')
[[ "$pares" == "0" ]] || falla "el nodo está conectado a $pares pares"
echo "Red privada: 0 nodos de arranque, 0 pares"

# 2. Subida y recuperación de un archivo por su CID (CIDv1, como los PDF de la plataforma)
archivo=$(mktemp)
trap 'rm -f "$archivo" "$archivo.recuperado"' EXIT
printf 'Certificado de prueba DRA-46 %s\n' "$(date -u +%FT%TZ)" > "$archivo"
cid=$(curl -sf -X POST -F "file=@$archivo" "$API/add?cid-version=1&pin=true" | jq -r '.Hash')
[[ "$cid" == bafy* || "$cid" == bafk* ]] || falla "CID inesperado (se esperaba CIDv1): $cid"
curl -sf -X POST "$API/cat?arg=$cid" -o "$archivo.recuperado"
cmp -s "$archivo" "$archivo.recuperado" || falla "el archivo recuperado no coincide"
fijado=$(curl -sf -X POST "$API/pin/ls?arg=$cid" | jq -r ".Keys[\"$cid\"].Type")
[[ "$fijado" == "recursive" ]] || falla "el archivo no quedó fijado (pin)"
echo "Archivo subido y recuperado íntegro: $cid (fijado)"
