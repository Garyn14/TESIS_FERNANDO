// Personajes en ilustración plana. Cada función devuelve un <g> de SVG con el
// origen en la base de los hombros (centro). Alto aproximado: 420 unidades.

const PIEL = { rosa: '#c68b5e', carlos: '#b97a50', lucia: '#d39a6a', empleador: '#a86d47' };

function cabello(peinado, color, canas) {
  const atras = {
    moño: `<circle cx="0" cy="-392" r="40" fill="${color}"/>`,
    largo: `<path d="M-96 -292 Q-104 -392 0 -388 Q104 -392 96 -292 L104 -150 Q70 -128 44 -168 L-44 -168 Q-70 -128 -104 -150Z" fill="${color}"/>`,
    corto: '',
  }[peinado];
  const frente = {
    moño: `<path d="M-82 -282 Q-92 -386 0 -382 Q92 -386 82 -282 Q66 -352 -6 -344 Q-56 -338 -82 -282Z" fill="${color}"/>`,
    largo: `<path d="M-84 -270 Q-96 -388 0 -384 Q96 -388 84 -270 Q74 -342 22 -346 Q-10 -312 -84 -270Z" fill="${color}"/>`,
    corto: `<path d="M-82 -296 Q-90 -392 0 -386 Q90 -392 82 -296 Q74 -340 40 -346 Q0 -330 -46 -348 Q-74 -340 -82 -296Z" fill="${color}"/>` +
      (canas ? `<path d="M-82 -296 Q-84 -318 -76 -330 L-70 -300Z M82 -296 Q84 -318 76 -330 L70 -300Z" fill="#d9d4cc"/>` : ''),
  }[peinado];
  return { atras, frente };
}

function cara(expresion) {
  const ojos = `<g class="ojos"><ellipse cx="-28" cy="-286" rx="7" ry="9" fill="#2a1c15"/><ellipse cx="28" cy="-286" rx="7" ry="9" fill="#2a1c15"/><circle cx="-25" cy="-290" r="2.4" fill="#fff"/><circle cx="31" cy="-290" r="2.4" fill="#fff"/></g>`;
  const cejas = {
    neutral: `<path d="M-44 -314 L-14 -316 M14 -316 L44 -314" stroke="#2a1c15" stroke-width="6" stroke-linecap="round"/>`,
    preocupada: `<path d="M-44 -310 L-14 -322 M14 -322 L44 -310" stroke="#2a1c15" stroke-width="6" stroke-linecap="round"/>`,
    feliz: `<path d="M-44 -314 Q-29 -326 -14 -318 M14 -318 Q29 -326 44 -314" fill="none" stroke="#2a1c15" stroke-width="6" stroke-linecap="round"/>`,
  }[expresion];
  const boca = {
    neutral: `<path d="M-18 -238 Q0 -230 18 -238" fill="none" stroke="#6b2f2a" stroke-width="5" stroke-linecap="round"/>`,
    preocupada: `<path d="M-16 -232 Q0 -242 16 -232" fill="none" stroke="#6b2f2a" stroke-width="5" stroke-linecap="round"/>`,
    feliz: `<path d="M-26 -244 Q0 -210 26 -244 Z" fill="#7a2e2e"/><path d="M-20 -242 L20 -242 L18 -236 L-18 -236Z" fill="#fff"/>`,
  }[expresion];
  const mejillas = `<circle cx="-46" cy="-254" r="12" fill="#e57373" opacity=".25"/><circle cx="46" cy="-254" r="12" fill="#e57373" opacity=".25"/>`;
  return ojos + cejas + boca + mejillas;
}

