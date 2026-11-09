// Línea de tiempo del video. seek(t) deja cada elemento en su estado exacto
// para el segundo t de la pista final (pista-final.mp3), sin animaciones CSS:
// así cada cuadro se puede grabar uno por uno. Los tiempos salen de
// ../escenas.json y de los tiempos por palabra de la narración.

const $ = (id) => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const p = (t, a, b) => cl((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => { const c = 1.7; return x === 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const azar = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const pulso = (t, a, d = 0.35) => Math.sin(p(t, a, a + d) * Math.PI);

// ---------- Piezas de dibujo ----------

function escritorio(y, ancho = 1920, x = 0, tapa = '#8d6e63', frente = '#6d4c41') {
  return `<rect x="${x}" y="${y}" width="${ancho}" height="28" fill="${tapa}"/><rect x="${x}" y="${y}" width="${ancho}" height="5" fill="#fff" opacity=".18"/><rect x="${x}" y="${y + 28}" width="${ancho}" height="${1080 - y}" fill="${frente}"/><rect x="${x}" y="${y + 28}" width="${ancho}" height="${1052 - y}" fill="url(#bajo-borde)"/>`;
}

function telefonoFijo(id) {
  return `<g id="${id}">
    <path d="M-80 0 L-64 -60 Q-60 -72 -46 -72 L46 -72 Q60 -72 64 -60 L80 0Z" fill="#37474f"/>
    <rect x="-90" y="-104" width="180" height="40" rx="20" fill="#263238"/>
    <g fill="#90a4ae">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-30 + c * 22}" y="${-56 + r * 16}" width="14" height="10" rx="3"/>`).join('')).join('')}</g>
  </g>`;
}

function qr(x, y, lado, color = '#1f2a22') {
  const n = 9, c = lado / n;
  let s = `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" fill="#fff"/>`;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const esquina = (i < 3 && j < 3) || (i < 3 && j > 5) || (i > 5 && j < 3);
    const lleno = esquina ? !(i % 6 === 1 && j % 6 === 1) && !((i === 1 || i === 7) && (j === 1 || j === 7)) : azar(i * 9 + j + 3) > 0.5;
    if (lleno) s += `<rect x="${x + j * c}" y="${y + i * c}" width="${c + 0.3}" height="${c + 0.3}" fill="${color}"/>`;
  }
  return s;
}

function agricultor(x, y, k) {
  const piel = ['#c68b5e', '#a86d47', '#d39a6a', '#b97a50'][k % 4];
  const ropa = ['#2e7d32', '#c28119', '#1d5fa8', '#8e2b2b', '#5d4037'][k % 5];
  return `<g transform="translate(${x} ${y})" class="agricultor">
    <path d="M-22 26 Q-22 6 0 4 Q22 6 22 26Z" fill="${ropa}"/>
    <circle cx="0" cy="-8" r="13" fill="${piel}"/>
    <ellipse cx="0" cy="-17" rx="22" ry="5" fill="#b8885a"/><path d="M-12 -17 Q-10 -32 0 -32 Q10 -32 12 -17Z" fill="#c99a68"/>
  </g>`;
}

