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
