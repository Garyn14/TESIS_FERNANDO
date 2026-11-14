import { useId, type ReactNode } from 'react'

/**
 * DRA-70: dibujo esquemático de un certificado de la agencia, con el pie tal como lo arma el PDF
 * (GeneradorDePdf.pie): a la izquierda la fecha de emisión y, si vence, "Válido hasta"; al centro el
 * QR con el código de verificación debajo; a la derecha la firma del Director. Es un dibujo, no un
 * documento real: no lleva datos de nadie y no hay que rehacerlo si cambian los textos del PDF.
 */
export default function DibujoDocumento() {
  const id = useId()
  const tinta = '#1f2a22'
  const tenue = '#c9c4b8'
  const verde = '#1b5e20'
  const oro = '#e8b500'
  const marca = '#c28119'
  return (
    <figure className="mx-auto max-w-md">
      <svg
        viewBox="0 0 400 500"
        role="img"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descripcion`}
        className="h-auto w-full"
      >
        <title id={`${id}-titulo`}>Dónde están el código QR y el código de verificación</title>
        <desc id={`${id}-descripcion`}>
          Dibujo de un certificado. Abajo a la izquierda, la fecha de emisión y la fecha de
          vigencia. Abajo al centro, el código QR y, debajo de él, el código de verificación. Abajo
          a la derecha, la firma del Director.
        </desc>

        {/* Hoja con el marco institucional */}
        <rect
          x="10"
          y="10"
          width="380"
          height="480"
          rx="6"
          fill="#fff"
          stroke={verde}
          strokeWidth="3"
        />
        <rect x="20" y="20" width="360" height="460" fill="none" stroke={oro} strokeWidth="1.5" />

        {/* Encabezado, título, nombre y texto, como líneas grises */}
        <circle cx="200" cy="58" r="16" fill={oro} />
        <rect x="140" y="84" width="120" height="6" rx="3" fill={tenue} />
        <text x="200" y="128" textAnchor="middle" fontSize="22" fontWeight="600" fill={verde}>
          CERTIFICADO
        </text>
        <rect x="120" y="148" width="160" height="10" rx="5" fill={verde} opacity="0.55" />
        {[176, 190, 204, 218].map((y, i) => (
          <rect key={y} x="60" y={y} width={i === 3 ? 180 : 280} height="6" rx="3" fill={tenue} />
        ))}

        {/* Pie: fechas, QR con el código y firma */}
        <rect x="40" y="318" width="90" height="6" rx="3" fill={tinta} opacity="0.7" />
        <rect x="40" y="332" width="80" height="6" rx="3" fill={verde} opacity="0.8" />

        <rect x="160" y="282" width="80" height="80" fill="#fff" stroke={tinta} strokeWidth="2" />
        {[
          [166, 288],
          [212, 288],
          [166, 334],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="22" height="22" fill={tinta} />
            <rect x={x + 5} y={y + 5} width="12" height="12" fill="#fff" />
            <rect x={x + 8} y={y + 8} width="6" height="6" fill={tinta} />
          </g>
        ))}
        {[
          [196, 292],
          [204, 302],
          [196, 316],
          [214, 318],
          [226, 330],
          [204, 340],
          [218, 346],
          [196, 350],
          [230, 350],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" fill={tinta} />
        ))}
        <text x="200" y="381" textAnchor="middle" fontSize="10" fontWeight="700" fill={tinta}>
          DRA-2026-XXXXXX
        </text>

        <line x1="272" y1="330" x2="362" y2="330" stroke={tinta} strokeWidth="1.5" />
        <rect x="282" y="338" width="70" height="6" rx="3" fill={tenue} />

        <rect x="80" y="420" width="240" height="5" rx="2.5" fill={tenue} />

        {/* Señales */}
        <rect
          x="134"
          y="272"
          width="132"
          height="120"
          rx="8"
          fill="none"
          stroke={marca}
          strokeWidth="3"
          strokeDasharray="6 4"
        />
        <rect
          x="32"
          y="308"
          width="106"
          height="38"
          rx="8"
          fill="none"
          stroke={marca}
          strokeWidth="3"
          strokeDasharray="6 4"
        />
        <Senal x={266} y={272} numero={1} />
        <Senal x={266} y={392} numero={2} />
        <Senal x={32} y={308} numero={3} />
      </svg>
      <figcaption className="mt-4">
        <ol className="space-y-2">
          <Leyenda numero={1}>
            <strong>Código QR</strong>: abajo, al centro del documento. Escanéelo con la cámara del
            celular.
          </Leyenda>
          <Leyenda numero={2}>
            <strong>Código de verificación</strong>: impreso debajo del QR, con la forma{' '}
            <span className="whitespace-nowrap">DRA-2026-XXXXXX</span>. También aparece en la última
            línea del documento.
          </Leyenda>
          <Leyenda numero={3}>
            <strong>Fecha de emisión</strong> y, si el documento tiene vigencia, la fecha{' '}
            <strong>&quot;Válido hasta&quot;</strong>: abajo, a la izquierda.
          </Leyenda>
        </ol>
      </figcaption>
    </figure>
  )
}

function Senal({ x, y, numero }: { x: number; y: number; numero: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill="#c28119" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill="#fff">
        {numero}
      </text>
    </g>
  )
}

function Leyenda({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber text-sm font-bold text-white"
      >
        {numero}
      </span>
      <span>{children}</span>
    </li>
  )
}
