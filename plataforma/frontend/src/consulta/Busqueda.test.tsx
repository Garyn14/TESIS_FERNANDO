import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FilaDeBusqueda } from './api'
import PaginaBuscarDocumentos from './PaginaBuscarDocumentos'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const DOCUMENTO: FilaDeBusqueda = {
  codigo: 'DRA-2026-F8R2MA',
  lote: null,
  tipoNombre: 'Certificado de Trabajo',
  beneficiario: 'Rosa Quispe Huamán',
  dni: '45829364',
  numeroExpediente: 'EXP-2026-005391',
  areaNombre: 'Área de Administración',
  registradoEn: '2026-11-04T15:00:00Z',
  estado: 'FIRMADO',
  cantidad: null,
  completo: null,
  certificados: null,
}

const certificado = (codigo: string, beneficiario: string, estado: 'FIRMADO' | 'ANULADO') => ({
  ...DOCUMENTO,
  codigo,
  lote: '2026-001',
  tipoNombre: 'Certificado de Capacitación',
  beneficiario,
  dni: '7' + codigo.slice(-7).replace(/\D/g, '1').padStart(7, '0'),
  numeroExpediente: null,
  areaNombre: 'Área de Capacitación',
  estado,
})

const LOTE_COMPLETO: FilaDeBusqueda = {
  ...DOCUMENTO,
  codigo: null,
  lote: '2026-001',
  tipoNombre: 'Certificado de Capacitación',
  beneficiario: null,
  dni: null,
  numeroExpediente: null,
  areaNombre: 'Área de Capacitación',
  estado: null,
  cantidad: 2,
  completo: true,
  certificados: [
    certificado('DRA-2026-AAAAAA', 'Ana Soto Ríos', 'FIRMADO'),
    certificado('DRA-2026-BBBBBB', 'Luis Pérez Rojas', 'ANULADO'),
  ],
}

let consultas: string[]

function backend(responder: (ruta: string) => Promise<Response>) {
  consultas = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) => {
    consultas.push(String(ruta))
    return responder(String(ruta))
  })
}

const parametros = (ruta: string) => Object.fromEntries(new URL(ruta, 'http://x').searchParams)

const escribir = (texto: string) =>
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: texto } })

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Buscar documentos (HU22)', () => {
  it('al abrir muestra los más recientes, con sus datos y su estado', async () => {
    backend(() => respuesta(200, { filas: [DOCUMENTO], hayMas: false }))
    render(<PaginaBuscarDocumentos />)

    const fila = (await screen.findByText('DRA-2026-F8R2MA')).closest('tr')!
    for (const dato of [
      'Certificado de Trabajo',
      'Rosa Quispe Huamán',
      '45829364',
      'EXP-2026-005391',
      'Área de Administración',
      '04/11/2026',
      'Firmado',
    ])
      expect(within(fila).getByText(dato)).toBeInTheDocument()
    expect(parametros(consultas[0])).toEqual({ texto: '', estado: 'TODOS' })
  })

  it('busca lo escrito, sin espacios de más, una vez que deja de escribir', async () => {
    backend(() => respuesta(200, { filas: [DOCUMENTO], hayMas: false }))
    render(<PaginaBuscarDocumentos />)
    await screen.findByText('DRA-2026-F8R2MA')

    escribir('q')
    escribir('qu')
    escribir('  quispe   rosa ')
    await vi.waitFor(() => expect(consultas).toHaveLength(2))
    expect(parametros(consultas[1])).toEqual({ texto: 'quispe rosa', estado: 'TODOS' })
  })

  it('con un solo carácter pide al menos dos y no consulta', async () => {
    backend(() => respuesta(200, { filas: [], hayMas: false }))
    render(<PaginaBuscarDocumentos />)
    await screen.findByRole('status')

    escribir(' a ')
    expect(screen.getByRole('alert')).toHaveTextContent('Escriba al menos 2 caracteres.')
    await new Promise((r) => setTimeout(r, 400))
    expect(consultas).toHaveLength(1)
  })

  it('sin resultados lo informa con un mensaje', async () => {
    backend((ruta) =>
      respuesta(200, {
        filas: parametros(ruta).texto ? [] : [DOCUMENTO],
        hayMas: false,
      }),
    )
    render(<PaginaBuscarDocumentos />)
    await screen.findByText('DRA-2026-F8R2MA')

    escribir('Nadie Conestenombre')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No se encontraron documentos con «Nadie Conestenombre». Revise lo que escribió o busque por otro dato.',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('filtra por estado, junto con el texto', async () => {
    backend(() => respuesta(200, { filas: [DOCUMENTO], hayMas: false }))
    render(<PaginaBuscarDocumentos />)
    await screen.findByText('DRA-2026-F8R2MA')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Todos',
      'En trámite',
      'Firmados',
      'Anulados',
      'Rechazados',
    ])
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')

    escribir('quispe')
    fireEvent.click(screen.getByRole('tab', { name: 'En trámite' }))
    await vi.waitFor(() =>
      expect(parametros(consultas.at(-1)!)).toEqual({ texto: 'quispe', estado: 'EN_TRAMITE' }),
    )
    expect(screen.getByRole('tab', { name: 'En trámite' })).toHaveAttribute('aria-selected', 'true')
  })

  it('un lote ocupa una fila plegada y se despliega en sus certificados', async () => {
    backend(() => respuesta(200, { filas: [LOTE_COMPLETO], hayMas: false }))
    render(<PaginaBuscarDocumentos />)

    const boton = await screen.findByRole('button', { name: /Lote 2026-001/ })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    const fila = boton.closest('tr')!
    expect(within(fila).getByText('2 certificados')).toBeInTheDocument()
    expect(within(fila).getByText('Firmado 1')).toBeInTheDocument()
    expect(within(fila).getByText('Anulado 1')).toBeInTheDocument()
    expect(screen.queryByText('Ana Soto Ríos')).not.toBeInTheDocument()

    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Ana Soto Ríos')).toBeInTheDocument()
    expect(screen.getByText('DRA-2026-BBBBBB')).toBeInTheDocument()

    fireEvent.click(boton)
    expect(screen.queryByText('Ana Soto Ríos')).not.toBeInTheDocument()
  })

  it('si coinciden solo algunos certificados, el lote aparece desplegado con ellos', async () => {
    const parcial = {
      ...LOTE_COMPLETO,
      cantidad: 25,
      completo: false,
      certificados: [LOTE_COMPLETO.certificados![0]],
    }
    backend(() => respuesta(200, { filas: [parcial], hayMas: false }))
    render(<PaginaBuscarDocumentos />)

    const boton = await screen.findByRole('button', { name: /Lote 2026-001/ })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('25 certificados')).toBeInTheDocument()
    expect(screen.getByText('1 de 25 coinciden con la búsqueda')).toBeInTheDocument()
    expect(screen.getByText('Ana Soto Ríos')).toBeInTheDocument()
    expect(screen.queryByText('Luis Pérez Rojas')).not.toBeInTheDocument()
  })

  it('avisa cuando hay más de 50 resultados', async () => {
    backend(() => respuesta(200, { filas: [DOCUMENTO], hayMas: true }))
    render(<PaginaBuscarDocumentos />)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se muestran los 50 resultados más recientes. Escriba más datos para precisar la búsqueda.',
    )
  })

  it('si el servidor falla, muestra su mensaje', async () => {
    backend(() =>
      respuesta(403, { mensaje: 'No tiene permiso para realizar esta acción.', campos: {} }),
    )
    render(<PaginaBuscarDocumentos />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para realizar esta acción.',
    )
  })
})
