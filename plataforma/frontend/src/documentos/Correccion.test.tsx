import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TipoDocumento } from './api'
import PaginaCorreccion from './PaginaCorreccion'
import PaginaDetalleDocumento from './PaginaDetalleDocumento'
import PaginaDetalleLote from './PaginaDetalleLote'

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

const OBSERVADO = {
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
  estado: 'OBSERVADO',
  lote: null,
  areaNombre: 'Área de Administración',
  registradoPor: 'Pedro Morales Ccanto',
  registradoEn: '2026-10-05T15:00:00Z',
  motivo: 'El cargo no coincide con el contrato',
  datos: { cargo: 'asistente administrativa', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
  corregido: false,
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Corregir y reenviar un observado (HU15)', () => {
  it('el detalle de un observado ofrece "Corregir y reenviar"', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, OBSERVADO))
    render(<PaginaDetalleDocumento codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByRole('link', { name: 'Corregir y reenviar' })).toHaveAttribute(
      'href',
      '#/mis-documentos/DRA-2026-F8R2MA/corregir',
    )
    expect(screen.getByText('El cargo no coincide con el contrato')).toBeInTheDocument()
  })

  it('el formulario viene precargado, muestra el motivo y reenvía con el mismo código', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, init) => {
      const r = String(ruta)
      // DRA-60: el formulario sale del tipo del propio documento, no de los tipos del área.
      if (r.endsWith('/formulario')) return respuesta(200, TRABAJO)
      if (r.endsWith('/correccion/vista-previa'))
        return respuesta(200, { ...OBSERVADO, ...JSON.parse(String(init?.body)) })
      if (r.endsWith('/correccion'))
        return respuesta(200, { ...OBSERVADO, estado: 'PENDIENTE', motivo: null, corregido: true })
      return respuesta(200, OBSERVADO)
    })
    render(<PaginaCorreccion codigo="DRA-2026-F8R2MA" />)
    expect(
      await screen.findByRole('heading', { name: 'Corregir y reenviar – Certificado de Trabajo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('El cargo no coincide con el contrato')).toBeInTheDocument()
    const cargo = screen.getByLabelText('Cargo', { exact: false })
    expect(cargo).toHaveValue('asistente administrativa')
    expect(screen.getByLabelText('Apellidos', { exact: false })).toHaveValue('Paredes Quinto')
    expect(screen.getByLabelText('N.° de expediente', { exact: false })).toHaveValue(
      'EXP-2026-005391',
    )
    fireEvent.change(cargo, { target: { value: 'secretaria' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar a revisión' }))
    const confirmacion = screen.getByRole('dialog', { name: '¿Reenviar a revisión?' })
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Reenviar' }))

    expect(
      await screen.findByText('✓ Documento corregido y reenviado a revisión'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Registrar otro documento' })).not.toBeInTheDocument()
    const llamada = fetch.mock.calls.find(([r]) => String(r).endsWith('/correccion'))!
    expect(llamada[0]).toBe('/api/documentos/DRA-2026-F8R2MA/correccion')
    expect(JSON.parse(String(llamada[1]?.body))).toMatchObject({
      numeroExpediente: 'EXP-2026-005391',
      apellidos: 'Paredes Quinto',
      datos: { cargo: 'secretaria', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
    })
  })

  it('un documento que no está observado no se corrige', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, { ...OBSERVADO, estado: 'PENDIENTE', motivo: null }),
    )
    render(<PaginaCorreccion codigo="DRA-2026-F8R2MA" />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo se corrige un documento observado.',
    )
  })

  it('en un lote, el certificado observado se corrige desde su fila', async () => {
    const LOTE = {
      numero: '2026-001',
      tipo: 'CERTIFICADO_CAPACITACION',
      tipoNombre: 'Certificado de Capacitación',
      areaNombre: 'Área de Capacitación',
      registradoPor: 'Rosa Quispe Huamán',
      registradoEn: '2026-10-07T15:00:00Z',
      datos: { nombreEvento: 'Manejo integrado de plagas en café' },
      periodo: 'del 14 al 16 de setiembre de 2026',
      ejemplo: {
        ...OBSERVADO,
        tipo: 'CERTIFICADO_CAPACITACION',
        nombres: 'Juan',
        apellidos: 'Ccori Pari',
      },
      documentos: [
        {
          codigo: 'DRA-2026-J4C7QX',
          nombres: 'Juan',
          apellidos: 'Ccori Pari',
          dni: '45218736',
          estado: 'FIRMADO',
          motivo: null,
        },
        {
          codigo: 'DRA-2026-G1L7DY',
          nombres: 'Gladys',
          apellidos: 'Sanchez',
          dni: '45903318',
          estado: 'OBSERVADO',
          motivo: 'El DNI no coincide',
        },
      ],
    }
    let intento = 0
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) => {
      if (String(ruta).endsWith('/correccion'))
        return ++intento === 1
          ? respuesta(400, {
              mensaje: 'Revise los datos.',
              campos: { dni: 'El DNI ya está en otro certificado de este lote.' },
            })
          : respuesta(200, {})
      return respuesta(200, LOTE)
    })
    render(<PaginaDetalleLote numero="2026-001" />)
    const corregir = await screen.findAllByRole('button', { name: 'Corregir' })
    expect(corregir).toHaveLength(1)
    fireEvent.click(corregir[0])
    const ventana = screen.getByRole('dialog', { name: 'Corregir certificado' })
    expect(within(ventana).getByText('El DNI no coincide')).toBeInTheDocument()
    expect(within(ventana).getByLabelText('Apellidos', { exact: false })).toHaveValue('Sanchez')
    fireEvent.change(within(ventana).getByLabelText('DNI', { exact: false }), {
      target: { value: '45218736' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Reenviar a revisión' }))
    expect(
      await within(ventana).findByText('El DNI ya está en otro certificado de este lote.'),
    ).toBeInTheDocument()

    fireEvent.change(within(ventana).getByLabelText('Apellidos', { exact: false }), {
      target: { value: 'Sánchez Ñaupari' },
    })
    fireEvent.change(within(ventana).getByLabelText('DNI', { exact: false }), {
      target: { value: '45903318' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Reenviar a revisión' }))
    expect(
      await screen.findByText(
        /El certificado de Gladys Sanchez se corrigió y se reenvió a revisión/,
      ),
    ).toBeInTheDocument()
    const ultima = fetch.mock.calls.filter(([r]) => String(r).endsWith('/correccion')).at(-1)!
    expect(JSON.parse(String(ultima[1]?.body))).toEqual({
      nombres: 'Gladys',
      apellidos: 'Sánchez Ñaupari',
      dni: '45903318',
    })
  })
})
