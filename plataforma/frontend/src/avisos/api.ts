import { solicitar } from '../api/cliente'

export interface Aviso {
  id: number
  tipo: string
  texto: string
  /** Ruta de la plataforma que abre, sin "#/". */
  enlace: string
  creadoEn: string
  leido: boolean
}

export interface Avisos {
  avisos: Aviso[]
  sinLeer: number
}

export const misAvisos = () => solicitar<Avisos>('/api/avisos')
export const marcarLeido = (id: number) =>
  solicitar<void>(`/api/avisos/${id}/lectura`, { method: 'POST' })
export const marcarTodos = () => solicitar<void>('/api/avisos/lectura', { method: 'POST' })

const DIA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Lima',
})

/** Antigüedad de un aviso: "hace un momento", "hace 5 min", "hace 2 h", "ayer" o la fecha. */
export function antiguedad(iso: string, ahora = new Date()) {
  const minutos = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return 'hace un momento'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  if (horas < 48) return 'ayer'
  return DIA.format(new Date(iso))
}
