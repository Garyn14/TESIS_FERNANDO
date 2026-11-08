#!/usr/bin/env bash
# Pruebas de los scripts de los disparadores (DRA-52) sin AWS: un comando "aws" simulado anota cada
# llamada y responde lo que haría AWS. Lo corre la CI.
#   probar-acciones.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
PRUEBA=$(mktemp -d)
trap 'rm -rf "$PRUEBA"' EXIT
fallas=0
comprobar() { # comprobar <descripción> <condición>
  if eval "$2"; then echo "  ok    $1"; else echo "  FALLA $1"; fallas=$((fallas + 1)); fi
}

# aws simulado: anota la llamada en $LLAMADAS y responde según AWS_SIMULADO_*.
mkdir -p "$PRUEBA/bin"
cat > "$PRUEBA/bin/aws" <<'FIN'
#!/usr/bin/env bash
echo "$*" >> "$LLAMADAS"
case "$1 $2" in
  "ssm describe-instance-information") echo "${AWS_SIMULADO_AGENTE:-Online}" ;;
  "ssm send-command") echo "comando-123" ;;
  "ssm get-command-invocation")
    if [[ "$*" == *"--query Status"* ]]; then echo "${AWS_SIMULADO_RESULTADO:-Success}"; else printf 'Plataforma lista.\t\n'; fi ;;
  "ssm get-parameter") [ "${AWS_SIMULADO_CONTRATO:-no}" = si ] || exit 254 ;;
  "ec2 describe-instances") printf 'i-0abc\tt4g.medium\tstopped\n' ;;
  "cloudfront create-invalidation") echo "I123" ;;
esac
FIN
chmod +x "$PRUEBA/bin/aws"
export PATH="$PRUEBA/bin:$PATH" LLAMADAS="$PRUEBA/llamadas" SSM_PAUSA=0

echo "== publicar-sitio.sh"
SITIO="$PRUEBA/dist"
mkdir -p "$SITIO/assets"
touch "$SITIO/index.html" "$SITIO/logo.png" "$SITIO/assets/index-a1.js" "$SITIO/assets/pdf.worker.min-b2.mjs"
: > "$LLAMADAS"
"$AQUI/publicar-sitio.sh" "$SITIO" bucket-portal DIST123 >/dev/null
comprobar "los .mjs se suben como JavaScript" "grep -q -- '--include \*.mjs --content-type text/javascript' '$LLAMADAS'"
comprobar "assets/ con caché de un año, sin los .mjs" "grep -- 's3 sync $SITIO/assets s3://bucket-portal/assets' '$LLAMADAS' | grep -q -- '--exclude \*.mjs --cache-control public, max-age=31536000, immutable'"
comprobar "no toca _estado/ (aviso de apagado de Terraform)" "grep -- 's3 sync $SITIO s3://bucket-portal ' '$LLAMADAS' | grep -q -- '--exclude _estado/\*'"
comprobar "index.html sin caché" "grep -- 'index.html s3://bucket-portal/index.html' '$LLAMADAS' | grep -q -- '--cache-control no-cache'"
comprobar "index.html se sube después de los demás archivos" "[ \"\$(grep -n 's3 ' '$LLAMADAS' | tail -1 | grep -c index.html)\" = 1 ]"
comprobar "renueva index.html en CloudFront" "grep -q -- 'cloudfront create-invalidation --distribution-id DIST123 --paths /index.html /' '$LLAMADAS'"
comprobar "sin build no publica nada" "! '$AQUI/publicar-sitio.sh' '$PRUEBA/vacio' b d 2>/dev/null"

echo "== ssm-ejecutar.sh"
: > "$LLAMADAS"
comprobar "espera el resultado y termina bien si el comando funcionó" "'$AQUI/ssm-ejecutar.sh' i-0abc /usr/local/bin/plataforma-desplegar 60 >/dev/null"
comprobar "manda el comando y su tiempo máximo a AWS-RunShellScript" "grep 'ssm send-command' '$LLAMADAS' | grep -q 'AWS-RunShellScript.*\"commands\":\[\"/usr/local/bin/plataforma-desplegar\"\],\"executionTimeout\":\[\"60\"\]'"
comprobar "falla si el comando falló en el servidor" "! AWS_SIMULADO_RESULTADO=Failed '$AQUI/ssm-ejecutar.sh' i-0abc x 20 >/dev/null"
comprobar "falla si el agente de SSM no responde" "! AWS_SIMULADO_AGENTE=ConnectionLost '$AQUI/ssm-ejecutar.sh' i-0abc x 20 >/dev/null 2>&1"

echo "== desplegar-contrato.sh"
: > "$LLAMADAS"
comprobar "no despliega otro contrato si ya hay uno" "[ \"\$(cd '$PRUEBA' && AWS_SIMULADO_CONTRATO=si '$AQUI/desplegar-contrato.sh' qa https://x/rpc)\" = existente ]"
comprobar "y no escribe ningún parámetro" "! grep -q put-parameter '$LLAMADAS'"

echo "== instancia.sh"
: > "$LLAMADAS"
comprobar "devuelve id, tipo y estado" "[ \"\$('$AQUI/instancia.sh' qa)\" = \"\$(printf 'i-0abc\tt4g.medium\tstopped')\" ]"
comprobar "busca el servidor del ambiente, sin los ya eliminados" "grep -q 'Name=tag:Name,Values=dra-satipo-qa Name=instance-state-name,Values=pending,running,stopping,stopped' '$LLAMADAS'"

echo "== Disparadores (.github/workflows/qa-*.yml)"
FLUJOS=$(cd "$AQUI/../../../.." && pwd)/.github/workflows
for flujo in "$FLUJOS"/qa-*.yml; do
  # Los pasos corren en plataforma/ (defaults.run.working-directory): antes de descargar el código
  # esa carpeta no existe y cualquier paso "run" falla (primer QA – Encender, DRA-56).
  comprobar "$(basename "$flujo"): el primer paso descarga el código" \
    "python3 -c 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); assert all(j[\"steps\"][0].get(\"uses\",\"\").startswith(\"actions/checkout\") for j in d[\"jobs\"].values())' '$flujo'"
done

if [ "$fallas" -gt 0 ]; then
  echo "$fallas comprobaciones fallaron."
  exit 1
fi
echo "Todas las comprobaciones pasaron."
