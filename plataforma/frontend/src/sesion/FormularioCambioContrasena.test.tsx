import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormularioCambioContrasena from './FormularioCambioContrasena'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

function llenar(actual: string, nueva: string, confirmacion: string) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: actual } })
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: nueva } })
  fireEvent.change(screen.getByLabelText('Repita la contraseña nueva'), {
    target: { value: confirmacion },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

afterEach(() => vi.restoreAllMocks())

describe('FormularioCambioContrasena (HU04)', () => {
  it.each([
    ['', '', '', 'Ingrese su contraseña actual.'],
    ['Actual2026', 'corta', 'corta', 'La contraseña debe tener de 8 a 20 caracteres.'],
    [
      'Actual2026',
      'Actual2026',
      'Actual2026',
      'La contraseña nueva debe ser distinta de la actual.',
    ],
    ['Actual2026', 'Nueva20266', 'Otra202666', 'Las contraseñas no coinciden.'],
  ])('valida antes de enviar: %s / %s / %s', (actual, nueva, confirmacion, mensaje) => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<FormularioCambioContrasena onCambiada={vi.fn()} />)
    llenar(actual, nueva, confirmacion)
    expect(screen.getByText(mensaje)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('muestra en su campo que la contraseña actual es incorrecta', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuesta(400, {
        mensaje: 'La contraseña actual no es correcta.',
        campos: { contrasenaActual: 'La contraseña actual no es correcta.' },
      }),
    )
    render(<FormularioCambioContrasena onCambiada={vi.fn()} />)
    llenar('Mala20266', 'Nueva20266', 'Nueva20266')
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true')
  })

  it('envía la actual y la nueva, sin la confirmación', async () => {
    const sesion = { nombreUsuario: 'x', debeCambiarContrasena: false, permisos: [] }
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(200, sesion))
    const onCambiada = vi.fn()
    render(<FormularioCambioContrasena onCambiada={onCambiada} />)
    llenar('Actual2026', 'Nueva20266', 'Nueva20266')
    await waitFor(() => expect(onCambiada).toHaveBeenCalledWith(sesion))
    const [ruta, opciones] = fetch.mock.calls[0]
    expect(ruta).toBe('/api/sesion/contrasena')
    expect(opciones?.method).toBe('PUT')
    expect(JSON.parse(opciones?.body as string)).toEqual({
      contrasenaActual: 'Actual2026',
      contrasenaNueva: 'Nueva20266',
    })
  })
})
