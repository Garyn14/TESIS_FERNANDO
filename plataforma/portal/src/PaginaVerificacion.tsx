import { useEffect, useState } from 'react'
import { urlDelDocumento, verificar, type Verificacion } from './api'
import TarjetaResultado from './TarjetaResultado'
import VisorPdf from './VisorPdf'

type Estado =
  | { tipo: 'verificando' }
  | { tipo: 'no-disponible'; mensaje: string }
  | { tipo: 'listo'; verificacion: Verificacion }

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
  return (
    <div className="space-y-6">
      <TarjetaResultado v={v} />
      {v.resultado === 'VALIDO' && <Documento token={token} />}
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
