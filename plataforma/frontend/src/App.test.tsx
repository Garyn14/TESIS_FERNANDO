import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Sesion } from './sesion/api'

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }))
}

const sesionDe = (rol: string, rolNombre: string, permisos: string[]): Sesion => ({
  nombreUsuario: 'prueba',
  nombreCompleto: 'Rosa Quispe Huamán',
  rol,
  rolNombre,
  areaNombre: null,
  permisos: ['CUENTA_PROPIA', ...permisos],
  debeCambiarContrasena: false,
})

const ADMIN = sesionDe('ADMINISTRADOR', 'Administrador', [
  'USUARIOS_GESTIONAR',
  'BILLETERA_GESTIONAR',
])
const AREA = sesionDe('AREA_ENCARGADA', 'Área encargada', [
  'DOCUMENTO_REGISTRAR',
  'DOCUMENTO_VER_AREA',
])
const DIRECTOR = sesionDe('DIRECTOR', 'Director', ['DOCUMENTO_REVISAR', 'DOCUMENTO_VER_FIRMADOS'])
const CONSULTA = sesionDe('CONSULTA_INTERNA', 'Consulta interna', ['DOCUMENTO_BUSCAR'])

/** Simula el backend con la sesión indicada (null: sin sesión). */
function backend(sesion: Sesion | null, extra: Record<string, () => Promise<Response>> = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((ruta, opciones) => {
    const clave = `${opciones?.method ?? 'GET'} ${ruta}`
    if (extra[clave]) return extra[clave]()
    if (clave === 'GET /api/sesion')
      return sesion
        ? respuesta(200, sesion)
        : respuesta(401, { mensaje: 'Inicie sesión para continuar.', campos: {} })
    if (clave === 'DELETE /api/sesion') return Promise.resolve(new Response(null, { status: 204 }))
    if (['GET /api/usuarios', 'GET /api/roles', 'GET /api/areas'].includes(clave))
      return respuesta(200, [])
    if (clave === 'GET /api/tipos-documento') return respuesta(200, [])
    return respuesta(500, null)
  })
}

const opcionesDelMenu = async () =>
  within(await screen.findByRole('navigation', { name: 'Menú principal' }))
    .getAllByRole('link')
    .map((a) => a.textContent)

beforeEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})
afterEach(() => vi.restoreAllMocks())

