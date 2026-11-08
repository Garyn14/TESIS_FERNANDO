import { solicitar } from '../api/cliente'
import type { EstadoDocumento } from '../documentos/api'

/** Filtros por estado de Buscar documentos (HU22). */
export type FiltroDeEstado =
  'TODOS' | 'EN_TRAMITE' | 'FIRMADOS' | 'ANULADOS' | 'RECHAZADOS' | 'LISTOS_PARA_ENTREGAR'

export const FILTROS: { valor: FiltroDeEstado; titulo: string }[] = [
  { valor: 'TODOS', titulo: 'Todos' },
  { valor: 'EN_TRAMITE', titulo: 'En trámite' },
  { valor: 'FIRMADOS', titulo: 'Firmados' },
  { valor: 'ANULADOS', titulo: 'Anulados' },
  { valor: 'RECHAZADOS', titulo: 'Rechazados' },
  // HU25: firmados que todavía no se imprimieron ni descargaron.
  { valor: 'LISTOS_PARA_ENTREGAR', titulo: 'Listos para entregar' },
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

/** HU23: estado y datos básicos de un documento, para informar al ciudadano. */
export interface FichaDelDocumento {
  codigo: string
  tipoNombre: string
  origen: 'SOLICITUD_PARTE' | 'OFICIO'
  estado: EstadoDocumento
  beneficiario: string
  dni: string
  numeroExpediente: string | null
  areaNombre: string
  lote: string | null
  evento: string | null
  registradoEn: string
  motivo: string | null
  firmadoEn: string | null
  anuladoEn: string | null
  reemplazaA: string | null
  reemisionEnCurso: string | null
  reemplazadoPor: string | null
  /** HU25: cuántas veces Mesa de Partes lo imprimió y descargó. */
  impresiones: number
  descargas: number
}

export const fichaDelDocumento = (codigo: string) =>
  solicitar<FichaDelDocumento>(`/api/consulta/documentos/${encodeURIComponent(codigo)}`)

const FECHA_Y_HORA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Lima',
})

/** Fecha y hora en hora de Lima: 08/11/2026 09:15. */
export const fechaYHora = (iso: string) => FECHA_Y_HORA.format(new Date(iso)).replace(',', '')

/** La búsqueda como parámetros de la dirección: texto=…&estado=…, sin los valores por defecto. */
export function consultaDe(texto: string, filtro: FiltroDeEstado) {
  const p = new URLSearchParams()
  if (texto) p.set('texto', texto)
  if (filtro !== 'TODOS') p.set('estado', filtro)
  return p.toString()
}

/** HU24: tipos de evento del historial de un documento. */
export type EventoDocumento =
  | 'REGISTRADO'
  | 'REVISADO'
  | 'PREPARADO'
  | 'ERROR_ALMACENAMIENTO'
  | 'FIRMADO'
  | 'FIRMA_CANCELADA'
  | 'OBSERVADO'
  | 'RECHAZADO'
  | 'CORREGIDO'
  | 'ANULADO'
  | 'REEMISION_SOLICITADA'
  | 'IMPRESO'
  | 'DESCARGADO'

export interface EventoDelHistorial {
  evento: EventoDocumento
  realizadoEn: string
  /** Nulo si lo registró el sistema (la sincronización con la blockchain). */
  responsable: string | null
  rol: string | null
  detalle: string | null
}

export interface DetalleTecnico {
  hashPdf: string | null
  cid: string | null
  transaccion: string | null
  bloque: number | null
  billeteraFirmante: string | null
  registradoEn: string | null
  transaccionAnulacion: string | null
  bloqueAnulacion: number | null
  anuladoEn: string | null
  contrato: string | null
}

export interface AuditoriaDelDocumento {
  eventos: EventoDelHistorial[]
  tecnico: DetalleTecnico
}

export const auditoriaDelDocumento = (codigo: string) =>
  solicitar<AuditoriaDelDocumento>(
    `/api/consulta/documentos/${encodeURIComponent(codigo)}/auditoria`,
  )

/** HU25: "Ver documento" abre esta dirección en otra pestaña; no se registra. */
export const direccionDelPdf = (codigo: string) =>
  `/api/consulta/documentos/${encodeURIComponent(codigo)}/pdf`

/** HU25: descarga o impresión del PDF comprobado; queda en el historial. */
export const entregar = (codigo: string, forma: 'IMPRESION' | 'DESCARGA') =>
  solicitar<Blob>(`/api/consulta/documentos/${encodeURIComponent(codigo)}/entregas`, {
    method: 'POST',
    body: JSON.stringify({ forma }),
    comoArchivo: true,
  })

const veces = (n: number) => (n === 1 ? '1 vez' : `${n} veces`)

/** Estado de entrega de un documento firmado (HU25). */
export function estadoDeEntrega(ficha: FichaDelDocumento) {
  if (ficha.impresiones === 0 && ficha.descargas === 0) return 'Listo para entregar'
  return `Entregado: impreso ${veces(ficha.impresiones)}, descargado ${veces(ficha.descargas)}`
}
