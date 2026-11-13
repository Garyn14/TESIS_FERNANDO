#!/usr/bin/env bash
# Volcado de PostgreSQL en el disco del servidor (DRA-66), justo antes de la copia diaria del disco.
# Es la segunda capa del respaldo: la base de datos queda también en un formato portable (pg_dump,
# formato personalizado), que se puede revisar o restaurar por separado con pg_restore. Se guardan
# los 3 más recientes en /opt/plataforma/volcados.
#
# Lo ejecuta el temporizador plataforma-volcado (lo instala desplegar.sh si los respaldos están
# activos) y el disparador "Respaldar ahora" antes de su copia.
set -euo pipefail
DESTINO=${VOLCADOS:-/opt/plataforma/volcados}
CONSERVAR=${VOLCADOS_CONSERVAR:-3}

# El PostgreSQL de la plataforma (proyecto de docker compose "plataforma"; las pruebas usan otro).
contenedor=$(docker ps --filter "label=com.docker.compose.project=${PROYECTO:-plataforma}" \
  --filter label=com.docker.compose.service=postgres --format '{{.Names}}' | head -n 1)
[ -n "$contenedor" ] || { echo "PostgreSQL no está corriendo: no hay volcado." >&2; exit 1; }

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
archivo="$DESTINO/plataforma-$(date -u +%Y%m%dT%H%M%SZ).dump"
# Primero a un archivo temporal: un volcado a medias nunca queda con el nombre definitivo.
docker exec "$contenedor" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$archivo.parcial"
mv "$archivo.parcial" "$archivo"
chmod 600 "$archivo"
echo "Volcado listo: $archivo ($(du -h "$archivo" | cut -f1))"

# Solo los más recientes: el disco no se llena con volcados.
# Los nombres llevan la fecha (UTC), así que el orden alfabético es el cronológico.
find "$DESTINO" -maxdepth 1 -name 'plataforma-*.dump' | sort -r | tail -n +"$((CONSERVAR + 1))" | xargs -r rm -f
