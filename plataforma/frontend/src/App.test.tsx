import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('muestra el nombre de la plataforma y la lista de cuentas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) =>
      ruta === '/api/usuarios'
        ? respuesta(200, [
            {
              id: 1,
              nombreUsuario: 'admin',
              nombreCompleto: 'Administrador de la plataforma',
              rol: 'ADMINISTRADOR',
              rolNombre: 'Administrador',
              activo: true,
              debeCambiarContrasena: true,
              creadoEn: '2026-10-29T15:00:00Z',
            },
          ])
        : respuesta(200, []),
    )
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Plataforma de Certificados y Constancias' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Administrador de la plataforma')).toBeInTheDocument()
    expect(screen.getByText('✓ Activa')).toBeInTheDocument()
  })

  it('avisa si no tiene permiso para ver las cuentas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(403, null))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para realizar esta acción.',
    )
  })
})
