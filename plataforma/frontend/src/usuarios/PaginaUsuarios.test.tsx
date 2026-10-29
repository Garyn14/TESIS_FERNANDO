import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cuenta } from './api'
import PaginaUsuarios from './PaginaUsuarios'

const roles = [
  { codigo: 'ADMINISTRADOR', nombre: 'Administrador', descripcion: 'Gestiona cuentas' },
  { codigo: 'DIRECTOR', nombre: 'Director', descripcion: 'Firma documentos' },
  { codigo: 'CONSULTA_INTERNA', nombre: 'Consulta interna', descripcion: 'Mesa de Partes' },
]

const lrojas: Cuenta = {
  id: 7,
  nombreUsuario: 'lrojas',
  nombreCompleto: 'Luis Rojas',
  rol: 'DIRECTOR',
  rolNombre: 'Director',
  activo: true,
  debeCambiarContrasena: false,
  bloqueadaHasta: null,
  creadoEn: '2026-10-29T15:00:00Z',
}

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

/** Simula el backend: GET de cuentas y roles, y la respuesta indicada para cada acción. */
function backend(acciones: Record<string, () => Promise<Response>>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`
    if (clave === 'GET /api/usuarios') return respuesta(200, [lrojas])
    if (clave === 'GET /api/roles') return respuesta(200, roles)
    return acciones[clave]?.() ?? respuesta(500, null)
  })
}

const fila = async (usuario: string) =>
  (await screen.findByText(usuario)).closest('tr') as HTMLElement

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('PaginaUsuarios (HU02)', () => {
  it('edita el nombre y el rol; el nombre de usuario no es editable', async () => {
    const fetch = backend({
      'PUT /api/usuarios/7': () =>
        respuesta(200, {
          ...lrojas,
          nombreCompleto: 'Luis Rojas Paredes',
          rol: 'CONSULTA_INTERNA',
          rolNombre: 'Consulta interna',
        }),
    })
    render(<PaginaUsuarios />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar lrojas' }))

    const ventana = screen.getByRole('dialog', { name: 'Editar cuenta' })
    expect(within(ventana).queryByLabelText('Nombre de usuario')).not.toBeInTheDocument()
    expect(within(ventana).getByText('El nombre de usuario no se puede cambiar.')).toBeVisible()
    fireEvent.change(within(ventana).getByLabelText('Nombre completo'), {
      target: { value: 'Luis Rojas Paredes' },
    })
    fireEvent.change(within(ventana).getByLabelText('Rol'), {
      target: { value: 'CONSULTA_INTERNA' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se guardaron los cambios de "lrojas".',
    )
    expect(within(await fila('lrojas')).getByText('Consulta interna')).toBeInTheDocument()
    const put = fetch.mock.calls.find(([, o]) => o?.method === 'PUT')
    expect(JSON.parse(put?.[1]?.body as string)).toEqual({
      nombreCompleto: 'Luis Rojas Paredes',
      rol: 'CONSULTA_INTERNA',
    })
  })

  it('pide confirmación antes de desactivar y muestra la cuenta como inactiva', async () => {
    const fetch = backend({
      'POST /api/usuarios/7/desactivar': () => respuesta(200, { ...lrojas, activo: false }),
    })
    render(<PaginaUsuarios />)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar lrojas' }))

    const ventana = screen.getByRole('dialog', { name: '¿Desactivar la cuenta?' })
    expect(within(ventana).getByText(/La cuenta no se elimina/)).toBeInTheDocument()
    expect(fetch.mock.calls.some(([r]) => String(r).endsWith('/desactivar'))).toBe(false)

    fireEvent.click(within(ventana).getByRole('button', { name: 'Desactivar cuenta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Se desactivó la cuenta "lrojas"')
    expect(within(await fila('lrojas')).getByText('⊘ Inactiva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivar lrojas' })).toBeInTheDocument()
  })

  it('cancelar la confirmación no cambia nada', async () => {
    const fetch = backend({})
    render(<PaginaUsuarios />)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar lrojas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('muestra el motivo cuando el servidor no permite desactivar', async () => {
    backend({
      'POST /api/usuarios/7/desactivar': () =>
        respuesta(409, {
          mensaje: 'Debe quedar al menos un Administrador activo.',
          campos: {},
        }),
    })
    render(<PaginaUsuarios />)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar lrojas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Debe quedar al menos un Administrador activo.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('no ofrece ninguna opción para eliminar cuentas', async () => {
    backend({})
    render(<PaginaUsuarios />)
    await screen.findByText('lrojas')
    expect(screen.queryByRole('button', { name: /eliminar|borrar/i })).not.toBeInTheDocument()
  })
  it('restablece la contraseña y la muestra una sola vez para entregarla', async () => {
    const fetch = backend({
      'POST /api/usuarios/7/restablecer-contrasena': () =>
        respuesta(200, { ...lrojas, debeCambiarContrasena: true }),
    })
    render(<PaginaUsuarios />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Restablecer la contraseña de lrojas' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Restablecer contraseña' })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Generar' }))
    const temporal = (within(ventana).getByLabelText('Contraseña temporal') as HTMLInputElement)
      .value
    expect(temporal).toHaveLength(12)

    fireEvent.click(within(ventana).getByRole('button', { name: 'Restablecer contraseña' }))

    expect(await within(ventana).findByText(temporal)).toBeInTheDocument()
    expect(within(ventana).getByText(/no se volverá a mostrar/)).toBeInTheDocument()
    const envio = fetch.mock.calls.find(([r]) => String(r).endsWith('/restablecer-contrasena'))
    expect(JSON.parse(envio?.[1]?.body as string)).toEqual({ contrasenaTemporal: temporal })
  })

  it('valida la longitud de la contraseña temporal', async () => {
    const fetch = backend({})
    render(<PaginaUsuarios />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Restablecer la contraseña de lrojas' }),
    )
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: 'corta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La contraseña debe tener de 8 a 20 caracteres.',
    )
    expect(fetch.mock.calls.some(([r]) => String(r).includes('restablecer'))).toBe(false)
  })

  it('muestra hasta qué hora está bloqueada una cuenta', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) =>
      ruta === '/api/usuarios'
        ? respuesta(200, [{ ...lrojas, bloqueadaHasta: '2026-10-29T17:34:00Z' }])
        : respuesta(200, roles),
    )
    render(<PaginaUsuarios />)
    expect(await screen.findByText(/Bloqueada hasta 12:34/)).toBeInTheDocument()
  })
})
