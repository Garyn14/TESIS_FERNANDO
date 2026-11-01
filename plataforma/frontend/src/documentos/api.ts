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
  tipo: 'TEXTO' | 'FECHA' | 'OPCION'
  ayuda: string | null
  opciones: string[]
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
  numeroExpediente: string
  nombres: string
  apellidos: string
  dni: string
  texto: string
  /** Nombre del Director que firma, o null si aún no hay ninguno. */
  firmante: string | null
}

export type EstadoDocumento = 'PENDIENTE'

export interface Documento extends VistaPrevia {
  codigo: string
  origen: Origen
  estado: EstadoDocumento
  areaNombre: string
  registradoPor: string
  registradoEn: string
}

export interface DocumentoResumen {
  codigo: string
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

export const ESTADOS: Record<EstadoDocumento, string> = { PENDIENTE: 'Pendiente' }

const FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Lima',
})

/** Fecha de envío en el formato del prototipo: 28/09/2026. */
export const fechaCorta = (iso: string) => FECHA.format(new Date(iso))
