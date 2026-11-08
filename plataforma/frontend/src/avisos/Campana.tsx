import { useCallback, useEffect, useRef, useState } from 'react'
import { antiguedad, marcarLeido, marcarTodos, misAvisos, type Avisos } from './api'

/**
 * HU26 (RF46–RF48): la campana de avisos del encabezado. Los avisos se consultan al cambiar de
 * pantalla, al abrir la campana y al volver a la ventana; nunca a intervalos, para que la sesión
 * siga cerrándose por inactividad (HU03).
 */
export default function Campana() {
  const [datos, setDatos] = useState<Avisos | null>(null)
  const [abierta, setAbierta] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  const consultar = useCallback(() => {
    misAvisos()
      .then(setDatos)
      .catch(() => {})
  }, [])

  useEffect(() => {
    consultar()
    window.addEventListener('hashchange', consultar)
    window.addEventListener('focus', consultar)
    return () => {
      window.removeEventListener('hashchange', consultar)
      window.removeEventListener('focus', consultar)
    }
  }, [consultar])

  useEffect(() => {
    if (!abierta) return
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierta(false)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierta])

  const sinLeer = datos?.sinLeer ?? 0
  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        aria-label={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'}
        aria-expanded={abierta}
        onClick={() => {
          if (!abierta) consultar()
          setAbierta(!abierta)
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-green-pale"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-institutional stroke-2"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-red-700 px-1 text-center text-xs font-semibold text-white">
            {sinLeer > 99 ? '99+' : sinLeer}
          </span>
        )}
      </button>
      {abierta && (
        <section
          aria-label="Avisos"
          className="absolute right-0 z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-card shadow-lg"
        >
          <h2 className="border-b border-line px-4 py-3 font-semibold">Avisos</h2>
          {!datos || datos.avisos.length === 0 ? (
            <p className="px-4 py-6 text-muted">No tiene avisos.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {datos.avisos.map((a) => (
                <li key={a.id} className="border-b border-line last:border-0">
                  <a
                    href={`#/${a.enlace}`}
                    onClick={() => {
                      setAbierta(false)
                      if (!a.leido)
                        marcarLeido(a.id)
                          .then(consultar)
                          .catch(() => {})
                    }}
                    className="flex gap-3 px-4 py-3 hover:bg-green-pale"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block ${a.leido ? 'text-muted' : 'font-medium'}`}>
                        {a.texto}
                      </span>
                      <span className="text-sm text-muted">{antiguedad(a.creadoEn)}</span>
                    </span>
                    {!a.leido && (
                      <span
                        aria-label="Sin leer"
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-institutional"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {sinLeer > 0 && (
            <button
              type="button"
              onClick={() =>
                marcarTodos()
                  .then(consultar)
                  .catch(() => {})
              }
              className="w-full border-t border-line px-4 py-3 font-medium text-institutional hover:bg-green-pale"
            >
              Marcar todos como leídos
            </button>
          )}
        </section>
      )}
    </div>
  )
}
