import { solicitar } from '../api/cliente'

export interface TipoDeDocumento {
  codigo: string
  nombre: string
  origen: 'SOLICITUD_PARTE' | 'OFICIO'
}

export interface AreaConfigurada {
  codigo: string
  nombre: string
  /** Personas activas con el rol Emisor de área. */
  personasActivas: number
  tipos: TipoDeDocumento[]
}

export interface Cambio {
  area: string
  evento: 'TIPO_ASIGNADO' | 'TIPO_QUITADO'
  detalle: string
  realizadoPor: string
  realizadoEn: string
}

/** DRA-60: pantalla "Áreas y documentos". */
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
