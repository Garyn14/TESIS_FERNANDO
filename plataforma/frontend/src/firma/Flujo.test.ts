import { describe, expect, it, vi } from 'vitest'
import { ErrorBilletera, type DocumentoAFirmar } from '../blockchain/billetera'
import type { Preparado } from './api'
import { enTandas, firmar, type Dependencias, type Paso } from './flujo'

const preparado = (i: number): Preparado => ({
  codigo: `DRA-2026-A${String(i).padStart(5, '0')}`,
  hash: 'ab'.repeat(32),
  cid: 'bafy' + i,
  dniHmac: 'cd'.repeat(32),
})

function dependencias(n: number, cambios: Partial<Dependencias> = {}): Dependencias {
  const preparados = Array.from({ length: n }, (_, i) => preparado(i))
  let tx = 0
  return {
    preparar: vi.fn(async () => ({
      preparados,
      noPreparados: [{ codigo: 'DRA-2026-SINREV', motivo: 'El documento aún no fue revisado.' }],
    })),
    registrar: vi.fn(async (_lote, alEnviar) => {
      alEnviar()
      return '0x' + String(++tx).padStart(64, '0')
    }),
    confirmar: vi.fn(async (transaccion: string) => ({
      transaccion,
      bloque: 10,
      firmados: preparados
        .slice((Number(transaccion) - 1) * 50, Number(transaccion) * 50)
        .map((p) => ({ codigo: p.codigo, fechaEmision: '2026-11-04T15:30Z' })),
      noAplicados: [],
    })),
    cancelar: vi.fn(async (codigos: string[]) => ({ devueltos: codigos, noDevueltos: [] })),
    ...cambios,
  }
}

describe('Firma en tandas (HU11)', () => {
  it('divide la selección en tandas de hasta 50', () => {
    const tandas = enTandas(Array.from({ length: 120 }, (_, i) => i))
    expect(tandas.map((t) => t.length)).toEqual([50, 50, 20])
    expect(enTandas([1, 2, 3])).toEqual([[1, 2, 3]])
  })

  it('121 documentos se registran en 3 transacciones y se confirman todas', async () => {
    const deps = dependencias(121)
    const pasos: Paso[] = []
    const resultado = await firmar(deps, (p) => pasos.push(p))
    expect(deps.registrar).toHaveBeenCalledTimes(3)
    expect(vi.mocked(deps.registrar).mock.calls.map(([lote]) => lote.length)).toEqual([50, 50, 21])
    expect(resultado.transacciones).toHaveLength(3)
    expect(resultado.firmados).toHaveLength(121)
    // Lo que no se pudo preparar se informa aparte.
    expect(resultado.noFirmados).toEqual([
      { codigo: 'DRA-2026-SINREV', motivo: 'El documento aún no fue revisado.' },
    ])
    expect(pasos[0]).toEqual({ tipo: 'preparando' })
    expect(pasos).toContainEqual({ tipo: 'confirmando', tanda: 3, tandas: 3 })
  })

  it('si una transacción falla, sus documentos vuelven a Pendiente y las demás siguen', async () => {
    let llamada = 0
    const deps = dependencias(60, {
      registrar: vi.fn(async () => {
        llamada++
        if (llamada === 1) throw new ErrorBilletera('La blockchain rechazó la transacción.')
        return '0x' + '2'.padStart(64, '0')
      }),
    })
    const resultado = await firmar(deps, () => {})
    expect(deps.cancelar).toHaveBeenCalledWith(
      Array.from({ length: 50 }, (_, i) => preparado(i).codigo),
      'La blockchain no registró la transacción',
    )
    expect(resultado.firmados).toHaveLength(10)
    expect(resultado.noFirmados).toHaveLength(51)
    expect(resultado.noFirmados[1].motivo).toBe('La blockchain no registró la transacción.')
  })

  it('cancelar en la billetera devuelve los documentos con ese motivo', async () => {
    const deps = dependencias(2, {
      registrar: vi.fn(async () => {
        throw Object.assign(new ErrorBilletera('Operación cancelada en la billetera.'), {
          cancelada: true,
        })
      }),
    })
    const resultado = await firmar(deps, () => {})
    expect(deps.cancelar).toHaveBeenCalledWith(
      [preparado(0).codigo, preparado(1).codigo],
      'Firma cancelada en la billetera',
    )
    expect(resultado.firmados).toEqual([])
    expect(resultado.noFirmados.slice(1).map((d) => d.motivo)).toEqual([
      'Firma cancelada en la billetera.',
      'Firma cancelada en la billetera.',
    ])
  })

  it('si la transacción se envió pero no se confirma, quedan en proceso (no se devuelven)', async () => {
    const deps = dependencias(2, {
      confirmar: vi.fn(async () => {
        throw new Error('sin conexión')
      }),
    })
    const resultado = await firmar(deps, () => {})
    expect(deps.cancelar).not.toHaveBeenCalled()
    expect(resultado.sinConfirmar).toHaveLength(2)
    expect(resultado.firmados).toEqual([])
  })
})

describe('Firma de reemisiones (HU30)', () => {
  it('las reemisiones van en su propia transacción, separadas de los documentos nuevos', async () => {
    const lista = [
      preparado(1),
      { ...preparado(2), reemplaza: 'DRA-2026-ORIG01' },
      preparado(3),
      { ...preparado(4), reemplaza: 'DRA-2026-ORIG02' },
    ]
    const registrar = vi.fn(async (_lote: DocumentoAFirmar[], alEnviar: () => void) => {
      alEnviar()
      return '0x' + String(registrar.mock.calls.length).padStart(64, '0')
    })
    const deps: Dependencias = {
      preparar: async () => ({ preparados: lista, noPreparados: [] }),
      registrar,
      confirmar: async (transaccion: string) => ({
        transaccion,
        bloque: 1,
        firmados: [],
        noAplicados: [],
      }),
      cancelar: async (codigos: string[]) => ({ devueltos: codigos, noDevueltos: [] }),
    }
    await firmar(deps, () => undefined)
    expect(registrar.mock.calls.map(([lote]) => lote.map((d) => d.reemplaza ?? null))).toEqual([
      [null, null],
      ['DRA-2026-ORIG01', 'DRA-2026-ORIG02'],
    ])
  })
})
