#!/usr/bin/env bash
# "Respaldar ahora" (DRA-66): copia del disco completo del servidor, en el momento, antes de una
# operación delicada (por ejemplo, una actualización). Primero deja un volcado de PostgreSQL en el
# disco y luego copia todos los discos del servidor en el mismo instante. Espera a que la copia
# termine e imprime su identificador.
#
# Las copias manuales no las borra la retención diaria: se borran a mano cuando ya no sirven
# (docs/arquitectura/respaldos.md).
#   respaldar-ahora.sh <ambiente>
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
AMBIENTE=${1:?Uso: respaldar-ahora.sh <ambiente>}
NOMBRE="dra-satipo-$AMBIENTE"

read -r instancia _ estado <<< "$("$AQUI/instancia.sh" "$AMBIENTE")"
[ -n "${instancia:-}" ] || { echo "No existe el servidor de $AMBIENTE." >&2; exit 1; }
[ "$estado" = running ] || { echo "El servidor de $AMBIENTE está $estado: enciéndalo antes de respaldar." >&2; exit 1; }

echo "Volcado de PostgreSQL en el disco del servidor…"
"$AQUI/ssm-ejecutar.sh" "$instancia" /opt/plataforma/app/infra/aws/servidor/volcar-base.sh 600

echo "Copia del disco del servidor $instancia…"
copias=$(aws ec2 create-snapshots \
  --instance-specification "InstanceId=$instancia" \
  --description "Respaldo manual de $NOMBRE - DRA-66" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=$NOMBRE},{Key=Ambiente,Value=$AMBIENTE},{Key=TipoDeRespaldo,Value=manual}]" \
  --query 'Snapshots[].SnapshotId' --output text)
[ -n "$copias" ] || { echo "AWS no devolvió ninguna copia." >&2; exit 1; }
echo "Copias en curso: $copias"
# shellcheck disable=SC2086 # varios identificadores, separados por espacios
aws ec2 wait snapshot-completed --snapshot-ids $copias
echo "Respaldo listo: $copias"
