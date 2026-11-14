import { render, screen, within } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { opcionesPermitidas } from '../estructura/menu'
import { PaginaInicio } from '../estructura/Paginas'
import type { Sesion } from '../sesion/api'
import guia from './guia-de-operacion.md?raw'
import { seccionesDe } from './manual'
import { PaginaGuiaDeOperacion } from './PaginaManual'

afterEach(() => vi.restoreAllMocks())

const FLUJOS = join(__dirname, '..', '..', '..', '..', '.github', 'workflows')

const sesion = (rol: string, permisos: string[]): Sesion => ({
  nombreUsuario: 'prueba',
  nombreCompleto: 'Ana Prueba',
  rol,
  rolNombre: rol,
  areaNombre: null,
  permisos,
  debeCambiarContrasena: false,
})

describe('Guía de operación (DRA-74)', () => {
  it('solo está en el menú del Administrador', () => {
    const titulos = (permisos: string[]) => opcionesPermitidas(permisos).map((o) => o.titulo)
    expect(titulos(['CUENTA_PROPIA', 'USUARIOS_GESTIONAR'])).toContain('Guía de operación')
    for (const otro of [
      ['CUENTA_PROPIA', 'DOCUMENTO_REGISTRAR', 'DOCUMENTO_VER_AREA'],
      ['CUENTA_PROPIA', 'DOCUMENTO_REVISAR', 'DOCUMENTO_VER_FIRMADOS'],
      ['CUENTA_PROPIA', 'DOCUMENTO_BUSCAR', 'AUDITORIA_VER', 'DOCUMENTO_IMPRIMIR'],
    ])
      expect(titulos(otro)).not.toContain('Guía de operación')
  })

  it('el inicio del Administrador la enlaza; el de los demás, no', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'))
    const { unmount } = render(
      <PaginaInicio sesion={sesion('ADMINISTRADOR', ['CUENTA_PROPIA', 'USUARIOS_GESTIONAR'])} />,
    )
    expect(screen.getByRole('link', { name: 'Abrir la guía de operación' })).toHaveAttribute(
      'href',
      '#/operacion',
    )
    unmount()
    render(<PaginaInicio sesion={sesion('DIRECTOR', ['CUENTA_PROPIA', 'DOCUMENTO_REVISAR'])} />)
    expect(
      screen.queryByRole('link', { name: 'Abrir la guía de operación' }),
    ).not.toBeInTheDocument()
  })

  it('muestra la guía con su índice y un enlace por sección', () => {
    render(<PaginaGuiaDeOperacion />)
    const indice = screen.getByRole('navigation', { name: 'Contenido de la guía' })
    const secciones = seccionesDe(guia)
    expect(secciones.map((s) => s.titulo)).toEqual([
      'Cómo está armada la plataforma',
      'Calendario de tareas',
      'El personal',
      'Encender, apagar y actualizar',
      'Respaldos',
      'Alertas',
      'Seguridad',
      'Costos',
      'Ante un incidente',
      'Documentos técnicos',
    ])
    for (const s of secciones) {
      expect(within(indice).getByRole('link', { name: s.titulo })).toHaveAttribute(
        'href',
        `#/operacion/${s.id}`,
      )
      expect(document.getElementById(s.id)).toHaveTextContent(s.titulo)
    }
  })

  it('los documentos técnicos se abren en GitHub, en otra pestaña', () => {
    render(<PaginaGuiaDeOperacion />)
    const tecnicos = within(
      document.getElementById('documentos-tecnicos')!.nextElementSibling as HTMLElement,
    ).getAllByRole('link')
    expect(tecnicos).toHaveLength(3)
    for (const enlace of tecnicos) {
      expect(enlace.getAttribute('href')).toMatch(
        /^https:\/\/github\.com\/Garyn14\/TESIS_FERNANDO\/blob\/main\/docs\/arquitectura\/[a-z-]+\.md$/,
      )
      expect(enlace).toHaveAttribute('target', '_blank')
    }
  })

  it('los documentos técnicos que nombra existen en el repositorio', () => {
    const arquitectura = join(FLUJOS, '..', '..', 'docs', 'arquitectura')
    const archivos = readdirSync(arquitectura)
    for (const [, nombre] of guia.matchAll(/`([a-z-]+\.md)`|arquitectura\/([a-z-]+\.md)/g))
      if (nombre) expect(archivos).toContain(nombre)
    for (const [, nombre] of guia.matchAll(/`([a-z-]+\.md)`/g)) expect(archivos).toContain(nombre)
  })

  it('nombra los disparadores igual que GitHub', () => {
    const nombres = readdirSync(FLUJOS)
      .filter((f) => f.endsWith('.yml'))
      .map((f) => /^name: (.+)$/m.exec(readFileSync(join(FLUJOS, f), 'utf8'))?.[1])
    const citados = [...guia.matchAll(/"(QA – [^"]+)"/g)].map(([, n]) => n)
    expect(citados.length).toBeGreaterThan(5)
    for (const nombre of citados) expect(nombres).toContain(nombre)
  })

  it('no contiene claves, contraseñas ni correos', () => {
    expect(guia).not.toMatch(/AKIA[0-9A-Z]{12,}/) // clave de AWS
    expect(guia).not.toMatch(/0x[0-9a-fA-F]{40,}/) // billetera o clave privada
    expect(guia).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/) // correo
    expect(guia).not.toMatch(/contraseña:\s*\S|password\s*[:=]/i)
  })
})
