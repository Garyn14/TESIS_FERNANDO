#!/usr/bin/env bash
# Publica el build del frontend o del portal en su bucket y renueva index.html en CloudFront
# (DRA-52, DRA-54).
#   publicar-sitio.sh <carpeta dist> <bucket> <id de la distribución>
#
# - assets/ lleva un hash en cada nombre: caché de un año.
# - Los .mjs (workers de pdf.js, HU19) se suben con su tipo: si S3 los entrega como
#   application/octet-stream, el navegador no los carga y el visor del PDF no aparece.
# - Lo demás (logo, ícono), 5 minutos.
# - index.html va al final y sin caché: la versión nueva se ve de inmediato y nunca apunta a
#   archivos que todavía no se subieron.
# - _estado/ (aviso de servidor apagado) es de Terraform: no se toca.
set -euo pipefail
DIST=${1:?Uso: publicar-sitio.sh <dist> <bucket> <distribución>}
BUCKET=${2:?Falta el bucket}
DISTRIBUCION=${3:?Falta la distribución}
[ -f "$DIST/index.html" ] || { echo "No hay build en $DIST (falta index.html)." >&2; exit 1; }
UN_ANIO="public, max-age=31536000, immutable"

aws s3 sync "$DIST/assets" "s3://$BUCKET/assets" --delete --exclude "*.mjs" \
  --cache-control "$UN_ANIO" --only-show-errors
if compgen -G "$DIST/assets/*.mjs" >/dev/null; then
  aws s3 cp "$DIST/assets" "s3://$BUCKET/assets" --recursive --exclude "*" --include "*.mjs" \
    --content-type "text/javascript" --cache-control "$UN_ANIO" --only-show-errors
fi
aws s3 sync "$DIST" "s3://$BUCKET" --delete --exclude "assets/*" --exclude "_estado/*" \
  --exclude "index.html" --cache-control "public, max-age=300" --only-show-errors
aws s3 cp "$DIST/index.html" "s3://$BUCKET/index.html" --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache" --only-show-errors
aws cloudfront create-invalidation --distribution-id "$DISTRIBUCION" --paths "/index.html" "/" \
  --query 'Invalidation.Id' --output text >/dev/null
echo "Publicado $DIST en s3://$BUCKET (distribución $DISTRIBUCION)."
