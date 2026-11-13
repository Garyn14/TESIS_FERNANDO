#!/usr/bin/env bash
# Despliega en el servidor de AWS (DRA-51) el paquete ya descargado en /opt/plataforma/app. Lo
# llama plataforma-desplegar (instalado por arranque.sh), que el disparador Encender (DRA-52)
# ejecuta con SSM Run Command después de publicar un paquete nuevo o de cambiar las variables
# (por ejemplo, al desplegar el contrato).
#
# Arma el archivo de variables desde Parameter Store (los secretos nunca tocan el repositorio,
# RNF03) y llama a levantar.sh. Lee AMBIENTE y REGION de /etc/plataforma/ambiente.
#
# Al encender el servidor no hace falta: Docker vuelve a levantar los contenedores solo.
set -euo pipefail
# shellcheck disable=SC1091
. /etc/plataforma/ambiente
BASE=/opt/plataforma

# Cada parámetro /dra-satipo/<ambiente>/NOMBRE pasa a ser la variable NOMBRE. Los valores van entre
# comillas simples: docker compose y bash los leen igual, sin interpretar nada. Solo root puede
# leer el archivo (umask en una subcapa: las claves de Besu, en cambio, las lee el contenedor).
(
umask 077
aws ssm get-parameters-by-path --region "$REGION" --path "/dra-satipo/$AMBIENTE/" --recursive \
  --with-decryption --query 'Parameters[].[Name,Value]' --output text |
  while IFS=$'\t' read -r nombre valor; do
    printf "%s='%s'\n" "${nombre##*/}" "$valor"
  done > "$BASE/plataforma.env.nuevo"
mv "$BASE/plataforma.env.nuevo" "$BASE/plataforma.env"
)

"$BASE/app/infra/aws/servidor/levantar.sh" "$BASE/plataforma.env"

# Temporizadores opcionales, según los interruptores del ambiente (parámetros si/no). Activo, se
# instala y se enciende; inactivo, se quita si estaba.
#   temporizador <nombre> <si|no> <descripción> <OnCalendar> <programa>
temporizador() {
  local unidad=/etc/systemd/system/plataforma-$1
  if [ "$2" = si ]; then
    cat > "$unidad.service" <<FIN
[Unit]
Description=$3

[Service]
Type=oneshot
ExecStart=$5
FIN
    cat > "$unidad.timer" <<FIN
[Unit]
Description=$3

[Timer]
OnCalendar=$4
Persistent=false

[Install]
WantedBy=timers.target
FIN
    systemctl daemon-reload
    systemctl enable --now "plataforma-$1.timer"
    echo "Activo: $3."
  elif [ -f "$unidad.timer" ]; then
    systemctl disable --now "plataforma-$1.timer" || true
    rm -f "$unidad.timer" "$unidad.service"
    systemctl daemon-reload
    echo "Inactivo: se quitó $3."
  fi
}
interruptor() { sed -n "s/^$1='\(.*\)'$/\1/p" "$BASE/plataforma.env"; }

# DRA-66: volcado de PostgreSQL a las 02:50 de Lima, antes de la copia diaria del disco (03:00).
temporizador volcado "$(interruptor RESPALDOS_ACTIVOS)" "volcado diario de PostgreSQL (DRA-66)" \
  "*-*-* 02:50:00 America/Lima" "$BASE/app/infra/aws/servidor/volcar-base.sh"
# DRA-68: el vigilante publica en CloudWatch, cada minuto, si cada parte funciona.
temporizador vigilante "$(interruptor MONITOREO_ACTIVO)" "vigilante del servidor (DRA-68)" \
  "minutely" "$BASE/app/infra/aws/servidor/vigilar.sh"
