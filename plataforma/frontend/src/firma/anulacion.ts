import { solicitar } from '../api/cliente'
import type { EstadoDocumento } from '../documentos/api'

/** Un documento de la pantalla Documentos firmados (HU29). */
export interface DocumentoFirmado {
  codigo: string
  lote: string | null
  evento: string | null
  tipoNombre: string
  nombres: string
  apellidos: string
  dni: string
  areaNombre: string
  firmadoEn: string
  estado: EstadoDocumento
  anuladoEn: string | null
  motivoAnulacion: string | null
  /** HU30: su reemisión en revisión; mientras tanto no se anula por separado. */
  reemisionEnCurso?: string | null
}

const enviar = <T>(ruta: string, cuerpo: unknown) =>
  solicitar<T>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) })
const ruta = (codigo: string, paso: string) =>
  `/api/anulacion/${encodeURIComponent(codigo)}/${paso}`

export const firmados = () => solicitar<DocumentoFirmado[]>('/api/firmados')

/** Guarda el motivo antes de que la billetera envíe la anulación. */
export const solicitarAnulacion = (codigo: string, motivo: string) =>
  enviar<DocumentoFirmado>(ruta(codigo, 'solicitud'), { motivo })

/** El servidor lee la transacción en la blockchain y el documento pasa a Anulado. */
export const confirmarAnulacion = (codigo: string, transaccion: string) =>
  enviar<DocumentoFirmado>(ruta(codigo, 'confirmacion'), { transaccion })

/** La anulación no se completó: el documento sigue firmado y se descarta el motivo. */
export const cancelarAnulacion = (codigo: string) =>
  enviar<DocumentoFirmado>(ruta(codigo, 'cancelacion'), {})
