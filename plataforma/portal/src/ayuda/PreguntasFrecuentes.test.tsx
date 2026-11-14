import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { esPreguntasFrecuentes } from '../ruta'
import { GRUPOS } from './preguntas'

afterEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})

const pregunta = (texto: string) =>
  screen.getByRole('heading', { level: 3, name: texto }).closest('details') as HTMLDetailsElement

describe('Preguntas frecuentes del portal (DRA-71)', () => {
  it('tiene su propia ruta', () => {
    expect(esPreguntasFrecuentes('/preguntas-frecuentes')).toBe(true)
    expect(esPreguntasFrecuentes('/preguntas-frecuentes/')).toBe(true)
    expect(esPreguntasFrecuentes('/como-verificar')).toBe(false)
  })

  it('muestra las preguntas en tres grupos, todas cerradas, sin consultar al servidor', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<App ruta="/preguntas-frecuentes" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' }),
    ).toBeInTheDocument()
    for (const titulo of [
      'Sobre la verificación',
      'Si usted es el titular del documento',
      'Si usted recibe un documento (empleadores y entidades)',
    ])
      expect(screen.getByRole('region', { name: titulo })).toBeInTheDocument()
    const todas = document.querySelectorAll('details')
    expect(todas.length).toBe(GRUPOS.flatMap((g) => g.preguntas).length)
    expect([...todas].every((d) => !d.open)).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('cada pregunta es un acordeón del navegador: se abre al pulsar su título', () => {
    // jsdom no abre <details> al pulsar <summary>; el clic real se prueba en e2e/sprint8.cjs.
    render(<App ruta="/preguntas-frecuentes" />)
    const costo = pregunta('¿Verificar un documento tiene algún costo?')
    expect(costo.firstElementChild?.tagName).toBe('SUMMARY')
    expect(costo.firstElementChild).toHaveTextContent('¿Verificar un documento tiene algún costo?')
    costo.open = true
    expect(costo).toHaveTextContent('La verificación es gratuita')
  })

  it('el enlace de una pregunta la abre', () => {
    window.location.hash = '#perdi-mi-documento'
    render(<App ruta="/preguntas-frecuentes" />)
    const perdi = pregunta('Perdí mi documento o se dañó el código QR. ¿Qué hago?')
    expect(perdi.open).toBe(true)
    expect(within(perdi).getByRole('link', { name: 'Enlace a esta pregunta' })).toHaveAttribute(
      'href',
      '#perdi-mi-documento',
    )
  })

  it('los enlaces de las preguntas no se repiten', () => {
    const ids = GRUPOS.flatMap((g) => g.preguntas.map((p) => p.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('responde lo que el sistema hace: nunca el DNI y el límite de 10 por minuto', () => {
    render(<App ruta="/preguntas-frecuentes" />)
    expect(pregunta('¿Qué datos míos se muestran al verificar?')).toHaveTextContent(
      'Nunca se muestra su DNI.',
    )
    expect(pregunta('¿Qué pasa si verifico muchos documentos seguidos?')).toHaveTextContent(
      'Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.',
    )
  })

  it('no usa términos técnicos', () => {
    render(<App ruta="/preguntas-frecuentes" />)
    const texto = screen.getByRole('article').textContent ?? ''
    for (const tecnico of ['hash', 'IPFS', 'Besu', 'token', 'CID'])
      expect(texto).not.toMatch(new RegExp(`\\b${tecnico}\\b`, 'i'))
  })

  it('se llega desde la portada, el pie y la guía', () => {
    const { unmount } = render(<App ruta="/" />)
    const enlaces = screen.getAllByRole('link', { name: 'Preguntas frecuentes' })
    expect(enlaces).toHaveLength(2)
    for (const e of enlaces) expect(e).toHaveAttribute('href', '/preguntas-frecuentes')
    unmount()
    render(<App ruta="/como-verificar" />)
    expect(screen.getByRole('link', { name: 'preguntas frecuentes' })).toHaveAttribute(
      'href',
      '/preguntas-frecuentes',
    )
  })
})
