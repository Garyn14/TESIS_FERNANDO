import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaginaPorRevisar from './PaginaPorRevisar'
import PaginaRevisionDocumento from './PaginaRevisionDocumento'
import PaginaRevisionLote from './PaginaRevisionLote'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const BANDEJA = [
  {
    codigo: 'DRA-2026-T6N9QE',
    lote: null,
    tipoNombre: 'Constancia de Productor Activo',
    beneficiario: 'Teodoro Inga Mamani',
    evento: null,
    cantidad: 1,
    numeroExpediente: 'EXP-2026-004817',
    areaNombre: 'Área de Desarrollo Agrario',
    enviadoPor: 'Marco Salazar Vela',
    registradoEn: '2026-09-28T15:00:00Z',
    revisado: true,
  },
  {
    codigo: null,
    lote: '2026-007',
    tipoNombre: 'Certificado de Capacitación',
    beneficiario: null,
    evento: 'Manejo integrado de plagas en café',
    cantidad: 8,
    numeroExpediente: null,
    areaNombre: 'Área de Capacitación',
    enviadoPor: 'Rosa Quispe Huamán',
    registradoEn: '2026-10-07T15:00:00Z',
    revisado: false,
  },
]

const EJEMPLO = {
  tipo: 'CERTIFICADO_CAPACITACION',
  tipoNombre: 'Certificado de Capacitación',
  titulo: 'CERTIFICADO',
  numeroExpediente: null,
  nombres: 'Juan',
  apellidos: 'Ccori Pari',
  dni: '45218736',
  texto: "Por haber participado en el taller de capacitación 'Manejo integrado de plagas en café'.",
  firmante: 'Ing. Carlos Mendoza Rivera',
}

