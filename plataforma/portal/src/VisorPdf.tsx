import { useEffect, useRef, useState } from 'react'

type Estado = 'cargando' | 'listo' | 'error'

/** Dibuja cada página del PDF en un lienzo con pdf.js, que se carga recién al necesitarse. */
async function dibujar(url: string, contenedor: HTMLElement, vigente: () => boolean) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`El documento respondió ${respuesta.status}`)
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await respuesta.arrayBuffer()) })
    .promise
  const ancho = contenedor.clientWidth || 800
  const densidad = window.devicePixelRatio || 1
  for (let n = 1; n <= pdf.numPages && vigente(); n++) {
    const pagina = await pdf.getPage(n)
    const base = pagina.getViewport({ scale: 1 })
    const vista = pagina.getViewport({ scale: (ancho / base.width) * densidad })
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.floor(vista.width)
    lienzo.height = Math.floor(vista.height)
    lienzo.className = 'block h-auto w-full'
    lienzo.setAttribute('aria-hidden', 'true')
    await pagina.render({ canvas: lienzo, viewport: vista }).promise
    if (vigente()) contenedor.append(lienzo)
  }
}

/**
 * HU19 (RF39): el documento completo dentro de la página. Se dibuja con pdf.js porque los
 * navegadores de los celulares no muestran un PDF incrustado.
 */
export default function VisorPdf({ url, titulo }: { url: string; titulo: string }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>('cargando')

  useEffect(() => {
    const destino = contenedor.current
    if (!destino) return
    let vigente = true
    destino.replaceChildren()
    dibujar(url, destino, () => vigente)
      .then(() => vigente && setEstado('listo'))
      .catch(() => vigente && setEstado('error'))
    return () => {
      vigente = false
    }
  }, [url])

  return (
    <div role="img" aria-label={titulo} aria-busy={estado === 'cargando'}>
      {estado === 'cargando' && <p className="p-6 text-muted">Cargando el documento…</p>}
      {estado === 'error' && (
        <p className="p-6 text-muted">
          No se pudo mostrar el documento aquí. Use "Abrir el documento" o "Descargar PDF".
        </p>
      )}
      <div ref={contenedor} className="overflow-hidden rounded-b-xl" />
    </div>
  )
}
