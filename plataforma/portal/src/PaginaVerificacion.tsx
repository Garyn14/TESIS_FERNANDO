import { useEffect, useState } from 'react'
import { fechaLarga, urlDelDocumento, verificar, type Verificacion } from './api'
import VisorPdf from './VisorPdf'

type Estado =
  | { tipo: 'verificando' }
  | { tipo: 'no-disponible'; mensaje: string }
  | { tipo: 'listo'; verificacion: Verificacion }

const ENCABEZADOS = {
  VALIDO: { titulo: 'Documento válido', icono: '✓', clase: 'border-institutional bg-green-pale' },
  ANULADO: {
    titulo: 'Documento anulado',
    icono: '⊘',
    clase: 'border-neutral-icon bg-neutral-pale',
  },
  NO_VALIDO: { titulo: 'Documento no válido', icono: '✕', clase: 'border-red-700 bg-red-50' },
}

/**
 * HU19 (RF39): resultado de la verificación del documento del código QR y, si es válido, el
 * documento completo. El resultado lo calcula el servidor con la blockchain (HU21).
 */
export default function PaginaVerificacion({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'verificando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    verificar(token)
      .then((verificacion) => vigente && setEstado({ tipo: 'listo', verificacion }))
      .catch((e: Error) => vigente && setEstado({ tipo: 'no-disponible', mensaje: e.message }))
    return () => {
      vigente = false
    }
  }, [token, intento])

  const consultar = () => {
    setEstado({ tipo: 'verificando' })
    setIntento((n) => n + 1)
  }

  if (estado.tipo === 'verificando')
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-xl border border-line bg-card p-6 shadow-sm"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-institutional border-t-transparent"
        />
        Verificando el documento…
      </p>
    )

  if (estado.tipo === 'no-disponible')
    return (
      <div role="alert" className="rounded-xl border border-amber bg-amber-pale p-6">
        <p>{estado.mensaje}</p>
        <button
          type="button"
          onClick={consultar}
          className="mt-4 rounded-lg bg-institutional px-4 py-2 font-medium text-white hover:bg-institutional-soft"
        >
          Intentar nuevamente
        </button>
      </div>
    )

  const v = estado.verificacion
  const encabezado = ENCABEZADOS[v.resultado]
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="resultado"
        className={`rounded-xl border-2 p-6 shadow-sm ${encabezado.clase}`}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-xl font-bold"
          >
            {encabezado.icono}
          </span>
          <div>
            <h1 id="resultado" className="text-2xl font-semibold">
              {encabezado.titulo}
            </h1>
            <p className="mt-1">{v.mensaje}</p>
          </div>
        </div>
        {v.resultado !== 'NO_VALIDO' && (
          <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-lg bg-card p-4 sm:grid-cols-2">
            <Dato etiqueta="Tipo de documento" valor={v.tipo} />
            <Dato etiqueta="Titular" valor={v.titular} />
            <Dato
              etiqueta="Fecha de emisión"
              valor={v.fechaEmision && fechaLarga(v.fechaEmision)}
            />
            <Dato etiqueta="Estado" valor={v.resultado === 'VALIDO' ? 'Vigente' : 'Anulado'} />
            {v.anuladoEn && <Dato etiqueta="Fecha de anulación" valor={fechaLarga(v.anuladoEn)} />}
          </dl>
        )}
        {v.versionCorregida && (
          <p className="mt-4 rounded-lg bg-card p-4">
            Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.
          </p>
        )}
        {v.resultado === 'NO_VALIDO' && (
          <p className="mt-4 text-sm">
            Compruebe que escaneó el código QR del documento original. Si cree que es un error,
            comuníquese con la Agencia Agraria Satipo.
          </p>
        )}
      </section>
      {v.resultado === 'VALIDO' && <Documento token={token} />}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}

/** El documento completo, verificado: dibujado en la página y con enlaces para abrirlo o bajarlo. */
function Documento({ token }: { token: string }) {
  const url = urlDelDocumento(token)
  return (
    <section
      aria-labelledby="documento"
      className="rounded-xl border border-line bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <h2 id="documento" className="text-lg font-semibold">
          Documento completo
        </h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="rounded-lg border border-institutional px-3 py-2 text-sm font-medium text-institutional hover:bg-green-pale"
          >
            Abrir el documento
          </a>
          <a
            href={url}
            download="documento-verificado.pdf"
            className="rounded-lg bg-institutional px-3 py-2 text-sm font-medium text-white hover:bg-institutional-soft"
          >
            Descargar PDF
          </a>
        </div>
      </div>
      <VisorPdf url={url} titulo="Documento verificado" />
    </section>
  )
}
