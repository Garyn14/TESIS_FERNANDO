import { solicitar } from '../api/cliente'

export interface Cuenta {
  id: number
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  rolNombre: string
  /** Código y nombre del área (HU05), o null. */
  area: string | null
  areaNombre: string | null
  activo: boolean
  debeCambiarContrasena: boolean
  /** Hasta cuándo está bloqueada por intentos fallidos (HU03), o null. */
  bloqueadaHasta: string | null
  creadoEn: string
}

export interface Rol {
  codigo: string
  nombre: string
  descripcion: string
  /** El rol exige un área y solo ve lo de ella (Emisor de área, Mesa de Partes de área; DRA-58). */
  limitadoAlArea: boolean
}

/** True si el rol elegido exige área (HU05, RF05; DRA-58). */
export const exigeArea = (roles: Rol[], codigo: string) =>
  roles.some((r) => r.codigo === codigo && r.limitadoAlArea)

export interface TipoDocumento {
  codigo: string
  nombre: string
}

export interface Area {
  codigo: string
  nombre: string
  tipos: TipoDocumento[]
}

export interface NuevaCuenta {
  nombreUsuario: string
  nombreCompleto: string
  rol: string
  /** Código del área; solo para los roles limitados a un área. */
  area: string
  contrasenaTemporal: string
}

export type EdicionCuenta = Pick<NuevaCuenta, 'nombreCompleto' | 'rol' | 'area'>

export const listarCuentas = () => solicitar<Cuenta[]>('/api/usuarios')

export const listarRoles = () => solicitar<Rol[]>('/api/roles')

export const listarAreas = () => solicitar<Area[]>('/api/areas')

/** Tipos de documento que la sesión puede registrar: los de su área si es Área encargada (RF05). */
/** Sin área elegida se envía null; el servidor ignora el área de los roles que no la llevan. */
const conArea = <T extends { area: string }>(datos: T) => ({
  ...datos,
  area: datos.area || null,
})

export const crearCuenta = (datos: NuevaCuenta) =>
  solicitar<Cuenta>('/api/usuarios', { method: 'POST', body: JSON.stringify(conArea(datos)) })

export const editarCuenta = (id: number, datos: EdicionCuenta) =>
  solicitar<Cuenta>(`/api/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(conArea(datos)),
  })

export const desactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/desactivar`, { method: 'POST' })

export const reactivarCuenta = (id: number) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/reactivar`, { method: 'POST' })

export const restablecerContrasena = (id: number, contrasenaTemporal: string) =>
  solicitar<Cuenta>(`/api/usuarios/${id}/restablecer-contrasena`, {
    method: 'POST',
    body: JSON.stringify({ contrasenaTemporal }),
  })
