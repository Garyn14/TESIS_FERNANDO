#!/usr/bin/env bash
# Arma la pista final del video: "Hoy" con reloj, silencio, rebobinado y
# gancho, golpe de música con el logo y "Ahora" con música de fondo.
set -euo pipefail
cd "$(dirname "$0")/audio"
ffmpeg -v error -y \
  -i narracion-oscar.mp3 -i gancho.mp3 -i musica-ahora.mp3 \
  -stream_loop -1 -i reloj.mp3 -i rebobinar.mp3 \
  -filter_complex "\
[0:a]atrim=0:31.0,asetpts=PTS-STARTPTS,afade=t=out:st=30.9:d=0.1[hoy];\
[0:a]atrim=start=32.03,asetpts=PTS-STARTPTS,afade=t=in:d=0.05,adelay=39900|39900[ahora];\
[1:a]adelay=33600|33600[gancho];\
[4:a]volume=0.7,adelay=32000|32000[rebobinar];\
[3:a]atrim=0:31.0,asetpts=PTS-STARTPTS,volume=0.16,afade=t=in:d=1.5[reloj];\
[2:a]volume='if(lt(t,1.0),0.5,0.5-0.28*min((t-1.0)/0.8,1))':eval=frame,afade=t=out:st=37.5:d=2.5,adelay=38900|38900[musica];\
[hoy][ahora][gancho][rebobinar][reloj][musica]amix=inputs=6:normalize=0:duration=longest,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]" \
  -map "[out]" -ar 48000 -c:a libmp3lame -b:a 192k ../pista-final.mp3
