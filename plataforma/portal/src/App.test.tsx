import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// pdf.js necesita un lienzo real: en jsdom solo se comprueba qué documento se pide.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 0 }) })),
}))
import App from './App'
import { tokenDeLaRuta } from './ruta'

const TOKEN = 'k3Jx9mQ2vT7pL0sN4bW8yR6cE1aZ5uH3fG2dK9oP7iM'

const VALIDO = {
  resultado: 'VALIDO',
  mensaje: 'El documento es auténtico: coincide con su registro en la blockchain.',
  tipo: 'Certificado de Trabajo',
  titular: 'Lucía Paredes Quinto',
  fechaEmision: '2026-11-04T15:30:00Z',
  anuladoEn: null,
  versionCorregida: false,
}

function servidor(estado: number, cuerpo: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(cuerpo), { status: estado }))
}

afterEach(() => vi.restoreAllMocks())

describe('Portal de verificación (HU19)', () => {
  it('reconoce la ruta del código QR', () => {
    expect(tokenDeLaRuta(`/verificar/${TOKEN}`)).toBe(TOKEN)
    expect(tokenDeLaRuta(`/verificar/${TOKEN}/`)).toBe(TOKEN)
    expect(tokenDeLaRuta('/')).toBeNull()
    expect(tokenDeLaRuta('/verificar/')).toBeNull()
  })

  it('la portada explica cómo verificar con el QR, sin pedir registro', () => {
    render(<App ruta="/" />)
    expect(screen.getByRole('heading', { name: 'Verifique un documento' })).toBeInTheDocument()
    expect(screen.getByText(/Escanéelo con la cámara de su celular/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
  })

  it('un documento válido muestra el resultado, sus datos y el documento completo', async () => {
    const fetch = servidor(200, VALIDO)
    render(<App ruta={`/verificar/${TOKEN}`} />)
    expect(screen.getByRole('status')).toHaveTextContent('Verificando el documento…')

    const resultado = await screen.findByRole('region', { name: 'Documento válido' })
    expect(resultado).toHaveTextContent(VALIDO.mensaje)
    expect(resultado).toHaveTextContent('Certificado de Trabajo')
    expect(resultado).toHaveTextContent('Lucía Paredes Quinto')
    expect(resultado).toHaveTextContent('4 de noviembre de 2026')
    expect(resultado).toHaveTextContent('Vigente')
    expect(fetch).toHaveBeenCalledWith(`/api/verificacion/${TOKEN}`, expect.anything())

    const documento = screen.getByRole('region', { name: 'Documento completo' })
    expect(within(documento).getByRole('img', { name: 'Documento verificado' })).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(`/api/verificacion/${TOKEN}/documento`),
    )
    expect(within(documento).getByRole('link', { name: 'Abrir el documento' })).toHaveAttribute(
      'href',
      `/api/verificacion/${TOKEN}/documento`,
    )
    expect(within(documento).getByRole('link', { name: 'Descargar PDF' })).toHaveAttribute(
      'download',
    )
  })

  it('un anulado muestra la fecha y la versión corregida, pero no el documento', async () => {
    servidor(200, {
      ...VALIDO,
      resultado: 'ANULADO',
      mensaje: 'Este documento fue anulado y ya no es válido.',
      anuladoEn: '2026-11-05T15:00:00Z',
      versionCorregida: true,
    })
    render(<App ruta={`/verificar/${TOKEN}`} />)
    const resultado = await screen.findByRole('region', { name: 'Documento anulado' })
    expect(resultado).toHaveTextContent('Fecha de anulación')
    expect(resultado).toHaveTextContent('5 de noviembre de 2026')
    expect(resultado).toHaveTextContent('Estado' + 'Anulado')
    expect(resultado).toHaveTextContent(
      'Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.',
    )
    expect(screen.queryByRole('region', { name: 'Documento completo' })).not.toBeInTheDocument()
  })

  it('un no válido no muestra datos ni documento', async () => {
    servidor(200, {
      resultado: 'NO_VALIDO',
      mensaje: 'No encontramos un documento válido con estos datos.',
      tipo: null,
      titular: null,
      fechaEmision: null,
      anuladoEn: null,
      versionCorregida: false,
    })
    render(<App ruta="/verificar/no-es-un-token" />)
    const resultado = await screen.findByRole('region', { name: 'Documento no válido' })
    expect(resultado).toHaveTextContent('No encontramos un documento válido con estos datos.')
    expect(resultado).not.toHaveTextContent('Titular')
    expect(screen.queryByRole('region', { name: 'Documento completo' })).not.toBeInTheDocument()
  })

  it('si la verificación no está disponible, permite intentarlo nuevamente', async () => {
    const mensaje =
      'No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.'
    const fetch = servidor(503, { mensaje, campos: {} })
    render(<App ruta={`/verificar/${TOKEN}`} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje)

    fetch.mockImplementation(async () => new Response(JSON.stringify(VALIDO), { status: 200 }))
    fireEvent.click(screen.getByRole('button', { name: 'Intentar nuevamente' }))
    expect(await screen.findByRole('region', { name: 'Documento válido' })).toBeInTheDocument()
  })
})
