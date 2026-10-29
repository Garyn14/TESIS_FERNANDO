import { useEffect, useState } from 'react'
import { BOTON_PRIMARIO } from '../comun/estilos'
import Modal from '../comun/Modal'
import { listarCuentas, listarRoles, type Cuenta, type Rol } from './api'
import ConfirmarEstado from './ConfirmarEstado'
import FormularioCuenta from './FormularioCuenta'
import FormularioEdicion from './FormularioEdicion'

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

type Ventana =
  { tipo: 'nueva' } | { tipo: 'editar'; cuenta: Cuenta } | { tipo: 'estado'; cuenta: Cuenta } | null

/** Pantalla Usuarios del Administrador: crear (HU01), editar, desactivar y reactivar (HU02). */
export default function PaginaUsuarios() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ventana, setVentana] = useState<Ventana>(null)

  useEffect(() => {
    Promise.all([listarCuentas(), listarRoles()])
      .then(([c, r]) => {
        setCuentas(c)
        setRoles(r)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  const abrir = (v: Ventana) => {
    setAviso('')
    setVentana(v)
  }

  const cerrar = () => setVentana(null)

  const reemplazar = (cuenta: Cuenta, mensaje: string) => {
    setCuentas((lista) => lista.map((c) => (c.id === cuenta.id ? cuenta : c)))
    setAviso(mensaje)
    cerrar()
  }

  const alCrear = (cuenta: Cuenta) => {
    setCuentas((c) => [cuenta, ...c])
    setAviso(`Se creó la cuenta "${cuenta.nombreUsuario}" con el rol ${cuenta.rolNombre}.`)
    cerrar()
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">Cuentas del personal autorizado a usar la plataforma.</p>
        <button
          type="button"
          onClick={() => abrir({ tipo: 'nueva' })}
          disabled={cargando || !!error}
          className={BOTON_PRIMARIO}
        >
          Nueva cuenta
        </button>
      </div>

      {aviso && (
        <p role="status" className="mt-4 rounded-lg bg-green-pale px-4 py-3 text-institutional">
          ✓ {aviso}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card shadow-sm">
        {cargando ? (
          <p className="p-6 text-muted">Cargando cuentas…</p>
        ) : error ? (
          <p role="alert" className="p-6 text-red-800">
            {error}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-line bg-cream text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Nombre completo</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Creada</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-line last:border-0 ${c.activo ? '' : 'text-muted'}`}
                >
                  <td className="px-4 py-3 font-medium">{c.nombreUsuario}</td>
                  <td className="px-4 py-3">{c.nombreCompleto}</td>
                  <td className="px-4 py-3">{c.rolNombre}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.activo ? (
                      <span className="rounded-full bg-green-pale px-3 py-1 text-institutional">
                        ✓ Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-pale px-3 py-1 text-muted">
                        ⊘ Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatoFecha.format(new Date(c.creadoEn))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => abrir({ tipo: 'editar', cuenta: c })}
                      aria-label={`Editar ${c.nombreUsuario}`}
                      className="rounded px-2 py-1 font-medium text-institutional-soft hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => abrir({ tipo: 'estado', cuenta: c })}
                      aria-label={`${c.activo ? 'Desactivar' : 'Reactivar'} ${c.nombreUsuario}`}
                      className={`ml-2 rounded px-2 py-1 font-medium hover:underline ${
                        c.activo ? 'text-red-700' : 'text-institutional-soft'
                      }`}
                    >
                      {c.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ventana?.tipo === 'nueva' && (
        <Modal titulo="Nueva cuenta" onCerrar={cerrar}>
          <FormularioCuenta roles={roles} onCreada={alCrear} onCancelar={cerrar} />
        </Modal>
      )}
      {ventana?.tipo === 'editar' && (
        <Modal titulo="Editar cuenta" onCerrar={cerrar}>
          <FormularioEdicion
            cuenta={ventana.cuenta}
            roles={roles}
            onGuardada={(c) => reemplazar(c, `Se guardaron los cambios de "${c.nombreUsuario}".`)}
            onCancelar={cerrar}
          />
        </Modal>
      )}
      {ventana?.tipo === 'estado' && (
        <Modal
          titulo={ventana.cuenta.activo ? '¿Desactivar la cuenta?' : '¿Reactivar la cuenta?'}
          onCerrar={cerrar}
        >
          <ConfirmarEstado
            cuenta={ventana.cuenta}
            onConfirmada={(c) =>
              reemplazar(
                c,
                c.activo
                  ? `Se reactivó la cuenta "${c.nombreUsuario}".`
                  : `Se desactivó la cuenta "${c.nombreUsuario}". Sus datos e historial se conservan.`,
              )
            }
            onCancelar={cerrar}
          />
        </Modal>
      )}
    </section>
  )
}
