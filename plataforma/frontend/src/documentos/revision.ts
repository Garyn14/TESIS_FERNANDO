import { solicitar } from '../api/cliente'
import type { Documento, Lote } from './api'

/**
 * Una fila de la bandeja "Por revisar" (HU10): un documento, o un lote completo con el nombre del
 * evento y la cantidad de certificados (RF21).
 */
export interface ElementoPorRevisar {
  codigo: string | null
  lote: string | null
  tipoNombre: string
  beneficiario: string | null
  evento: string | null
  cantidad: number
  numeroExpediente: string | null
  areaNombre: string
  enviadoPor: string
  registradoEn: string
  revisado: boolean
  /** Reenviado por el área tras una observación (HU15). */
  corregido?: boolean
  /** HU30: reemplaza a un documento firmado (en un lote: alguno de sus certificados). */
  reemision?: boolean
}

/** Pendientes de todas las áreas, del más antiguo al más reciente. */
export const bandeja = () => solicitar<ElementoPorRevisar[]>('/api/revision')

/** Abre un documento para revisarlo; el servidor registra la revisión (RF22). */
export const revisarDocumento = (codigo: string) =>
  solicitar<Documento>(`/api/revision/documentos/${encodeURIComponent(codigo)}`, {
    method: 'POST',
  })

/** Abre un lote; la revisión cuenta para todos sus documentos (RF22). */
export const revisarLote = (numero: string) =>
  solicitar<Lote>(`/api/revision/lotes/${encodeURIComponent(numero)}`, { method: 'POST' })

/** HU12: observa o rechaza certificados Pendientes de un lote; sin códigos, todo el lote. */
export const decidirEnLote = (
  numero: string,
  decision: 'observacion' | 'rechazo',
  codigos: string[],
  motivo: string,
) =>
  solicitar<Lote>(`/api/revision/lotes/${encodeURIComponent(numero)}/${decision}`, {
    method: 'POST',
    body: JSON.stringify({ codigos, motivo }),
  })

/** HU13: observa un documento Pendiente con su motivo; vuelve al Área encargada. */
export const observarDocumento = (codigo: string, motivo: string) =>
  solicitar<Documento>(`/api/revision/documentos/${encodeURIComponent(codigo)}/observacion`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })

/** HU14: rechaza un documento Pendiente con su motivo; el rechazo es definitivo. */
export const rechazarDocumento = (codigo: string, motivo: string) =>
  solicitar<Documento>(`/api/revision/documentos/${encodeURIComponent(codigo)}/rechazo`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  })
