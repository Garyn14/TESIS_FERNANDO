#!/usr/bin/env bash
# Corre la prueba de punta a punta de un sprint en un entorno limpio: levanta levantar.sh, espera al
# frontend (5173) y al portal (5174), ejecuta e2e/sprint<N>.cjs y apaga todo.
#
#   ./e2e/regresion.sh 5 [carpeta-de-capturas]     (desde plataforma/)
#
# Variables opcionales: JAVA_HOME, SOLC_RUTA (compilador solc local si no hay red para descargarlo).
set -uo pipefail
n=${1:?Indique el número de sprint}
salida=${2:-/tmp/e2e-sprint$n}
cd "$(dirname "$0")/.."
registro=$(mktemp)
detener() {
  local p
  p=$(ps -eo pid,args | awk '$2=="bash" && $3=="./e2e/levantar.sh"{print $1}')
  [ -n "$p" ] && kill $p
  for p in $(ps -eo pid,args | awk '/node_modules\/.bin\/vite/ && !/awk/{print $1}'); do kill $p; done
  for _ in $(seq 1 30); do docker ps --format '{{.Names}}' | grep -q e2e || break; sleep 1; done
}
detener
docker rm -f e2e-pg e2e-ipfs >/dev/null 2>&1
(nohup ./e2e/levantar.sh > "$registro" 2>&1 &)
until grep -aq "Entorno listo\|Falta un requisito" "$registro"; do sleep 2; done
for _ in $(seq 1 60); do curl -s -o /dev/null localhost:5173 && curl -s -o /dev/null localhost:5174 && break; sleep 1; done
rm -rf "$salida"; mkdir -p "$salida"
NODE_PATH=$(npm root -g) timeout 600 node "e2e/sprint$n.cjs" "$salida" > "$salida/salida.log" 2>&1
detener
echo "Sprint $n: $(grep -E 'FALL|pasos correctos' "$salida/salida.log")  (capturas y registro en $salida)"
