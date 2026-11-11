/**
 * Opciones del menú y el permiso que exige cada una (HU03, RF04). El menú muestra solo las
 * opciones cuyo permiso tiene la sesión; las rutas también se protegen por permiso.
 */
export interface OpcionMenu {
  ruta: string
  titulo: string
  permiso: string
  /** Pantalla aún no construida: se muestra el aviso con el sprint en que se habilita. */
  pendiente?: string
}

export const MENU: OpcionMenu[] = [
  { ruta: 'inicio', titulo: 'Inicio', permiso: 'CUENTA_PROPIA' },
  { ruta: 'usuarios', titulo: 'Usuarios', permiso: 'USUARIOS_GESTIONAR' },
  {
    ruta: 'billetera',
    titulo: 'Billetera del director',
    permiso: 'BILLETERA_GESTIONAR',
  },
  {
    ruta: 'areas',
    titulo: 'Áreas y documentos',
    permiso: 'CATALOGO_GESTIONAR',
  },
  {
    ruta: 'mis-documentos',
    titulo: 'Mis documentos',
    permiso: 'DOCUMENTO_VER_AREA',
  },
  {
    ruta: 'nuevo-documento',
    titulo: 'Nuevo documento',
    permiso: 'DOCUMENTO_REGISTRAR',
  },
  {
    ruta: 'por-revisar',
    titulo: 'Por revisar',
    permiso: 'DOCUMENTO_REVISAR',
  },
  {
    ruta: 'firmados',
    titulo: 'Documentos firmados',
    permiso: 'DOCUMENTO_VER_FIRMADOS',
  },
  {
    ruta: 'buscar',
    titulo: 'Buscar documentos',
    permiso: 'DOCUMENTO_BUSCAR',
  },
]

export const opcionesPermitidas = (permisos: string[]) =>
  MENU.filter((o) => permisos.includes(o.permiso))
