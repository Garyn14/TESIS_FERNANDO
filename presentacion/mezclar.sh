#!/usr/bin/env bash
# Arma la pista final del video: "Hoy" con reloj, silencio, rebobinado y
# gancho, golpe de música con el logo y "Ahora" con música de fondo, más los
# efectos pequeños sincronizados con la animación (video/animacion.js).
set -euo pipefail
cd "$(dirname "$0")/audio"

# Efectos: archivo, segundo en la pista final, volumen.
EFECTOS=(
  # Hoy: Rosa, Carlos y Lucía.
  "pop 0.45 0.30" "pop 2.60 0.35" "tic 8.48 0.45" "tic 8.88 0.45" "tic 9.12 0.45"
  "pop 10.35 0.30" "whoosh 12.90 0.30" "whoosh 15.50 0.40"
  "pop 20.90 0.30" "whoosh 22.40 0.30" "pop 25.70 0.40"
  "telefono 28.50 0.22"
  # Gancho y logo.
  "pop 33.64 0.45" "pop 35.22 0.45" "pop 36.78 0.45"
  "brillo 38.95 0.55"
  # Ahora: Rosa.
  "whoosh 40.30 0.60" "soltar 41.12 1.60"
  "tic 42.72 0.55" "tic 42.96 0.55" "tic 43.20 0.55" "tic 43.44 0.55" "tic 43.68 0.55"
  "ding 45.90 0.55"
  # Ahora: Carlos firma y la blockchain registra.
  "whoosh 46.60 0.45" "soltar 47.85 1.40" "pop 48.15 0.35" "soltar 49.98 1.40" "ding 50.35 0.40"
  "whoosh 52.30 0.35" "tic 52.60 0.50" "tic 52.92 0.50" "tic 53.24 0.50" "tic 53.56 0.50" "tic 53.88 0.50"
  # Ahora: Lucía, el QR y el resultado.
  "whoosh 56.15 0.45" "brillo 59.20 0.25" "whoosh 60.55 0.30" "ding 61.35 0.55" "pop 63.05 0.30"
  # Cierre.
  "whoosh 64.85 0.45" "brillo 64.95 0.45" "pop 67.87 0.45" "pop 68.83 0.45" "pop 69.39 0.45" "whoosh 73.60 0.30"
)

entradas=(-i narracion-oscar.mp3 -i gancho.mp3 -i musica-ahora.mp3 -stream_loop -1 -i reloj.mp3 -i rebobinar.mp3)
filtro="\
[0:a]atrim=0:31.0,asetpts=PTS-STARTPTS,afade=t=out:st=30.9:d=0.1[hoy];\
[0:a]atrim=start=32.03,asetpts=PTS-STARTPTS,afade=t=in:d=0.05,adelay=39900|39900[ahora];\
[1:a]adelay=33600|33600[gancho];\
[4:a]volume=0.7,adelay=32000|32000[rebobinar];\
[3:a]atrim=0:31.0,asetpts=PTS-STARTPTS,volume=0.16,afade=t=in:d=1.5[reloj];\
[2:a]volume='if(lt(t,1.0),0.5,0.5-0.28*min((t-1.0)/0.8,1))':eval=frame,afade=t=out:st=37.5:d=2.5,adelay=38900|38900[musica];"
mezcla="[hoy][ahora][gancho][rebobinar][reloj][musica]"
i=5  # entradas 0–4: voz, gancho, música, reloj, rebobinado; mezcla base: 6 pistas
for e in "${EFECTOS[@]}"; do
  read -r nombre seg vol <<<"$e"
  entradas+=(-i "efectos/$nombre.mp3")
  ms=$(awk "BEGIN{printf \"%d\", $seg*1000}")
  recorte=""
  # El teléfono se corta en seco en el congelado (31.0 s).
  [ "$nombre" = telefono ] && recorte="atrim=0:$(awk "BEGIN{print 31.0-$seg}"),"
  filtro+="[$i:a]${recorte}volume=$vol,adelay=$ms|$ms[e$i];"
  mezcla+="[e$i]"
  i=$((i + 1))
done
filtro+="${mezcla}amix=inputs=$((i + 1)):normalize=0:duration=longest,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]"

ffmpeg -v error -y "${entradas[@]}" -filter_complex "$filtro" -map "[out]" -ar 48000 -c:a libmp3lame -b:a 192k ../pista-final.mp3
