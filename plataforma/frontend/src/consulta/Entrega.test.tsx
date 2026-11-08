import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FichaDelDocumento } from './api'
import { guardarPdf, imprimirPdf } from './archivos'
import Entrega from './Entrega'
import PaginaFichaDocumento from './PaginaFichaDocumento'

vi.mock('./archivos', () => ({ guardarPdf: vi.fn(), imprimirPdf: vi.fn() }))

const FIRMADO: FichaDelDocumento = {
  codigo: 'DRA-2026-F8R2MA',
  tipoNombre: 'Certificado de Trabajo',
  origen: 'SOLICITUD_PARTE',
  estado: 'FIRMADO',
  beneficiario: 'Lucía Paredes Quinto',
  dni: '45829364',
  numeroExpediente: 'EXP-2026-005391',
  areaNombre: 'Área de Administración',
  lote: null,
  evento: null,
  registradoEn: '2026-11-04T15:05:00Z',
  motivo: null,
  firmadoEn: '2026-11-05T20:30:00Z',
  anuladoEn: null,
  reemplazaA: null,
  reemisionEnCurso: null,
  reemplazadoPor: null,
  impresiones: 0,
  descargas: 0,
}

const PDF = '%PDF-1.7 documento'
let pedidos: { ruta: string; metodo: string; cuerpo: string | null; accept: string | null }[]

function backend(entrega: () => Promise<Response>) {
  pedidos = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    pedidos.push({
      ruta: String(ruta),
      metodo: opciones?.method ?? 'GET',
      cuerpo: (opciones?.body as string) ?? null,
      accept: new Headers(opciones?.headers).get('Accept'),
    })
    return entrega()
  })
}

const pdf = () =>
  Promise.resolve(
    new Response(PDF, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
  )

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(guardarPdf).mockClear()
  vi.mocked(imprimirPdf).mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('Descargar o imprimir (HU25)', () => {
  it('un documento nunca entregado está listo para entregar y tiene los tres botones', () => {
    render(<Entrega ficha={FIRMADO} alEntregar={() => {}} />)
    expect(screen.getByText('Listo para entregar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver documento' })).toHaveAttribute(
      'href',
      '/api/consulta/documentos/DRA-2026-F8R2MA/pdf',
    )
    expect(screen.getByRole('link', { name: 'Ver documento' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
  })

  it('imprimir pide el PDF comprobado, lo imprime y avisa para recargar el historial', async () => {
    backend(pdf)
    const alEntregar = vi.fn()
    render(<Entrega ficha={FIRMADO} alEntregar={alEntregar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await vi.waitFor(() => expect(imprimirPdf).toHaveBeenCalledTimes(1))
    expect(pedidos).toEqual([
      {
        ruta: '/api/consulta/documentos/DRA-2026-F8R2MA/entregas',
        metodo: 'POST',
        cuerpo: '{"forma":"IMPRESION"}',
        accept: 'application/pdf, application/json',
      },
    ])
    expect(await vi.mocked(imprimirPdf).mock.calls[0][0].text()).toBe(PDF)
    expect(alEntregar).toHaveBeenCalledTimes(1)
    expect(guardarPdf).not.toHaveBeenCalled()
  })

  it('descargar guarda el PDF con el código como nombre', async () => {
    backend(pdf)
    render(<Entrega ficha={FIRMADO} alEntregar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    await vi.waitFor(() => expect(guardarPdf).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarPdf).mock.calls[0][1]).toBe('DRA-2026-F8R2MA.pdf')
    expect(pedidos[0].cuerpo).toBe('{"forma":"DESCARGA"}')
    expect(imprimirPdf).not.toHaveBeenCalled()
  })

  it('ya entregado: muestra cuántas veces y ofrece imprimir un duplicado', () => {
    render(<Entrega ficha={{ ...FIRMADO, impresiones: 2, descargas: 1 }} alEntregar={() => {}} />)
    expect(screen.getByText('Entregado: impreso 2 veces, descargado 1 vez')).toBeInTheDocument()
    expect(screen.getByText('Si imprime otra vez, se registra como duplicado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir duplicado' })).toBeInTheDocument()
  })

  it('si el documento no coincide con la blockchain, muestra el mensaje y no imprime', async () => {
    backend(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            mensaje:
              'El documento no coincide con su registro en la blockchain. No se puede entregar. Comuníquese con el Administrador.',
            campos: {},
          }),
          { status: 409 },
        ),
      ),
    )
    const alEntregar = vi.fn()
    render(<Entrega ficha={FIRMADO} alEntregar={alEntregar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El documento no coincide con su registro en la blockchain.',
    )
    expect(imprimirPdf).not.toHaveBeenCalled()
    expect(alEntregar).not.toHaveBeenCalled()
  })

  it('en la ficha solo aparece para un firmado y con el permiso', async () => {
    const ficha = (estado: FichaDelDocumento['estado']) =>
      vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ ...FIRMADO, estado }), { status: 200 })),
        )
    ficha('FIRMADO')
    const { unmount } = render(
      <PaginaFichaDocumento codigo={FIRMADO.codigo} consulta="" conEntrega />,
    )
    expect(await screen.findByRole('region', { name: 'Entrega del documento' })).toBeInTheDocument()
    unmount()
    vi.restoreAllMocks()

    ficha('ANULADO')
    const otra = render(<PaginaFichaDocumento codigo={FIRMADO.codigo} consulta="" conEntrega />)
    await screen.findByText('Fue anulado y ya no es válido.')
    expect(screen.queryByRole('region', { name: 'Entrega del documento' })).not.toBeInTheDocument()
    otra.unmount()
    vi.restoreAllMocks()

    ficha('FIRMADO')
    render(<PaginaFichaDocumento codigo={FIRMADO.codigo} consulta="" />)
    await screen.findByText(
      'Firmado y registrado en la blockchain. Se puede entregar al ciudadano.',
    )
    expect(screen.queryByRole('region', { name: 'Entrega del documento' })).not.toBeInTheDocument()
  })
})
