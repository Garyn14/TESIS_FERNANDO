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

# DRA-66: con los respaldos activos, un temporizador deja un volcado de PostgreSQL a las 02:50 de
# Lima, antes de la copia diaria del disco (03:00). Sin respaldos, se quita.
respaldos=$(sed -n "s/^RESPALDOS_ACTIVOS='\(.*\)'$/\1/p" "$BASE/plataforma.env")
if [ "$respaldos" = si ]; then
  cat > /etc/systemd/system/plataforma-volcado.service <<FIN
[Unit]
Description=Volcado de PostgreSQL antes de la copia diaria del disco (DRA-66)

[Service]
Type=oneshot
ExecStart=$BASE/app/infra/aws/servidor/volcar-base.sh
FIN
  cat > /etc/systemd/system/plataforma-volcado.timer <<'FIN'
[Unit]
Description=Volcado diario de PostgreSQL (DRA-66)

[Timer]
OnCalendar=*-*-* 02:50:00 America/Lima
Persistent=false

[Install]
WantedBy=timers.target
FIN
  systemctl daemon-reload
  systemctl enable --now plataforma-volcado.timer
  echo "Respaldos activos: volcado diario de PostgreSQL a las 02:50 de Lima."
elif [ -f /etc/systemd/system/plataforma-volcado.timer ]; then
  systemctl disable --now plataforma-volcado.timer || true
  rm -f /etc/systemd/system/plataforma-volcado.timer /etc/systemd/system/plataforma-volcado.service
  systemctl daemon-reload
  echo "Respaldos inactivos: se quitó el volcado diario de PostgreSQL."
fi
