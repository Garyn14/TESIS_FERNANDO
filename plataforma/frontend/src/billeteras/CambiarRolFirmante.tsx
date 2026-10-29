import { useState } from 'react'
import { ErrorApi } from '../api/cliente'
import {
  cambiarRolDeFirmante,
  conectar,
  ErrorBilletera,
  esAdministradorDelContrato,
} from '../blockchain/billetera'
import { BOTON_ADVERTENCIA, BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { confirmarCambioDeRol, type CuentaConBilletera, type Red } from './api'

type Paso =
  | { tipo: 'inicio' }
  | { tipo: 'conectando' }
  | { tipo: 'confirmar'; administrador: string }
  | { tipo: 'progreso'; mensaje: string }
  | { tipo: 'hecho' }

interface Props {
  cuenta: CuentaConBilletera
  red: Red
  otorgar: boolean
  onCambiado: (cuenta: CuentaConBilletera) => void
  onCerrar: () => void
}

/**
 * HU06 (RF08): otorga o revoca el rol de firmante. La billetera del Administrador firma en el
 * navegador; el servidor solo verifica la transacción en la blockchain.
 */
export default function CambiarRolFirmante({ cuenta, red, otorgar, onCambiado, onCerrar }: Props) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicio' })
  const [error, setError] = useState('')
  const billetera = cuenta.billetera as string

  const fallar = (e: unknown, volverA: Paso) => {
    setError(
      e instanceof ErrorBilletera || e instanceof ErrorApi
        ? e.message
        : 'Ocurrió un error inesperado.',
    )
    setPaso(volverA)
  }

  const conectarBilletera = async () => {
    setError('')
    setPaso({ tipo: 'conectando' })
    try {
      const administrador = await conectar(red)
      if (!(await esAdministradorDelContrato(red, administrador))) {
        throw new ErrorBilletera(
          `La billetera conectada (${administrador}) no es administradora del contrato. Conecte la billetera del Administrador.`,
        )
      }
      setPaso({ tipo: 'confirmar', administrador })
    } catch (e) {
      fallar(e, { tipo: 'inicio' })
    }
  }

  const confirmar = async (administrador: string) => {
    setError('')
    setPaso({ tipo: 'progreso', mensaje: 'Esperando su confirmación en la billetera…' })
    try {
      const transaccion = await cambiarRolDeFirmante(red, billetera, otorgar, () =>
        setPaso({ tipo: 'progreso', mensaje: 'Registrando en la blockchain…' }),
      )
      setPaso({ tipo: 'progreso', mensaje: 'Verificando el registro…' })
      onCambiado(await confirmarCambioDeRol(cuenta.id, transaccion))
      setPaso({ tipo: 'hecho' })
    } catch (e) {
      fallar(e, { tipo: 'confirmar', administrador })
    }
  }

  const accion = otorgar ? 'Otorgar el rol de firmante' : 'Revocar el rol de firmante'

  return (
    <div className="space-y-4">
      {paso.tipo === 'hecho' ? (
        <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
          ✓ {otorgar ? 'Rol de firmante otorgado' : 'Rol de firmante revocado'}.{' '}
          {otorgar
            ? `${cuenta.nombreCompleto} ya puede firmar documentos con su billetera.`
            : `${cuenta.nombreCompleto} ya no puede firmar documentos nuevos.`}
        </p>
      ) : (
        <>
          <p>
            {accion} a la billetera de <strong>{cuenta.nombreCompleto}</strong>:
          </p>
          <p className="rounded-lg bg-neutral-pale px-3 py-2 font-mono break-all">{billetera}</p>
          {otorgar ? (
            <p className="text-muted">
              Con este rol podrá firmar documentos desde su billetera. Lo confirma la billetera del
              Administrador del contrato.
            </p>
          ) : (
            <p className="rounded-lg bg-orange-pale px-3 py-2">
              La billetera ya no podrá firmar documentos nuevos. Los documentos firmados antes
              siguen siendo válidos.
            </p>
          )}
        </>
      )}

      {paso.tipo === 'confirmar' && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-line p-3">
          <dt className="text-muted">Billetera del Administrador</dt>
          <dd className="font-mono break-all">{paso.administrador}</dd>
          <dt className="text-muted">Red</dt>
          <dd>{red.nombre}</dd>
          <dt className="text-muted">Costo de la operación</dt>
          <dd>Sin costo</dd>
        </dl>
      )}

      {paso.tipo === 'progreso' && (
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-institutional">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-institutional border-t-transparent"
          />
          {paso.mensaje}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {paso.tipo === 'hecho' ? (
          <button type="button" onClick={onCerrar} className={BOTON_PRIMARIO}>
            Listo
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCerrar}
              disabled={paso.tipo === 'progreso'}
              className={BOTON_SECUNDARIO}
            >
              Cancelar
            </button>
            {paso.tipo === 'confirmar' ? (
              <button
                type="button"
                onClick={() => confirmar(paso.administrador)}
                className={otorgar ? BOTON_PRIMARIO : BOTON_ADVERTENCIA}
              >
                Confirmar en la billetera
              </button>
            ) : (
              <button
                type="button"
                onClick={conectarBilletera}
                disabled={paso.tipo !== 'inicio'}
                className={otorgar ? BOTON_PRIMARIO : BOTON_ADVERTENCIA}
              >
                {paso.tipo === 'conectando' ? 'Conectando…' : 'Conectar billetera y continuar'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
