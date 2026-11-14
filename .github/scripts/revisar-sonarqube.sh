#!/usr/bin/env bash
# DRA-79: decide si el análisis de SonarQube Cloud bloquea la CI. Bloquea solo lo grave del código
# nuevo: en un pull request, un hallazgo de seguridad o de fiabilidad con gravedad alta o
# bloqueante. El umbral "Sonar way" (que también exige mantenibilidad, cobertura y duplicación) se
# muestra como aviso, sin bloquear. En main solo informa.
#
# Uso: revisar-sonarqube.sh [número del PR]   (sin número: análisis de main)
# Lee el informe del escáner (.scannerwork/report-task.txt) y, si existe, SONAR_TOKEN.
# SONAR_API y RESUMEN se pueden cambiar en las pruebas.
set -euo pipefail

PR="${1:-}"
API="${SONAR_API:-https://sonarcloud.io/api}"
RESUMEN="${RESUMEN:-${GITHUB_STEP_SUMMARY:-/dev/stdout}}"
INFORME="${INFORME:-.scannerwork/report-task.txt}"
ESPERA="${ESPERA_SEGUNDOS:-5}"

valor() { grep "^$1=" "$INFORME" | cut -d= -f2-; }
consultar() {
  if [[ -n "${SONAR_TOKEN:-}" ]]; then
    curl -sSf -u "${SONAR_TOKEN}:" "$1"
  else
    curl -sSf "$1"
  fi
}

PROYECTO="$(valor projectKey)"
TAREA="$(valor ceTaskUrl)"
TABLERO="$(valor dashboardUrl)"

# 1. Esperar a que SonarQube procese el informe (normalmente unos segundos).
estado=""
for _ in $(seq 1 60); do
  estado="$(consultar "$TAREA" | jq -r '.task.status')"
  case "$estado" in
    SUCCESS) break ;;
    FAILED | CANCELED)
      echo "::error::SonarQube no pudo procesar el análisis ($estado): $TAREA"
      exit 1
      ;;
  esac
  sleep "$ESPERA"
done
if [[ "$estado" != SUCCESS ]]; then
  echo "::error::SonarQube no terminó de procesar el análisis a tiempo: $TAREA"
  exit 1
fi

ambito="branch=main"
[[ -n "$PR" ]] && ambito="pullRequest=$PR"

# 2. El umbral "Sonar way": solo un aviso.
umbral="$(consultar "$API/qualitygates/project_status?projectKey=$PROYECTO&$ambito" | jq -r '.projectStatus.status')"
if [[ "$umbral" == ERROR ]]; then
  echo "::warning::El umbral \"Sonar way\" no se cumple (no bloquea): revise mantenibilidad, cobertura y duplicación en $TABLERO"
fi

# 3. Lo grave: seguridad o fiabilidad, con gravedad alta o bloqueante, abierto.
graves="$(consultar "$API/issues/search?componentKeys=$PROYECTO&$ambito&resolved=false&impactSoftwareQualities=SECURITY,RELIABILITY&impactSeverities=HIGH,BLOCKER&ps=100")"
cantidad="$(jq -r '.total' <<<"$graves")"

{
  echo "## SonarQube Cloud"
  echo
  echo "- Análisis: $TABLERO"
  echo "- Umbral \"Sonar way\" (aviso, no bloquea): **$umbral**"
  echo "- Hallazgos graves abiertos (seguridad o fiabilidad, gravedad alta o bloqueante): **$cantidad**"
  if [[ "$cantidad" -gt 0 ]]; then
    echo
    jq -r '.issues[] | "- `\(.rule)` en \(.component | sub("^[^:]*:"; "")):\(.line // "-"): \(.message)"' <<<"$graves"
  fi
} >>"$RESUMEN"

if [[ "$cantidad" -gt 0 ]]; then
  jq -r '.issues[] | "::error file=\(.component | sub("^[^:]*:"; "")),line=\(.line // 1)::\(.rule): \(.message)"' <<<"$graves"
  if [[ -n "$PR" ]]; then
    echo "::error::El pull request agrega $cantidad hallazgo(s) grave(s). Corríjalo(s) o, si es un falso positivo revisado, exclúyalo con su justificación (docs/calidad/README.md)."
    exit 1
  fi
  echo "::warning::main tiene $cantidad hallazgo(s) grave(s) abierto(s): van a un ticket de corrección."
fi
echo "SonarQube: umbral $umbral, $cantidad hallazgo(s) grave(s)."