describe('App (HU03)', () => {
  it('sin sesión muestra el inicio de sesión', async () => {
    backend(null)
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Plataforma de Certificados y Constancias' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    ['Administrador', ADMIN, ['Inicio', 'Usuarios', 'Billetera del director']],
    ['Área encargada', AREA, ['Inicio', 'Mis documentos', 'Nuevo documento']],
    ['Director', DIRECTOR, ['Inicio', 'Por revisar', 'Documentos firmados']],
    ['Consulta interna', CONSULTA, ['Inicio', 'Buscar documentos']],
  ])('el menú de %s muestra solo sus vistas', async (_rol, sesion, esperadas) => {
    backend(sesion)
    render(<App />)
    expect(await opcionesDelMenu()).toEqual(esperadas)
  })

  it('el encabezado muestra el nombre, el rol y las iniciales', async () => {
    backend(AREA)
    render(<App />)
    const encabezado = await screen.findByRole('banner')
    expect(within(encabezado).getByText('Rosa Quispe Huamán')).toBeInTheDocument()
    expect(within(encabezado).getByText('Área encargada')).toBeInTheDocument()
    expect(within(encabezado).getByText('RQ')).toBeInTheDocument()
  })

  it('una dirección sin permiso no muestra la pantalla', async () => {
    window.location.hash = '#/usuarios'
    backend(DIRECTOR)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para ver esta sección.',
    )
    expect(screen.queryByText('Nueva cuenta')).not.toBeInTheDocument()
  })

  it('las pantallas aún no construidas avisan en qué sprint se habilitan', async () => {
    backend(CONSULTA)
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Buscar documentos' }))
    expect(await screen.findByText(/Se habilita en el Sprint 6/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar documentos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('el Administrador entra a Usuarios desde el menú', async () => {
    backend(ADMIN)
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Usuarios' }))
    expect(await screen.findByRole('button', { name: 'Nueva cuenta' })).toBeInTheDocument()
  })

  it('cerrar sesión termina la sesión en el servidor y vuelve al login', async () => {
    const fetch = backend(ADMIN)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(fetch.mock.calls.some(([r, o]) => r === '/api/sesion' && o?.method === 'DELETE')).toBe(
      true,
    )
  })

  it('si la sesión expira, la siguiente acción vuelve al login con el aviso', async () => {
    backend(ADMIN, {
      'GET /api/usuarios': () =>
        respuesta(401, {
          mensaje: 'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
          campos: {},
        }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Usuarios' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
    )
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('al abrir con una sesión vencida avisa en el login', async () => {
    backend(null, {
      'GET /api/sesion': () =>
        respuesta(401, {
          mensaje: 'Su sesión expiró por inactividad. Inicie sesión nuevamente.',
          campos: {},
        }),
    })
    render(<App />)
    expect(await screen.findByRole('status')).toHaveTextContent('Su sesión expiró')
  })
  it('al cambiar de pantalla detecta que la cuenta fue desactivada', async () => {
    let activa = true
    backend(null, {
      'GET /api/sesion': () =>
        activa
          ? respuesta(200, CONSULTA)
          : respuesta(401, {
              mensaje: 'Su cuenta fue desactivada. Comuníquese con el Administrador.',
              campos: {},
            }),
    })
    render(<App />)
    const enlace = await screen.findByRole('link', { name: 'Buscar documentos' })
    activa = false
    fireEvent.click(enlace)
    expect(await screen.findByRole('status')).toHaveTextContent('Su cuenta fue desactivada.')
  })

  it('al cambiar de pantalla aplica el rol nuevo en el menú', async () => {
    let actual = DIRECTOR
    backend(null, { 'GET /api/sesion': () => respuesta(200, actual) })
    render(<App />)
    const enlace = await screen.findByRole('link', { name: 'Por revisar' })
    actual = CONSULTA
    fireEvent.click(enlace)
    expect(await screen.findByRole('link', { name: 'Buscar documentos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Por revisar' })).not.toBeInTheDocument()
  })
  it('pulsar la opción en la que ya se está también valida la sesión', async () => {
    let actual = DIRECTOR
    backend(null, { 'GET /api/sesion': () => respuesta(200, actual) })
    render(<App />)
    const inicio = await screen.findByRole('link', { name: 'Inicio' })
    actual = CONSULTA
    fireEvent.click(inicio)
    expect(await screen.findByRole('link', { name: 'Buscar documentos' })).toBeInTheDocument()
  })
  it('con contraseña temporal solo muestra el cambio obligatorio', async () => {
    const temporal = { ...ADMIN, debeCambiarContrasena: true }
    backend(temporal, {
      'PUT /api/sesion/contrasena': () => respuesta(200, ADMIN),
    })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Cambie su contraseña' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Temporal99' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'Propia2026' },
    })
    fireEvent.change(screen.getByLabelText('Repita la contraseña nueva'), {
      target: { value: 'Propia2026' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await opcionesDelMenu()).toEqual(['Inicio', 'Usuarios', 'Billetera del director'])
  })

  it('cualquier usuario puede cambiar su contraseña desde el encabezado', async () => {
    backend(CONSULTA, { 'PUT /api/sesion/contrasena': () => respuesta(200, CONSULTA) })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }))
    const ventana = screen.getByRole('dialog', { name: 'Cambiar contraseña' })
    fireEvent.change(within(ventana).getByLabelText('Contraseña actual'), {
      target: { value: 'Actual2026' },
    })
    fireEvent.change(within(ventana).getByLabelText('Contraseña nueva'), {
      target: { value: 'Nueva20266' },
    })
    fireEvent.change(within(ventana).getByLabelText('Repita la contraseña nueva'), {
      target: { value: 'Nueva20266' },
    })
    fireEvent.click(within(ventana).getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await within(ventana).findByRole('status')).toHaveTextContent('Su contraseña se cambió.')
  })
  it('el Área encargada ve su área en el encabezado y lo que emite en Inicio', async () => {
    backend(
      { ...AREA, areaNombre: 'Área de Capacitación' },
      {
        'GET /api/tipos-documento': () =>
          respuesta(200, [
            { codigo: 'CERTIFICADO_CAPACITACION', nombre: 'Certificado de Capacitación' },
            { codigo: 'CERTIFICADO_RECONOCIMIENTO', nombre: 'Certificado de Reconocimiento' },
          ]),
      },
    )
    render(<App />)
    const encabezado = await screen.findByRole('banner')
    expect(
      within(encabezado).getByText('Área encargada – Área de Capacitación'),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Documentos que emite Área de Capacitación' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Certificado de Reconocimiento')).toBeInTheDocument()
  })

  it('sin área asignada avisa que debe comunicarse con el Administrador', async () => {
    backend(AREA)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene un área asignada')
  })

  it('los roles sin registro de documentos no consultan tipos', async () => {
    const fetch = backend(DIRECTOR)
    render(<App />)
    await screen.findByRole('navigation')
    expect(fetch.mock.calls.some(([r]) => r === '/api/tipos-documento')).toBe(false)
  })
})

describe('App (HU07)', () => {
  const CAPACITACION = {
    codigo: 'CERTIFICADO_CAPACITACION',
    nombre: 'Certificado de Capacitación',
    descripcion: 'Para participantes de talleres y capacitaciones.',
    titulo: 'CERTIFICADO',
    origen: 'OFICIO',
    campos: [],
  }
  const TRABAJO = {
    codigo: 'CERTIFICADO_TRABAJO',
    nombre: 'Certificado de Trabajo',
    descripcion: 'Para personas que trabajaron en la agencia.',
    titulo: 'CERTIFICADO',
    origen: 'SOLICITUD_PARTE',
    campos: [
      { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'TEXTO', ayuda: null, opciones: [], maximo: 100 },
      {
        nombre: 'fechaInicio',
        etiqueta: 'Fecha de inicio',
        tipo: 'FECHA',
        ayuda: null,
        opciones: [],
        maximo: 0,
      },
      {
        nombre: 'fechaFin',
        etiqueta: 'Fecha de fin',
        tipo: 'FECHA',
        ayuda: null,
        opciones: [],
        maximo: 100,
      },
    ],
  }

  it('Nuevo documento lista los tipos del área con su origen', async () => {
    backend(AREA, { 'GET /api/tipos-documento': () => respuesta(200, [CAPACITACION, TRABAJO]) })
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Nuevo documento' }))
    const tarjeta = await screen.findByRole('link', { name: /Certificado de Capacitación/ })
    expect(tarjeta).toHaveTextContent('Para participantes de talleres y capacitaciones.')
    expect(tarjeta).toHaveTextContent('Emisión por lista')
    expect(tarjeta).toHaveAttribute('href', '#/nuevo-documento/CERTIFICADO_CAPACITACION')
    expect(screen.getByRole('link', { name: /Certificado de Trabajo/ })).toHaveTextContent(
      'A solicitud de parte',
    )
    expect(
      screen.getByText('Solo se muestran los tipos de documento asignados a su área.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Se habilita en el Sprint 2/)).not.toBeInTheDocument()
  })

  it('sin área asignada no muestra tipos y avisa', async () => {
    window.location.hash = '#/nuevo-documento'
    backend(AREA)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Comuníquese con el Administrador')
  })

  it('un tipo de oficio abre el registro por lista', async () => {
    window.location.hash = '#/nuevo-documento/CERTIFICADO_CAPACITACION'
    backend(AREA, {
      'GET /api/tipos-documento/CERTIFICADO_CAPACITACION': () => respuesta(200, CAPACITACION),
    })
    render(<App />)
    expect(
      await screen.findByRole('heading', {
        name: 'Emisión por lista: Certificado de Capacitación',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Origen: De oficio')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Pasos' }))
        .getAllByRole('listitem')
        .map((p) => p.textContent),
    ).toEqual(['1Datos del evento', '2Beneficiarios', '3Vista previa'])
    expect(screen.getByRole('link', { name: 'Nuevo documento' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: '← Cambiar tipo de documento' })).toHaveAttribute(
      'href',
      '#/nuevo-documento',
    )
  })

  it('un tipo a solicitud de parte abre el registro individual', async () => {
    window.location.hash = '#/nuevo-documento/CERTIFICADO_TRABAJO'
    backend(AREA, { 'GET /api/tipos-documento/CERTIFICADO_TRABAJO': () => respuesta(200, TRABAJO) })
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Certificado de Trabajo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Origen: A solicitud de parte')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Pasos' }))
        .getAllByRole('listitem')
        .map((p) => p.textContent),
    ).toEqual(['1Datos de la solicitud', '2Vista previa'])
  })

  it('un tipo que no es del área no muestra el formulario', async () => {
    window.location.hash = '#/nuevo-documento/CONSTANCIA_PRODUCTOR_ACTIVO'
    backend(AREA, {
      'GET /api/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO': () =>
        respuesta(403, {
          mensaje: 'Este tipo de documento no está asignado a su área.',
          campos: {},
        }),
    })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este tipo de documento no está asignado a su área.',
    )
    expect(screen.queryByText(/Origen:/)).not.toBeInTheDocument()
  })

  it('otro rol no puede abrir el formulario por su dirección', async () => {
    window.location.hash = '#/nuevo-documento/CERTIFICADO_CAPACITACION'
    const fetch = backend(DIRECTOR)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permiso para ver esta sección.',
    )
    expect(fetch.mock.calls.some(([r]) => String(r).startsWith('/api/tipos-documento'))).toBe(false)
  })

  it('al volver a Nuevo documento consulta otra vez los tipos', async () => {
    const fetch = backend(AREA, {
      'GET /api/tipos-documento': () => respuesta(200, [CAPACITACION]),
    })
    render(<App />)
    const opcion = await screen.findByRole('link', { name: 'Nuevo documento' })
    fireEvent.click(opcion)
    await screen.findByRole('link', { name: /Certificado de Capacitación/ })
    fireEvent.click(opcion)
    await vi.waitFor(() =>
      expect(fetch.mock.calls.filter(([r]) => r === '/api/tipos-documento').length).toBe(3),
    )
  })
})

describe('App (HU08)', () => {
  it('si varias solicitudes reciben 401 a la vez, el aviso conserva el primer motivo', async () => {
    backend(AREA, {
      // La sesión se cierra cuando la persona ya está en la plataforma y pasa a Mis documentos.
      'GET /api/sesion': () =>
        window.location.hash !== '#/mis-documentos'
          ? respuesta(200, AREA)
          : respuesta(401, {
              mensaje: 'El Administrador restableció su contraseña. Inicie sesión nuevamente.',
              campos: {},
            }),
      // Llega después, cuando la sesión ya no existe: su aviso es genérico.
      'GET /api/documentos': () =>
        new Promise((r) => setTimeout(r, 30)).then(() =>
          respuesta(401, { mensaje: 'Inicie sesión para continuar.', campos: {} }),
        ),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('link', { name: 'Mis documentos' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'El Administrador restableció su contraseña.',
    )
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.getByRole('status')).toHaveTextContent(
      'El Administrador restableció su contraseña.',
    )
  })
})
