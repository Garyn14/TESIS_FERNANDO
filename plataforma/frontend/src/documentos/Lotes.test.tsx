import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TipoDocumento } from './api'
import FormularioLote from './FormularioLote'
import PaginaDetalleLote from './PaginaDetalleLote'
import PaginaMisDocumentos from './PaginaMisDocumentos'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const texto = (nombre: string, etiqueta: string, maximo = 150) => ({
  nombre,
  etiqueta,
  tipo: 'TEXTO' as const,
  ayuda: null,
  opciones: [],
  maximo,
})
const fecha = (nombre: string, etiqueta: string) => ({
  nombre,
  etiqueta,
  tipo: 'FECHA' as const,
  ayuda: null,
  opciones: [],
  maximo: 0,
})

const CAPACITACION: TipoDocumento = {
  codigo: 'CERTIFICADO_CAPACITACION',
  nombre: 'Certificado de Capacitación',
  descripcion: 'Para participantes de talleres y capacitaciones.',
  titulo: 'CERTIFICADO',
  origen: 'OFICIO',
  campos: [
    texto('nombreEvento', 'Nombre del taller', 200),
    fecha('fechaInicio', 'Fecha de inicio'),
    fecha('fechaFin', 'Fecha de fin'),
    { ...texto('duracionHoras', 'Duración (horas)'), tipo: 'NUMERO', maximo: 1000 },
    texto('lugar', 'Lugar'),
    texto('areaOrganizadora', 'Área organizadora'),
  ],
}

const EJEMPLO = {
  tipo: 'CERTIFICADO_CAPACITACION',
  tipoNombre: 'Certificado de Capacitación',
  titulo: 'CERTIFICADO',
  numeroExpediente: null,
  nombres: 'Juan',
  apellidos: 'Ccori Pari',
  dni: '45218736',
  texto:
    "Por haber participado en el taller de capacitación 'Manejo integrado de plagas en café', realizado del 14 al 16 de setiembre de 2026 en Local comunal de Río Negro, Satipo, con una duración de 24 horas.",
  firmante: 'Ing. Carlos Mendoza Rivera',
}

const LOTE = {
  numero: '2026-008',
  tipo: 'CERTIFICADO_CAPACITACION',
  tipoNombre: 'Certificado de Capacitación',
  areaNombre: 'Área de Capacitación',
  registradoPor: 'Rosa Quispe Huamán',
  registradoEn: '2026-10-07T15:00:00Z',
  datos: {
    nombreEvento: 'Manejo integrado de plagas en café',
    lugar: 'Local comunal de Río Negro, Satipo',
    duracionHoras: '24',
    areaOrganizadora: 'Área de Capacitación',
  },
  periodo: 'del 14 al 16 de setiembre de 2026',
  ejemplo: EJEMPLO,
  documentos: [
    {
      codigo: 'DRA-2026-J4C7QX',
      nombres: 'Juan',
      apellidos: 'Ccori Pari',
      dni: '45218736',
      estado: 'PENDIENTE',
    },
    {
      codigo: 'DRA-2026-M9P2RT',
      nombres: 'María Elena',
      apellidos: 'Rojas Soto',
      dni: '47390125',
      estado: 'PENDIENTE',
    },
  ],
}

const campo = (etiqueta: string) => screen.getByLabelText(etiqueta, { exact: false })

