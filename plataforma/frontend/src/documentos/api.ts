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
}

/** Tipos de documento del área de la persona; el servidor aplica la regla de RF05. */
export const tiposPermitidos = () => solicitar<TipoDocumento[]>('/api/tipos-documento')

/** Un tipo permitido, para abrir su formulario; si no es del área, el servidor responde 403. */
export const tipoPermitido = (codigo: string) =>
  solicitar<TipoDocumento>(`/api/tipos-documento/${encodeURIComponent(codigo)}`)
