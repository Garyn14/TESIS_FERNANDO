// Línea de tiempo del video. seek(t) deja cada elemento en su estado exacto
// para el segundo t de la pista final (pista-final.mp3), sin animaciones CSS:
// así cada cuadro se puede grabar uno por uno.

const $ = (id) => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const p = (t, a, b) => cl((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => { const c = 1.7; return x === 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const azar = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

// ---------- Escenas en SVG ----------

function escritorio(y, ancho = 1920, x = 0, tapa = '#8d6e63', frente = '#6d4c41') {
  return `<rect x="${x}" y="${y}" width="${ancho}" height="28" fill="${tapa}"/><rect x="${x}" y="${y}" width="${ancho}" height="5" fill="#fff" opacity=".18"/><rect x="${x}" y="${y + 28}" width="${ancho}" height="${1080 - y}" fill="${frente}"/><rect x="${x}" y="${y + 28}" width="${ancho}" height="${1052 - y}" fill="url(#bajo-borde)"/>`;
}

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
  <g transform="translate(1250 120)"><rect width="330" height="84" rx="42" fill="#fff" stroke="#d6cdb8" stroke-width="3"/>
    <text x="165" y="54" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#5d4037" id="hr-contador">Certificado 1 de 40</text></g>
`;

$('svg-hoy-carlos').innerHTML = `
  <defs><clipPath id="hc-izq"><polygon points="0,0 1010,0 910,1080 0,1080"/></clipPath>
        <clipPath id="hc-der"><polygon points="1010,0 1920,0 1920,1080 910,1080"/></clipPath></defs>
  <g clip-path="url(#hc-izq)">
    <rect width="1920" height="1080" fill="#cfe3ef"/>
    <circle cx="760" cy="200" r="70" fill="#f6d77a"/>
    <path d="M-40 760 L220 420 L420 640 L640 360 L960 760Z" fill="#7aa37e"/>
    <path d="M-40 820 Q300 700 600 780 T1100 760 L1100 1080 L-40 1080Z" fill="#5b8f5f"/>
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
      ${Array.from({ length: 16 }, (_, k) => `<rect x="${(azar(k) - 0.5) * 24}" y="${-(k + 1) * 30}" width="300" height="30" rx="4" fill="${['#f2d28b', '#e9c46a', '#f4e1b0'][k % 3]}" stroke="#c9a85a" stroke-width="2"/>`).join('')}
    </g>
    <g transform="translate(1180 200)"><rect width="300" height="64" rx="32" fill="#fff"/><text x="150" y="43" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#8e2b2b">Por firmar</text></g>
  </g>
  <polygon points="1000,0 1020,0 920,1080 900,1080" fill="#fff"/>
`;

$('svg-hoy-lucia').innerHTML = `
  <rect width="1920" height="1080" fill="#dfe6ea"/>
  <rect x="0" y="700" width="1920" height="20" fill="#c9d2d7"/>
  <rect x="250" y="130" width="240" height="180" rx="6" fill="#fff" stroke="#9aa7ad" stroke-width="10"/>
  <path d="M290 270 L340 210 L380 250 L410 220 L450 270Z" fill="#b6c4ca"/>
  ${reloj('hl-reloj', 1700, 200, 86)}
  <g id="hl-emp" transform="translate(1060 830) scale(1.15)">${PERSONAJES.empleador('preocupada', { mirar: -3 })}</g>
  <g id="hl-cert">${certificado(-105, -80, 210, 160)}
    <circle cx="-108" cy="40" r="22" fill="${PIEL.empleador}"/><circle cx="108" cy="40" r="22" fill="${PIEL.empleador}"/></g>
  ${escritorio(800, 1500, 500, '#90a4ae', '#78909c')}
  <g id="hl-tel" transform="translate(1560 800)">
    <path d="M-80 0 L-64 -60 Q-60 -72 -46 -72 L46 -72 Q60 -72 64 -60 L80 0Z" fill="#37474f"/>
    <rect x="-90" y="-104" width="180" height="40" rx="20" fill="#263238"/>
    <g fill="#90a4ae">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-30 + c * 22}" y="${-56 + r * 16}" width="14" height="10" rx="3"/>`).join('')).join('')}</g>
  </g>
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

$('g1-svg').innerHTML = `<rect x="-200" y="-460" width="400" height="400" fill="#e8f1e6"/><g transform="translate(0 -20)">${PERSONAJES.rosa('neutral')}</g>`;
$('g2-svg').innerHTML = `<rect x="-200" y="-460" width="400" height="400" fill="#e8eef1"/><g transform="translate(0 -20)">${PERSONAJES.carlos('neutral')}</g>`;
$('g3-svg').innerHTML = `<rect width="400" height="400" fill="#fbf3dc"/>${certificado(70, 100, 260, 200, 'transform="rotate(-6 200 200)"')}`;

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

// Rejilla de 40 certificados en la pantalla de Rosa.
$('pr-rejilla').innerHTML = Array.from({ length: 40 }, () =>
  `<svg viewBox="0 0 66 66">${certificado(6, 10, 54, 44)}</svg>`).join('');

// ---------- Estado por escena ----------

function pon(id, estilos) { Object.assign($(id).style, estilos); }
function relojA(id, minutos) {
  $(id + '-m').setAttribute('transform', `rotate(${minutos * 6})`);
  $(id + '-h').setAttribute('transform', `rotate(${(minutos / 60) * 30 + 270})`);
}

function hoyRosa(lt) {
  const n = cl(Math.floor(1 + p(lt, 1.5, 9.4) * 3), 1, 40);
  $('hr-contador').textContent = `Certificado ${n} de 40`;
  relojA('hr-reloj', 480 + lt * 9);
  $('hr-rosa').setAttribute('transform', `translate(620 ${830 + Math.sin(lt * 2.2) * 4}) scale(1.25)`);
  return 1 + 0.04 * p(lt, 0, 10.1);
}

function hoyCarlos(lt) {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  $('hc-dia').textContent = dias[cl(Math.floor(p(lt, 17.4, 20.2) * 5), 0, 4)];
  $('hc-pila').setAttribute('transform', `translate(1180 ${760 + (1 - eo(p(lt, 17.4, 20))) * 0})`);
  return 1 + 0.04 * p(lt, 10.1, 20.6);
}

function hoyLucia(lt) {
  $('hl-cert').setAttribute('transform', `translate(1060 728) rotate(${Math.sin(lt * 1.3) * 3})`);
  const pq = back(p(lt, 25.7, 26.15));
  $('hl-pregunta').setAttribute('transform', `translate(1310 ${300 + Math.sin(lt * 2.5) * 6}) scale(${pq})`);
  $('hl-pregunta').style.opacity = p(lt, 25.7, 25.8);
  const suena = lt >= 28.5;
  $('hl-tel').setAttribute('transform', `translate(${1560 + (suena ? Math.sin(lt * 70) * 5 : 0)} 800)`);
  $('hl-ondas').style.opacity = suena ? 0.35 + 0.65 * Math.abs(Math.sin(lt * 9)) : 0;
  const pl = back(p(lt, 28.5, 28.9));
  $('hl-llamada').setAttribute('transform', `translate(1560 530) scale(${pl})`);
  $('hl-llamada').style.opacity = p(lt, 28.5, 28.6);
  $('hl-llamada-texto').textContent = 'Llamando a la agencia' + '.'.repeat(Math.floor(lt * 3) % 4);
  // El reloj avanza normal y, en "y esperar", corre como un time-lapse.
  relojA('hl-reloj', 600 + lt * 6 + Math.pow(p(lt, 29.8, 31), 2) * 900);
  $('hl-lucia').setAttribute('transform', `translate(380 ${1090 + Math.sin(lt * 1.8) * 5}) scale(1.32)`);
  return 1 + 0.045 * p(lt, 20.6, 31);
}

const HOY = { 'hoy-rosa': hoyRosa, 'hoy-carlos': hoyCarlos, 'hoy-lucia': hoyLucia };

// ---------- Vida: parpadeo, cabeza, mirada y grano ----------
function vida(t) {
  document.querySelectorAll('.persona').forEach((g, i) => {
    const semilla = i * 1.37;
    const fase = (t + semilla * 2.3) % (2.8 + (i % 3) * 0.6);
    const cierre = fase < 0.16 ? Math.sin((fase / 0.16) * Math.PI) : 0;
    const mirar = Number(g.dataset.mirar || 0);
    g.querySelectorAll('.ojos').forEach((o) => o.setAttribute('transform',
      `translate(${mirar} -286) scale(1 ${1 - 0.9 * cierre}) translate(0 286)`));
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
  // Todo oculto por defecto.
  for (const e of document.querySelectorAll('.escena')) { e.style.opacity = 0; e.style.transform = ''; e.style.filter = ''; }
  pon('vineta', { opacity: 0 }); pon('rebobinado', { opacity: 0 }); pon('destello', { opacity: 0 });

  // ---- Hoy (0 – 32) ----
  const FIN_HOY = 31.0;
  if (t < 32.0) {
    const lt = Math.min(t, FIN_HOY);
    const id = lt < 10.1 ? 'hoy-rosa' : lt < 20.6 ? 'hoy-carlos' : 'hoy-lucia';
    let escala = HOY[id](lt);
    const congela = p(t, FIN_HOY, FIN_HOY + 0.15);
    if (t >= FIN_HOY) {
      escala += 0.035 * eo(congela);
      $(id).style.filter = `grayscale(1) contrast(1.12) brightness(${lerp(1, 0.86, congela)})`;
      pon('vineta', { opacity: congela });
    }
    $(id).style.opacity = t < 0.6 ? p(t, 0, 0.6) : 1;
    $(id).style.transform = `scale(${escala})`;
  }

  // ---- Rebobinado (32.0 – 33.7) ----
  if (t >= 32.0 && t < 33.75) {
    let id, lt;
    if (t < 32.55) { id = 'hoy-lucia'; lt = lerp(31, 20.6, p(t, 32.0, 32.55)); }
    else if (t < 33.15) { id = 'hoy-carlos'; lt = lerp(20.6, 10.1, p(t, 32.55, 33.15)); }
    else { id = 'hoy-rosa'; lt = lerp(10.1, 0, p(t, 33.15, 33.7)); }
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
  // Destello de paso al gancho.
  pon('destello', { opacity: t >= 33.6 && t < 34.0 ? lerp(0.9, 0, p(t, 33.68, 34.0)) * p(t, 33.6, 33.68) : 0 });

  // ---- Gancho (33.65 – 39.2) ----
  if (t >= 33.65 && t < 39.2) {
    pon('gancho', { opacity: 1, transform: `scale(${1 + 0.03 * p(t, 33.65, 38.4)})` });
    const llegadas = [33.62, 35.2, 36.76];
    const junta = eio(p(t, 38.4, 38.92));
    llegadas.forEach((a, i) => {
      const x = back(p(t, a, a + 0.45));
      const dx = (1 - i) * 560 * junta;
      const s = lerp(0.7, 1, x) * lerp(1, 0.25, junta);
      pon(`g${i + 1}`, {
        opacity: p(t, a, a + 0.12) * (1 - p(t, 38.75, 38.92)),
        transform: `translate(${dx}px, ${lerp(50, 0, eo(p(t, a, a + 0.45)))}px) scale(${s})`,
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
  if (t >= 38.95) {
    const entra = back(p(t, 38.95, 39.35));
    const va = eio(p(t, 39.55, 40.05));
    const s = lerp(entra, 120 / 420, va);
    pon('logo', { opacity: 1, transform: `translate(${lerp(0, 90 - 960, va)}px, ${lerp(0, 84 - 540, va)}px) scale(${s})` });
  } else pon('logo', { opacity: 0 });

  // ---- Ahora: Rosa (39.55 – ) ----
  if (t >= 39.55) {
    const escala = lerp(1.07, 1, eo(p(t, 39.55, 41))) + 0.025 * p(t, 41, 47);
    pon('ahora-rosa', { opacity: 1, transform: `scale(${escala})` });
    const salto = Math.sin(p(t, 45.9, 46.35) * Math.PI) * 16;
    $('ar-rosa').setAttribute('transform', `translate(420 ${800 + Math.sin(t * 2) * 4 - salto}) scale(1.1)`);
    const feliz = p(t, 45.88, 45.98);
    $('ar-rosa-n').setAttribute('opacity', 1 - feliz); $('ar-rosa-f').setAttribute('opacity', feliz);
    $('ar-luz').style.opacity = 0.55 * eo(p(t, 39.7, 41.2)) + 0.08 * Math.sin(t * 0.8);
    pon('pantalla-rosa', { opacity: p(t, 39.85, 40.15) });

    // El archivo vuela de Rosa a la zona de carga.
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

    // Carga.
    pon('pr-progreso', { opacity: p(t, 41.4, 41.6) * (1 - p(t, 42.45, 42.6)) });
    pon('pr-barra', { width: `${eio(p(t, 41.5, 42.3)) * 100}%` });
    $('pr-progreso-texto').textContent = t < 42.3 ? 'Cargando la lista…' : 'Lista cargada ✓';

    // Revisión de los datos.
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

    // Preparación de los 40 certificados.
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
    const pulso = 1 + 0.05 * Math.sin(p(t, 45.9, 46.3) * Math.PI);
    pon('pr-listo', { opacity: p(t, 44.45, 44.65), transform: `scale(${pulso})` });
    $('pr-listos').textContent = listos;
  } else {
    pon('archivo', { opacity: 0 });
  }
  vida(t);
}

window.seek = seek;
seek(Number(new URLSearchParams(location.search).get('t') || 0));
