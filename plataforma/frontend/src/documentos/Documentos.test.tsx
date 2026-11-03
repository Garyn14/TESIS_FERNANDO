import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TipoDocumento } from './api'
import FormularioSolicitud from './FormularioSolicitud'
import PaginaDetalleDocumento from './PaginaDetalleDocumento'
import PaginaMisDocumentos from './PaginaMisDocumentos'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const TRABAJO: TipoDocumento = {
  codigo: 'CERTIFICADO_TRABAJO',
  nombre: 'Certificado de Trabajo',
  descripcion: 'Para personas que trabajaron en la agencia.',
  titulo: 'CERTIFICADO',
  origen: 'SOLICITUD_PARTE',
  campos: [
    { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'TEXTO', ayuda: null, opciones: [], maximo: 100 },
    {
      nombre: 'fechaInicio',
      etiqueta: 'Fecha de inicio',
      tipo: 'FECHA',
      ayuda: null,
      opciones: [],
      maximo: 0,
    },
    {
      nombre: 'fechaFin',
      etiqueta: 'Fecha de fin',
      tipo: 'FECHA',
      ayuda: null,
      opciones: [],
      maximo: 100,
    },
  ],
}

const PREVIA = {
  tipo: 'CERTIFICADO_TRABAJO',
  tipoNombre: 'Certificado de Trabajo',
  titulo: 'CERTIFICADO',
  numeroExpediente: 'EXP-2026-005391',
  nombres: 'Lucía',
  apellidos: 'Paredes Quinto',
  dni: '45829364',
  texto:
    'Por haber laborado en la Agencia Agraria Satipo como asistente administrativa, del 02/01/2025 al 30/09/2026, demostrando responsabilidad y buen desempeño.',
  firmante: 'Ing. Carlos Mendoza Rivera',
}

const DOCUMENTO = {
  ...PREVIA,
  codigo: 'DRA-2026-F8R2MA',
  origen: 'SOLICITUD_PARTE',
  estado: 'PENDIENTE',
  areaNombre: 'Área de Administración',
  registradoPor: 'Silvia Poma Torres',
  registradoEn: '2026-10-05T15:00:00Z',
}

const campo = (etiqueta: string) => screen.getByLabelText(etiqueta, { exact: false })

