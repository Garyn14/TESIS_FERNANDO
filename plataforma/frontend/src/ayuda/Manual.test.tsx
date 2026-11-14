import { render, screen, within } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ESTADOS } from '../documentos/api'
import { MENU, opcionesPermitidas } from '../estructura/menu'
import { PaginaInicio } from '../estructura/Paginas'
import type { Sesion } from '../sesion/api'
import manual from './manual.md?raw'
import { SECCION_DEL_ROL, SECCIONES } from './manual'
import { PaginaManual } from './PaginaManual'

afterEach(() => vi.restoreAllMocks())

const sesion = (rol: string, rolNombre: string, permisos = ['CUENTA_PROPIA']): Sesion => ({
  nombreUsuario: 'prueba',
  nombreCompleto: 'Ana Prueba',
  rol,
  rolNombre,
  areaNombre: null,
  permisos,
  debeCambiarContrasena: false,
})

/** Todo el código de las pantallas (sin las pruebas), para comparar los nombres del manual. */
function codigoDeLasPantallas(carpeta = join(__dirname, '..')): string {
  return readdirSync(carpeta, { withFileTypes: true })
    .map((e) => {
      const ruta = join(carpeta, e.name)
      if (e.isDirectory()) return codigoDeLasPantallas(ruta)
      return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? readFileSync(ruta, 'utf8') : ''
    })
    .join('\n')
}

describe('Manual de usuario (DRA-75)', () => {
  it('está en el menú de todos los roles', () => {
    expect(MENU.at(-1)).toMatchObject({ ruta: 'manual', titulo: 'Manual de usuario' })
    // CUENTA_PROPIA es el permiso que tienen todos los roles.
    expect(opcionesPermitidas(['CUENTA_PROPIA']).map((o) => o.titulo)).toContain(
      'Manual de usuario',
    )
  })

  it('muestra el manual con su índice, que enlaza a cada sección', () => {
    render(<PaginaManual />)
    expect(screen.getByRole('heading', { level: 1, name: 'Manual de usuario' })).toBeInTheDocument()
    const indice = screen.getByRole('navigation', { name: 'Contenido del manual' })
    const enlaces = within(indice).getAllByRole('link')
    expect(enlaces.map((e) => e.textContent)).toEqual([
      'La plataforma en una página',
      'Para todos',
      'Para el Administrador',
      'Para el Emisor de área',
      'Para el Director',
      'Para Mesa de Partes',
      'La verificación pública',
      'Glosario',
    ])
    for (const s of SECCIONES) {
      expect(screen.getByRole('link', { name: s.titulo })).toHaveAttribute(
        'href',
        `#/manual/${s.id}`,
      )
      expect(document.getElementById(s.id)).toHaveTextContent(s.titulo)
    }
  })

  it('el botón imprime el manual', () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<PaginaManual />)
    screen.getByRole('button', { name: 'Imprimir o guardar en PDF' }).click()
    expect(imprimir).toHaveBeenCalled()
  })

  it('el inicio lleva al manual y a la sección del rol de cada persona', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'))
    for (const [rol, seccion] of Object.entries(SECCION_DEL_ROL)) {
      expect(SECCIONES.map((s) => s.id)).toContain(seccion)
      const { unmount } = render(<PaginaInicio sesion={sesion(rol, 'Director')} />)
      const ayuda = screen.getByRole('complementary', { name: '¿Necesita ayuda?' })
      expect(
        within(ayuda).getByRole('link', { name: 'Ver lo que hace el rol Director' }),
      ).toHaveAttribute('href', `#/manual/${seccion}`)
      expect(within(ayuda).getByRole('link', { name: 'Abrir el manual completo' })).toHaveAttribute(
        'href',
        '#/manual',
      )
      unmount()
    }
  })

  it('nombra las opciones del menú y los estados igual que la pantalla', () => {
    for (const opcion of MENU) expect(manual).toContain(`**${opcion.titulo}**`)
    for (const estado of Object.values(ESTADOS)) expect(manual).toContain(`**${estado}**`)
  })

  it('todo lo que pone en negrita existe en la pantalla', () => {
    const pantallas = codigoDeLasPantallas()
    const negritas = [...manual.matchAll(/\*\*([^*]+)\*\*/g)].map(([, t]) => t)
    // Las únicas negritas que no son textos de pantalla: la explicación de la convención.
    const ajenas = negritas.filter((t) => t !== 'negrita' && !pantallas.includes(t))
    expect(ajenas).toEqual([])
  })
})
