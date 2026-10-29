import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Sesion } from './sesion/api'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const sesionDe = (rol: string, rolNombre: string, permisos: string[]): Sesion => ({
  nombreUsuario: 'prueba',
  nombreCompleto: 'Rosa Quispe Huamán',
  rol,
  rolNombre,
  permisos: ['CUENTA_PROPIA', ...permisos],
  debeCambiarContrasena: false,
})

const ADMIN = sesionDe('ADMINISTRADOR', 'Administrador', [
  'USUARIOS_GESTIONAR',
  'BILLETERA_GESTIONAR',
])
const AREA = sesionDe('AREA_ENCARGADA', 'Área encargada', [
  'DOCUMENTO_REGISTRAR',
  'DOCUMENTO_VER_AREA',
])
const DIRECTOR = sesionDe('DIRECTOR', 'Director', ['DOCUMENTO_REVISAR', 'DOCUMENTO_VER_FIRMADOS'])
const CONSULTA = sesionDe('CONSULTA_INTERNA', 'Consulta interna', ['DOCUMENTO_BUSCAR'])

/** Simula el backend con la sesión indicada (null: sin sesión). */
function backend(sesion: Sesion | null, extra: Record<string, () => Promise<Response>> = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`
    if (extra[clave]) return extra[clave]()
    if (clave === 'GET /api/sesion')
      return sesion
        ? respuesta(200, sesion)
        : respuesta(401, { mensaje: 'Inicie sesión para continuar.', campos: {} })
    if (clave === 'DELETE /api/sesion') return Promise.resolve(new Response(null, { status: 204 }))
    if (clave === 'GET /api/usuarios' || clave === 'GET /api/roles') return respuesta(200, [])
    return respuesta(500, null)
  })
}

const opcionesDelMenu = async () =>
  within(await screen.findByRole('navigation', { name: 'Menú principal' }))
    .getAllByRole('link')
    .map((a) => a.textContent)

beforeEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})
afterEach(() => vi.restoreAllMocks())

describe('App (HU03)', () => {
  it('sin sesión muestra el inicio de sesión', async () => {
    backend(null)
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Plataforma de Certificados y Constancias' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    ['Administrador', ADMIN, ['Inicio', 'Usuarios', 'Billetera del director']],
    ['Área encargada', AREA, ['Inicio', 'Mis documentos', 'Nuevo documento']],
    ['Director', DIRECTOR, ['Inicio', 'Por revisar', 'Documentos firmados']],
    ['Consulta interna', CONSULTA, ['Inicio', 'Buscar documentos']],
  ])('el menú de %s muestra solo sus vistas', async (_rol, sesion, esperadas) => {
    backend(sesion)
    render(<App />)
    expect(await opcionesDelMenu()).toEqual(esperadas)
  })

  it('el encabezado muestra el nombre, el rol y las iniciales', async () => {
    backend(AREA)
    render(<App />)
    const encabezado = await screen.findByRole('banner')
    expect(within(encabezado).getByText('Rosa Quispe Huamán')).toBeInTheDocument()
    expect(within(encabezado).getByText('Área encargada')).toBeInTheDocument()
    expect(within(encabezado).getByText('RQ')).toBeInTheDocument()
  })

  it('una dirección sin permiso no muestra la pantalla', async () => {
    window.location.hash = '#/usuarios'
    backend(DIRECTOR)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para ver esta sección.',
    )
    expect(screen.queryByText('Nueva cuenta')).not.toBeInTheDocument()
  })

  it('las pantallas aún no construidas avisan en qué sprint se habilitan', async () => {
    backend(DIRECTOR)
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Por revisar' }))
    expect(await screen.findByText(/Se habilita en el Sprint 3 \(HU10\)/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Por revisar' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('el Administrador entra a Usuarios desde el menú', async () => {
    backend(ADMIN)
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Usuarios' }))
    expect(await screen.findByRole('button', { name: 'Nueva cuenta' })).toBeInTheDocument()
  })

  it('cerrar sesión termina la sesión en el servidor y vuelve al login', async () => {
    const fetch = backend(ADMIN)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(fetch.mock.calls.some(([r, o]) => r === '/api/sesion' && o?.method === 'DELETE')).toBe(
      true,
    )
  })

  it('si la sesión expira, la siguiente acción vuelve al login con el aviso', async () => {
    backend(ADMIN, {
      'GET /api/usuarios': () =>
        respuesta(401, {
          mensaje: 'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
          campos: {},
        }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Usuarios' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
    )
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('al abrir con una sesión vencida avisa en el login', async () => {
    backend(null, {
      'GET /api/sesion': () =>
        respuesta(401, {
          mensaje: 'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
          campos: {},
        }),
    })
    render(<App />)
    expect(await screen.findByRole('status')).toHaveTextContent('Su sesión expiró')
  })
  it('al cambiar de pantalla detecta que la cuenta fue desactivada', async () => {
    let activa = true
    backend(null, {
      'GET /api/sesion': () =>
        activa
          ? respuesta(200, CONSULTA)
          : respuesta(401, {
              mensaje: 'Su cuenta fue desactivada. Comuníquese con el Administrador.',
              campos: {},
            }),
    })
    render(<App />)
    const enlace = await screen.findByRole('link', { name: 'Buscar documentos' })
    activa = false
    fireEvent.click(enlace)
    expect(await screen.findByRole('status')).toHaveTextContent('Su cuenta fue desactivada.')
  })

  it('al cambiar de pantalla aplica el rol nuevo en el menú', async () => {
    let actual = DIRECTOR
    backend(null, { 'GET /api/sesion': () => respuesta(200, actual) })
    render(<App />)
    const enlace = await screen.findByRole('link', { name: 'Por revisar' })
    actual = CONSULTA
    fireEvent.click(enlace)
    expect(await screen.findByRole('link', { name: 'Buscar documentos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Por revisar' })).not.toBeInTheDocument()
  })
  it('pulsar la opción en la que ya se está también valida la sesión', async () => {
    let actual = DIRECTOR
    backend(null, { 'GET /api/sesion': () => respuesta(200, actual) })
    render(<App />)
    const inicio = await screen.findByRole('link', { name: 'Inicio' })
    actual = CONSULTA
    fireEvent.click(inicio)
    expect(await screen.findByRole('link', { name: 'Buscar documentos' })).toBeInTheDocument()
  })
})
