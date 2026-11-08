import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditoriaDelDocumento, DetalleTecnico } from './api'
import Auditoria from './Auditoria'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const SIN_REGISTRO: DetalleTecnico = {
  hashPdf: null,
  cid: null,
  transaccion: null,
  bloque: null,
  billeteraFirmante: null,
  registradoEn: null,
  transaccionAnulacion: null,
  bloqueAnulacion: null,
  anuladoEn: null,
  contrato: null,
}

const FIRMADO: AuditoriaDelDocumento = {
  eventos: [
    {
      evento: 'REGISTRADO',
      realizadoEn: '2026-11-04T15:05:00Z',
      responsable: 'Pedro Morales Ccanto',
      rol: 'Área encargada',
      detalle: 'Registrado y enviado a revisión por Pedro Morales Ccanto (Área de Administración)',
    },
    {
      evento: 'RECHAZADO',
      realizadoEn: '2026-11-04T16:00:00Z',
      responsable: 'Ing. Carlos Mendoza Rivera',
      rol: 'Director',
      detalle: 'Rechazado por Ing. Carlos Mendoza Rivera: datos de otra persona',
    },
    {
      evento: 'FIRMADO',
      realizadoEn: '2026-11-05T20:30:00Z',
      responsable: null,
      rol: null,
      detalle: 'Firma confirmada por la sincronización con la blockchain',
    },
  ],
  tecnico: {
    ...SIN_REGISTRO,
    hashPdf: 'a'.repeat(64),
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    transaccion: '0x' + 'b'.repeat(64),
    bloque: 1234,
    billeteraFirmante: '0x7c1E000000000000000000000000000000004B9a',
    registradoEn: '2026-11-05T20:30:00Z',
    contrato: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
}

function abrir(auditoria: AuditoriaDelDocumento | null) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    auditoria
      ? respuesta(200, auditoria)
      : respuesta(403, { mensaje: 'No tiene permiso para realizar esta acción.', campos: {} }),
  )
  render(<Auditoria codigo="DRA-2026-F8R2MA" />)
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Historial y auditoría (HU24)', () => {
  it('cada evento muestra su título, fecha, hora y responsable', async () => {
    abrir(FIRMADO)
    const historial = await screen.findByRole('region', { name: 'Historial' })
    const eventos = within(historial).getAllByRole('listitem')
    expect(eventos).toHaveLength(3)
    expect(eventos[0]).toHaveTextContent('Registrado y enviado a revisión')
    expect(eventos[0]).toHaveTextContent('04/11/2026 10:05 · Pedro Morales Ccanto (Área encargada)')
    expect(eventos[1]).toHaveTextContent('Rechazado por el Director')
    expect(eventos[1]).toHaveTextContent('datos de otra persona')
    // Un evento del sistema no tiene cuenta.
    expect(eventos[2]).toHaveTextContent('Firmado y registrado en la blockchain')
    expect(eventos[2]).toHaveTextContent(
      '05/11/2026 15:30 · Sistema (sincronización con la blockchain)',
    )
  })

  it('el detalle técnico aparece plegado y se despliega con sus datos', async () => {
    abrir(FIRMADO)
    const boton = await screen.findByRole('button', { name: /Detalle técnico de auditoría/ })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('a'.repeat(64))).not.toBeInTheDocument()

    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    for (const [etiqueta, valor] of [
      ['Huella digital del PDF (SHA-256)', 'a'.repeat(64)],
      ['Identificador en IPFS (CID)', FIRMADO.tecnico.cid],
      ['Transacción de la firma', FIRMADO.tecnico.transaccion],
      ['Bloque de la firma', '1234'],
      ['Billetera firmante', FIRMADO.tecnico.billeteraFirmante],
      ['Fecha y hora del registro', '05/11/2026 15:30'],
      ['Contrato RegistroDocumentos', FIRMADO.tecnico.contrato],
    ])
      expect(screen.getByText(etiqueta!).nextElementSibling).toHaveTextContent(valor!)
    expect(screen.queryByText('Transacción de la anulación')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Todavía no tiene registro en la blockchain.'),
    ).not.toBeInTheDocument()

    fireEvent.click(boton)
    expect(screen.queryByText('a'.repeat(64))).not.toBeInTheDocument()
  })

  it('cada valor se puede copiar', async () => {
    const escribir = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escribir },
      configurable: true,
    })
    abrir(FIRMADO)
    fireEvent.click(await screen.findByRole('button', { name: /Detalle técnico de auditoría/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar Transacción de la firma' }))
    expect(escribir).toHaveBeenCalledWith(FIRMADO.tecnico.transaccion)
    expect(
      await screen.findByRole('button', { name: 'Copiar Transacción de la firma' }),
    ).toHaveTextContent('Copiado')
  })

  it('un anulado muestra la transacción y el bloque de la anulación', async () => {
    abrir({
      ...FIRMADO,
      tecnico: {
        ...FIRMADO.tecnico,
        transaccionAnulacion: '0x' + 'c'.repeat(64),
        bloqueAnulacion: 1300,
        anuladoEn: '2026-11-06T14:00:00Z',
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: /Detalle técnico de auditoría/ }))
    expect(screen.getByText('Transacción de la anulación').nextElementSibling).toHaveTextContent(
      '0x' + 'c'.repeat(64),
    )
    expect(screen.getByText('Bloque de la anulación').nextElementSibling).toHaveTextContent('1300')
    expect(screen.getByText('Fecha y hora de la anulación').nextElementSibling).toHaveTextContent(
      '06/11/2026 09:00',
    )
  })

  it('un documento sin firmar todavía no tiene registro en la blockchain', async () => {
    abrir({ eventos: FIRMADO.eventos.slice(0, 1), tecnico: SIN_REGISTRO })
    fireEvent.click(await screen.findByRole('button', { name: /Detalle técnico de auditoría/ }))
    expect(screen.getByText('Todavía no tiene registro en la blockchain.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Copiar/ })).not.toBeInTheDocument()
  })

  it('si no tiene permiso, muestra el mensaje del servidor', async () => {
    abrir(null)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para realizar esta acción.',
    )
  })

  it('una impresión después de la primera se titula como duplicado (HU25)', async () => {
    abrir({
      eventos: [
        {
          evento: 'IMPRESO',
          realizadoEn: '2026-11-06T14:00:00Z',
          responsable: 'Luz Flores Ticona',
          rol: 'Consulta interna',
          detalle: 'Impreso por Luz Flores Ticona (Consulta interna)',
        },
        {
          evento: 'IMPRESO',
          realizadoEn: '2026-11-06T15:00:00Z',
          responsable: 'Luz Flores Ticona',
          rol: 'Consulta interna',
          detalle: 'Duplicado impreso por Luz Flores Ticona (Consulta interna). Impresión n.° 2',
        },
        {
          evento: 'DESCARGADO',
          realizadoEn: '2026-11-06T16:00:00Z',
          responsable: 'Luz Flores Ticona',
          rol: 'Consulta interna',
          detalle: 'PDF descargado por Luz Flores Ticona (Consulta interna)',
        },
      ],
      tecnico: SIN_REGISTRO,
    })
    const historial = await screen.findByRole('region', { name: 'Historial' })
    const titulos = within(historial)
      .getAllByRole('listitem')
      .map((e) => e.querySelector('p')?.textContent)
    expect(titulos).toEqual(['Impreso', 'Duplicado impreso', 'PDF descargado'])
  })
})