function cafeto(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="70" ry="54" fill="#3f7f45"/><ellipse cx="-30" cy="-26" rx="40" ry="32" fill="#4c9152"/><ellipse cx="34" cy="-20" rx="38" ry="30" fill="#468a4c"/>
    ${[[-30, 4], [10, -10], [40, 10], [-8, 20], [22, 26]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="7" fill="#c0392b"/>`).join('')}
  </g>`;
}

function campo(id, saturado) {
  const cielo = saturado ? '#bfe3f7' : '#cfe3ef';
  return `<g id="${id}">
    <rect width="1920" height="1080" fill="${cielo}"/>
    <circle cx="${saturado ? 1640 : 760}" cy="190" r="${saturado ? 90 : 70}" fill="#f6d77a"/>
    ${saturado ? '<circle cx="1640" cy="190" r="150" fill="#f6d77a" opacity=".25"/>' : ''}
    <path d="M-40 760 L220 420 L420 640 L640 360 L960 700 L1240 430 L1560 700 L1960 520 L1960 1080 L-40 1080Z" fill="#7aa37e"/>
    <path d="M-40 820 Q300 700 600 780 T1300 760 T1960 740 L1960 1080 L-40 1080Z" fill="#5b8f5f"/>
    ${cafeto(830, 880, 0.9)}${cafeto(1700, 900, 1.1)}${cafeto(1960, 860, 0.8)}
  </g>`;
}

// ---------- HOY: Rosa (0 – 10.1) ----------

$('svg-hoy-rosa').innerHTML = `
  <rect width="1920" height="1080" fill="#ece4d3"/>
  <rect x="120" y="140" width="300" height="380" rx="8" fill="#cfdde3" stroke="#bfae94" stroke-width="14"/>
  <path d="M270 140 V520 M120 330 H420" stroke="#bfae94" stroke-width="10"/>
  ${reloj('hr-reloj', 1720, 170, 78)}
  <g id="hr-rosa" transform="translate(620 830) scale(1.25)">${PERSONAJES.rosa('preocupada', { mirar: 7 })}</g>
  ${escritorio(800)}
  <g id="hr-pilas">
    ${[0, 1, 2, 3].map((i) => `<g id="hr-pila${i}" transform="translate(${960 + i * 225} 800)">
      ${Array.from({ length: 14 }, (_, k) => `<rect class="hoja" x="${(k % 2) * 6 - 3}" y="${-(k + 1) * 22}" width="180" height="22" rx="2" fill="${k % 2 ? '#fffdf6' : '#f2ecdc'}" stroke="#cfc4aa" stroke-width="2"/>`).join('')}
    </g>`).join('')}
  </g>
  <g id="hr-taller" transform="translate(1380 340)">
    <rect x="-400" y="-210" width="800" height="420" rx="36" fill="#fff" stroke="#d6cdb8" stroke-width="4"/>
    <circle cx="-330" cy="250" r="22" fill="#fff" stroke="#d6cdb8" stroke-width="4"/><circle cx="-380" cy="300" r="12" fill="#fff" stroke="#d6cdb8" stroke-width="3"/>
    <text x="0" y="-140" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#5d4037">Taller: Manejo del café</text>
    ${Array.from({ length: 40 }, (_, k) => agricultor(-315 + (k % 10) * 70, -60 + Math.floor(k / 10) * 66, k)).join('')}
    <text id="hr-taller-n" x="0" y="190" text-anchor="middle" font-family="Inter Display" font-weight="800" font-size="40" fill="#2e7d32">40 agricultores</text>
  </g>
  <g id="hr-contador-g" transform="translate(1250 120)"><rect width="330" height="84" rx="42" fill="#fff" stroke="#d6cdb8" stroke-width="3"/>
    <text x="165" y="54" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#5d4037" id="hr-contador">Certificado 1 de 40</text></g>
`;

// ---------- HOY: Carlos (10.1 – 20.6) ----------

$('svg-hoy-carlos').innerHTML = `
  <defs><clipPath id="hc-izq"><polygon points="0,0 1010,0 910,1080 0,1080"/></clipPath>
        <clipPath id="hc-der"><polygon points="1010,0 1920,0 1920,1080 910,1080"/></clipPath></defs>
  <g id="hc-a">
    <rect width="1920" height="1080" fill="#e8e2d4"/>
    <rect x="1340" y="150" width="300" height="220" rx="6" fill="#fffdf6" stroke="#bfae94" stroke-width="12"/>
    <rect x="1400" y="200" width="180" height="16" rx="4" fill="#bfae94"/><rect x="1380" y="240" width="220" height="10" rx="4" fill="#d6cdb8"/><rect x="1380" y="266" width="220" height="10" rx="4" fill="#d6cdb8"/><circle cx="1490" cy="320" r="22" fill="#e8b500" opacity=".7"/>
    <g id="hc-a-carlos" transform="translate(700 830) scale(1.25)">${PERSONAJES.carlos('neutral', { mirar: 6 })}</g>
    ${escritorio(800)}
    <g id="hc-firma" transform="translate(1180 720)">
      <g transform="rotate(-4)">${certificado(-210, -170, 420, 300)}
        <path d="M60 80 L190 80" stroke="#1f2a22" stroke-width="3"/>
        <text x="125" y="108" text-anchor="middle" font-family="Inter" font-weight="600" font-size="18" fill="#5f6b62">Firma del Director</text>
        <circle id="hc-aro" cx="125" cy="70" r="70" fill="none" stroke="#e8b500" stroke-width="7" stroke-dasharray="16 12"/>
      </g>
    </g>
  </g>
  <g id="hc-b">
    <g clip-path="url(#hc-izq)">
      ${campo('hc-campo', false)}
      <g id="hc-carlos" transform="translate(470 1080) scale(1.25)">${PERSONAJES.carlos('neutral', { sombrero: true })}</g>
      <g transform="translate(90 90)"><rect width="430" height="76" rx="38" fill="#fff"/><text x="215" y="50" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="#2e4a33">En comisión de campo</text></g>
    </g>
    <g clip-path="url(#hc-der)">
      <rect width="1920" height="1080" fill="#e8e2d4"/>
      <g transform="translate(1600 170)"><rect x="-110" y="-70" width="220" height="200" rx="14" fill="#fff" stroke="#cfc4aa" stroke-width="4"/>
        <rect x="-110" y="-70" width="220" height="56" rx="14" fill="#c0392b"/><rect x="-110" y="-30" width="220" height="16" fill="#c0392b"/>
        <text id="hc-dia" x="0" y="80" text-anchor="middle" font-family="Inter Display" font-weight="800" font-size="84" fill="#3e2723">Lun</text></g>
      ${escritorio(760)}
      <g id="hc-pila" transform="translate(1180 760)">
        ${Array.from({ length: 16 }, (_, k) => `<rect class="carpeta" x="${(azar(k) - 0.5) * 24}" y="${-(k + 1) * 30}" width="300" height="30" rx="4" fill="${['#f2d28b', '#e9c46a', '#f4e1b0'][k % 3]}" stroke="#c9a85a" stroke-width="2"/>`).join('')}
      </g>
      <g transform="translate(1180 200)"><rect width="300" height="64" rx="32" fill="#fff"/><text x="150" y="43" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#8e2b2b">Por firmar</text></g>
    </g>
    <polygon points="1000,0 1020,0 920,1080 900,1080" fill="#fff"/>
  </g>
`;

// ---------- HOY: Lucía (20.6 – 31) ----------

$('svg-hoy-lucia').innerHTML = `
  <rect width="1920" height="1080" fill="#dfe6ea"/>
  <rect x="0" y="700" width="1920" height="20" fill="#c9d2d7"/>
  <rect x="250" y="130" width="240" height="180" rx="6" fill="#fff" stroke="#9aa7ad" stroke-width="10"/>
  <path d="M290 270 L340 210 L380 250 L410 220 L450 270Z" fill="#b6c4ca"/>
  ${reloj('hl-reloj', 1700, 200, 86)}
  <g id="hl-emp" transform="translate(1060 830) scale(1.15)">${PERSONAJES.empleador('preocupada', { mirar: -3 })}</g>
  <g id="hl-manos"><circle cx="952" cy="768" r="22" fill="${PIEL.empleador}"/><circle cx="1168" cy="768" r="22" fill="${PIEL.empleador}"/></g>
  <g id="hl-cert">${certificado(-105, -80, 210, 160)}</g>
  ${escritorio(800, 1500, 500, '#90a4ae', '#78909c')}
  <g transform="translate(1560 800)">${telefonoFijo('hl-tel')}</g>
  <g id="hl-ondas" transform="translate(1560 710)" fill="none" stroke="#c0392b" stroke-width="8" stroke-linecap="round">
    <path d="M-120 -10 Q-140 -60 -110 -100"/><path d="M120 -10 Q140 -60 110 -100"/>
    <path d="M-160 0 Q-190 -70 -150 -130"/><path d="M160 0 Q190 -70 150 -130"/>
  </g>
  <g id="hl-llamada" transform="translate(1560 530)">
    <rect x="-210" y="-50" width="420" height="100" rx="50" fill="#fff" stroke="#b0bec5" stroke-width="3"/>
    <path d="M-20 48 L0 80 L20 48Z" fill="#fff"/>
    <text id="hl-llamada-texto" x="0" y="14" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="#37474f">Llamando a la agencia</text>
  </g>
  <g id="hl-pregunta" transform="translate(1290 330)">
    <circle r="78" fill="#fff" stroke="#b0bec5" stroke-width="4"/><circle cx="-62" cy="88" r="16" fill="#fff" stroke="#b0bec5" stroke-width="3"/>
    <text y="40" text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="120" fill="#c0392b">?</text>
  </g>
  <g id="hl-lucia" transform="translate(380 1090) scale(1.32)">${PERSONAJES.lucia('preocupada', { mirar: 7 })}</g>
`;

// ---------- GANCHO ----------

$('g1-svg').innerHTML = `<rect x="-200" y="-460" width="400" height="400" fill="#e8f1e6"/><g transform="translate(0 -20)">${PERSONAJES.rosa('neutral')}</g>`;
$('g2-svg').innerHTML = `<rect x="-200" y="-460" width="400" height="400" fill="#e8eef1"/><g transform="translate(0 -20)">${PERSONAJES.carlos('neutral')}</g>`;
$('g3-svg').innerHTML = `<rect width="400" height="400" fill="#fbf3dc"/>${certificado(70, 100, 260, 200, 'transform="rotate(-6 200 200)"')}`;

// ---------- AHORA: Rosa (39.55 – 46.85) ----------

$('svg-ahora-rosa').innerHTML = `
  <defs><linearGradient id="ar-pared" x1="0" x2="1"><stop offset="0" stop-color="#fdfbf5"/><stop offset="1" stop-color="#f3eee0"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#ar-pared)"/>
  <rect x="80" y="120" width="320" height="420" rx="10" fill="#d7ecf6" stroke="#e8b500" stroke-width="12"/>
  <path d="M240 120 V540 M80 330 H400" stroke="#e8b500" stroke-width="8"/>
  <path d="M120 540 Q160 420 240 470 Q300 400 360 540Z" fill="#a5d6a7" opacity=".7"/>
  <g transform="translate(1760 740)"><rect x="-56" y="-90" width="112" height="90" rx="12" fill="#c28119"/>
    <path d="M0 -90 Q-90 -200 -60 -300 Q-10 -220 0 -90 Q20 -240 80 -310 Q90 -190 0 -90Z" fill="#2e7d32"/>
    <path d="M0 -90 Q-120 -150 -130 -230 Q-50 -190 0 -90Z" fill="#43a047"/></g>
  <g id="ar-luz" style="mix-blend-mode:screen"><polygon points="400,120 80,540 760,1080 1500,1080" fill="url(#rayo)"/></g>
  <g id="ar-rosa" transform="translate(420 800) scale(1.1)"><g id="ar-rosa-n">${PERSONAJES.rosa('neutral', { mirar: 8 })}</g><g id="ar-rosa-f" opacity="0">${PERSONAJES.rosa('feliz', { mirar: 8 })}</g></g>
  ${escritorio(760, 1920, 0, '#bcaaa4', '#a1887f')}
  <ellipse cx="1160" cy="772" rx="470" ry="18" fill="#000" opacity=".12"/><rect x="712" y="176" width="896" height="548" rx="22" fill="#1f2a22" filter="url(#sombra)"/>
  <rect x="1110" y="724" width="100" height="30" fill="#2f3b33"/><ellipse cx="1160" cy="760" rx="120" ry="12" fill="#2f3b33"/>
  <g transform="translate(655 760) scale(.8)"><rect x="-40" y="-70" width="80" height="70" rx="10" fill="#fff" stroke="#e5e1d8" stroke-width="4"/><path d="M40 -56 Q70 -50 62 -26 Q56 -12 40 -16" fill="none" stroke="#e5e1d8" stroke-width="8"/><rect x="-26" y="-50" width="52" height="10" rx="5" fill="#1b5e20"/></g>
`;

$('pr-rejilla').innerHTML = Array.from({ length: 40 }, () =>
  `<svg viewBox="0 0 66 66">${certificado(6, 10, 54, 44)}</svg>`).join('');

// ---------- AHORA: Carlos (46.85 – 56.4) ----------

$('svg-ahora-carlos').innerHTML = `
  ${campo('ac-campo', true)}
  <g id="ac-luz" style="mix-blend-mode:screen"><circle cx="1640" cy="190" r="520" fill="url(#sol)"/></g>
  <g id="ac-carlos" transform="translate(470 1080) scale(1.25)"><g id="ac-carlos-n">${PERSONAJES.carlos('neutral', { sombrero: true, mirar: 8 })}</g><g id="ac-carlos-f" opacity="0">${PERSONAJES.carlos('feliz', { sombrero: true, mirar: 8 })}</g></g>
  <g id="ac-cadena">
    ${[0, 1, 2, 3].map((i) => `<path class="ac-enlace" d="M${790 + i * 230} 175 H${850 + i * 230}" stroke="#e8b500" stroke-width="10" stroke-linecap="round"/>`).join('')}
    ${[0, 1, 2, 3, 4].map((i) => `<g class="ac-bloque" transform="translate(${700 + i * 230} 175)">
      <rect x="-90" y="-70" width="180" height="140" rx="22" fill="${i === 4 ? '#1b5e20' : '#fff'}" stroke="#1b5e20" stroke-width="6" filter="url(#sombra)"/>
      <text y="-12" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="24" fill="${i === 4 ? '#e8b500' : '#1b5e20'}">#${1020 + i}</text>
      <text y="34" text-anchor="middle" font-family="Inter" font-weight="800" font-size="34" fill="${i === 4 ? '#fff' : '#2e7d32'}">${i === 4 ? '40 ✓' : '✓'}</text>
    </g>`).join('')}
    <g id="ac-cadena-texto" transform="translate(1160 300)"><rect x="-300" y="-30" width="600" height="60" rx="30" fill="#fff" opacity=".92"/>
      <text y="11" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#1b5e20">Blockchain de la agencia</text></g>
  </g>
  <circle id="ac-chispa" r="16" fill="#e8b500"/>
`;

// ---------- AHORA: Lucía (56.4 – 65.1) ----------

$('svg-ahora-lucia').innerHTML = `
  <rect width="1920" height="1080" fill="#f7f2e6"/>
  <rect x="0" y="700" width="1920" height="20" fill="#ebe3cf"/>
  <rect x="250" y="130" width="240" height="180" rx="6" fill="#fff" stroke="#e8b500" stroke-width="10"/>
  <path d="M290 270 L340 210 L380 250 L410 220 L450 270Z" fill="#a5d6a7"/><circle cx="430" cy="180" r="18" fill="#f6d77a"/>
  <g id="al-luz" style="mix-blend-mode:screen"><polygon points="490,130 250,310 700,1080 1300,1080" fill="url(#rayo)"/></g>
  <g id="al-emp" transform="translate(1000 830) scale(1.15)"><g id="al-emp-n">${PERSONAJES.empleador('neutral', { mirar: -3 })}</g><g id="al-emp-f" opacity="0">${PERSONAJES.empleador('feliz', { mirar: -3 })}</g></g>
  <g transform="translate(-60 0)"><circle cx="952" cy="768" r="22" fill="${PIEL.empleador}"/></g>
  <g id="al-cert" transform="translate(1000 728) rotate(-2)">${certificado(-105, -80, 210, 160)}${qr(30, -2, 56)}</g>
  ${escritorio(800, 1420, 500, '#d7c4a3', '#c4ad86')}
  <g transform="translate(760 800) scale(.8)">${telefonoFijo('al-tel')}</g>
  <g id="al-silencio" transform="translate(760 650)"><circle r="44" fill="#fff" stroke="#9aa39b" stroke-width="4"/><text y="14" text-anchor="middle" font-family="Inter" font-weight="800" font-size="34" fill="#68736a">zZ</text></g>
  <polygon id="al-haz" points="0,0 0,0 0,0" fill="#2e7d32" opacity=".25"/>
  <rect id="al-linea" x="0" y="0" width="0" height="5" rx="2" fill="#2e7d32"/>
  <g id="al-movil" transform="translate(1290 760)">
    <rect x="-46" y="-86" width="92" height="172" rx="16" fill="#263238"/><rect x="-38" y="-72" width="76" height="140" rx="8" fill="#e8f5e9"/>
    <circle cx="0" cy="76" r="5" fill="#90a4ae"/>
    <circle cx="44" cy="20" r="24" fill="${PIEL.empleador}"/>
  </g>
  <g id="al-lucia" transform="translate(380 1090) scale(1.32)"><g id="al-lucia-n">${PERSONAJES.lucia('neutral', { mirar: 7 })}</g><g id="al-lucia-f" opacity="0">${PERSONAJES.lucia('feliz', { mirar: 7 })}</g></g>
`;

// ---------- Estado por escena ----------

function pon(id, estilos) { Object.assign($(id).style, estilos); }
function atr(id, nombre, valor) { $(id).setAttribute(nombre, valor); }
function relojA(id, minutos) {
  atr(id + '-m', 'transform', `rotate(${minutos * 6})`);
  atr(id + '-h', 'transform', `rotate(${(minutos / 60) * 30 + 270})`);
}

function hoyRosa(lt) {
  // Burbuja del taller con los 40 agricultores.
  const tb = back(p(lt, 2.6, 3.0)) * (1 - eio(p(lt, 5.3, 5.6)));
  atr('hr-taller', 'transform', `translate(1380 340) scale(${tb})`);
  $('hr-taller').style.opacity = p(lt, 2.6, 2.7) * (1 - p(lt, 5.4, 5.6));
  document.querySelectorAll('#hr-taller .agricultor').forEach((a, k) => { a.style.opacity = p(lt, 2.9 + k * 0.04, 3.0 + k * 0.04); });
  // Las pilas de papel crecen: cuarenta certificados por hacer.
  for (let i = 0; i < 4; i++) {
    const n = Math.floor(eo(p(lt, 5.5 + i * 0.35, 7.6 + i * 0.35)) * 14);
    document.querySelectorAll(`#hr-pila${i} .hoja`).forEach((h, k) => { h.style.opacity = k < n ? 1 : 0; });
  }
  // "uno por uno": el contador sube con cada palabra.
  const n = 1 + (lt >= 8.48) + (lt >= 8.88) + (lt >= 9.12);
  $('hr-contador').textContent = `Certificado ${n} de 40`;
  $('hr-contador-g').style.opacity = p(lt, 5.6, 5.9);
  atr('hr-contador-g', 'transform', `translate(1250 120) scale(${1 + 0.06 * (pulso(lt, 8.48, 0.2) + pulso(lt, 8.88, 0.2) + pulso(lt, 9.12, 0.2))})`);
  relojA('hr-reloj', 480 + lt * 9);
  atr('hr-rosa', 'transform', `translate(620 ${830 + Math.sin(lt * 2.2) * 4}) scale(1.25)`);
  return 1 + 0.04 * p(lt, 0, 10.4);
}

function hoyCarlos(lt) {
  // Oficina: el certificado espera su firma. Luego, el campo y la pila.
  const va = eio(p(lt, 15.5, 15.95));
  atr('hc-a', 'transform', `translate(${-1920 * va} 0)`);
  atr('hc-b', 'transform', `translate(${1920 * (1 - va)} 0)`);
  const firma = p(lt, 13.3, 13.6);
  atr('hc-firma', 'transform', `translate(1180 ${lerp(1400, 720, eo(p(lt, 12.9, 13.5)))})`);
  $('hc-aro').style.opacity = firma * (0.55 + 0.45 * Math.sin(lt * 6));
  atr('hc-aro', 'transform', `rotate(${lt * 40} 125 70)`);
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  $('hc-dia').textContent = dias[cl(Math.floor(p(lt, 17.5, 20.2) * 5), 0, 4)];
  const k = 5 + Math.floor(p(lt, 17.5, 20.1) * 11);
  document.querySelectorAll('#hc-pila .carpeta').forEach((c, j) => { c.style.opacity = j < k ? 1 : 0; });
  return 1 + 0.04 * p(lt, 10.1, 20.8);
}

function hoyLucia(lt) {
  // Lucía entrega su certificado; el empleador lo mira con dudas.
  const e = eio(p(lt, 22.4, 23.4));
  atr('hl-cert', 'transform', `translate(${lerp(560, 1060, e)} ${lerp(880, 728, e) - Math.sin(e * Math.PI) * 120}) rotate(${lerp(-12, Math.sin(lt * 1.3) * 3, e)})`);
  $('hl-manos').style.opacity = p(lt, 23.2, 23.4);
  const pq = back(p(lt, 25.7, 26.15));
  atr('hl-pregunta', 'transform', `translate(1310 ${300 + Math.sin(lt * 2.5) * 6}) scale(${pq})`);
  $('hl-pregunta').style.opacity = p(lt, 25.7, 25.8);
  const suena = lt >= 28.5;
  atr('hl-tel', 'transform', `translate(${suena ? Math.sin(lt * 70) * 5 : 0} 0)`);
  $('hl-ondas').style.opacity = suena ? 0.35 + 0.65 * Math.abs(Math.sin(lt * 9)) : 0;
  const pl = back(p(lt, 28.5, 28.9));
  atr('hl-llamada', 'transform', `translate(1560 530) scale(${pl})`);
  $('hl-llamada').style.opacity = p(lt, 28.5, 28.6);
  $('hl-llamada-texto').textContent = 'Llamando a la agencia' + '.'.repeat(Math.floor(lt * 3) % 4);
  // El reloj avanza normal y, en "y esperar", corre como un time-lapse.
  relojA('hl-reloj', 600 + lt * 6 + Math.pow(p(lt, 29.8, 31), 2) * 900);
  atr('hl-lucia', 'transform', `translate(380 ${1090 + Math.sin(lt * 1.8) * 5}) scale(1.32)`);
  return 1 + 0.045 * p(lt, 20.6, 31);
}

const HOY = { 'hoy-rosa': hoyRosa, 'hoy-carlos': hoyCarlos, 'hoy-lucia': hoyLucia };
const VENTANAS_HOY = [['hoy-rosa', -1, 10.1], ['hoy-carlos', 10.1, 20.6], ['hoy-lucia', 20.6, 99]];

// Etiquetas de presentación de cada personaje.
const ETIQUETAS = [
  [0.45, 4.6, 'Rosa', 'Área de Capacitación'],
  [10.35, 14.6, 'Ing. Carlos', 'Director de la agencia'],
  [20.9, 24.8, 'Lucía', 'Postula a un nuevo trabajo'],
];

function ahoraRosa(t) {
  const escala = lerp(1.07, 1, eo(p(t, 39.55, 41))) + 0.025 * p(t, 41, 47);
  const salto = Math.sin(p(t, 45.9, 46.35) * Math.PI) * 16;
  atr('ar-rosa', 'transform', `translate(420 ${800 + Math.sin(t * 2) * 4 - salto}) scale(1.1)`);
  const feliz = p(t, 45.88, 45.98);
  atr('ar-rosa-n', 'opacity', 1 - feliz); atr('ar-rosa-f', 'opacity', feliz);
  $('ar-luz').style.opacity = 0.55 * eo(p(t, 39.7, 41.2)) + 0.08 * Math.sin(t * 0.8);
  pon('pantalla-rosa', { opacity: p(t, 39.85, 40.15) });

  const v = eio(p(t, 40.35, 41.15));
  const x = lerp(lerp(250, 640, v), lerp(640, 980, v), v);
  const y = lerp(lerp(600, 330, v), lerp(330, 466, v), v);
  const cae = p(t, 41.15, 41.4);
  pon('archivo', {
    opacity: p(t, 40.25, 40.4) * (1 - cae),
    transform: `translate(${x}px, ${y}px) scale(${lerp(1, 0.9, v) * lerp(1, 0.5, cae)}) rotate(${Math.sin(v * Math.PI) * -6}deg)`,
  });
  const encima = p(t, 40.9, 41.15) * (1 - p(t, 41.3, 41.5));
  pon('pr-zona', {
    opacity: 1 - p(t, 41.35, 41.55),
    borderColor: encima > 0 ? '#2e7d32' : '#b9c4ba',
    background: encima > 0 ? 'rgba(46,125,50,.08)' : 'transparent',
  });
  pon('pr-progreso', { opacity: p(t, 41.4, 41.6) * (1 - p(t, 42.45, 42.6)) });
  pon('pr-barra', { width: `${eio(p(t, 41.5, 42.3)) * 100}%` });
  $('pr-progreso-texto').textContent = t < 42.3 ? 'Cargando la lista…' : 'Lista cargada ✓';

  const vt = p(t, 42.55, 42.75) * (1 - p(t, 44.3, 44.5));
  pon('pr-tabla', { opacity: vt });
  document.querySelectorAll('#pr-tabla tr').forEach((fila, i) => {
    if (i === 0) return;
    const a = 42.7 + (i - 1) * 0.24;
    fila.style.opacity = p(t, a, a + 0.15);
    fila.style.transform = `translateX(${lerp(-20, 0, eo(p(t, a, a + 0.25)))}px)`;
  });
  const n = Math.round(eo(p(t, 42.6, 44.1)) * 40);
  $('pr-revision').innerHTML = n < 40 ? `Revisando <b>${n}</b> de 40 participantes…` : '✓ Los 40 participantes tienen sus datos correctos';
  pon('pr-revision', { opacity: vt });

  $('pr-titulo').textContent = t < 44.4 ? 'Registrar certificados desde una lista' : 'Certificados preparados';
  pon('pr-rejilla', { opacity: p(t, 44.35, 44.5) });
  let listos = 0;
  document.querySelectorAll('#pr-rejilla svg').forEach((s, i) => {
    const a = 44.5 + i * 0.034;
    const k = p(t, a, a + 0.18);
    if (t >= a + 0.09) listos++;
    s.style.opacity = k;
    s.style.transform = `scale(${back(k)})`;
  });
  pon('pr-listo', { opacity: p(t, 44.45, 44.65), transform: `scale(${1 + 0.05 * pulso(t, 45.9, 0.4)})` });
  $('pr-listos').textContent = listos;
  return escala;
}

function ahoraCarlos(t) {
  // Carlos, en el campo, firma los 40 desde el celular con su billetera.
  const feliz = p(t, 50.35, 50.45);
  atr('ac-carlos-n', 'opacity', 1 - feliz); atr('ac-carlos-f', 'opacity', feliz);
  atr('ac-carlos', 'transform', `translate(470 ${1080 + Math.sin(t * 1.9) * 4 - 14 * pulso(t, 50.35, 0.45)}) scale(1.25)`);
  $('ac-luz').style.opacity = 0.5 + 0.1 * Math.sin(t * 0.7);

  const entra = eo(p(t, 46.9, 47.5));
  const sube = eio(p(t, 52.2, 52.8));
  pon('movil-carlos', { opacity: 1, transform: `translate(${lerp(260, 0, entra)}px, ${lerp(0, 120, sube)}px) scale(${lerp(1, 0.86, sube)})` });
  pon('mc-boton', { transform: `scale(${1 - 0.06 * pulso(t, 47.85, 0.25)})` });
  const toque1 = p(t, 47.85, 48.3);
  pon('mc-toque', {
    opacity: (toque1 > 0 && toque1 < 1 ? 1 - toque1 : 0) + (p(t, 49.98, 50.4) > 0 && p(t, 49.98, 50.4) < 1 ? 1 - p(t, 49.98, 50.4) : 0),
    left: t < 49.5 ? '180px' : '252px', top: t < 49.5 ? '520px' : '540px',
    transform: `translate(-50%, -50%) scale(${t < 49.5 ? 0.4 + toque1 : 0.4 + p(t, 49.98, 50.4)})`,
  });
  const modal = p(t, 48.15, 48.35) * (1 - p(t, 50.25, 50.45));
  pon('mc-modal', { opacity: modal });
  pon('mc-tarjeta', { transform: `translateY(${lerp(80, 0, eo(p(t, 48.15, 48.5)))}px)` });
  pon('mc-confirmar', { transform: `scale(${1 - 0.06 * pulso(t, 49.98, 0.25)})` });
  pon('mc-listo', { opacity: p(t, 50.35, 50.55), transform: `scale(${back(p(t, 50.35, 50.7))})` });
  pon('mc-lista', { opacity: 1 - p(t, 50.25, 50.4) });

  // Cada firma queda registrada en la blockchain de la agencia.
  const ch = p(t, 52.3, 52.75);
  atr('ac-chispa', 'transform', `translate(${lerp(1250, 1620, eio(ch))} ${lerp(560, 175, eio(ch)) - Math.sin(ch * Math.PI) * 120})`);
  $('ac-chispa').style.opacity = ch > 0 && ch < 1 ? 1 : 0;
  document.querySelectorAll('#ac-cadena .ac-bloque').forEach((b, i) => {
    const a = 52.6 + i * 0.32;
    b.style.opacity = p(t, a, a + 0.1);
    const s = back(p(t, a, a + 0.35)) * (1 + 0.08 * pulso(t, 54.2, 0.4) * (i === 4));
    b.setAttribute('transform', `translate(${700 + i * 230} 175) scale(${s})`);
  });
  document.querySelectorAll('#ac-cadena .ac-enlace').forEach((e, i) => { e.style.opacity = p(t, 52.75 + i * 0.32, 52.9 + i * 0.32); });
  $('ac-cadena-texto').style.opacity = p(t, 54.1, 54.4);
  return 1.02 + 0.03 * p(t, 46.85, 56.4);
}

function ahoraLucia(t) {
  // Quien recibe el certificado escanea el QR y en segundos sabe si es auténtico.
  const feliz = p(t, 61.5, 61.6);
  for (const q of ['al-emp', 'al-lucia']) { atr(q + '-n', 'opacity', 1 - feliz); atr(q + '-f', 'opacity', feliz); }
  atr('al-lucia', 'transform', `translate(380 ${1090 + Math.sin(t * 1.8) * 5 - 12 * pulso(t, 61.5, 0.45)}) scale(1.32)`);
  $('al-luz').style.opacity = 0.45 + 0.08 * Math.sin(t * 0.8);
  // El celular se acerca al QR del certificado.
  const acerca = eio(p(t, 58.5, 59.2));
  const mx = lerp(1290, 1180, acerca), my = lerp(760, 700, acerca);
  atr('al-movil', 'transform', `translate(${mx} ${my}) rotate(${lerp(10, -8, acerca)})`);
  const escanea = p(t, 59.2, 60.6);
  const activo = escanea > 0 && escanea < 1;
  // QR en el certificado: centro aproximado (1058, 754).
  atr('al-haz', 'points', `${mx - 40},${my - 40} ${mx - 40},${my + 40} 1028,784 1028,724`);
  $('al-haz').style.opacity = activo ? 0.25 + 0.15 * Math.sin(t * 20) : 0;
  const ly = lerp(724, 782, (Math.sin(t * 9) + 1) / 2);
  atr('al-linea', 'x', 1030); atr('al-linea', 'width', 56); atr('al-linea', 'y', ly);
  $('al-linea').style.opacity = activo ? 1 : 0;
  // El resultado del portal, en grande.
  pon('movil-lucia', { opacity: p(t, 60.55, 60.75), transform: `translateX(${lerp(260, 0, eo(p(t, 60.55, 61.0)))}px)` });
  pon('ml-cargando', { opacity: 1 - p(t, 61.3, 61.4) });
  pon('ml-resultado', { opacity: p(t, 61.35, 61.5), transform: `scale(${back(p(t, 61.35, 61.75))})` });
  // Sin llamar a nadie: el teléfono fijo duerme.
  $('al-silencio').style.opacity = p(t, 63.05, 63.25);
  atr('al-silencio', 'transform', `translate(760 ${650 - 10 * Math.sin(t * 2)}) scale(${back(p(t, 63.05, 63.4))})`);
  return 1.02 + 0.03 * p(t, 56.4, 65.1);
}

function cierre(t) {
  const pal = document.querySelectorAll('#c-titulo span');
  const tiempos = [65.14, 65.4, 65.85, 66.55, 66.85];
  pal.forEach((s, i) => {
    const k = p(t, tiempos[i], tiempos[i] + 0.4);
    s.style.opacity = k; s.style.transform = `translateY(${lerp(40, 0, eo(k))}px)`;
  });
  [67.87, 68.83, 69.39].forEach((a, i) => {
    const k = p(t, a, a + 0.45);
    pon(`c-i${i}`, { opacity: p(t, a, a + 0.1), transform: `scale(${back(k)})` });
  });
  const l = p(t, 70.27, 70.8);
  pon('c-lema', { opacity: l, transform: `translateY(${lerp(30, 0, eo(l))}px)` });
  pon('c-pie', { opacity: p(t, 71.2, 71.8) });
  // "Veamos cómo funciona."
  const sale = eio(p(t, 73.6, 74.1));
  pon('c-contenido', { opacity: 1 - sale, transform: `translateY(${-60 * sale}px)` });
  const v = p(t, 74.11, 74.5);
  pon('c-veamos', { opacity: v, transform: `translateY(${lerp(40, 0, eo(v))}px)` });
  pon('c-flecha', { transform: `translateX(${12 * Math.sin(Math.max(0, t - 74.5) * 5)}px)` });
  return 1 + 0.02 * p(t, 65.1, 79);
}

// Cortinas verdes entre las escenas del "Ahora".
const CORTINAS = [46.6, 56.15, 64.85];

// ---------- Vida: parpadeo, cabeza, mirada y grano ----------
function vida(t) {
  document.querySelectorAll('.persona').forEach((g, i) => {
    const semilla = i * 1.37;
    const fase = (t + semilla * 2.3) % (2.8 + (i % 3) * 0.6);
    const cierreOjos = fase < 0.16 ? Math.sin((fase / 0.16) * Math.PI) : 0;
    const mirar = Number(g.dataset.mirar || 0);
    g.querySelectorAll('.ojos').forEach((o) => o.setAttribute('transform',
      `translate(${mirar} -286) scale(1 ${1 - 0.9 * cierreOjos}) translate(0 286)`));
    const giro = Math.sin(t * 0.9 + semilla) * 2.2 + Math.sin(t * 2.3 + semilla) * 0.6;
    const r = `rotate(${giro} 0 -205)`;
    g.querySelector('.cabeza').setAttribute('transform', r);
    g.querySelector('.cabeza-atras').setAttribute('transform', r);
  });
  const c = Math.floor(t * 10); // el grano cambia 10 veces por segundo
  pon('grano', { backgroundPosition: `${Math.floor(azar(c) * 256)}px ${Math.floor(azar(c + 3) * 256)}px` });
}

(function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const cx = cv.getContext('2d'); const img = cx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(azar(i * 0.731 + 11) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  $('grano').style.backgroundImage = `url(${cv.toDataURL()})`;
})();

function seek(t) {
  const cuadro = Math.round(t * 30);
  for (const e of document.querySelectorAll('.escena')) { e.style.opacity = 0; e.style.transform = ''; e.style.filter = ''; }
  for (const id of ['vineta', 'rebobinado', 'destello', 'cortina', 'etiqueta', 'archivo']) pon(id, { opacity: 0 });

  // ---- Hoy (0 – 32) ----
  const FIN_HOY = 31.0;
  if (t < 32.0) {
    const lt = Math.min(t, FIN_HOY);
    for (const [id, a, b] of VENTANAS_HOY) {
      // Fundido breve entre escenas, sin imágenes superpuestas.
      const op = p(lt, a, a + 0.22) * (1 - p(lt, b - 0.22, b));
      if (op <= 0) continue;
      let escala = HOY[id](lt);
      if (t >= FIN_HOY) {
        const congela = p(t, FIN_HOY, FIN_HOY + 0.15);
        escala += 0.035 * eo(congela);
        $(id).style.filter = `grayscale(1) contrast(1.12) brightness(${lerp(1, 0.86, congela)})`;
        pon('vineta', { opacity: congela });
      }
      $(id).style.opacity = op * (t < 0.6 ? p(t, 0, 0.6) : 1);
      $(id).style.transform = `scale(${escala})`;
    }
    for (const [a, b, nombre, rol] of ETIQUETAS) {
      if (t < a || t > b) continue;
      $('et-nombre').textContent = nombre; $('et-rol').textContent = rol;
      const e = eo(p(t, a, a + 0.4)), s = eio(p(t, b - 0.35, b));
      pon('etiqueta', { opacity: e * (1 - s), transform: `translateX(${lerp(-60, 0, e) - 60 * s}px)` });
    }
  }

  // ---- Rebobinado (32.0 – 33.7) ----
  if (t >= 32.0 && t < 33.75) {
    let id, lt;
    if (t < 32.55) { id = 'hoy-lucia'; lt = lerp(31, 20.7, p(t, 32.0, 32.55)); }
    else if (t < 33.15) { id = 'hoy-carlos'; lt = lerp(20.5, 10.2, p(t, 32.55, 33.15)); }
    else { id = 'hoy-rosa'; lt = lerp(10.0, 0, p(t, 33.15, 33.7)); }
    const escala = HOY[id](lt);
    const dx = (azar(cuadro) - 0.5) * 36;
    $(id).style.opacity = 1;
    $(id).style.transform = `translateX(${dx}px) skewX(${(azar(cuadro + 7) - 0.5) * 4}deg) scale(${escala + 0.03})`;
    $(id).style.filter = 'grayscale(.75) contrast(1.25) brightness(1.08)';
    pon('rebobinado', { opacity: 1 });
    pon('rb-banda', { top: `${((t - 32) * 1500) % 1240 - 120}px` });
    pon('rb-icono', { opacity: cuadro % 12 < 8 ? 1 : 0.2 });
    pon('vineta', { opacity: 0.6 });
  }
  if (t >= 33.6 && t < 34.0) pon('destello', { opacity: lerp(0.9, 0, p(t, 33.68, 34.0)) * p(t, 33.6, 33.68) });

  // ---- Gancho (33.65 – 39.2) ----
  if (t >= 33.65 && t < 39.2) {
    pon('gancho', { opacity: 1, transform: `scale(${1 + 0.03 * p(t, 33.65, 38.4)})` });
    const junta = eio(p(t, 38.4, 38.92));
    [33.62, 35.2, 36.76].forEach((a, i) => {
      const x = back(p(t, a, a + 0.45));
      pon(`g${i + 1}`, {
        opacity: p(t, a, a + 0.12) * (1 - p(t, 38.75, 38.92)),
        transform: `translate(${(1 - i) * 560 * junta}px, ${lerp(50, 0, eo(p(t, a, a + 0.45)))}px) scale(${lerp(0.7, 1, x) * lerp(1, 0.25, junta)})`,
      });
    });
  }

  // ---- Golpe con el logo (38.9 – 40.0) ----
  if (t >= 38.88 && t < 40.0) {
    pon('golpe', { opacity: 1 - p(t, 39.6, 39.95) });
    pon('estallido', { transform: `scale(${eo(p(t, 38.88, 39.25))})` });
    const po = p(t, 39.0, 39.75);
    pon('onda', { transform: `scale(${lerp(0.6, 2.8, eo(po))})`, opacity: po > 0 ? 1 - po : 0 });
    pon('destello', { opacity: 0.45 * (1 - p(t, 38.9, 39.1)) * p(t, 38.86, 38.9) });
  }

  // ---- Logo: aparece, va a la esquina y vuelve al centro en el cierre ----
  if (t >= 38.95) {
    const entra = back(p(t, 38.95, 39.35));
    const va = eio(p(t, 39.55, 40.05));
    const vuelve = eio(p(t, 64.95, 65.6));
    const brilla = 1 + 0.05 * pulso(t, 65.6, 0.5);
    const s = lerp(lerp(entra, 120 / 420, va), 240 / 420, vuelve) * brilla;
    const x = lerp(lerp(0, 90 - 960, va), 0, vuelve), y = lerp(lerp(0, 84 - 540, va), 230 - 540, vuelve);
    const sube = eio(p(t, 73.6, 74.1));
    pon('logo', { opacity: 1, transform: `translate(${x}px, ${y + 70 * sube}px) scale(${s * lerp(1, 0.8, sube)})` });
  } else pon('logo', { opacity: 0 });

  // ---- Ahora ----
  const escenaAhora = t < CORTINAS[0] + 0.25 ? ['ahora-rosa', ahoraRosa]
    : t < CORTINAS[1] + 0.25 ? ['ahora-carlos', ahoraCarlos]
    : t < CORTINAS[2] + 0.25 ? ['ahora-lucia', ahoraLucia] : ['cierre', cierre];
  if (t >= 39.55) {
    const [id, fn] = escenaAhora;
    const escala = fn(t);
    pon(id, { opacity: 1, transform: `scale(${escala})` });
  }
  for (const c of CORTINAS) {
    const k = p(t, c, c + 0.5);
    if (k > 0 && k < 1) pon('cortina', { opacity: 1, transform: `translateX(${lerp(-2600, 1920, eio(k))}px) skewX(-12deg)` });
  }

  // ---- Final: fundido a negro ----
  pon('negro', { opacity: p(t, 77.2, 78.9) });
  vida(t);
}

window.seek = seek;
seek(Number(new URLSearchParams(location.search).get('t') || 0));
