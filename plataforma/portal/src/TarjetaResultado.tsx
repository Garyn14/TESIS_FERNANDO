import { fechaLarga, type Verificacion } from './api'

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
 * El resultado de una verificación (HU19, HU20): Válido, Anulado o No válido, con los datos que
 * entrega el servidor (HU21). Nunca muestra el documento: eso lo decide quien la usa.
 */
export default function TarjetaResultado({
  v,
  nivel = 1,
}: {
  v: Verificacion
  /** En la portada, el resultado va debajo del título de la página (HU20). */
  nivel?: 1 | 2
}) {
  const encabezado = ENCABEZADOS[v.resultado]
  const Titulo = nivel === 1 ? 'h1' : 'h2'
  return (
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
          <Titulo id="resultado" className="text-2xl font-semibold">
            {encabezado.titulo}
          </Titulo>
          <p className="mt-1">{v.mensaje}</p>
        </div>
      </div>
      {v.resultado !== 'NO_VALIDO' && (
        <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-lg bg-card p-4 sm:grid-cols-2">
          <Dato etiqueta="Tipo de documento" valor={v.tipo} />
          <Dato etiqueta="Titular" valor={v.titular} />
          <Dato etiqueta="Fecha de emisión" valor={v.fechaEmision && fechaLarga(v.fechaEmision)} />
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
