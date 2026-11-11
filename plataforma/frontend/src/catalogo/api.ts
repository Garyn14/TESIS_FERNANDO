import { solicitar } from '../api/cliente'

export interface TipoDeDocumento {
  codigo: string
  nombre: string
  origen: 'SOLICITUD_PARTE' | 'OFICIO'
}

export interface AreaConfigurada {
  codigo: string
  nombre: string
  /** DRA-61: una área deshabilitada conserva sus tipos y no registra documentos nuevos. */
  activa: boolean
  /** Personas activas con el rol Emisor de área. */
  personasActivas: number
  tipos: TipoDeDocumento[]
}

export interface Cambio {
  area: string
  evento:
    | 'TIPO_ASIGNADO'
    | 'TIPO_QUITADO'
    | 'AREA_CREADA'
    | 'AREA_RENOMBRADA'
    | 'AREA_DESHABILITADA'
    | 'AREA_REACTIVADA'
  detalle: string
  realizadoPor: string
  realizadoEn: string
}

/** DRA-60 y DRA-61: pantalla "Áreas y documentos". */
export interface Catalogo {
  areas: AreaConfigurada[]
  tipos: TipoDeDocumento[]
  historial: Cambio[]
}

const ruta = (area: string, tipo: string) => `/api/catalogo/areas/${area}/tipos-documento/${tipo}`

export const consultarCatalogo = () => solicitar<Catalogo>('/api/catalogo')

export const asignarTipo = (area: string, tipo: string) =>
  solicitar<Catalogo>(ruta(area, tipo), { method: 'PUT' })

export const quitarTipo = (area: string, tipo: string) =>
  solicitar<Catalogo>(ruta(area, tipo), { method: 'DELETE' })

const conNombre = (nombre: string) => ({ body: JSON.stringify({ nombre }) })

/** DRA-61. No existe la operación de eliminar un área. */
export const crearArea = (nombre: string) =>
  solicitar<Catalogo>('/api/catalogo/areas', { method: 'POST', ...conNombre(nombre) })

export const renombrarArea = (area: string, nombre: string) =>
  solicitar<Catalogo>(`/api/catalogo/areas/${area}`, { method: 'PUT', ...conNombre(nombre) })

export const deshabilitarArea = (area: string) =>
  solicitar<Catalogo>(`/api/catalogo/areas/${area}/deshabilitar`, { method: 'POST' })

export const reactivarArea = (area: string) =>
  solicitar<Catalogo>(`/api/catalogo/areas/${area}/reactivar`, { method: 'POST' })
