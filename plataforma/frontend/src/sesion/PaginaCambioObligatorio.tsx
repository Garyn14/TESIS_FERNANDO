import logo from '../assets/logo-dra.png'
import type { Sesion } from './api'
import FormularioCambioContrasena from './FormularioCambioContrasena'

interface Props {
  sesion: Sesion
  onCambiada: (sesion: Sesion) => void
  onCerrarSesion: () => void
}

/**
 * HU04 (RF03): con contraseña temporal, es lo único que se muestra después de iniciar sesión. El
 * servidor también rechaza cualquier otra solicitud hasta que se cambie.
 */
export default function PaginaCambioObligatorio({ sesion, onCambiada, onCerrarSesion }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-line bg-card p-8 shadow-sm">
        <div className="text-center">
          <img src={logo} alt="Logo de la DRA Junín" className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-2xl font-semibold text-institutional">Cambie su contraseña</h1>
        </div>
        <p className="mt-4 rounded-lg bg-amber-pale px-4 py-3">
          Hola, {sesion.nombreCompleto}. Su contraseña es temporal: para continuar, elija una
          contraseña que solo usted conozca.
        </p>
        <div className="mt-6">
          <FormularioCambioContrasena
            etiquetaActual="Contraseña temporal"
            onCambiada={onCambiada}
          />
        </div>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="mt-4 w-full rounded-lg px-4 py-2 text-muted hover:underline"
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}
