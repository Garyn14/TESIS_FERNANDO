import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FichaDelDocumento } from './api'
import PaginaFichaDocumento from './PaginaFichaDocumento'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const PENDIENTE: FichaDelDocumento = {
  codigo: 'DRA-2026-F8R2MA',
  tipoNombre: 'Certificado de Trabajo',
  origen: 'SOLICITUD_PARTE',
  estado: 'PENDIENTE',
  beneficiario: 'Lucía Paredes Quinto',
  dni: '45829364',
  numeroExpediente: 'EXP-2026-005391',
  areaNombre: 'Área de Administración',
  lote: null,
  evento: null,
  registradoEn: '2026-11-04T15:05:00Z',
  motivo: null,
  firmadoEn: null,
  anuladoEn: null,
  reemplazaA: null,
  reemisionEnCurso: null,
  reemplazadoPor: null,
}

function abrir(ficha: Partial<FichaDelDocumento> | null, consulta = '') {
  const pedidos: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) => {
    pedidos.push(String(ruta))
    return ficha
      ? respuesta(200, { ...PENDIENTE, ...ficha })
      : respuesta(404, { mensaje: 'No se encontró el documento DRA-2026-NOEXST.', campos: {} })
  })
  render(<PaginaFichaDocumento codigo={ficha?.codigo ?? PENDIENTE.codigo} consulta={consulta} />)
  return pedidos
}

