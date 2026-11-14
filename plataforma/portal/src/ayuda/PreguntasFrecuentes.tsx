import { useEffect, useState } from 'react'
import { RUTA_COMO_VERIFICAR } from '../ruta'
import { GRUPOS } from './preguntas'

const pedida = () => decodeURIComponent(window.location.hash.slice(1))

/**
 * DRA-71: preguntas frecuentes del portal público, en tres grupos. Cada pregunta se abre y se
 * cierra (details/summary del navegador: teclado y lectores de pantalla sin código extra) y tiene
 * su propio enlace: /preguntas-frecuentes#id la abre y la muestra.
 */
export default function PreguntasFrecuentes() {
  const [abierta, setAbierta] = useState(pedida)

  useEffect(() => {
    const alCambiar = () => setAbierta(pedida())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  useEffect(() => {
    if (abierta) document.getElementById(abierta)?.scrollIntoView?.({ block: 'start' })
  }, [abierta])

  return (
    <article className="space-y-6">
      <header className="rounded-xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-institutional">Preguntas frecuentes</h1>
        <p className="mt-2 text-muted">
          Respuestas cortas a las dudas más comunes sobre la verificación de documentos de la
          Agencia Agraria Satipo. Para los pasos, vea{' '}
          <a href={RUTA_COMO_VERIFICAR} className="font-medium text-institutional underline">
            cómo verificar un documento
          </a>
          .
        </p>
      </header>

      {GRUPOS.map((grupo) => (
        <section
          key={grupo.titulo}
          aria-label={grupo.titulo}
          className="rounded-xl border border-line bg-card p-6 shadow-sm"
        >
          <h2 className="mb-3 text-lg font-semibold">{grupo.titulo}</h2>
          <div className="divide-y divide-line">
            {grupo.preguntas.map((p) => (
              <details
                key={p.id}
                id={p.id}
                open={abierta === p.id}
                className="group scroll-mt-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium hover:text-institutional">
                  <h3>{p.pregunta}</h3>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-institutional transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="mt-2 text-ink/90">
                  {p.respuesta}
                  <p className="mt-2 text-sm">
                    <a href={`#${p.id}`} className="text-muted underline">
                      Enlace a esta pregunta
                    </a>
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <a
        href="/"
        className="inline-block rounded-lg bg-institutional px-5 py-2 font-medium text-white hover:bg-institutional-soft"
      >
        Verificar un documento
      </a>
    </article>
  )
}
