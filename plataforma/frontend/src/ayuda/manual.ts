import manual from './manual.md?raw'

/** DRA-75: el enlace de una sección del manual, a partir de su título: "Para el Director" → para-el-director. */
export const seccionDe = (titulo: string) =>
  titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Las secciones del manual (sus títulos ##), en orden, para el índice. */
export const SECCIONES = [...manual.matchAll(/^## (.+)$/gm)].map(([, titulo]) => ({
  titulo,
  id: seccionDe(titulo),
}))

/** La sección del manual de cada rol, para el enlace del inicio. */
export const SECCION_DEL_ROL: Record<string, string> = {
  ADMINISTRADOR: 'para-el-administrador',
  AREA_ENCARGADA: 'para-el-emisor-de-area',
  DIRECTOR: 'para-el-director',
  CONSULTA_INTERNA: 'para-mesa-de-partes',
  MESA_PARTES_AREA: 'para-mesa-de-partes',
}

/** Capturas que usa el manual (capturas/x.png), con la dirección que les da Vite. */
export const CAPTURAS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('./capturas/*.png', { eager: true, query: '?url', import: 'default' }),
  ).map(([ruta, url]) => [ruta.replace('./', ''), url]),
)
