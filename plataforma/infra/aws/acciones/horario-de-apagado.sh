#!/usr/bin/env bash
# ¿Corresponde apagar QA ahora? (DRA-64). Imprime "si" o "no".
#   horario-de-apagado.sh <evento>   (evento: el GITHUB_EVENT_NAME del flujo)
# El apagado a mano (workflow_dispatch) siempre corresponde. El programado solo de 00:00 a 05:59 de
# Lima: GitHub no garantiza la hora de los flujos programados y llegó a ejecutarlo 8 horas tarde,
# en pleno horario de trabajo. HORA_LIMA (00–23) reemplaza la hora real, para las pruebas.
set -euo pipefail
EVENTO=${1:?Uso: horario-de-apagado.sh <evento>}
HORA=${HORA_LIMA:-$(TZ=America/Lima date +%H)}
if [ "$EVENTO" != schedule ] || [ "$((10#$HORA))" -lt 6 ]; then
  echo si
else
  echo no
fi
