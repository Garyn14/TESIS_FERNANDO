import { useEffect, useRef, useState } from 'react'
import { listarCuentas, listarRoles, type Cuenta, type Rol } from './api'
import FormularioCuenta from './FormularioCuenta'

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

/** Pantalla Usuarios del Administrador (HU01). Editar y desactivar se agregan en HU02. */
export default function PaginaUsuarios() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const dialogo = useRef<HTMLDialogElement>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  useEffect(() => {
    Promise.all([listarCuentas(), listarRoles()])
      .then(([c, r]) => {
        setCuentas(c)
        setRoles(r)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  const abrir = () => {
    setAviso('')
    setFormularioAbierto(true)
    dialogo.current?.showModal?.()
  }

  const cerrar = () => {
    dialogo.current?.close?.()
    setFormularioAbierto(false)
  }

  const alCrear = (cuenta: Cuenta) => {
    setCuentas((c) => [cuenta, ...c])
    setAviso(`Se creó la cuenta "${cuenta.nombreUsuario}" con el rol ${cuenta.rolNombre}.`)
    cerrar()
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-institutional">Usuarios</h2>
          <p className="text-muted">Cuentas del personal autorizado a usar la plataforma.</p>
        </div>
        <button
          type="button"
          onClick={abrir}
          disabled={cargando || !!error}
          className="rounded-lg bg-institutional px-4 py-2 font-medium text-white hover:bg-institutional-soft disabled:opacity-60"
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
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{c.nombreUsuario}</td>
                  <td className="px-4 py-3">{c.nombreCompleto}</td>
                  <td className="px-4 py-3">{c.rolNombre}</td>
                  <td className="px-4 py-3">
                    {c.activo ? (
                      <span className="rounded-full bg-green-pale px-3 py-1 text-institutional">
                        ✓ Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-pale px-3 py-1 text-muted">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatoFecha.format(new Date(c.creadoEn))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-nueva-cuenta"
        onClose={() => setFormularioAbierto(false)}
        className="m-auto w-full max-w-lg rounded-xl border border-line bg-card p-6 text-ink shadow-lg backdrop:bg-black/40"
      >
        <h3 id="titulo-nueva-cuenta" className="mb-4 text-xl font-semibold text-institutional">
          Nueva cuenta
        </h3>
        {formularioAbierto && (
          <FormularioCuenta roles={roles} onCreada={alCrear} onCancelar={cerrar} />
        )}
      </dialog>
    </section>
  )
}
