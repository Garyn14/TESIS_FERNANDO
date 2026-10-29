import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PaginaLogin from './PaginaLogin'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

function ingresar(usuario: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: usuario } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: contrasena } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

afterEach(() => vi.restoreAllMocks())

describe('PaginaLogin (HU03)', () => {
  it('inicia sesión con usuario y contraseña', async () => {
    const sesion = { nombreUsuario: 'rquispe', permisos: ['CUENTA_PROPIA'] }
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(200, sesion))
    const onIniciada = vi.fn()
    render(<PaginaLogin onIniciada={onIniciada} />)

    ingresar(' rquispe ', 'Demo2026')

    await waitFor(() => expect(onIniciada).toHaveBeenCalledWith(sesion))
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      nombreUsuario: 'rquispe',
      contrasena: 'Demo2026',
    })
  })

  it('muestra el error, conserva el usuario y borra la contraseña', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuesta(401, { mensaje: 'Usuario o contraseña incorrectos.', campos: {} }),
    )
    render(<PaginaLogin onIniciada={vi.fn()} />)

    ingresar('rquispe', 'Mala')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
    expect(screen.getByLabelText('Usuario')).toHaveValue('rquispe')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  })

  it('muestra el mensaje de cuenta bloqueada', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuesta(423, {
        mensaje:
          'Su cuenta está bloqueada por 3 intentos fallidos. Intente nuevamente a las 11:45 a. m.',
        campos: {},
      }),
    )
    render(<PaginaLogin onIniciada={vi.fn()} />)
    ingresar('rquispe', 'Mala')
    expect(await screen.findByRole('alert')).toHaveTextContent('bloqueada por 3 intentos')
  })

  it('pide los dos datos antes de enviar', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<PaginaLogin onIniciada={vi.fn()} />)
    ingresar('', '')
    expect(screen.getByRole('alert')).toHaveTextContent('Ingrese su usuario y su contraseña.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('la contraseña inicia oculta y se puede mostrar', () => {
    render(<PaginaLogin onIniciada={vi.fn()} />)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')
  })

  it('muestra el aviso recibido, por ejemplo de sesión expirada', () => {
    render(<PaginaLogin aviso="Su sesión expiró por inactividad." onIniciada={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Su sesión expiró por inactividad.')
  })
})
