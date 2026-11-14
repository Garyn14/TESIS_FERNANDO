import { useEffect, useMemo, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import guia from './guia-de-operacion.md?raw'
import manual from './manual.md?raw'
import { CAPTURAS, seccionDe, seccionesDe } from './manual'

/**
 * DRA-75: manual de usuario general (versión 1), el mismo para todos los roles. El texto vive en
 * manual.md, en Markdown, para leerlo y editarlo también en GitHub. Cada sección (##) tiene su
 * enlace, #/manual/<sección>; el inicio enlaza a la del rol de la persona.
 */
export const PaginaManual = ({ seccion }: { seccion?: string }) => (
  <DocumentoDeAyuda texto={manual} ruta="manual" seccion={seccion} />
)

/** DRA-74: guía de operación, solo para el Administrador (#/operacion). */
export const PaginaGuiaDeOperacion = ({ seccion }: { seccion?: string }) => (
  <DocumentoDeAyuda texto={guia} ruta="operacion" seccion={seccion} />
)

/**
 * Un documento de ayuda en Markdown, con su índice, un enlace por sección (#/<ruta>/<sección>) y
 * el botón para imprimirlo. Al imprimir salen solo el documento y su título.
 */
function DocumentoDeAyuda({
  texto: contenido,
  ruta,
  seccion,
}: {
  texto: string
  ruta: string
  seccion?: string
}) {
  const componentes = useMemo(() => componentesDe(contenido, ruta), [contenido, ruta])
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
        <Markdown remarkPlugins={[remarkGfm]} components={componentes}>
          {contenido}
        </Markdown>
      </article>
    </section>
  )
}

const texto = (hijos: ReactNode): string =>
  Array.isArray(hijos) ? hijos.map(texto).join('') : typeof hijos === 'string' ? hijos : ''

const componentesDe = (contenido: string, ruta: string): Components => ({
  h1: ({ children }) => (
    <>
      {/* En pantalla el título ya está en el encabezado de la página; al imprimir, el encabezado
          se oculta y el título sale aquí. */}
      <h1 className="hidden text-2xl font-semibold text-institutional print:block">{children}</h1>
      <Indice secciones={seccionesDe(contenido)} ruta={ruta} />
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
      // Tamaño fijo (las capturas son de 1280 × 800): la página no se mueve al cargarlas, y el
      // enlace a una sección la deja arriba de la pantalla.
      <img
        src={archivo}
        alt={alt ?? ''}
        width={1280}
        height={800}
        className="mt-4 h-auto w-full rounded-lg border border-line print:break-inside-avoid"
      />
    ) : null
  },
  // Los enlaces externos (los documentos técnicos en GitHub) se abren en otra pestaña.
  a: ({ href, children }) =>
    href?.startsWith('http') ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-institutional underline"
      >
        {children}
      </a>
    ) : (
      <a href={href} className="font-medium text-institutional underline">
        {children}
      </a>
    ),
})

/** Índice con un enlace a cada sección del documento. */
function Indice({
  secciones,
  ruta,
}: {
  secciones: { titulo: string; id: string }[]
  ruta: string
}) {
  return (
    <nav
      aria-label={ruta === 'manual' ? 'Contenido del manual' : 'Contenido de la guía'}
      className="mt-4 rounded-lg bg-cream p-4 print:hidden"
    >
      <p className="font-semibold">Contenido</p>
      <ol className="mt-2 list-decimal space-y-1 pl-6">
        {secciones.map((s) => (
          <li key={s.id}>
            <a href={`#/${ruta}/${s.id}`} className="text-institutional underline">
              {s.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
