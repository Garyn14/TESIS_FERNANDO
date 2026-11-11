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
      personasActivas: 2,
      tipos: [PRACTICAS, TRABAJO],
    },
    {
      codigo: 'DESARROLLO_AGRARIO',
      nombre: 'Área de Desarrollo Agrario',
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
