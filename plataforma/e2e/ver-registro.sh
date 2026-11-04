#!/usr/bin/env bash
# Muestra lo que la pantalla todavía no muestra (la auditoría llega con HU24): los documentos
# firmados y anulados con su CID en IPFS, su transacción, su bloque, la transacción de la anulación
# y el documento que los reemplazó (HU29, HU30), o el historial de un documento.
# Requiere el entorno de levantar.sh en ejecución.
#
#   ./e2e/ver-registro.sh               -> documentos firmados y anulados, del más reciente al más antiguo
#   ./e2e/ver-registro.sh DRA-2026-XXXX -> historial de ese documento
set -euo pipefail
psql() { docker exec e2e-pg psql -U plataforma -d plataforma -P pager=off "$@"; }
if [ $# -eq 0 ]; then
  psql -c "
    SELECT d.codigo AS \"Código\", d.nombres || ' ' || d.apellidos AS \"Beneficiario\", d.estado AS \"Estado\",
           to_char(d.firmado_en AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI') AS \"Firmado\",
           d.bloque AS \"Bloque\", left(d.transaccion, 12) || '…' AS \"Transacción\",
           left(d.transaccion_anulacion, 12) || '…' AS \"Tx. anulación\",
           (SELECT r.codigo FROM documento r WHERE r.reemplaza_a = d.id AND r.estado IN ('FIRMADO', 'ANULADO')) AS \"Reemplazado por\",
           'http://localhost:8082/ipfs/' || d.cid AS \"PDF en IPFS\"
    FROM documento d WHERE d.estado IN ('FIRMADO', 'ANULADO') ORDER BY d.firmado_en DESC, d.id"
  psql -c "SELECT ultimo_bloque AS \"Último bloque sincronizado\", to_char(actualizado_en AT TIME ZONE 'America/Lima', 'HH24:MI:SS') AS \"Hora\" FROM sincronizacion_blockchain"
else
  [[ "$1" =~ ^DRA-[0-9]{4}-[A-Z0-9]{6}$ ]] || { echo "Código inválido: $1 (formato DRA-AAAA-XXXXXX)" >&2; exit 1; }
  psql -c "
    SELECT to_char(h.realizado_en AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI:SS') AS \"Fecha\",
           h.evento AS \"Evento\", coalesce(u.nombre_completo, '(sistema)') AS \"Por\", h.detalle AS \"Detalle\"
    FROM documento_historial h JOIN documento d ON d.id = h.documento_id
    LEFT JOIN usuario u ON u.id = h.realizado_por
    WHERE d.codigo = '$1' ORDER BY h.id"
fi
