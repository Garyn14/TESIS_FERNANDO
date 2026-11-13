#!/usr/bin/env bash
# "Restaurar respaldo" (DRA-66): reemplaza el disco del servidor por el de una copia. Usa la
# función de AWS que cambia el disco sin crear otro servidor (Replace root volume): el servidor,
# su rol y CloudFront no cambian. Todo vuelve al momento de la copia, la blockchain incluida: lo
# firmado después se pierde. El disco reemplazado no se borra (permite volver atrás); se borra a mano
# cuando ya no sirve (docs/arquitectura/respaldos.md).
#
# Después vuelve a desplegar la plataforma: lee los parámetros actuales y espera a que responda.
#   restaurar-respaldo.sh <ambiente> <identificador de la copia, snap-…>
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
AMBIENTE=${1:?Uso: restaurar-respaldo.sh <ambiente> <copia>}
COPIA=${2:?Falta el identificador de la copia (snap-…). Véalas con listar-respaldos.sh}
PAUSA=${RESTAURAR_PAUSA:-15}

# La copia debe ser de este ambiente y estar completa: nunca se restaura la de otro ambiente.
# shellcheck disable=SC2016 # las comillas invertidas son de JMESPath, no del shell
read -r ambiente_copia estado_copia <<< "$(aws ec2 describe-snapshots --owner-ids self --snapshot-ids "$COPIA" \
  --query 'Snapshots[0].[Tags[?Key==`Ambiente`] | [0].Value, State]' --output text 2>/dev/null || true)"
[ "${ambiente_copia:-}" = "$AMBIENTE" ] || { echo "La copia $COPIA no es un respaldo de $AMBIENTE." >&2; exit 1; }
[ "${estado_copia:-}" = completed ] || { echo "La copia $COPIA no está completa (${estado_copia:-desconocida})." >&2; exit 1; }

read -r instancia _ estado <<< "$("$AQUI/instancia.sh" "$AMBIENTE")"
[ -n "${instancia:-}" ] || { echo "No existe el servidor de $AMBIENTE. Créelo antes de restaurar." >&2; exit 1; }
# Replace root volume solo funciona con el servidor encendido.
if [ "$estado" != running ]; then
  echo "El servidor está $estado: se enciende para restaurar."
  aws ec2 start-instances --instance-ids "$instancia" >/dev/null
  aws ec2 wait instance-running --instance-ids "$instancia"
fi

echo "Reemplazando el disco de $instancia por la copia $COPIA…"
tarea=$(aws ec2 create-replace-root-volume-task --instance-id "$instancia" --snapshot-id "$COPIA" \
  --no-delete-replaced-root-volume --query 'ReplaceRootVolumeTask.ReplaceRootVolumeTaskId' --output text)
estado_tarea=""
for _ in $(seq 120); do
  estado_tarea=$(aws ec2 describe-replace-root-volume-tasks --replace-root-volume-task-ids "$tarea" \
    --query 'ReplaceRootVolumeTasks[0].TaskState' --output text)
  case "$estado_tarea" in succeeded | failed | failed-detached) break ;; esac
  sleep "$PAUSA"
done
[ "$estado_tarea" = succeeded ] || { echo "El reemplazo del disco terminó en: ${estado_tarea:-sin respuesta}." >&2; exit 1; }
echo "Disco reemplazado. Desplegando la plataforma…"

# El disco restaurado trae la versión de la plataforma de ese momento; se vuelve a desplegar con
# los parámetros actuales y se espera a que responda. El siguiente Encender instala la última versión.
"$AQUI/ssm-ejecutar.sh" "$instancia" /usr/local/bin/plataforma-desplegar 900
echo "Restauración lista: $AMBIENTE quedó como en la copia $COPIA."
