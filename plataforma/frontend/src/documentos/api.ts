import { solicitar } from '../api/cliente'

/** SOLICITUD_PARTE: individual, con número de expediente (HU08). OFICIO: emisión por lista (HU09). */
export type Origen = 'SOLICITUD_PARTE' | 'OFICIO'

/** Tipo de documento que la cuenta puede registrar (HU05, HU07). */
export interface TipoDocumento {
  codigo: string
  nombre: string
  descripcion: string
  titulo: 'CERTIFICADO' | 'CONSTANCIA'
  origen: Origen
  /** Campos del formulario; vacío para los de oficio (HU09). */
  campos: Campo[]
}

/** Tipos de documento del área de la persona; el servidor aplica la regla de RF05. */
export const tiposPermitidos = () => solicitar<TipoDocumento[]>('/api/tipos-documento')

/** Un tipo permitido, para abrir su formulario; si no es del área, el servidor responde 403. */
export const tipoPermitido = (codigo: string) =>
  solicitar<TipoDocumento>(`/api/tipos-documento/${encodeURIComponent(codigo)}`)

/** Campo propio del formulario de un tipo a solicitud de parte (HU08). */
export interface Campo {
  nombre: string
  etiqueta: string
  tipo: 'TEXTO' | 'FECHA' | 'OPCION' | 'NUMERO'
  ayuda: string | null
  opciones: string[]
  /** Largo máximo de un TEXTO o valor máximo de un NUMERO. */
  maximo: number
}

export interface SolicitudDocumento {
  tipo: string
  numeroExpediente: string
  nombres: string
  apellidos: string
  dni: string
  datos: Record<string, string>
}

/** Datos para la vista previa con la plantilla del tipo (RF18). */
export interface VistaPrevia {
  tipo: string
  tipoNombre: string
  titulo: TipoDocumento['titulo']
  numeroExpediente: string | null
  nombres: string
  apellidos: string
  dni: string
  texto: string
  /** Nombre del Director que firma, o null si aún no hay ninguno. */
  firmante: string | null
}

export type EstadoDocumento = 'PENDIENTE' | 'PROCESANDO_FIRMA'

export interface Documento extends VistaPrevia {
  codigo: string
  /** Número del lote, para los de una emisión por lista (HU09). */
  lote: string | null
  origen: Origen
  estado: EstadoDocumento
  areaNombre: string
  registradoPor: string
  registradoEn: string
}

/** Una fila de Mis documentos: un documento, o un lote completo (HU09). */
export interface DocumentoResumen {
  codigo: string | null
  lote: string | null
  cantidad: number
  tipoNombre: string
  beneficiario: string
  numeroExpediente: string | null
  registradoEn: string
  estado: EstadoDocumento
}

/** Valida en el servidor y arma el texto, sin guardar nada. */
export const vistaPrevia = (solicitud: SolicitudDocumento) =>
  solicitar<VistaPrevia>('/api/documentos/vista-previa', {
    method: 'POST',
    body: JSON.stringify(solicitud),
  })

/** Registra el documento y lo deja Pendiente, con su código de verificación (RF16). */
export const registrar = (solicitud: SolicitudDocumento) =>
  solicitar<Documento>('/api/documentos', { method: 'POST', body: JSON.stringify(solicitud) })

/** Mis documentos: solo los del área de la persona (RF05). */
export const documentosDelArea = () => solicitar<DocumentoResumen[]>('/api/documentos')

export const documento = (codigo: string) =>
  solicitar<Documento>(`/api/documentos/${encodeURIComponent(codigo)}`)

export const ESTADOS: Record<EstadoDocumento, string> = {
  PENDIENTE: 'Pendiente',
  PROCESANDO_FIRMA: 'Procesando firma',
}

const FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Lima',
})

/** Fecha de envío en el formato del prototipo: 28/09/2026. */
export const fechaCorta = (iso: string) => FECHA.format(new Date(iso))

// ---------------------------------------------------------------- HU09: emisión por lista

export interface Beneficiario {
  nombres: string
  apellidos: string
  dni: string
}

export interface SolicitudLote {
  tipo: string
  datos: Record<string, string>
  beneficiarios: Beneficiario[]
}

/** Vista previa del lote (RF19): un certificado de ejemplo y el resumen. */
export interface VistaPreviaLote {
  ejemplo: VistaPrevia
  cantidad: number
  beneficiarios: string[]
  datos: Record<string, string>
  periodo: string
}

export interface Lote {
  numero: string
  tipo: string
  tipoNombre: string
  areaNombre: string
  registradoPor: string
  registradoEn: string
  datos: Record<string, string>
  periodo: string
  ejemplo: VistaPrevia
  documentos: (Beneficiario & { codigo: string; estado: EstadoDocumento })[]
}

/** Descarga la plantilla Excel de beneficiarios (RF14). */
export async function descargarPlantilla(tipo: string) {
  const respuesta = await fetch(`/api/lotes/plantilla?tipo=${encodeURIComponent(tipo)}`, {
    credentials: 'include',
  })
  if (!respuesta.ok) throw new Error('No se pudo descargar la plantilla.')
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(await respuesta.blob())
  enlace.download = 'plantilla-beneficiarios.xlsx'
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

/** Lee las filas del Excel en el servidor; se validan igual que las ingresadas a mano. */
export function importarExcel(archivo: File) {
  const formulario = new FormData()
  formulario.append('archivo', archivo)
  return solicitar<Beneficiario[]>('/api/lotes/importar', { method: 'POST', body: formulario })
}

export const vistaPreviaLote = (solicitud: SolicitudLote) =>
  solicitar<VistaPreviaLote>('/api/lotes/vista-previa', {
    method: 'POST',
    body: JSON.stringify(solicitud),
  })

export const registrarLote = (solicitud: SolicitudLote) =>
  solicitar<Lote>('/api/lotes', { method: 'POST', body: JSON.stringify(solicitud) })

export const lote = (numero: string) => solicitar<Lote>(`/api/lotes/${encodeURIComponent(numero)}`)
