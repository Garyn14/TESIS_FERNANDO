import { useCallback, useEffect, useState } from 'react'
import Modal from '../comun/Modal'
import {
  listarBilleteras,
  obtenerRed,
  type Billeteras,
  type CuentaConBilletera,
  type Red,
} from './api'
import CambiarRolFirmante from './CambiarRolFirmante'
import RegistrarBilletera from './RegistrarBilletera'

type Ventana =
  | { tipo: 'registrar'; cuenta: CuentaConBilletera }
  | { tipo: 'rol'; cuenta: CuentaConBilletera; otorgar: boolean }
  | null

const ACCION = 'rounded px-2 py-0.5 font-medium whitespace-nowrap hover:underline'

function EstadoFirmante({
  cuenta,
  disponible,
}: {
  cuenta: CuentaConBilletera
  disponible: boolean
}) {
  if (!cuenta.billetera) return <span className="text-muted">Sin billetera</span>
  if (!disponible || cuenta.firmante === null)
    return <span className="text-orange">⚠ No se pudo consultar</span>
  return cuenta.firmante ? (
    <span className="inline-block rounded-full bg-green-pale px-3 py-1 whitespace-nowrap text-institutional">
      ✓ Firmante activo
    </span>
  ) : (
    <span className="inline-block rounded-full bg-neutral-pale px-3 py-1 whitespace-nowrap text-muted">
      Sin rol de firmante
    </span>
  )
}

/**
 * Pantalla "Billetera del director" (HU06): billetera de cada Director (RF07) y su rol de firmante
 * en el contrato (RF08). El estado del rol se lee siempre de la blockchain (RNF10).
 */
export default function PaginaBilletera() {
  const [datos, setDatos] = useState<Billeteras | null>(null)
  const [red, setRed] = useState<Red | null>(null)
  const [error, setError] = useState('')
  const [ventana, setVentana] = useState<Ventana>(null)

  const cargar = useCallback(
    () =>
      Promise.all([listarBilleteras(), obtenerRed()])
        .then(([b, r]) => {
          setDatos(b)
          setRed(r)
        })
        .catch((e: Error) => setError(e.message)),
    [],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizar = (cuenta: CuentaConBilletera) =>
    setDatos((d) =>
      d ? { ...d, cuentas: d.cuentas.map((c) => (c.id === cuenta.id ? cuenta : c)) } : d,
    )

  const disponible = !!datos?.blockchainDisponible && !!red?.contrato

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p className="text-muted">
        Billetera de cada director y su permiso para firmar documentos en la blockchain.
      </p>

      {datos && !datos.blockchainDisponible && (
        <p role="alert" className="mt-4 rounded-lg bg-orange-pale px-4 py-3">
          ⚠ {datos.aviso} Mientras tanto no se muestra si cada billetera puede firmar.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
        {error ? (
          <p role="alert" className="p-6 text-red-800">
            {error}
          </p>
        ) : !datos ? (
          <p className="p-6 text-muted">Cargando…</p>
        ) : datos.cuentas.length === 0 ? (
          <p className="p-6 text-muted">
            No hay cuentas con rol Director. Créela primero en Usuarios.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-line bg-cream text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Director</th>
                <th className="px-3 py-3 font-medium">Billetera</th>
                <th className="px-3 py-3 font-medium">Firma</th>
                <th className="px-3 py-3 font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.cuentas.map((c) => {
                const yaNoDebe = c.firmante === true && (c.rol !== 'DIRECTOR' || !c.activo)
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3">
                      <span className="font-medium">{c.nombreCompleto}</span>
                      <span className="block text-muted">{c.nombreUsuario}</span>
                      {yaNoDebe && (
                        <span className="block text-orange">
                          ⚠ {c.activo ? 'Ya no es Director' : 'Cuenta desactivada'}: revoque el rol
                          de firmante.
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono break-all">{c.billetera ?? '—'}</td>
                    <td className="px-3 py-3">
                      <EstadoFirmante cuenta={c} disponible={disponible} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-end">
                        {c.rol === 'DIRECTOR' && (
                          <button
                            type="button"
                            onClick={() => setVentana({ tipo: 'registrar', cuenta: c })}
                            aria-label={`${c.billetera ? 'Cambiar' : 'Registrar'} la billetera de ${c.nombreUsuario}`}
                            className={`${ACCION} text-institutional-soft`}
                          >
                            {c.billetera ? 'Cambiar billetera' : 'Registrar billetera'}
                          </button>
                        )}
                        {disponible &&
                          c.billetera &&
                          c.firmante === false &&
                          c.rol === 'DIRECTOR' &&
                          c.activo && (
                            <button
                              type="button"
                              onClick={() => setVentana({ tipo: 'rol', cuenta: c, otorgar: true })}
                              aria-label={`Otorgar el rol de firmante a ${c.nombreUsuario}`}
                              className={`${ACCION} text-institutional-soft`}
                            >
                              Otorgar rol de firmante
                            </button>
                          )}
                        {disponible && c.firmante === true && (
                          <button
                            type="button"
                            onClick={() => setVentana({ tipo: 'rol', cuenta: c, otorgar: false })}
                            aria-label={`Revocar el rol de firmante de ${c.nombreUsuario}`}
                            className={`${ACCION} text-red-700`}
                          >
                            Revocar rol de firmante
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {red?.contrato && (
        <p className="mt-4 text-muted">
          Red: {red.nombre} · Contrato <span className="font-mono break-all">{red.contrato}</span>
        </p>
      )}

      {ventana?.tipo === 'registrar' && (
        <Modal titulo="Billetera del director" onCerrar={() => setVentana(null)}>
          <RegistrarBilletera
            cuenta={ventana.cuenta}
            onRegistrada={(c) => {
              actualizar(c)
              setVentana(null)
            }}
            onCancelar={() => setVentana(null)}
          />
        </Modal>
      )}
      {ventana?.tipo === 'rol' && red && (
        <Modal
          titulo={ventana.otorgar ? 'Otorgar rol de firmante' : '¿Revocar el rol de firmante?'}
          onCerrar={() => setVentana(null)}
        >
          <CambiarRolFirmante
            cuenta={ventana.cuenta}
            red={red}
            otorgar={ventana.otorgar}
            onCambiado={actualizar}
            onCerrar={() => setVentana(null)}
          />
        </Modal>
      )}
    </section>
  )
}
