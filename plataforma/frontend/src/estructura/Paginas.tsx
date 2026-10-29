import { useState } from 'react'
import type { Sesion } from '../sesion/api'

const saludo = (hora: number) =>
  hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

export function PaginaInicio({ sesion }: { sesion: Sesion }) {
  const nombre = sesion.nombreCompleto.split(/\s+/).find((p) => !/\.$/.test(p)) ?? ''
  const [hola] = useState(() => saludo(new Date().getHours()))
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <h2 className="text-xl font-semibold">
        {hola}, {nombre}
      </h2>
      <p className="mt-1 text-muted">Ingresó como {sesion.rolNombre}.</p>
    </section>
  )
}

export function PaginaPendiente({ mensaje }: { mensaje: string }) {
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p className="rounded-xl border border-line bg-card p-6 text-muted shadow-sm">
        Esta sección todavía no está disponible. {mensaje}
      </p>
    </section>
  )
}

export function PaginaSinPermiso() {
  return (
    <section className="mx-auto w-full max-w-6xl p-6">
      <p role="alert" className="rounded-xl border border-line bg-card p-6 shadow-sm">
        No tiene permiso para ver esta sección.
      </p>
    </section>
  )
}
