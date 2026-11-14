import { useEffect, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import manual from './manual.md?raw'
import { CAPTURAS, SECCIONES, seccionDe } from './manual'

/**
 * DRA-75: manual de usuario general (versión 1), el mismo para todos los roles. El texto vive en
 * manual.md, en Markdown, para leerlo y editarlo también en GitHub. Cada sección (##) tiene su
 * enlace, #/manual/<sección>; el inicio enlaza a la del rol de la persona.
 */
export function PaginaManual({ seccion }: { seccion?: string }) {
  useEffect(() => {
    if (seccion) document.getElementById(seccion)?.scrollIntoView?.({ block: 'start' })
  }, [seccion])

  return (
    <section className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-line bg-card px-4 py-2 font-medium hover:bg-cream"
        >
          Imprimir o guardar en PDF
        </button>
      </div>
      <article className="rounded-xl border border-line bg-card p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTES}>
          {manual}
        </Markdown>
      </article>
    </section>
  )
}

const texto = (hijos: ReactNode): string =>
  Array.isArray(hijos) ? hijos.map(texto).join('') : typeof hijos === 'string' ? hijos : ''

const COMPONENTES: Components = {
  h1: ({ children }) => (
    <>
      <h1 className="text-2xl font-semibold text-institutional">{children}</h1>
      <Indice />
    </>
  ),
  h2: ({ children }) => (
    <h2
      id={seccionDe(texto(children))}
      className="mt-10 scroll-mt-4 border-b border-line pb-2 text-xl font-semibold text-institutional"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mt-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-line bg-cream px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-line px-3 py-2 align-top">{children}</td>,
  img: ({ src, alt }) => {
    const archivo = CAPTURAS[String(src)]
    return archivo ? (
      <img
        src={archivo}
        alt={alt ?? ''}
        className="mt-4 w-full rounded-lg border border-line print:break-inside-avoid"
      />
    ) : null
  },
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-institutional underline">
      {children}
    </a>
  ),
}

/** Índice con un enlace a cada sección del manual. */
function Indice() {
  return (
    <nav aria-label="Contenido del manual" className="mt-4 rounded-lg bg-cream p-4 print:hidden">
      <p className="font-semibold">Contenido</p>
      <ol className="mt-2 list-decimal space-y-1 pl-6">
        {SECCIONES.map((s) => (
          <li key={s.id}>
            <a href={`#/manual/${s.id}`} className="text-institutional underline">
              {s.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
