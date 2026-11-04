import { useEffect, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import VentanaDeFirma from '../firma/VentanaDeFirma'
import { fechaCorta, type Documento } from './api'
import Certificado from './Certificado'
import MuestraDelPdf from './MuestraDelPdf'
import { observarDocumento, revisarDocumento } from './revision'
import VentanaDeMotivo from './VentanaDeMotivo'

/**
 * HU10: revisión de un documento. Abrirlo registra la revisión (RF22). HU11: se firma desde aquí.
 * HU13: se observa con un motivo y vuelve al área. Rechazar llega con HU14.
 */
export default function PaginaRevisionDocumento({
  codigo,
  director = '',
}: {
  codigo: string
  director?: string
}) {
  const [doc, setDoc] = useState<Documento | null>(null)
  const [error, setError] = useState('')
  const [firmando, setFirmando] = useState(false)
  const [observando, setObservando] = useState(false)
  useEffect(() => {
    revisarDocumento(codigo)
      .then(setDoc)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el documento.'))
  }, [codigo])

  const datos: [string, string][] = doc
    ? [
        ['Tipo', doc.tipoNombre],
        ['Beneficiario', `${doc.nombres} ${doc.apellidos}`],
        ['Código', doc.codigo],
        ['DNI', doc.dni],
        ...(doc.numeroExpediente
          ? [['N.° de expediente', doc.numeroExpediente] as [string, string]]
          : []),
        ['Área', doc.areaNombre],
        ['Enviado por', doc.registradoPor],
        ['Fecha de envío', fechaCorta(doc.registradoEn)],
      ]
    : []

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
        ← Volver a Por revisar
      </a>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-line bg-card p-6 shadow-sm">
          {error}
        </p>
      ) : doc === null ? (
        <p className="mt-4 text-muted">Cargando…</p>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold">Revisión – {doc.tipoNombre}</h2>
          <dl className="mt-4 grid rounded-xl border border-line bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            {datos.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="border-b border-line p-4">
                <dt className="text-sm text-muted">{etiqueta}</dt>
                <dd className="font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <Certificado documento={doc} />
          </div>
          {doc.estado === 'OBSERVADO' ? (
            <div className="mt-6 space-y-3">
              <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
                El documento fue observado y volvió al área.
              </p>
              <p className="rounded-lg bg-orange-pale px-4 py-3">
                <strong>Motivo:</strong> {doc.motivo}
              </p>
              <a href="#/por-revisar" className="font-medium text-institutional hover:underline">
                Volver a Por revisar
              </a>
            </div>
          ) : (
            <>
              <MuestraDelPdf codigo={doc.codigo} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted">
                  ✓ Quedó registrado como revisado. Rechazar se habilita con HU14.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setObservando(true)}
                    className={BOTON_SECUNDARIO}
                  >
                    Observar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirmando(true)}
                    className={BOTON_PRIMARIO}
                  >
                    Firmar
                  </button>
                </div>
              </div>
            </>
          )}
          {observando && (
            <VentanaDeMotivo
              titulo="Observar documento"
              rechazo={false}
              onConfirmar={async (motivo) => {
                setDoc(await observarDocumento(doc.codigo, motivo))
                setObservando(false)
              }}
              onCerrar={() => setObservando(false)}
            />
          )}
          {firmando && (
            <VentanaDeFirma
              seleccion={{
                codigos: [doc.codigo],
                lotes: [],
                cantidad: 1,
                nombres: { [doc.codigo]: `${doc.tipoNombre} – ${doc.nombres} ${doc.apellidos}` },
              }}
              director={director}
              onCerrar={(resultado) => {
                setFirmando(false)
                if (resultado) window.location.hash = '#/por-revisar'
              }}
            />
          )}
        </>
      )}
    </section>
  )
}
