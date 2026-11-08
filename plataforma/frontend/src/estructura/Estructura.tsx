import { useState, type ReactNode } from 'react'
import Campana from '../avisos/Campana'
import logo from '../assets/logo-dra.png'
import Modal from '../comun/Modal'
import type { Sesion } from '../sesion/api'
import FormularioCambioContrasena from '../sesion/FormularioCambioContrasena'
import { opcionesPermitidas } from './menu'

interface Props {
  sesion: Sesion
  titulo: string
  ruta: string
  onNavegar: (ruta: string) => void
  onCerrarSesion: () => void
  onSesionActualizada: (sesion: Sesion) => void
  children: ReactNode
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter((p) => !/^(ing|dr|lic)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** Estructura de las pantallas internas (prototipo §6.1): menú lateral, encabezado y contenido. */
export default function Estructura({
  sesion,
  titulo,
  ruta,
  onNavegar,
  onCerrarSesion,
  onSesionActualizada,
  children,
}: Props) {
  // HU04: cambio voluntario de la contraseña (null: ventana cerrada).
  const [cambio, setCambio] = useState<null | 'formulario' | 'hecho'>(null)
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-institutional text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="flex items-center gap-3 px-5 py-4">
          <img src={logo} alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />
          <span className="font-semibold">Agencia Agraria Satipo</span>
        </div>
        <nav aria-label="Menú principal">
          <ul className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-0">
            {opcionesPermitidas(sesion.permisos).map((o) => {
              const activa = o.ruta === ruta
              return (
                <li key={o.ruta}>
                  <a
                    href={`#/${o.ruta}`}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavegar(o.ruta)
                    }}
                    aria-current={activa ? 'page' : undefined}
                    className={`block border-l-4 px-4 py-3 whitespace-nowrap md:px-5 ${
                      activa
                        ? 'border-gold bg-institutional-soft font-semibold'
                        : 'border-transparent hover:bg-institutional-soft/60'
                    }`}
                  >
                    {o.titulo}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-6 py-3">
          <h1 className="text-2xl font-semibold text-institutional">{titulo}</h1>
          <div className="flex items-center gap-3">
            {/* HU26–HU28: avisos dentro de la plataforma. */}
            {sesion.permisos.includes('NOTIFICACIONES_VER') && <Campana />}
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-green-pale font-semibold text-institutional"
            >
              {iniciales(sesion.nombreCompleto)}
            </span>
            <div className="leading-tight">
              <p className="font-medium">{sesion.nombreCompleto}</p>
              <p className="text-muted">
                {sesion.rolNombre}
                {sesion.areaNombre && ` – ${sesion.areaNombre}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCambio('formulario')}
              className="ml-2 rounded-lg px-3 py-2 font-medium text-institutional-soft hover:underline"
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={onCerrarSesion}
              className="ml-2 rounded-lg border border-line px-3 py-2 font-medium text-ink hover:bg-neutral-pale"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>

      {cambio && (
        <Modal titulo="Cambiar contraseña" onCerrar={() => setCambio(null)}>
          {cambio === 'formulario' ? (
            <FormularioCambioContrasena
              onCambiada={(s) => {
                onSesionActualizada(s)
                setCambio('hecho')
              }}
              onCancelar={() => setCambio(null)}
            />
          ) : (
            <div className="space-y-4">
              <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
                ✓ Su contraseña se cambió. Si tenía la sesión abierta en otro equipo, allí se cerró.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCambio(null)}
                  className="rounded-lg bg-institutional px-4 py-2 font-medium text-white"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