function completar() {
  fireEvent.change(campo('N.° de expediente'), { target: { value: ' exp-2026-005391 ' } })
  fireEvent.change(campo('DNI'), { target: { value: '45829364' } })
  fireEvent.change(campo('Nombres'), { target: { value: '  Lucía ' } })
  fireEvent.change(campo('Apellidos'), { target: { value: 'Paredes   Quinto' } })
  fireEvent.change(campo('Cargo'), { target: { value: 'asistente administrativa' } })
  fireEvent.change(campo('Fecha de inicio'), { target: { value: '02/01/2025' } })
  fireEvent.change(campo('Fecha de fin'), { target: { value: '30/09/2026' } })
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Registro a solicitud de parte (HU08)', () => {
  it('valida los campos antes de pedir la vista previa', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<FormularioSolicitud tipo={TRABAJO} />)
    fireEvent.change(campo('DNI'), { target: { value: '4582936' } })
    fireEvent.change(campo('Fecha de inicio'), { target: { value: '02/05/2026' } })
    fireEvent.change(campo('Fecha de fin'), { target: { value: '01/05/2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))

    expect(await screen.findByText('Ingrese el número de expediente.')).toBeInTheDocument()
    expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('Ingrese los nombres.')).toBeInTheDocument()
    expect(screen.getByText('Complete este campo.')).toBeInTheDocument()
    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la de inicio.'),
    ).toBeInTheDocument()
    expect(campo('DNI')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('una fecha que no existe se señala con el formato esperado', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<FormularioSolicitud tipo={TRABAJO} />)
    completar()
    fireEvent.change(campo('Fecha de inicio'), { target: { value: '31/02/2025' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    expect(screen.getByText('Ingrese una fecha válida, en formato dd/mm/aaaa.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('el expediente debe seguir el formato provisional', async () => {
    render(<FormularioSolicitud tipo={TRABAJO} />)
    completar()
    fireEvent.change(campo('N.° de expediente'), { target: { value: '2026-5391' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    expect(
      await screen.findByText('Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817.'),
    ).toBeInTheDocument()
  })

  it('muestra la vista previa con la plantilla y se puede volver sin perder los datos', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, PREVIA))
    render(<FormularioSolicitud tipo={TRABAJO} />)
    completar()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))

    const certificado = await screen.findByRole('figure', {
      name: 'Vista previa: Certificado de Trabajo',
    })
    expect(certificado).toHaveTextContent('VISTA PREVIA')
    expect(certificado).toHaveTextContent('Otorgado a')
    expect(certificado).toHaveTextContent(PREVIA.texto)
    expect(certificado).toHaveTextContent('Fecha de emisión: se asignará al firmar')
    expect(certificado).toHaveTextContent('Ing. Carlos Mendoza Rivera')
    expect(screen.getByText('EXP-2026-005391')).toBeInTheDocument()
    const [ruta, opciones] = fetch.mock.calls[0]
    expect(ruta).toBe('/api/documentos/vista-previa')
    expect(JSON.parse(String(opciones?.body))).toEqual({
      tipo: 'CERTIFICADO_TRABAJO',
      numeroExpediente: 'EXP-2026-005391',
      nombres: 'Lucía',
      apellidos: 'Paredes Quinto',
      dni: '45829364',
      datos: {
        cargo: 'asistente administrativa',
        fechaInicio: '2025-01-02',
        fechaFin: '2026-09-30',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(campo('Cargo')).toHaveValue('asistente administrativa')
  })

  it('enviar pide confirmación y muestra el código de verificación', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((ruta) =>
        ruta === '/api/documentos' ? respuesta(201, DOCUMENTO) : respuesta(200, PREVIA),
      )
    render(<FormularioSolicitud tipo={TRABAJO} />)
    completar()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))

    const ventana = screen.getByRole('dialog', { name: '¿Enviar a revisión?' })
    expect(ventana).toHaveTextContent('no se puede modificar mientras esté en revisión')
    expect(fetch.mock.calls.some(([r]) => r === '/api/documentos')).toBe(false)
    fireEvent.click(within(ventana).getByRole('button', { name: 'Enviar' }))

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Documento enviado a revisión')
    expect(aviso).toHaveTextContent('DRA-2026-F8R2MA')
    expect(within(aviso).getByRole('link', { name: 'Ver el documento' })).toHaveAttribute(
      'href',
      '#/mis-documentos/DRA-2026-F8R2MA',
    )
  })

  it('si el expediente ya está registrado vuelve al formulario y lo señala', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) =>
      ruta === '/api/documentos'
        ? respuesta(409, {
            mensaje: 'El número de expediente ya está registrado en otro documento.',
            campos: {
              numeroExpediente: 'El número de expediente ya está registrado en otro documento.',
            },
          })
        : respuesta(200, PREVIA),
    )
    render(<FormularioSolicitud tipo={TRABAJO} />)
    completar()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('El número de expediente ya está registrado en otro documento.'),
    ).toBeInTheDocument()
    expect(campo('N.° de expediente')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Mis documentos (HU08)', () => {
  it('lista los documentos del área con su estado', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, [
        {
          codigo: 'DRA-2026-F8R2MA',
          tipoNombre: 'Certificado de Trabajo',
          beneficiario: 'Lucía Paredes Quinto',
          numeroExpediente: 'EXP-2026-005391',
          registradoEn: '2026-10-05T15:00:00Z',
          estado: 'PENDIENTE',
        },
      ]),
    )
    render(<PaginaMisDocumentos areaNombre="Área de Administración" />)
    const fila = (await screen.findByText('Lucía Paredes Quinto')).closest('tr')!
    expect(fila).toHaveTextContent('Certificado de Trabajo')
    expect(fila).toHaveTextContent('EXP-2026-005391')
    expect(fila).toHaveTextContent('05/10/2026')
    expect(fila).toHaveTextContent('Pendiente')
    expect(within(fila).getByRole('link', { name: 'DRA-2026-F8R2MA' })).toHaveAttribute(
      'href',
      '#/mis-documentos/DRA-2026-F8R2MA',
    )
  })

  it('sin documentos muestra un estado vacío', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, []))
    render(<PaginaMisDocumentos areaNombre="Área de Administración" />)
    expect(
      await screen.findByText('Aún no hay documentos registrados en su área.'),
    ).toBeInTheDocument()
  })

  it('el detalle de un Pendiente no tiene opciones para editarlo', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, DOCUMENTO))
    render(<PaginaDetalleDocumento codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByRole('figure')).toHaveTextContent('VISTA PREVIA')
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('EXP-2026-005391')).toBeInTheDocument()
    expect(screen.getByText('Silvia Poma Torres')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('un documento de otra área no se muestra', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(403, { mensaje: 'Este documento no pertenece a su área.', campos: {} }),
    )
    render(<PaginaDetalleDocumento codigo="DRA-2026-T6N9QE" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este documento no pertenece a su área.',
    )
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })
})
