import logo from '../assets/logo-dra.png'
import type { VistaPrevia } from './api'

/**
 * Documento con la plantilla de su tipo (RF18), como en el prototipo. Mientras no está firmado
 * lleva la marca de agua "VISTA PREVIA": la fecha de emisión y el QR se asignan al firmar.
 */
export default function Certificado({ documento }: { documento: VistaPrevia }) {
  return (
    <figure
      aria-label={`Vista previa: ${documento.tipoNombre}`}
      className="relative overflow-hidden border border-institutional bg-card p-2"
    >
      <div className="flex min-h-[420px] flex-col items-center border-4 border-double border-gold px-8 py-6 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold tracking-widest text-institutional/10 select-none [transform:rotate(-20deg)]"
        >
          VISTA PREVIA
        </span>
        <p className="flex items-center gap-3 font-semibold text-institutional">
          <img src={logo} alt="" className="h-10 w-10" />
          AGENCIA AGRARIA SATIPO – DRA JUNÍN
        </p>
        <p className="mt-6 text-3xl tracking-[0.2em] text-institutional">{documento.titulo}</p>
        <p className="mt-3">Otorgado a</p>
        <p className="mt-1 text-2xl font-bold text-institutional uppercase">
          {documento.nombres} {documento.apellidos}
        </p>
        <p className="mt-4 max-w-2xl">{documento.texto}</p>
        <div className="mt-auto grid w-full grid-cols-3 items-end gap-4 pt-10 text-sm">
          <p>Fecha de emisión: se asignará al firmar</p>
          <p className="rounded border border-line bg-neutral-pale p-3 text-muted">
            Código QR: se generará al firmar
          </p>
          <p className="border-t border-ink pt-2">
            {documento.firmante && (
              <span className="block font-semibold text-institutional">{documento.firmante}</span>
            )}
            Director de la Agencia Agraria Satipo
          </p>
        </div>
      </div>
    </figure>
  )
}
