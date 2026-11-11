import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Catalogo } from './api'
import PaginaAreas from './PaginaAreas'

const TRABAJO = {
  codigo: 'CERTIFICADO_TRABAJO',
  nombre: 'Certificado de Trabajo',
  origen: 'SOLICITUD_PARTE',
} as const
const PRACTICAS = {
  codigo: 'CERTIFICADO_PRACTICAS',
  nombre: 'Certificado de Prácticas',
  origen: 'SOLICITUD_PARTE',
} as const
const CONSTANCIA = {
  codigo: 'CONSTANCIA_PRODUCTOR_ACTIVO',
  nombre: 'Constancia de Productor Activo',
  origen: 'SOLICITUD_PARTE',
} as const
const CAPACITACION = {
  codigo: 'CERTIFICADO_CAPACITACION',
  nombre: 'Certificado de Capacitación',
  origen: 'OFICIO',
} as const

const inicial: Catalogo = {
  areas: [
    {
      codigo: 'ADMINISTRACION',
      nombre: 'Área de Administración',
      activa: true,
      personasActivas: 2,
      tipos: [PRACTICAS, TRABAJO],
    },
    {
      codigo: 'DESARROLLO_AGRARIO',
      nombre: 'Área de Desarrollo Agrario',
      activa: true,
      personasActivas: 1,
      tipos: [],
    },
  ],
  tipos: [CAPACITACION, PRACTICAS, TRABAJO, CONSTANCIA],
  historial: [],
}

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

