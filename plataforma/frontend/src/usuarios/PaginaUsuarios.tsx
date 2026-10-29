import { useEffect, useState } from 'react'
import { BOTON_PRIMARIO } from '../comun/estilos'
import Modal from '../comun/Modal'
import {
  AREA_ENCARGADA,
  listarAreas,
  listarCuentas,
  listarRoles,
  type Area,
  type Cuenta,
  type Rol,
} from './api'
import ConfirmarEstado from './ConfirmarEstado'
import FormularioCuenta from './FormularioCuenta'
import FormularioEdicion from './FormularioEdicion'
import RestablecerContrasena from './RestablecerContrasena'

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

const formatoHora = new Intl.DateTimeFormat('es-PE', {
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

type Ventana =
  | { tipo: 'nueva' }
  | { tipo: 'editar'; cuenta: Cuenta }
  | { tipo: 'estado'; cuenta: Cuenta }
  | { tipo: 'contrasena'; cuenta: Cuenta }
  | null

/**
 * Pantalla Usuarios del Administrador: crear (HU01), editar, desactivar y reactivar (HU02), y
 * restablecer la contraseña (HU04).
 */
export default function PaginaUsuarios() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ventana, setVentana] = useState<Ventana>(null)

  useEffect(() => {
    Promise.all([listarCuentas(), listarRoles(), listarAreas()])
      .then(([c, r, a]) => {
        setCuentas(c)
        setRoles(r)
        setAreas(a)
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
                <th className="px-3 py-3 font-medium">Usuario</th>
                <th className="px-3 py-3 font-medium">Nombre completo</th>
                <th className="px-3 py-3 font-medium">Rol</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Creada</th>
                <th className="px-3 py-3 font-medium">
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
                  <td className="px-3 py-3 font-medium">{c.nombreUsuario}</td>
                  <td className="px-3 py-3">{c.nombreCompleto}</td>
                  <td className="px-3 py-3">
                    {c.rolNombre}
                    {c.areaNombre && <span className="block text-muted">{c.areaNombre}</span>}
                    {c.rol === AREA_ENCARGADA && !c.area && (
                      <span className="block text-orange">⚠ Sin área asignada</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {c.activo && c.bloqueadaHasta ? (
                      <span className="inline-block rounded-2xl bg-orange-pale px-3 py-1 text-orange">
                        🔒 Bloqueada hasta {formatoHora.format(new Date(c.bloqueadaHasta))}
                      </span>
                    ) : c.activo ? (
                      <span className="inline-block rounded-full bg-green-pale px-3 py-1 whitespace-nowrap text-institutional">
                        ✓ Activa
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-neutral-pale px-3 py-1 whitespace-nowrap text-muted">
                        ⊘ Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{formatoFecha.format(new Date(c.creadoEn))}</td>
                  <td className="px-3 py-2">
                    {/* Acciones apiladas: la tabla cabe sin desplazarse en pantallas de 1280 px. */}
                    <div className="flex flex-col items-end">
                      <button
                        type="button"
                        onClick={() => abrir({ tipo: 'editar', cuenta: c })}
                        aria-label={`Editar ${c.nombreUsuario}`}
                        className="rounded px-2 py-0.5 font-medium whitespace-nowrap text-institutional-soft hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrir({ tipo: 'contrasena', cuenta: c })}
                        aria-label={`Restablecer la contraseña de ${c.nombreUsuario}`}
                        className="rounded px-2 py-0.5 font-medium whitespace-nowrap text-institutional-soft hover:underline"
                      >
                        Restablecer contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => abrir({ tipo: 'estado', cuenta: c })}
                        aria-label={`${c.activo ? 'Desactivar' : 'Reactivar'} ${c.nombreUsuario}`}
                        className={`rounded px-2 py-0.5 font-medium whitespace-nowrap hover:underline ${
                          c.activo ? 'text-red-700' : 'text-institutional-soft'
                        }`}
                      >
                        {c.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ventana?.tipo === 'nueva' && (
        <Modal titulo="Nueva cuenta" onCerrar={cerrar}>
          <FormularioCuenta roles={roles} areas={areas} onCreada={alCrear} onCancelar={cerrar} />
        </Modal>
      )}
      {ventana?.tipo === 'editar' && (
        <Modal titulo="Editar cuenta" onCerrar={cerrar}>
          <FormularioEdicion
            cuenta={ventana.cuenta}
            roles={roles}
            areas={areas}
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
      {ventana?.tipo === 'contrasena' && (
        <Modal titulo="Restablecer contraseña" onCerrar={cerrar}>
          <RestablecerContrasena
            cuenta={ventana.cuenta}
            onRestablecida={(c) => setCuentas((lista) => lista.map((x) => (x.id === c.id ? c : x)))}
            onCerrar={cerrar}
          />
        </Modal>
      )}
    </section>
  )
}
