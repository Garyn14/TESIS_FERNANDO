#!/usr/bin/env bash
# Copias del disco del servidor de un ambiente (DRA-66), de la más reciente a la más antigua:
# identificador, fecha (UTC), estado y tipo (diario o manual).
#   listar-respaldos.sh <ambiente>
set -euo pipefail
AMBIENTE=${1:?Uso: listar-respaldos.sh <ambiente>}
# shellcheck disable=SC2016 # las comillas invertidas son de JMESPath, no del shell
aws ec2 describe-snapshots --owner-ids self \
  --filters "Name=tag:Ambiente,Values=$AMBIENTE" "Name=tag-key,Values=TipoDeRespaldo" \
  --query 'reverse(sort_by(Snapshots, &StartTime))[].[SnapshotId, StartTime, State, Tags[?Key==`TipoDeRespaldo`] | [0].Value]' \
  --output text