const dato = (etiqueta: string) => screen.getByText(etiqueta).nextElementSibling?.textContent

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Ficha del documento (HU23)', () => {
  it('muestra el estado explicado y los datos básicos', async () => {
    const pedidos = abrir({})
    expect(await screen.findByRole('heading', { name: 'DRA-2026-F8R2MA' })).toBeInTheDocument()
    expect(pedidos).toEqual(['/api/consulta/documentos/DRA-2026-F8R2MA'])
    expect(screen.getAllByText('Pendiente')[0]).toBeInTheDocument()
    expect(
      screen.getByText('Está en revisión del Director. Todavía no se puede entregar.'),
    ).toBeInTheDocument()
    expect(dato('Enviado el')).toBe('04/11/2026 10:05')
    expect(dato('Beneficiario')).toBe('Lucía Paredes Quinto')
    expect(dato('DNI')).toBe('45829364')
    expect(dato('Tipo')).toBe('Certificado de Trabajo')
    expect(dato('Origen')).toBe('A solicitud de parte')
    expect(dato('N.° de expediente')).toBe('EXP-2026-005391')
    expect(dato('Área')).toBe('Área de Administración')
    expect(dato('Fecha de envío')).toBe('04/11/2026')
    expect(screen.queryByText('Lote')).not.toBeInTheDocument()
  })

  it.each([
    ['PROCESANDO_FIRMA', 'El Director está firmando el documento. Estará listo en unos minutos.'],
    [
      'OBSERVADO',
      'El Director pidió corregir el documento. El Área de Administración lo corregirá y lo volverá a enviar.',
    ],
    [
      'RECHAZADO',
      'El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite.',
    ],
    ['FIRMADO', 'Firmado y registrado en la blockchain. Se puede entregar al ciudadano.'],
    ['ANULADO', 'Fue anulado y ya no es válido.'],
  ] as const)('explica el estado %s', async (estado, texto) => {
    abrir({ estado })
    expect(await screen.findByText(texto)).toBeInTheDocument()
  })

  it('muestra el motivo de la observación, del rechazo o de la anulación', async () => {
    abrir({ estado: 'RECHAZADO', motivo: 'La persona no laboró en esas fechas.' })
    expect(await screen.findByText('Motivo del rechazo:')).toBeInTheDocument()
    expect(screen.getByText('La persona no laboró en esas fechas.')).toBeInTheDocument()
  })

  it('un firmado muestra la fecha y hora de la firma', async () => {
    abrir({ estado: 'FIRMADO', firmadoEn: '2026-11-05T20:30:00Z' })
    await screen.findByText('Firmado el')
    expect(dato('Firmado el')).toBe('05/11/2026 15:30')
  })

  it('un anulado reemplazado enlaza a su reemisión, conservando la búsqueda', async () => {
    abrir(
      {
        estado: 'ANULADO',
        anuladoEn: '2026-11-06T14:00:00Z',
        motivo: 'Reemplazado por DRA-2026-K7M4PX.',
        reemplazadoPor: 'DRA-2026-K7M4PX',
      },
      'texto=paredes',
    )
    expect(await screen.findByText('Motivo de la anulación:')).toBeInTheDocument()
    expect(dato('Anulado el')).toBe('06/11/2026 09:00')
    expect(screen.getByRole('link', { name: 'DRA-2026-K7M4PX' })).toHaveAttribute(
      'href',
      '#/buscar/DRA-2026-K7M4PX?texto=paredes',
    )
    expect(screen.getByText(/Fue reemplazado por el documento/)).toBeInTheDocument()
  })

  it('una reemisión enlaza al original, y un original enlaza a su reemisión en revisión', async () => {
    abrir({ reemplazaA: 'DRA-2026-AAAAAA', reemisionEnCurso: null })
    expect(await screen.findByText(/Reemplaza al documento/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DRA-2026-AAAAAA' })).toHaveAttribute(
      'href',
      '#/buscar/DRA-2026-AAAAAA',
    )
  })

  it('un original con una reemisión en revisión lo indica', async () => {
    abrir({ estado: 'FIRMADO', reemisionEnCurso: 'DRA-2026-BBBBBB' })
    expect(await screen.findByText(/Tiene una reemisión en revisión/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DRA-2026-BBBBBB' })).toBeInTheDocument()
  })

  it('un certificado de lote muestra el lote y el evento, sin expediente', async () => {
    abrir({
      origen: 'OFICIO',
      lote: '2026-001',
      evento: 'Manejo integrado de plagas en café',
      numeroExpediente: null,
    })
    await screen.findByText('Lote')
    expect(dato('Lote')).toBe('Lote 2026-001')
    expect(dato('Evento')).toBe('Manejo integrado de plagas en café')
    expect(dato('Origen')).toBe('De oficio')
    expect(screen.queryByText('N.° de expediente')).not.toBeInTheDocument()
  })

  it('un código que no existe lo informa, y se puede volver a la búsqueda', async () => {
    abrir(null, 'texto=lucia&estado=FIRMADOS')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se encontró el documento DRA-2026-NOEXST.',
    )
    expect(screen.getByRole('link', { name: '← Volver a Buscar documentos' })).toHaveAttribute(
      'href',
      '#/buscar?texto=lucia&estado=FIRMADOS',
    )
  })

  it('con el permiso de auditoría muestra el historial y el detalle técnico (HU24)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) =>
      String(ruta).endsWith('/auditoria')
        ? respuesta(200, {
            eventos: [
              {
                evento: 'REGISTRADO',
                realizadoEn: '2026-11-04T15:05:00Z',
                responsable: 'Pedro Morales Ccanto',
                rol: 'Área encargada',
                detalle: null,
              },
            ],
            tecnico: { transaccion: null },
          })
        : respuesta(200, PENDIENTE),
    )
    render(<PaginaFichaDocumento codigo={PENDIENTE.codigo} consulta="" conAuditoria />)
    expect(await screen.findByRole('region', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Detalle técnico de auditoría/ })).toBeInTheDocument()
  })

  it('sin el permiso de auditoría no consulta el historial', async () => {
    const pedidos = abrir({})
    await screen.findByRole('heading', { name: 'DRA-2026-F8R2MA' })
    expect(pedidos).toEqual(['/api/consulta/documentos/DRA-2026-F8R2MA'])
    expect(screen.queryByRole('region', { name: 'Historial' })).not.toBeInTheDocument()
  })
})