function persona(o) {
  const {
    piel, pelo = '#2b1d16', ropa = '#2e7d32', peinado = 'corto', lentes = false,
    expresion = 'neutral', cuello = '#ffffff', corbata = null, canas = false, sombrero = false,
    chaleco = null, mirar = 0,
  } = o;
  const c = cabello(peinado, pelo, canas);
  const sombra = 'rgba(0,0,0,.12)';
  return `<g class="persona" data-mirar="${mirar}" filter="url(#sombra)">
    <g class="cabeza-atras">${c.atras}</g>
    <path d="M-172 0 Q-176 -150 -64 -172 L64 -172 Q176 -150 172 0Z" fill="${ropa}"/>
    ${chaleco ? `<path d="M-150 0 Q-150 -120 -70 -160 L-30 -60 L-30 0Z M150 0 Q150 -120 70 -160 L30 -60 L30 0Z" fill="${chaleco}"/>` : ''}
    <rect x="-28" y="-212" width="56" height="54" rx="10" fill="${piel}"/>
    <rect x="-28" y="-212" width="56" height="20" fill="${sombra}"/>
    <path d="M-50 -170 L0 -120 L50 -170 L28 -176 L0 -150 L-28 -176Z" fill="${cuello}"/>
    ${corbata ? `<path d="M-10 -150 L10 -150 L16 -60 L0 -40 L-16 -60Z" fill="${corbata}"/>` : ''}
    <g class="cabeza">
    <ellipse cx="-78" cy="-280" rx="14" ry="20" fill="${piel}"/>
    <ellipse cx="78" cy="-280" rx="14" ry="20" fill="${piel}"/>
    <ellipse cx="0" cy="-286" rx="78" ry="92" fill="${piel}"/>
    ${c.frente}
    ${cara(expresion)}
    ${lentes ? `<g fill="none" stroke="#2a1c15" stroke-width="5"><rect x="-54" y="-304" width="44" height="34" rx="10"/><rect x="10" y="-304" width="44" height="34" rx="10"/><path d="M-10 -290 L10 -290"/></g>` : ''}
    ${sombrero ? `<ellipse cx="0" cy="-352" rx="130" ry="22" fill="#a1764a"/><path d="M-70 -352 Q-66 -430 0 -432 Q66 -430 70 -352Z" fill="#b8885a"/><rect x="-70" y="-370" width="140" height="16" fill="#5d4027"/>` : ''}
    </g></g>`;
}

const PERSONAJES = {
  rosa: (expresion, extra = {}) => persona({ piel: PIEL.rosa, pelo: '#2b1d16', ropa: '#2e7d32', peinado: 'moño', expresion, ...extra }),
  carlos: (expresion, extra = {}) => persona({ piel: PIEL.carlos, pelo: '#3a2a20', canas: true, ropa: '#eceff1', chaleco: '#455a64', peinado: 'corto', lentes: true, expresion, cuello: '#ffffff', ...extra }),
  lucia: (expresion, extra = {}) => persona({ piel: PIEL.lucia, pelo: '#3b2418', ropa: '#c28119', peinado: 'largo', expresion, ...extra }),
  empleador: (expresion, extra = {}) => persona({ piel: PIEL.empleador, pelo: '#1d1410', ropa: '#37474f', corbata: '#8e2b2b', peinado: 'corto', expresion, ...extra }),
};

// Certificado en miniatura: rectángulo con sello dorado y líneas de texto.
function certificado(x, y, w, h, extra = '') {
  return `<g transform="translate(${x} ${y})" ${extra}>
    <rect width="${w}" height="${h}" rx="${w * 0.04}" fill="#fffdf6" stroke="#d8cfb8" stroke-width="${Math.max(1, w * 0.012)}"/>
    <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="#1b5e20" stroke-width="${Math.max(1, w * 0.01)}"/>
    <rect x="${w * 0.25}" y="${h * 0.18}" width="${w * 0.5}" height="${h * 0.07}" rx="2" fill="#1b5e20"/>
    <rect x="${w * 0.18}" y="${h * 0.36}" width="${w * 0.64}" height="${h * 0.04}" rx="2" fill="#9aa39b"/>
    <rect x="${w * 0.18}" y="${h * 0.46}" width="${w * 0.64}" height="${h * 0.04}" rx="2" fill="#9aa39b"/>
    <rect x="${w * 0.18}" y="${h * 0.56}" width="${w * 0.44}" height="${h * 0.04}" rx="2" fill="#9aa39b"/>
    <circle cx="${w * 0.72}" cy="${h * 0.74}" r="${w * 0.08}" fill="#e8b500"/>
  </g>`;
}

function reloj(id, x, y, r) {
  return `<g transform="translate(${x} ${y})">
    <circle r="${r}" fill="#fff" stroke="#5f6b62" stroke-width="${r * 0.1}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="-2" y="${-r * 0.85}" width="4" height="${r * 0.14}" fill="#5f6b62" transform="rotate(${i * 30})"/>`).join('')}
    <rect id="${id}-h" x="-4" y="${-r * 0.5}" width="8" height="${r * 0.55}" rx="4" fill="#1f2a22"/>
    <rect id="${id}-m" x="-3" y="${-r * 0.75}" width="6" height="${r * 0.8}" rx="3" fill="#1f2a22"/>
    <circle r="${r * 0.07}" fill="#c0392b"/>
  </g>`;
}
