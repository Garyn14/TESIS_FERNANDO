#!/usr/bin/env bash
# Genera las claves de los 4 validadores, el génesis QBFT y la lista de nodos permitidos.
# La salida queda en red/ (no se versiona). Ejecutar una sola vez antes de levantar la red;
# con --forzar se regenera desde cero (borra también los datos de la cadena).
set -euo pipefail

cd "$(dirname "$0")"
BESU_IMAGE="${BESU_IMAGE:-hyperledger/besu:26.10.2}"
IPS=(172.30.0.11 172.30.0.12 172.30.0.13 172.30.0.14)

if [[ -d red && "${1:-}" != "--forzar" ]]; then
  echo "La red ya existe en $(pwd)/red. Usa --forzar para regenerarla." >&2
  exit 1
fi
if [[ "${1:-}" == "--forzar" ]]; then
  docker compose -f ../docker-compose.yml --profile besu down -v --remove-orphans >/dev/null 2>&1 || true
fi
rm -rf red tmp

# Git Bash (Windows) reescribe las rutas que parecen de Unix (-w /trabajo pasaría a ser
# C:/Program Files/Git/trabajo) y Docker Desktop necesita la carpeta en formato de Windows.
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* ]]; then
  export MSYS_NO_PATHCONV=1
  CARPETA="$(pwd -W)"
  USUARIO=()
else
  CARPETA="$(pwd)"
  USUARIO=(-u "$(id -u):$(id -g)")
fi

# Besu 26.10 genera los archivos pero termina con "Output directory already exists";
# por eso se valida la salida en lugar del código de retorno.
REGISTRO="$(mktemp)"
docker run --rm "${USUARIO[@]}" -v "$CARPETA:/trabajo" -w /trabajo "$BESU_IMAGE" \
  operator generate-blockchain-config --config-file=qbftConfigFile.json --to=tmp \
  --private-key-file-name=key >"$REGISTRO" 2>&1 || true
if [[ ! -f tmp/genesis.json || $(find tmp/keys -name key | wc -l) -ne 4 ]]; then
  echo "No se pudo generar la configuración de la red. Salida de Docker:" >&2
  tail -n 20 "$REGISTRO" >&2
  rm -f "$REGISTRO"
  exit 1
fi
rm -f "$REGISTRO"

mkdir -p red
cp tmp/genesis.json red/genesis.json
i=0
enodes=()
for dir in tmp/keys/*/; do
  i=$((i + 1))
  mkdir -p "red/nodo$i"
  cp "$dir/key" "red/nodo$i/key"
  cp "$dir/key.pub" "red/nodo$i/key.pub"
  pub=$(sed 's/^0x//' "$dir/key.pub")
  enodes+=("\"enode://$pub@${IPS[$((i - 1))]}:30303\"")
  basename "$dir" > "red/nodo$i/direccion"
done
rm -rf tmp

lista=$(IFS=,; echo "${enodes[*]}")
echo "nodes-allowlist=[$lista]" > red/permissions_config.toml

# Configuración de cada nodo. El nodo 1 es el nodo de arranque (bootnode) de los demás.
for n in 1 2 3 4; do
  {
    echo "genesis-file=\"/red/genesis.json\""
    echo "data-path=\"/opt/besu/data\""
    echo "node-private-key-file=\"/red/nodo$n/key\""
    echo "p2p-host=\"${IPS[$((n - 1))]}\""
    echo "p2p-port=30303"
    [[ $n -gt 1 ]] && echo "bootnodes=[${enodes[0]}]"
    cat <<'TOML'
# Sin costo de transacción para los usuarios (RNF11)
min-gas-price=0

rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-api=["ETH","NET","WEB3","QBFT","TXPOOL"]
rpc-http-cors-origins=["*"]
rpc-ws-enabled=true
rpc-ws-host="0.0.0.0"
rpc-ws-port=8546
rpc-ws-api=["ETH","NET","WEB3"]
host-allowlist=["*"]

# Red permisionada: solo se conectan los nodos de la lista (RNF11)
permissions-nodes-config-file-enabled=true
permissions-nodes-config-file="/red/permissions_config.toml"
TOML
  } > "red/nodo$n/config.toml"
done

echo "Red generada en $(pwd)/red:"
for n in 1 2 3 4; do echo "  nodo$n  validador $(cat red/nodo$n/direccion)"; done
