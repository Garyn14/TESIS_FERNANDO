import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormularioCuenta from './FormularioCuenta'

const areas = [
  {
    codigo: 'CAPACITACION',
    nombre: 'Área de Capacitación',
    tipos: [{ codigo: 'CERTIFICADO_CAPACITACION', nombre: 'Certificado de Capacitación' }],
  },
]

const roles = [
  {
    codigo: 'DIRECTOR',
    nombre: 'Director',
    descripcion: 'Revisa y firma documentos',
    limitadoAlArea: false,
  },
  {
    codigo: 'AREA_ENCARGADA',
    nombre: 'Emisor de área',
    descripcion: 'Registra documentos',
    limitadoAlArea: true,
  },
  {
    codigo: 'MESA_PARTES_AREA',
    nombre: 'Mesa de Partes de área',
    descripcion: 'Busca, consulta el historial, imprime y entrega los documentos de su área',
    limitadoAlArea: true,
  },
]

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

function llenar(usuario: string, nombre: string, rol: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: usuario } })
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: nombre } })
  fireEvent.change(screen.getByLabelText('Rol'), { target: { value: rol } })
  fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: contrasena } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

afterEach(() => vi.restoreAllMocks())

describe('FormularioCuenta (HU01)', () => {
  it('indica cada campo que hay que corregir sin llamar al servidor', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<FormularioCuenta roles={roles} areas={areas} onCreada={vi.fn()} onCancelar={vi.fn()} />)

    llenar('1ab', '', '', 'corta')

    expect(screen.getByText(/Use de 4 a 30 caracteres/)).toBeInTheDocument()
    expect(screen.getByText('Ingrese el nombre completo.')).toBeInTheDocument()
    expect(screen.getByText('Seleccione un rol.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener de 8 a 20 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de usuario')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('envía el nombre de usuario en minúsculas y avisa al crear la cuenta', async () => {
    const cuenta = { id: 5, nombreUsuario: 'jperez', rolNombre: 'Director' }
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(201, cuenta))
    const onCreada = vi.fn()
    render(
      <FormularioCuenta roles={roles} areas={areas} onCreada={onCreada} onCancelar={vi.fn()} />,
    )

    llenar(' JPerez ', 'Juan Pérez', 'DIRECTOR', 'Clave2026!')

    await waitFor(() => expect(onCreada).toHaveBeenCalledWith(cuenta))
    const [ruta, opciones] = fetch.mock.calls[0]
    expect(ruta).toBe('/api/usuarios')
    expect(opciones?.method).toBe('POST')
    expect(JSON.parse(opciones?.body as string)).toEqual({
      nombreUsuario: 'jperez',
      nombreCompleto: 'Juan Pérez',
      rol: 'DIRECTOR',
      area: null,
      contrasenaTemporal: 'Clave2026!',
    })
  })

  it('muestra el error del servidor cuando el usuario ya existe', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      respuesta(409, {
        mensaje: 'El nombre de usuario ya está registrado.',
        campos: { nombreUsuario: 'El nombre de usuario ya está registrado.' },
      }),
    )
    const onCreada = vi.fn()
    render(
      <FormularioCuenta roles={roles} areas={areas} onCreada={onCreada} onCancelar={vi.fn()} />,
    )

    llenar('jperez', 'Juan Pérez', 'DIRECTOR', 'Clave2026!')

    expect(await screen.findByText('El nombre de usuario ya está registrado.')).toBeInTheDocument()
    expect(onCreada).not.toHaveBeenCalled()
  })

  it('muestra la descripción del rol elegido', () => {
    render(<FormularioCuenta roles={roles} areas={areas} onCreada={vi.fn()} onCancelar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'DIRECTOR' } })
    expect(screen.getByText('Revisa y firma documentos')).toBeInTheDocument()
  })

  it('oculta la contraseña hasta que se pide mostrarla', () => {
    render(<FormularioCuenta roles={roles} areas={areas} onCreada={vi.fn()} onCancelar={vi.fn()} />)
    const contrasena = screen.getByLabelText('Contraseña temporal')
    expect(contrasena).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(contrasena).toHaveAttribute('type', 'text')
  })

  it('pide el área para Mesa de Partes de área y la envía (DRA-58)', async () => {
    const cuenta = { id: 6, nombreUsuario: 'atorres', rolNombre: 'Mesa de Partes de área' }
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(respuesta(201, cuenta))
    const onCreada = vi.fn()
    render(
      <FormularioCuenta roles={roles} areas={areas} onCreada={onCreada} onCancelar={vi.fn()} />,
    )
    expect(screen.queryByLabelText('Área')).not.toBeInTheDocument()

    llenar('atorres', 'Ana Torres Rojas', 'MESA_PARTES_AREA', 'Clave2026!')
    expect(screen.getByText('Seleccione el área de la persona.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'CAPACITACION' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(onCreada).toHaveBeenCalledWith(cuenta))
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toMatchObject({
      rol: 'MESA_PARTES_AREA',
      area: 'CAPACITACION',
    })
  })
})
