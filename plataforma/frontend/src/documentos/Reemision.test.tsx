import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TipoDocumento } from './api'
import PaginaDetalleDocumento from './PaginaDetalleDocumento'
import PaginaDetalleLote from './PaginaDetalleLote'
import PaginaReemision from './PaginaReemision'
import PaginaRevisionDocumento from './PaginaRevisionDocumento'

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
      maximo: 0,
    },
  ],
}

const FIRMADO = {
  tipo: 'CERTIFICADO_TRABAJO',
  tipoNombre: 'Certificado de Trabajo',
  titulo: 'CERTIFICADO',
  numeroExpediente: 'EXP-2026-005391',
  nombres: 'Lucía',
  apellidos: 'Paredes Quinto',
  dni: '45829364',
  texto: 'Por haber laborado en la Agencia Agraria Satipo como asistente administrativa…',
  firmante: 'Ing. Carlos Mendoza Rivera',
  codigo: 'DRA-2026-F8R2MA',
  origen: 'SOLICITUD_PARTE',
  estado: 'FIRMADO',
  lote: null,
  areaNombre: 'Área de Administración',
  registradoPor: 'Pedro Morales Ccanto',
  registradoEn: '2026-10-05T15:00:00Z',
  motivo: null,
  datos: { cargo: 'asistente administrativa', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
  corregido: false,
  reemision: null,
  reemisionEnCurso: null,
  reemplazadoPor: null,
}

const REEMISION = {
  ...FIRMADO,
  codigo: 'DRA-2026-R4M8TX',
  estado: 'PENDIENTE',
  apellidos: 'Paredes Quintana',
  reemision: {
    original: 'DRA-2026-F8R2MA',
    motivo: 'El apellido estaba mal escrito',
    cambios: ['Apellidos: Paredes Quinto → Paredes Quintana'],
  },
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Reemitir un documento firmado (HU30)', () => {
  it('el detalle de un firmado ofrece "Reemitir con corrección"', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, FIRMADO))
    render(<PaginaDetalleDocumento codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByRole('link', { name: /Reemitir con corrección/ })).toHaveAttribute(
      'href',
      '#/mis-documentos/DRA-2026-F8R2MA/reemitir',
    )
  })

  it('con una reemisión en curso no se reemite de nuevo, y luego muestra quién lo reemplazó', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => respuesta(200, { ...FIRMADO, reemisionEnCurso: 'DRA-2026-R4M8TX' }))
    const { unmount } = render(<PaginaDetalleDocumento codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByText(/Reemisión en revisión/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DRA-2026-R4M8TX' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Reemitir con corrección/ })).not.toBeInTheDocument()
    unmount()

    fetch.mockImplementation(() =>
      respuesta(200, {
        ...FIRMADO,
        estado: 'ANULADO',
        motivo: 'Reemplazado por DRA-2026-R4M8TX. Motivo de la reemisión: El apellido estaba mal',
        reemplazadoPor: 'DRA-2026-R4M8TX',
      }),
    )
    render(<PaginaDetalleDocumento codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByText(/Se anuló al firmarse su reemisión/)).toBeInTheDocument()
    expect(screen.getByText(/Reemplazado por/, { selector: 'strong' })).toBeInTheDocument()
  })

  it('el formulario viene precargado, pide el motivo y envía la reemisión', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, init) => {
      const r = String(ruta)
      if (r.startsWith('/api/tipos-documento/')) return respuesta(200, TRABAJO)
      if (r.endsWith('/reemision/vista-previa'))
        return respuesta(200, { ...FIRMADO, ...JSON.parse(String(init?.body)) })
      if (r.endsWith('/reemision')) return respuesta(201, REEMISION)
      return respuesta(200, FIRMADO)
    })
    render(<PaginaReemision codigo="DRA-2026-F8R2MA" />)
    expect(
      await screen.findByRole('heading', {
        name: 'Reemitir con corrección – Certificado de Trabajo',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/el original se anulará automáticamente/)).toBeInTheDocument()
    // El expediente es el del original y no se edita.
    expect(screen.queryByLabelText('N.° de expediente', { exact: false })).not.toBeInTheDocument()
    expect(screen.getByText('EXP-2026-005391')).toBeInTheDocument()
    const apellidos = screen.getByLabelText('Apellidos', { exact: false })
    expect(apellidos).toHaveValue('Paredes Quinto')

    const continuar = screen.getByRole('button', { name: 'Continuar a vista previa' })
    fireEvent.click(continuar)
    expect(await screen.findByText('Ingrese el motivo de la reemisión.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Motivo de la reemisión'), {
      target: { value: 'El apellido estaba mal escrito' },
    })
    fireEvent.click(continuar)
    expect(await screen.findByText('Corrija al menos un dato del documento.')).toBeInTheDocument()

    fireEvent.change(apellidos, { target: { value: 'Paredes Quintana' } })
    fireEvent.click(continuar)
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    const confirmacion = screen.getByRole('dialog', { name: '¿Enviar la reemisión a revisión?' })
    expect(confirmacion).toHaveTextContent('el original (DRA-2026-F8R2MA) se anulará')
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('✓ Reemisión enviada a revisión')).toBeInTheDocument()
    expect(screen.getByText('DRA-2026-R4M8TX')).toBeInTheDocument()
    const llamada = fetch.mock.calls.find(([r]) => String(r).endsWith('/reemision'))!
    expect(llamada[0]).toBe('/api/documentos/DRA-2026-F8R2MA/reemision')
    const cuerpo = JSON.parse(String(llamada[1]?.body))
    expect(cuerpo).toMatchObject({
      apellidos: 'Paredes Quintana',
      motivo: 'El apellido estaba mal escrito',
      datos: { cargo: 'asistente administrativa' },
    })
    expect(cuerpo).not.toHaveProperty('numeroExpediente')
  })

  it('en un lote, cada certificado firmado se reemite desde su fila', async () => {
    const lote = {
      numero: '2026-004',
      tipo: 'CERTIFICADO_CAPACITACION',
      tipoNombre: 'Certificado de Capacitación',
      areaNombre: 'Área de Capacitación',
      registradoPor: 'Rosa Quispe Huamán',
      registradoEn: '2026-10-05T15:00:00Z',
      datos: { nombreEvento: 'Poda de cacao' },
      periodo: 'del 22 al 24 de setiembre de 2026',
      ejemplo: { ...FIRMADO, tipoNombre: 'Certificado de Capacitación' },
      documentos: [
        {
          codigo: 'DRA-2026-AAAAAA',
          nombres: 'Gladys',
          apellidos: 'Sanchez',
          dni: '45903318',
          estado: 'FIRMADO',
        },
      ],
    }
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((ruta) =>
        String(ruta).endsWith('/reemision')
          ? respuesta(201, { ...REEMISION, codigo: 'DRA-2026-BBBBBB' })
          : respuesta(200, lote),
      )
    render(<PaginaDetalleLote numero="2026-004" />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reemitir con corrección DRA-2026-AAAAAA' }),
    )
    const ventana = screen.getByRole('dialog', { name: 'Reemitir certificado' })
    fireEvent.change(within(ventana).getByLabelText('Apellidos', { exact: false }), {
      target: { value: 'Sánchez Ñaupari' },
    })
    fireEvent.change(within(ventana).getByLabelText('Motivo de la reemisión'), {
      target: { value: 'Faltaban las tildes' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Enviar a revisión' }))
    expect(
      await screen.findByText(
        '✓ La reemisión de DRA-2026-AAAAAA se envió a revisión con el código DRA-2026-BBBBBB.',
      ),
    ).toBeInTheDocument()
    const llamada = fetch.mock.calls.find(([r]) => String(r).endsWith('/reemision'))!
    expect(JSON.parse(String(llamada[1]?.body))).toEqual({
      nombres: 'Gladys',
      apellidos: 'Sánchez Ñaupari',
      dni: '45903318',
      motivo: 'Faltaban las tildes',
    })
  })

  it('el Director ve a qué documento reemplaza, los cambios y el motivo', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, REEMISION))
    render(<PaginaRevisionDocumento codigo="DRA-2026-R4M8TX" director="Ing. Carlos Mendoza" />)
    const nota = await screen.findByRole('note')
    expect(nota).toHaveTextContent('Este documento reemplaza a DRA-2026-F8R2MA')
    expect(nota).toHaveTextContent('Apellidos: Paredes Quinto → Paredes Quintana')
    expect(nota).toHaveTextContent('Motivo de la reemisión: El apellido estaba mal escrito')
  })
})
