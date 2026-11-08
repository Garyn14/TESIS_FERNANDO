#!/usr/bin/env bash
# Ejecuta un comando en el servidor con SSM Run Command y espera el resultado (DRA-52). No hay SSH:
# el servidor solo acepta HTTP desde CloudFront.
#   ssm-ejecutar.sh <id del servidor> <comando> [segundos máximos]
set -euo pipefail
INSTANCIA=${1:?Uso: ssm-ejecutar.sh <instancia> <comando> [segundos]}
COMANDO=${2:?Falta el comando}
LIMITE=${3:-900}
PAUSA=${SSM_PAUSA:-10}

# En el primer arranque el agente de SSM tarda unos minutos en registrarse.
estado=""
for _ in $(seq 60); do
  estado=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCIA" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
  [ "$estado" = "Online" ] && break
  sleep "$PAUSA"
done
[ "$estado" = "Online" ] || { echo "El agente de SSM del servidor $INSTANCIA no respondió." >&2; exit 1; }

parametros=$(jq -nc --arg c "$COMANDO" --arg t "$LIMITE" '{commands: [$c], executionTimeout: [$t]}')
id=$(aws ssm send-command --instance-ids "$INSTANCIA" --document-name AWS-RunShellScript \
  --comment "DRA-52: $COMANDO" --parameters "$parametros" --query 'Command.CommandId' --output text)
echo "Comando $id en $INSTANCIA: $COMANDO"

final=""
for _ in $(seq $((LIMITE / (PAUSA > 0 ? PAUSA : 1) + 6))); do
  sleep "$PAUSA"
  final=$(aws ssm get-command-invocation --command-id "$id" --instance-id "$INSTANCIA" \
    --query 'Status' --output text 2>/dev/null || true)
  case "$final" in Success | Failed | TimedOut | Cancelled) break ;; esac
done
aws ssm get-command-invocation --command-id "$id" --instance-id "$INSTANCIA" \
  --query '[StandardOutputContent, StandardErrorContent]' --output text || true
echo "Resultado: ${final:-sin respuesta}"
[ "$final" = "Success" ]