function backend(extra: Record<string, () => Promise<Response>> = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`
    if (extra[clave]) return extra[clave]()
    if (clave === 'GET /api/catalogo') return respuesta(200, inicial)
    return respuesta(500, null)
  })
}

const tarjeta = async (nombre: string) => screen.findByRole('article', { name: nombre })

beforeEach(() => vi.restoreAllMocks())

describe('Áreas y documentos (DRA-60)', () => {
  it('muestra cada área con sus tipos, sus personas y el origen de cada tipo', async () => {
    backend()
    render(<PaginaAreas />)
    const admin = await tarjeta('Área de Administración')
    expect(within(admin).getByText('2 personas del área')).toBeInTheDocument()
    expect(within(admin).getByText('Certificado de Trabajo')).toBeInTheDocument()
    expect(within(admin).getAllByText('A solicitud de parte')).toHaveLength(2)
    expect(screen.getByText('Todavía no hay cambios.')).toBeInTheDocument()
  })

  it('advierte cuando un área no puede emitir documentos', async () => {
    backend()
    render(<PaginaAreas />)
    const agrario = await tarjeta('Área de Desarrollo Agrario')
    expect(within(agrario).getByRole('note')).toHaveTextContent(
      'Esta área no puede emitir documentos.',
    )
  })

  it('solo ofrece asignar los tipos que el área todavía no tiene', async () => {
    backend()
    render(<PaginaAreas />)
    const admin = await tarjeta('Área de Administración')
    const opciones = within(
      within(admin).getByLabelText('Asignar otro tipo de documento'),
    ).getAllByRole('option')
    expect(opciones.map((o) => o.textContent)).toEqual([
      'Elija un tipo de documento',
      'Certificado de Capacitación',
      'Constancia de Productor Activo',
    ])
    expect(within(admin).getByRole('button', { name: 'Asignar' })).toBeDisabled()
  })

  it('asigna un tipo y muestra el cambio en el historial', async () => {
    const fetch = backend({
      'PUT /api/catalogo/areas/ADMINISTRACION/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO': () =>
        respuesta(200, {
          ...inicial,
          areas: [
            { ...inicial.areas[0], tipos: [CONSTANCIA, PRACTICAS, TRABAJO] },
            inicial.areas[1],
          ],
          historial: [
            {
              area: 'Área de Administración',
              evento: 'TIPO_ASIGNADO',
              detalle: 'Área de Administración: se asignó Constancia de Productor Activo',
              realizadoPor: 'Garyn Huarhuachi Ramos',
              realizadoEn: '2026-11-11T15:30:00Z',
            },
          ],
        }),
    })
    render(<PaginaAreas />)
    const admin = await tarjeta('Área de Administración')
    fireEvent.change(within(admin).getByLabelText('Asignar otro tipo de documento'), {
      target: { value: 'CONSTANCIA_PRODUCTOR_ACTIVO' },
    })
    fireEvent.click(within(admin).getByRole('button', { name: 'Asignar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Área de Administración ya puede emitir Constancia de Productor Activo.',
    )
    expect(
      screen.getByText('Área de Administración: se asignó Constancia de Productor Activo'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Garyn Huarhuachi Ramos/)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/catalogo/areas/ADMINISTRACION/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('pide confirmación antes de quitar, con las personas afectadas', async () => {
    const fetch = backend({
      'DELETE /api/catalogo/areas/ADMINISTRACION/tipos-documento/CERTIFICADO_TRABAJO': () =>
        respuesta(200, {
          ...inicial,
          areas: [{ ...inicial.areas[0], tipos: [PRACTICAS] }, inicial.areas[1]],
        }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Quitar Certificado de Trabajo de Área de Administración',
      }),
    )

    const ventana = screen.getByRole('dialog', { name: 'Quitar tipo de documento' })
    expect(ventana).toHaveTextContent(
      '¿Quitar «Certificado de Trabajo» del Área de Administración?',
    )
    expect(ventana).toHaveTextContent(
      '2 personas del área dejarán de poder registrar documentos de este tipo. Los documentos ya registrados siguen su trámite.',
    )
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/tipos-documento/'),
      expect.anything(),
    )

    fireEvent.click(within(ventana).getByRole('button', { name: 'Quitar' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Área de Administración ya no emite Certificado de Trabajo.',
    )
    const admin = await tarjeta('Área de Administración')
    const emite = within(admin).getByRole('list', {
      name: 'Documentos que emite Área de Administración',
    })
    expect(within(emite).queryByText('Certificado de Trabajo')).not.toBeInTheDocument()
    // Vuelve a estar disponible para asignarlo.
    expect(
      within(within(admin).getByLabelText('Asignar otro tipo de documento')).getByRole('option', {
        name: 'Certificado de Trabajo',
      }),
    ).toBeInTheDocument()
  })

  it('muestra el error del servidor si el cambio ya no corresponde', async () => {
    backend({
      'DELETE /api/catalogo/areas/ADMINISTRACION/tipos-documento/CERTIFICADO_TRABAJO': () =>
        respuesta(409, {
          mensaje: '«Área de Administración» no tiene asignado «Certificado de Trabajo».',
          campos: {},
        }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Quitar Certificado de Trabajo de Área de Administración',
      }),
    )
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«Área de Administración» no tiene asignado «Certificado de Trabajo».',
    )
  })
})

const DESHABILITADA = {
  codigo: 'COMERCIALIZACION',
  nombre: 'Área de Comercialización',
  activa: false,
  personasActivas: 0,
  tipos: [CONSTANCIA],
}

describe('Gestionar áreas (DRA-61)', () => {
  it('crea un área y muestra el aviso; no ofrece eliminar áreas', async () => {
    const nueva = {
      codigo: 'EXTENSION_RURAL',
      nombre: 'Área de Extensión Rural',
      activa: true,
      personasActivas: 0,
      tipos: [],
    }
    const fetch = backend({
      'POST /api/catalogo/areas': () =>
        respuesta(200, { ...inicial, areas: [...inicial.areas, nueva] }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nueva área' }))
    const ventana = screen.getByRole('dialog', { name: 'Nueva área' })
    fireEvent.change(within(ventana).getByLabelText(/Nombre del área/), {
      target: { value: '  Área de   Extensión Rural ' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Crear área' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se creó el área «Área de Extensión Rural». Asígnele sus tipos de documento.',
    )
    expect(within(await tarjeta('Área de Extensión Rural')).getByRole('note')).toHaveTextContent(
      'Esta área no puede emitir documentos.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/catalogo/areas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ nombre: '  Área de   Extensión Rural ' }),
      }),
    )
  })

  it('muestra el error dentro de la ventana y la deja abierta', async () => {
    backend({
      'POST /api/catalogo/areas': () =>
        respuesta(409, { mensaje: 'Ya existe un área con ese nombre.', campos: {} }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    fireEvent.click(screen.getByRole('button', { name: 'Nueva área' }))
    const ventana = screen.getByRole('dialog', { name: 'Nueva área' })
    fireEvent.change(within(ventana).getByLabelText(/Nombre del área/), {
      target: { value: 'area de administracion' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Crear área' }))
    expect(await within(ventana).findByRole('alert')).toHaveTextContent(
      'Ya existe un área con ese nombre.',
    )
    expect(screen.getByRole('dialog', { name: 'Nueva área' })).toBeInTheDocument()
  })

  it('cambia el nombre de un área desde su tarjeta', async () => {
    const fetch = backend({
      'PUT /api/catalogo/areas/ADMINISTRACION': () =>
        respuesta(200, {
          ...inicial,
          areas: [
            { ...inicial.areas[0], nombre: 'Área de Administración y Finanzas' },
            inicial.areas[1],
          ],
        }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    fireEvent.click(
      screen.getByRole('button', { name: 'Cambiar el nombre de Área de Administración' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Cambiar el nombre del área' })
    const campo = within(ventana).getByLabelText(/Nombre del área/)
    expect(campo).toHaveValue('Área de Administración')
    fireEvent.change(campo, { target: { value: 'Área de Administración y Finanzas' } })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Guardar nombre' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      '«Área de Administración» ahora se llama «Área de Administración y Finanzas».',
    )
    expect(await tarjeta('Área de Administración y Finanzas')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/catalogo/areas/ADMINISTRACION',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('deshabilita con confirmación e informa si el área tiene personas activas', async () => {
    backend({
      'POST /api/catalogo/areas/ADMINISTRACION/deshabilitar': () =>
        respuesta(409, {
          mensaje:
            'No se puede deshabilitar: el área tiene 2 personas activas. Muévalas a otra área desde Usuarios.',
          campos: {},
        }),
    })
    render(<PaginaAreas />)
    await tarjeta('Área de Administración')
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar Área de Administración' }))
    const ventana = screen.getByRole('dialog', { name: 'Deshabilitar área' })
    expect(ventana).toHaveTextContent('¿Deshabilitar «Área de Administración»?')
    expect(ventana).toHaveTextContent(
      'Sus documentos en trámite siguen su flujo y los firmados siguen siendo válidos.',
    )
    fireEvent.click(within(ventana).getByRole('button', { name: 'Deshabilitar' }))
    expect(await within(ventana).findByRole('alert')).toHaveTextContent(
      'No se puede deshabilitar: el área tiene 2 personas activas. Muévalas a otra área desde Usuarios.',
    )
  })

  it('lista las áreas deshabilitadas con sus tipos y las reactiva', async () => {
    const fetch = backend({
      'GET /api/catalogo': () =>
        respuesta(200, { ...inicial, areas: [...inicial.areas, DESHABILITADA] }),
      'POST /api/catalogo/areas/COMERCIALIZACION/reactivar': () =>
        respuesta(200, {
          ...inicial,
          areas: [...inicial.areas, { ...DESHABILITADA, activa: true }],
        }),
    })
    render(<PaginaAreas />)
    const seccion = await screen.findByRole('region', { name: 'Áreas deshabilitadas' })
    expect(seccion).toHaveTextContent('Área de Comercialización')
    expect(seccion).toHaveTextContent('Conserva: Constancia de Productor Activo')
    expect(
      screen.queryByRole('article', { name: 'Área de Comercialización' }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(seccion).getByRole('button', { name: 'Reactivar Área de Comercialización' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Reactivar área' })
    expect(ventana).toHaveTextContent('Vuelve con los tipos de documento que tenía.')
    fireEvent.click(within(ventana).getByRole('button', { name: 'Reactivar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se reactivó «Área de Comercialización».',
    )
    expect(await tarjeta('Área de Comercialización')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Áreas deshabilitadas' })).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/catalogo/areas/COMERCIALIZACION/reactivar',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('Vigencia de los documentos (DRA-62)', () => {
  it('muestra la vigencia de cada tipo y la guarda en meses o sin vencimiento', async () => {
    const fetch = backend({
      'PUT /api/catalogo/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO/vigencia': () =>
        respuesta(200, {
          ...inicial,
          tipos: inicial.tipos.map((t) =>
            t.codigo === 'CONSTANCIA_PRODUCTOR_ACTIVO' ? { ...t, vigenciaMeses: 12 } : t,
          ),
        }),
    })
    render(<PaginaAreas />)
    const seccion = await screen.findByRole('region', { name: 'Vigencia de los documentos' })
    expect(within(seccion).getAllByText('Ahora: Sin vencimiento')).toHaveLength(4)
    const guardar = within(seccion).getByRole('button', {
      name: 'Guardar la vigencia de Constancia de Productor Activo',
    })
    expect(guardar).toBeDisabled()

    fireEvent.change(
      within(seccion).getByLabelText('Meses de vigencia de Constancia de Productor Activo'),
      { target: { value: '12' } },
    )
    fireEvent.click(guardar)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Constancia de Productor Activo: vigencia de 12 meses. Rige para los documentos que se firmen desde ahora.',
    )
    expect(within(seccion).getByText('Ahora: 12 meses')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/catalogo/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO/vigencia',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ meses: 12 }) }),
    )
  })

  it('muestra el error del servidor si la vigencia no es válida', async () => {
    backend({
      'PUT /api/catalogo/tipos-documento/CERTIFICADO_TRABAJO/vigencia': () =>
        respuesta(400, {
          mensaje: 'La vigencia debe ser de 1 a 120 meses, o sin vencimiento.',
          campos: {},
        }),
    })
    render(<PaginaAreas />)
    const seccion = await screen.findByRole('region', { name: 'Vigencia de los documentos' })
    fireEvent.change(
      within(seccion).getByLabelText('Meses de vigencia de Certificado de Trabajo'),
      {
        target: { value: '200' },
      },
    )
    fireEvent.click(
      within(seccion).getByRole('button', {
        name: 'Guardar la vigencia de Certificado de Trabajo',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La vigencia debe ser de 1 a 120 meses, o sin vencimiento.',
    )
  })
})
