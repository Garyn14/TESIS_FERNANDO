import { useEffect, useRef, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import type { Red } from '../billeteras/api'
import { anularDocumento, ErrorBilletera } from '../blockchain/billetera'
import Modal from '../comun/Modal'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { cancelarAnulacion, confirmarAnulacion, type DocumentoFirmado } from './anulacion'
import { corta, verificarBilletera } from './billeteraDelDirector'

type Estado =
  | { tipo: 'verificando' }
  | { tipo: 'error'; mensaje: string; cancelada?: boolean }
  | { tipo: 'confirmar'; red: Red; cuenta: string }
  | { tipo: 'progreso'; paso: 1 | 2 }
  | { tipo: 'anulado' }

const PASOS = ['Verificando su billetera', 'Registrando la anulación', 'Confirmando el registro']

function mensaje(e: unknown) {
  return e instanceof ErrorBilletera || e instanceof ErrorApi
    ? e.message
    : 'Ocurrió un error inesperado. Intente nuevamente.'
}

interface Props {
  documento: DocumentoFirmado
  director: string
  onCerrar: (anulado: boolean) => void
}

/**
 * HU29: anulación con la billetera del Director, después de guardar el motivo. Verifica la
 * billetera y la red, registra la anulación en el contrato y la confirma en el servidor.
 */
export default function VentanaDeAnulacion({ documento, director, onCerrar }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'verificando' })
  const iniciada = useRef(false)
  const nombre = `${documento.nombres} ${documento.apellidos}`

  const verificar = async () => {
    setEstado({ tipo: 'verificando' })
    try {
      const { red, cuenta } = await verificarBilletera()
      setEstado({ tipo: 'confirmar', red, cuenta })
    } catch (e) {
      setEstado({ tipo: 'error', mensaje: mensaje(e) })
    }
  }

  useEffect(() => {
    if (iniciada.current) return
    iniciada.current = true
    void verificar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const anular = async (red: Red) => {
    setEstado({ tipo: 'progreso', paso: 1 })
    let transaccion: string
    try {
      transaccion = await anularDocumento(red, documento.codigo)
    } catch (e) {
      // No se registró: el documento sigue firmado y se descarta el motivo guardado.
      await cancelarAnulacion(documento.codigo).catch(() => undefined)
      const cancelada = e instanceof ErrorBilletera && e.cancelada
      setEstado({
        tipo: 'error',
        cancelada: true,
        mensaje: cancelada
          ? 'Anulación cancelada en la billetera. El documento sigue firmado.'
          : `${mensaje(e)} El documento sigue firmado.`,
      })
      return
    }
    setEstado({ tipo: 'progreso', paso: 2 })
    try {
      await confirmarAnulacion(documento.codigo, transaccion)
      setEstado({ tipo: 'anulado' })
    } catch {
      setEstado({
        tipo: 'error',
        cancelada: true,
        mensaje:
          'La anulación se envió, pero no se pudo confirmar. Se confirmará al sincronizar con la blockchain.',
      })
    }
  }

  const ocupada = estado.tipo === 'verificando' || estado.tipo === 'progreso'
  const cerrar = () => !ocupada && onCerrar(estado.tipo === 'anulado')

  return (
    <Modal titulo="Anular con su billetera" onCerrar={cerrar}>
      <div className="space-y-4">
        {estado.tipo === 'verificando' && (
          <p role="status" className="text-institutional">
            Verificando su billetera…
          </p>
        )}
        {estado.tipo === 'error' && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {estado.mensaje}
          </p>
        )}
        {estado.tipo === 'confirmar' && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-line p-3">
            <dt className="text-muted">Cuenta</dt>
            <dd>
              {director} <span className="font-mono">({corta(estado.cuenta)})</span>
            </dd>
            <dt className="text-muted">Acción</dt>
            <dd className="font-semibold">Anular 1 documento</dd>
            <dt className="text-muted">Documento</dt>
            <dd>
              <span className="font-mono">{documento.codigo}</span> – {nombre}
            </dd>
            <dt className="text-muted">Red</dt>
            <dd>{estado.red.nombre}</dd>
            <dt className="text-muted">Costo de la operación</dt>
            <dd>Sin costo</dd>
          </dl>
        )}
        {estado.tipo === 'progreso' && (
          <ol aria-label="Progreso de la anulación" className="space-y-2">
            {PASOS.map((texto, i) => (
              <li
                key={texto}
                aria-current={i === estado.paso ? 'step' : undefined}
                className={i > estado.paso ? 'text-muted' : 'text-institutional'}
              >
                {i < estado.paso ? '✓ ' : i === estado.paso ? '… ' : '○ '}
                {texto}
              </li>
            ))}
            {estado.paso === 1 && (
              <li className="pt-2 text-sm text-muted">Confirme la operación en su billetera.</li>
            )}
          </ol>
        )}
        {estado.tipo === 'anulado' && (
          <p role="status" className="rounded-lg bg-neutral-pale px-4 py-3">
            <strong>Documento anulado.</strong>{' '}
            <span className="font-mono">{documento.codigo}</span> – {nombre}. Ya no es válido.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {estado.tipo === 'confirmar' ? (
            <>
              <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => anular(estado.red)}
                className={BOTON_ADVERTENCIA}
              >
                Confirmar
              </button>
            </>
          ) : estado.tipo === 'error' ? (
            <>
              <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>
                Cerrar
              </button>
              {!estado.cancelada && (
                <button type="button" onClick={verificar} className={BOTON_PRIMARIO}>
                  Intentar nuevamente
                </button>
              )}
            </>
          ) : estado.tipo === 'anulado' ? (
            <button type="button" onClick={cerrar} className={BOTON_PRIMARIO}>
              Volver a Documentos firmados
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