function completarEvento() {
  fireEvent.change(campo('Nombre del taller'), {
    target: { value: 'Manejo integrado de plagas en café' },
  })
  fireEvent.change(campo('Fecha de inicio'), { target: { value: '14/09/2026' } })
  fireEvent.change(campo('Fecha de fin'), { target: { value: '16/09/2026' } })
  fireEvent.change(campo('Duración (horas)'), { target: { value: '24' } })
  fireEvent.change(campo('Lugar'), { target: { value: 'Local comunal de Río Negro, Satipo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

function agregar(nombres: string, apellidos: string, dni: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar beneficiario' }))
  const n = screen.getAllByRole('button', { name: /^Eliminar la fila/ }).length
  fireEvent.change(screen.getByLabelText(`Nombres de la fila ${n}`), { target: { value: nombres } })
  fireEvent.change(screen.getByLabelText(`Apellidos de la fila ${n}`), {
    target: { value: apellidos },
  })
  fireEvent.change(screen.getByLabelText(`DNI de la fila ${n}`), { target: { value: dni } })
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('Emisión por lista (HU09)', () => {
  it('valida los datos del evento y completa el área organizadora', () => {
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    expect(campo('Área organizadora')).toHaveValue('Área de Capacitación')
    fireEvent.change(campo('Fecha de inicio'), { target: { value: '16/09/2026' } })
    fireEvent.change(campo('Fecha de fin'), { target: { value: '14/09/2026' } })
    fireEvent.change(campo('Duración (horas)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getAllByText('Complete este campo.')).toHaveLength(2)
    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la de inicio.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingrese un número entero de 1 a 1000.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar beneficiario' })).not.toBeInTheDocument()
  })

  it('valida cada fila y señala el DNI repetido en las dos', () => {
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    completarEvento()
    expect(
      screen.getByText(
        'Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar a vista previa' })).toBeDisabled()

    agregar('Juan', 'Ccori Pari', '45218736')
    agregar('Wilber', 'Quispe Casancho', '4419823')
    agregar('Pedro', 'Huaman Inga', '45218736')
    expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('El DNI se repite en la fila 3.')).toBeInTheDocument()
    expect(screen.getByText('El DNI se repite en la fila 1.')).toBeInTheDocument()
    expect(
      screen.getByText('Hay 3 errores en la lista. Corríjalos para continuar.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar a vista previa' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('DNI de la fila 2'), { target: { value: '44198236' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar la fila 3' }))
    expect(screen.getByText('✓ 2 beneficiarios listos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar a vista previa' })).toBeEnabled()
  })

  it('importa las filas del Excel y las agrega a la tabla', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, [
        { nombres: 'Juan', apellidos: 'Ccori Pari', dni: '45218736' },
        { nombres: 'Wilber', apellidos: 'Quispe Casancho', dni: '4419823' },
      ]),
    )
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    completarEvento()
    fireEvent.change(screen.getByLabelText('Archivo Excel de beneficiarios'), {
      target: { files: [new File(['x'], 'lista.xlsx')] },
    })
    expect(
      await screen.findByText('Se importaron 2 beneficiarios desde Excel.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombres de la fila 1')).toHaveValue('Juan')
    expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeInTheDocument()
    expect(
      screen.getByText('Hay 1 error en la lista. Corríjalo para continuar.'),
    ).toBeInTheDocument()
    const [ruta, opciones] = fetch.mock.calls[0]
    expect(ruta).toBe('/api/lotes/importar')
    expect(opciones?.body).toBeInstanceOf(FormData)
  })

  it('si el archivo no es la plantilla, lo indica y no agrega filas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(400, {
        mensaje: 'El archivo no es una plantilla Excel (.xlsx). Use la plantilla descargada.',
        campos: {
          archivo: 'El archivo no es una plantilla Excel (.xlsx). Use la plantilla descargada.',
        },
      }),
    )
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    completarEvento()
    fireEvent.change(screen.getByLabelText('Archivo Excel de beneficiarios'), {
      target: { files: [new File(['x'], 'lista.csv')] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo no es una plantilla Excel (.xlsx).',
    )
    expect(screen.queryByLabelText('Nombres de la fila 1')).not.toBeInTheDocument()
  })

  it('muestra el ejemplo y el resumen, y al enviar crea el lote', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((ruta) =>
      ruta === '/api/lotes'
        ? respuesta(201, LOTE)
        : respuesta(200, {
            ejemplo: EJEMPLO,
            cantidad: 2,
            beneficiarios: ['Juan Ccori Pari', 'María Elena Rojas Soto'],
            datos: LOTE.datos,
            periodo: 'del 14 al 16 de setiembre de 2026',
          }),
    )
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    completarEvento()
    agregar('Juan', ' Ccori  Pari ', '45218736')
    agregar('María Elena', 'Rojas Soto', '47390125')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))

    const resumen = await screen.findByRole('complementary', { name: 'Resumen del lote' })
    expect(resumen).toHaveTextContent('2 certificados')
    expect(resumen).toHaveTextContent('del 14 al 16 de setiembre de 2026')
    expect(resumen).toHaveTextContent('María Elena Rojas Soto')
    expect(screen.getByRole('figure')).toHaveTextContent('VISTA PREVIA')
    const cuerpo = JSON.parse(String(fetch.mock.calls[0][1]?.body))
    expect(cuerpo.beneficiarios[0]).toEqual({
      nombres: 'Juan',
      apellidos: 'Ccori Pari',
      dni: '45218736',
    })
    expect(cuerpo.datos.areaOrganizadora).toBe('Área de Capacitación')

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    const ventana = screen.getByRole('dialog', { name: '¿Enviar a revisión?' })
    expect(ventana).toHaveTextContent('¿Enviar 2 certificados a revisión del Director?')
    fireEvent.click(within(ventana).getByRole('button', { name: 'Enviar' }))
    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Se enviaron 2 certificados a revisión (Lote 2026-008)')
    expect(within(aviso).getByRole('link', { name: 'Ver el lote' })).toHaveAttribute(
      'href',
      '#/mis-documentos/lote/2026-008',
    )
  })

  it('un error del servidor en una fila vuelve a la relación y lo señala', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(400, {
        mensaje: 'Revise los datos ingresados.',
        campos: { 'beneficiarios[0].nombres': 'Use solo letras, espacios, apóstrofo o guion.' },
      }),
    )
    render(<FormularioLote tipo={CAPACITACION} areaNombre="Área de Capacitación" />)
    completarEvento()
    agregar('Juan', 'Ccori Pari', '45218736')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a vista previa' }))
    expect(
      await screen.findByText('Use solo letras, espacios, apóstrofo o guion.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombres de la fila 1')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Lotes en Mis documentos (HU09)', () => {
  it('un lote ocupa una sola fila y abre su detalle', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, [
        {
          codigo: null,
          lote: '2026-008',
          cantidad: 8,
          tipoNombre: 'Certificado de Capacitación',
          beneficiario: '8 beneficiarios',
          numeroExpediente: null,
          registradoEn: '2026-10-07T15:00:00Z',
          estado: 'PENDIENTE',
        },
      ]),
    )
    render(<PaginaMisDocumentos areaNombre="Área de Capacitación" />)
    const enlace = await screen.findByRole('link', { name: /Lote 2026-008/ })
    expect(enlace).toHaveAttribute('href', '#/mis-documentos/lote/2026-008')
    expect(enlace.closest('tr')).toHaveTextContent('8 beneficiarios')
  })

  it('el detalle del lote muestra el evento, el ejemplo y sus certificados', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, LOTE))
    render(<PaginaDetalleLote numero="2026-008" />)
    expect(await screen.findByRole('heading', { name: 'Lote 2026-008' })).toBeInTheDocument()
    expect(screen.getByText('Manejo integrado de plagas en café')).toBeInTheDocument()
    expect(screen.getByText('del 14 al 16 de setiembre de 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DRA-2026-M9P2RT' })).toHaveAttribute(
      'href',
      '#/mis-documentos/DRA-2026-M9P2RT',
    )
    expect(screen.getByRole('figure')).toHaveTextContent('Juan Ccori Pari')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('un lote con certificados en varios estados muestra cuántos hay en cada uno (HU12)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(200, [
        {
          codigo: null,
          lote: '2026-009',
          cantidad: 8,
          tipoNombre: 'Certificado de Capacitación',
          beneficiario: '8 beneficiarios',
          numeroExpediente: null,
          registradoEn: '2026-10-07T15:00:00Z',
          estado: 'OBSERVADO',
          estados: { OBSERVADO: 1, FIRMADO: 7 },
        },
      ]),
    )
    render(<PaginaMisDocumentos areaNombre="Área de Capacitación" />)
    const fila = (await screen.findByRole('link', { name: /Lote 2026-009/ })).closest('tr')!
    expect(within(fila).getByText('Observado 1')).toBeInTheDocument()
    expect(within(fila).getByText('Firmado 7')).toBeInTheDocument()
  })

  it('el detalle del lote muestra el estado y el motivo de cada certificado (HU12)', async () => {
    const documentos = LOTE.documentos.map((d, i) =>
      i === 0 ? { ...d, estado: 'OBSERVADO', motivo: 'El DNI no coincide' } : d,
    )
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => respuesta(200, { ...LOTE, documentos }))
    render(<PaginaDetalleLote numero="2026-008" />)
    expect(await screen.findByText('Motivo: El DNI no coincide')).toBeInTheDocument()
    expect(screen.getByText(/El estado de cada uno se muestra en la tabla/)).toBeInTheDocument()
  })

  it('un lote de otra área no se muestra', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      respuesta(403, { mensaje: 'Este lote no pertenece a su área.', campos: {} }),
    )
    render(<PaginaDetalleLote numero="2026-001" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Este lote no pertenece a su área.')
  })
})
