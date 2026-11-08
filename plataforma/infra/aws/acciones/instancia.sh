#!/usr/bin/env bash
# Datos del servidor de un ambiente (DRA-52): imprime "ID TIPO ESTADO", o nada si no existe.
#   instancia.sh qa
set -euo pipefail
AMBIENTE=${1:?Uso: instancia.sh <ambiente>}
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=dra-satipo-$AMBIENTE" \
  "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name]' --output text | head -n 1
