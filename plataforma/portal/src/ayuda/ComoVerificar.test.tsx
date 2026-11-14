import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { esComoVerificar } from '../ruta'

afterEach(() => vi.restoreAllMocks())

describe('¿Cómo verificar un documento? (DRA-70)', () => {
  it('tiene su propia ruta', () => {
    expect(esComoVerificar('/como-verificar')).toBe(true)
    expect(esComoVerificar('/como-verificar/')).toBe(true)
    expect(esComoVerificar('/')).toBe(false)
    expect(esComoVerificar('/verificar/abc')).toBe(false)
  })

  it('explica las dos formas de verificar, sin pedir registro ni consultar al servidor', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<App ruta="/como-verificar" />)
    expect(
      screen.getByRole('heading', { level: 1, name: '¿Cómo verificar un documento?' }),
    ).toBeInTheDocument()
    const qr = screen.getByRole('region', { name: 'Con el código QR (recomendado)' })
    expect(qr).toHaveTextContent('No hace falta instalar ninguna aplicación')
    const codigo = screen.getByRole('region', { name: 'Con el código de verificación' })
    expect(codigo).toHaveTextContent('DRA-2026-F8R2MA')
    expect(codigo).toHaveTextContent('no el documento completo')
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('el dibujo dice dónde están el QR, el código y las fechas', () => {
    render(<App ruta="/como-verificar" />)
    const dibujo = screen.getByRole('img', {
      name: 'Dónde están el código QR y el código de verificación',
    })
    expect(dibujo).toBeInTheDocument()
    const seccion = screen.getByRole('region', { name: 'Dónde están en el documento' })
    expect(seccion).toHaveTextContent('impreso debajo del QR')
    expect(seccion).toHaveTextContent('"Válido hasta"')
  })

  it('explica cada resultado con el mismo título que se ve al verificar', () => {
    render(<App ruta="/como-verificar" />)
    const resultados = screen.getByRole('region', { name: 'Qué significa cada resultado' })
    const titulos = within(resultados)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titulos).toEqual([
      'Documento válido',
      'Documento anulado',
      'Documento vencido',
      'Documento no válido',
      'Existe una versión corregida',
      'No se pudo verificar en este momento',
    ])
    expect(resultados).toHaveTextContent('ya no tiene valor')
  })

  it('no usa términos técnicos', () => {
    render(<App ruta="/como-verificar" />)
    const texto = screen.getByRole('article').textContent ?? ''
    for (const tecnico of ['hash', 'IPFS', 'Besu', 'token', 'CID']) {
      expect(texto).not.toMatch(new RegExp(`\\b${tecnico}\\b`, 'i'))
    }
  })

  it('vuelve a la portada para verificar', () => {
    render(<App ruta="/como-verificar" />)
    expect(screen.getByRole('link', { name: 'Verificar un documento' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('se llega desde la portada y desde el pie de todas las páginas', () => {
    render(<App ruta="/" />)
    const enlaces = screen.getAllByRole('link', { name: '¿Cómo verificar un documento?' })
    expect(enlaces).toHaveLength(2)
    for (const enlace of enlaces) expect(enlace).toHaveAttribute('href', '/como-verificar')
    expect(
      within(screen.getByRole('navigation', { name: 'Ayuda' })).getByRole('link'),
    ).toHaveAttribute('href', '/como-verificar')
  })
})
