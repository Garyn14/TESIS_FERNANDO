#!/usr/bin/env bash
# Despliega RegistroDocumentos en la red Besu del ambiente, solo la primera vez (DRA-52, HU06).
#   desplegar-contrato.sh <ambiente> <URL del RPC>      (desde plataforma/)
#
# Va por /rpc a través de CloudFront, igual que MetaMask. Crea billeteras de prueba nuevas (sin
# valor) para el Administrador del contrato, el respaldo y el Director, y las guarda en Parameter
# Store, en /dra-satipo/<ambiente>-billeteras/ (SecureString): fuera de la ruta que lee el servidor,
# porque el servidor nunca firma. La dirección y el bloque del contrato van a la ruta del backend.
# Imprime "nuevo" si desplegó y "existente" si ya había un contrato.
set -euo pipefail
AMBIENTE=${1:?Uso: desplegar-contrato.sh <ambiente> <rpc>}
RPC=${2:?Falta la URL del RPC}
RUTA=/dra-satipo/$AMBIENTE
BILLETERAS=/dra-satipo/$AMBIENTE-billeteras

if aws ssm get-parameter --name "$RUTA/PLATAFORMA_CONTRATO_DIRECCION" >/dev/null 2>&1; then
  echo existente
  exit 0
fi

(cd e2e && BESU_RPC_URL="$RPC" node preparar-blockchain.cjs >/dev/null)
DESPLIEGUE=e2e/.despliegue.json
trap 'rm -f "$DESPLIEGUE"' EXIT
dato() { node -p "require('./$DESPLIEGUE').$1"; }
guardar() { # guardar <nombre> <tipo> <valor>
  aws ssm put-parameter --name "$1" --type "$2" --value "$3" --overwrite >/dev/null
}

for rol in administrador respaldo director; do
  ROL=$(echo "$rol" | tr '[:lower:]' '[:upper:]')
  guardar "$BILLETERAS/${ROL}_DIRECCION" String "$(dato "billeteras.$rol.direccion")"
  guardar "$BILLETERAS/${ROL}_CLAVE" SecureString "$(dato "billeteras.$rol.clave")"
done
# El contrato al final: su existencia indica que el despliegue está completo.
guardar "$RUTA/PLATAFORMA_CONTRATO_BLOQUE_INICIAL" String "$(dato bloque)"
guardar "$RUTA/PLATAFORMA_CONTRATO_DIRECCION" String "$(dato contrato)"
echo nuevo
