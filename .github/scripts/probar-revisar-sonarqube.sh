#!/usr/bin/env bash
# DRA-79: pruebas de revisar-sonarqube.sh contra un SonarQube simulado (un servidor local que
# responde según el caso). No usa la red ni el token.
set -euo pipefail

aqui="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'kill "$servidor" 2>/dev/null || true; rm -rf "$tmp"' EXIT

cat >"$tmp/servidor.py" <<'PY'
import http.server, json, os, sys, urllib.parse

class S(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        caso = open(os.environ["CASO"]).read().strip()
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path.startswith("/ce/task"):
            cuerpo = {"task": {"status": "FAILED" if caso == "fallo" else "SUCCESS"}}
        elif u.path.startswith("/api/qualitygates"):
            cuerpo = {"projectStatus": {"status": "ERROR" if caso in ("umbral", "grave") else "OK"}}
        else:
            graves = []
            if caso == "grave" and "pullRequest" in q:
                graves = [{"rule": "javasecurity:S3649", "component": "P:src/A.java", "line": 7,
                           "message": "Change this code to not construct SQL queries from user data."}]
            if caso == "grave-main" and "branch" in q:
                graves = [{"rule": "java:S2077", "component": "P:src/B.java", "line": 3, "message": "x"}]
            cuerpo = {"total": len(graves), "issues": graves}
        datos = json.dumps(cuerpo).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(datos)

http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), S).serve_forever()
PY

echo ok >"$tmp/caso"
puerto=$((20000 + RANDOM % 20000))
CASO="$tmp/caso" python3 "$tmp/servidor.py" "$puerto" &
servidor=$!
for _ in $(seq 1 50); do curl -s "http://127.0.0.1:$puerto/ce/task" >/dev/null 2>&1 && break; sleep 0.1; done

cat >"$tmp/informe.txt" <<INF
projectKey=P
dashboardUrl=https://sonarcloud.io/dashboard?id=P
ceTaskUrl=http://127.0.0.1:$puerto/ce/task?id=1
INF

fallos=0
probar() { # nombre, caso, PR, salida esperada, texto esperado en la salida
  local nombre="$1" caso="$2" pr="$3" esperada="$4" texto="$5" salida=0
  echo "$caso" >"$tmp/caso"
  : >"$tmp/resumen"
  SONAR_API="http://127.0.0.1:$puerto/api" INFORME="$tmp/informe.txt" RESUMEN="$tmp/resumen" \
    ESPERA_SEGUNDOS=0 SONAR_TOKEN="" "$aqui/revisar-sonarqube.sh" "$pr" >"$tmp/salida" 2>&1 || salida=$?
  if [[ "$salida" == "$esperada" ]] && grep -q -- "$texto" "$tmp/salida" "$tmp/resumen"; then
    echo "  ok    $nombre"
  else
    echo "  FALLA $nombre (salida $salida, esperada $esperada)"
    cat "$tmp/salida"
    fallos=$((fallos + 1))
  fi
}

probar "PR limpio: pasa" ok 12 0 "0 hallazgo(s) grave(s)"
probar "PR con un hallazgo grave: falla y dice cuál" grave 12 1 "javasecurity:S3649"
probar "PR que no cumple Sonar way pero sin nada grave: solo aviso" umbral 12 0 "::warning::El umbral"
probar "main con un hallazgo grave: avisa sin bloquear" grave-main "" 0 "::warning::main tiene 1"
probar "SonarQube no pudo procesar el análisis: falla" fallo 12 1 "no pudo procesar"

if [[ "$fallos" -gt 0 ]]; then
  echo "$fallos prueba(s) fallaron."
  exit 1
fi
echo "Todas las comprobaciones pasaron."