const LOTE = {
  numero: '2026-007',
  tipo: 'CERTIFICADO_CAPACITACION',
  tipoNombre: 'Certificado de Capacitación',
  areaNombre: 'Área de Capacitación',
  registradoPor: 'Rosa Quispe Huamán',
  registradoEn: '2026-10-07T15:00:00Z',
  datos: { nombreEvento: 'Manejo integrado de plagas en café', lugar: 'Río Negro, Satipo' },
  periodo: 'del 14 al 16 de setiembre de 2026',
  ejemplo: EJEMPLO,
  documentos: [
    {
      codigo: 'DRA-2026-J4C7QX',
      nombres: 'Juan',
      apellidos: 'Ccori Pari',
      dni: '45218736',
      estado: 'PENDIENTE',
    },
    {
      codigo: 'DRA-2026-M9P2RT',
      nombres: 'María Elena',
      apellidos: 'Rojas Soto',
      dni: '47390125',
      estado: 'PENDIENTE',
    },
    {
      codigo: 'DRA-2026-P3H8KW',
      nombres: 'Pedro',
      apellidos: 'Huaman Inga',
      dni: '43876512',
      estado: 'PENDIENTE',
    },
  ],
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Por revisar (HU10)', () => {
  it('muestra los pendientes en el orden recibido, con el lote en una sola fila', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, BANDEJA))
    render(<PaginaPorRevisar />)
    expect(
      screen.getByText('Documentos enviados por las áreas, del más antiguo al más reciente.'),
    ).toBeInTheDocument()
    const filas = (await screen.findAllByRole('row')).slice(1)
    expect(filas).toHaveLength(2)
    expect(filas[0]).toHaveTextContent('Teodoro Inga Mamani')
    expect(filas[0]).toHaveTextContent('EXP-2026-004817')
    expect(filas[0]).toHaveTextContent('Marco Salazar Vela')
    expect(filas[0]).toHaveTextContent('28/09/2026')
    expect(filas[0]).toHaveTextContent('✓ Revisado')
    const lote = within(filas[1]).getByRole('link', {
      name: /Lote 2026-007 · Manejo integrado de plagas en café · 8 certificados/,
    })
    expect(lote).toHaveAttribute('href', '#/por-revisar/lote/2026-007')
    expect(filas[1]).toHaveTextContent('Sin revisar')
    expect(within(filas[0]).getByRole('link')).toHaveAttribute(
      'href',
      '#/por-revisar/DRA-2026-T6N9QE',
    )
  })

  it('solo los revisados se seleccionan; la barra cuenta los certificados de los lotes (HU11)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, [
        BANDEJA[0],
        { ...BANDEJA[1], revisado: true },
        {
          ...BANDEJA[0],
          codigo: 'DRA-2026-ZZZZZZ',
          beneficiario: 'Kevin Ramos Ccanto',
          revisado: false,
        },
      ]),
    )
    render(<PaginaPorRevisar director="Ing. Carlos Mendoza Rivera" />)
    const sinRevisar = await screen.findByRole('checkbox', {
      name: 'Seleccionar Kevin Ramos Ccanto',
    })
    expect(sinRevisar).toBeDisabled()
    expect(sinRevisar).toHaveAttribute('title', 'Revise el documento antes de seleccionarlo.')
    expect(screen.queryByRole('region', { name: 'Selección para firmar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Teodoro Inga Mamani' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar Lote 2026-007/ }))
    const barra = screen.getByRole('region', { name: 'Selección para firmar' })
    expect(barra).toHaveTextContent('2 seleccionados (9 certificados)')
    expect(within(barra).getByRole('button', { name: 'Firmar seleccionados' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Teodoro Inga Mamani' }))
    expect(barra).toHaveTextContent('1 seleccionado (8 certificados)')
  })

  it('sin pendientes avisa que todo está al día', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, []))
    render(<PaginaPorRevisar />)
    expect(await screen.findByText('¡Todo al día!')).toBeInTheDocument()
    expect(screen.getByText(/No tiene documentos pendientes de revisión/)).toBeInTheDocument()
  })

  it('abrir un documento lo registra como revisado con una solicitud POST', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, {
        ...EJEMPLO,
        codigo: 'DRA-2026-T6N9QE',
        tipoNombre: 'Constancia de Productor Activo',
        titulo: 'CONSTANCIA',
        nombres: 'Teodoro',
        apellidos: 'Inga Mamani',
        numeroExpediente: 'EXP-2026-004817',
        origen: 'SOLICITUD_PARTE',
        estado: 'PENDIENTE',
        lote: null,
        areaNombre: 'Área de Desarrollo Agrario',
        registradoPor: 'Marco Salazar Vela',
        registradoEn: '2026-09-28T15:00:00Z',
      }),
    )
    render(<PaginaRevisionDocumento codigo="DRA-2026-T6N9QE" />)
    expect(
      await screen.findByRole('heading', { name: 'Revisión – Constancia de Productor Activo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('EXP-2026-004817')).toBeInTheDocument()
    expect(screen.getByRole('figure')).toHaveTextContent('Teodoro Inga Mamani')
    expect(screen.getByText(/Quedó registrado como revisado/)).toBeInTheDocument()
    expect(fetch.mock.calls[0][0]).toBe('/api/revision/documentos/DRA-2026-T6N9QE')
    expect(fetch.mock.calls[0][1]?.method).toBe('POST')
    expect(screen.getByRole('link', { name: '← Volver a Por revisar' })).toHaveAttribute(
      'href',
      '#/por-revisar',
    ) // HU16: muestra del PDF final. HU11: se firma desde la revisión.
    expect(screen.getByRole('button', { name: 'Firmar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver muestra del PDF final ↗' })).toHaveAttribute(
      'href',
      '/api/revision/documentos/DRA-2026-T6N9QE/pdf',
    )
  })

  it('en un lote se navega entre los certificados y se elige un beneficiario', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, LOTE))
    render(<PaginaRevisionLote numero="2026-007" />)
    expect(
      await screen.findByRole('heading', { name: 'Revisión de lote – Lote 2026-007' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Enviado por Rosa Quispe Huamán/)).toBeInTheDocument()
    expect(screen.getByText('Certificado 1 de 3')).toBeInTheDocument()
    expect(screen.getByRole('figure')).toHaveTextContent('Juan Ccori Pari')
    expect(screen.getByRole('button', { name: '‹ Anterior' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }))
    expect(screen.getByText('Certificado 2 de 3')).toBeInTheDocument()
    expect(screen.getByRole('figure')).toHaveTextContent('María Elena Rojas Soto')

    const relacion = screen.getByRole('complementary', { name: 'Beneficiarios del lote' })
    fireEvent.click(within(relacion).getByRole('button', { name: /Pedro Huaman Inga/ }))
    expect(screen.getByText('Certificado 3 de 3')).toBeInTheDocument()
    expect(screen.getByRole('figure')).toHaveTextContent('Pedro Huaman Inga')
    expect(screen.getByRole('link', { name: 'Ver muestra del PDF final ↗' })).toHaveAttribute(
      'href',
      '/api/revision/documentos/DRA-2026-P3H8KW/pdf',
    )
    expect(within(relacion).getByRole('button', { name: /Pedro Huaman Inga/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Siguiente ›' })).toBeDisabled()
    expect(screen.getByText(/cuenta para sus 3 certificados/)).toBeInTheDocument()
  })

  it('un documento que ya no está pendiente no se muestra', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(404, { mensaje: 'Este documento no está pendiente de revisión.', campos: {} }),
    )
    render(<PaginaRevisionDocumento codigo="DRA-2026-ZZZZZZ" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este documento no está pendiente de revisión.',
    )
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('en un lote se observan los marcados con su motivo (HU12)', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((_ruta, init) => {
      if (String(_ruta).endsWith('/observacion')) {
        const documentos = LOTE.documentos.map((d) =>
          d.codigo === 'DRA-2026-M9P2RT'
            ? { ...d, estado: 'OBSERVADO', motivo: 'El DNI no coincide' }
            : d,
        )
        expect(JSON.parse(String(init?.body))).toEqual({
          codigos: ['DRA-2026-M9P2RT'],
          motivo: 'El DNI no coincide',
        })
        return respuesta(200, { ...LOTE, documentos })
      }
      return respuesta(200, LOTE)
    })
    render(<PaginaRevisionLote numero="2026-007" />)
    const observar = await screen.findByRole('button', { name: 'Observar seleccionados' })
    expect(observar).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rechazar seleccionados' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar a María Elena Rojas Soto' }))
    expect(observar).toBeEnabled()
    fireEvent.click(observar)

    const ventana = screen.getByRole('dialog', { name: 'Observar beneficiarios seleccionados' })
    const confirmar = within(ventana).getByRole('button', { name: 'Confirmar' })
    expect(confirmar).toBeDisabled()
    const motivo = within(ventana).getByLabelText('Motivo')
    expect(motivo).toHaveAttribute('placeholder', 'Explique qué debe corregirse')
    expect(within(ventana).queryByText(/El rechazo es definitivo/)).not.toBeInTheDocument()
    fireEvent.change(motivo, { target: { value: '  El DNI no coincide ' } })
    fireEvent.click(confirmar)

    expect(
      await screen.findByText('1 certificado fue observado y volvió al área.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Marcar a María Elena Rojas Soto' })).toBeDisabled()
    const relacion = screen.getByRole('complementary', { name: 'Beneficiarios del lote' })
    expect(within(relacion).getByText('Observado')).toBeInTheDocument()
    expect(fetch.mock.calls.some(([r]) => String(r).endsWith('/observacion'))).toBe(true)
    expect(screen.getByText(/cuenta para sus 2 certificados pendientes/)).toBeInTheDocument()
  })

  it('rechazar el lote avisa que es definitivo (HU12)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, LOTE))
    render(<PaginaRevisionLote numero="2026-007" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar lote' }))
    const ventana = screen.getByRole('dialog', { name: 'Rechazar lote' })
    expect(
      within(ventana).getByText('El rechazo es definitivo. El documento no podrá reenviarse.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Firmar lote' })).toBeInTheDocument()
  })

  it('un lote sin pendientes no ofrece acciones (HU12)', async () => {
    const documentos = LOTE.documentos.map((d) => ({ ...d, estado: 'RECHAZADO', motivo: 'No' }))
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, { ...LOTE, documentos }))
    render(<PaginaRevisionLote numero="2026-007" />)
    expect(
      await screen.findByText(/El lote ya no tiene certificados pendientes/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Firmar lote' })).not.toBeInTheDocument()
  })
})
