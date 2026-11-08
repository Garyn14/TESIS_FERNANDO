import { solicitar } from '../api/cliente'
import type { EstadoDocumento } from '../documentos/api'

/** Filtros por estado de Buscar documentos (HU22). */
export type FiltroDeEstado = 'TODOS' | 'EN_TRAMITE' | 'FIRMADOS' | 'ANULADOS' | 'RECHAZADOS'

export const FILTROS: { valor: FiltroDeEstado; titulo: string }[] = [
  { valor: 'TODOS', titulo: 'Todos' },
  { valor: 'EN_TRAMITE', titulo: 'En trámite' },
  { valor: 'FIRMADOS', titulo: 'Firmados' },
  { valor: 'ANULADOS', titulo: 'Anulados' },
  { valor: 'RECHAZADOS', titulo: 'Rechazados' },
]

/** Un documento, o un lote con los certificados que coinciden con la búsqueda. */
export interface FilaDeBusqueda {
  codigo: string | null
  lote: string | null
  tipoNombre: string
  beneficiario: string | null
  dni: string | null
  numeroExpediente: string | null
  areaNombre: string
  registradoEn: string
  estado: EstadoDocumento | null
  /** En un lote: cuántos certificados tiene en total. */
  cantidad: number | null
  /** En un lote: si se muestran todos sus certificados. */
  completo: boolean | null
  certificados: FilaDeBusqueda[] | null
}

export interface ResultadoDeBusqueda {
  filas: FilaDeBusqueda[]
  hayMas: boolean
}

export const MAXIMO_DE_FILAS = 50
export const MINIMO_DE_CARACTERES = 2

export const buscarDocumentos = (texto: string, estado: FiltroDeEstado) =>
  solicitar<ResultadoDeBusqueda>(
    `/api/consulta/documentos?${new URLSearchParams({ texto, estado })}`,
  )
