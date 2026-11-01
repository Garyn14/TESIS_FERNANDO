// Prueba de punta a punta real del Sprint 2: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Crea sus propias cuentas desde la
// pantalla Usuarios y recorre HU07.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')

const [out, URL = 'http://localhost:5173/', ADMIN_TEMPORAL = 'Admin2026!'] = process.argv.slice(2)
const ADMIN_CLAVE = 'AdminPropia26'
const TEMPORAL = 'Demo2026'
const PROPIA = 'Propia2026'
const resultados = []
const paso = async (nombre, fn) => {
  await fn()
  resultados.push('✓ ' + nombre)
  console.log('✓ ' + nombre)
}

;(async () => {
  const b = await chromium.launch()
  const nueva = async () => {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await c.newPage()
    await p.goto(URL)
    return p
  }
  const campo = (p, etiqueta) => p.getByLabel(etiqueta, { exact: true })
  const ingresar = async (p, u, c) => {
    await campo(p, 'Usuario').fill(u)
    await campo(p, 'Contraseña').fill(c)
    await p.getByRole('button', { name: 'Ingresar' }).click()
  }
  /** Primer ingreso con contraseña temporal: obliga a cambiarla (HU04). */
  const primerIngreso = async (p, u, temporal, propia) => {
    await ingresar(p, u, temporal)
    await p.getByRole('heading', { name: 'Cambie su contraseña' }).waitFor()
    await campo(p, 'Contraseña temporal').fill(temporal)
    await campo(p, 'Contraseña nueva').fill(propia)
    await campo(p, 'Repita la contraseña nueva').fill(propia)
    await p.getByRole('button', { name: 'Cambiar contraseña' }).last().click()
    await p.getByRole('navigation', { name: 'Menú principal' }).waitFor()
  }
  const menu = async (p) =>
    p.getByRole('navigation', { name: 'Menú principal' }).getByRole('link').allTextContents()
  const api = (p, ruta) => p.evaluate((r) => fetch(r).then((x) => x.status), ruta)
  const foto = (p, nombre) => p.screenshot({ path: `${out}/${nombre}.png` })
  /** Tarjetas de la pantalla Nuevo documento: nombre de cada tipo. */
  const tarjetas = (p) => p.locator('main ul > li a span.text-lg').allTextContents()

  // ------------------------------------------------------------- Preparación: cuentas reales
  const admin = await nueva()
  await paso('Preparación · El Administrador crea las cuentas desde la pantalla Usuarios', async () => {
    await primerIngreso(admin, 'admin', ADMIN_TEMPORAL, ADMIN_CLAVE)
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol, area] of [
      ['rquispe', 'Rosa Quispe Huamán', 'AREA_ENCARGADA', 'CAPACITACION'],
      ['pmorales', 'Pedro Morales Ccanto', 'AREA_ENCARGADA', 'ADMINISTRACION'],
      ['cmendoza', 'Ing. Carlos Mendoza Rivera', 'DIRECTOR', null],
    ]) {
      await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
      await campo(admin, 'Nombre de usuario').fill(u)
      await campo(admin, 'Nombre completo').fill(n)
      await campo(admin, 'Rol').selectOption(rol)
      if (area) await campo(admin, 'Área').selectOption(area)
      await campo(admin, 'Contraseña temporal').fill(TEMPORAL)
      await admin.getByRole('button', { name: 'Crear cuenta' }).click()
      await admin.getByRole('status').getByText(`Se creó la cuenta "${u}"`).waitFor()
    }
  })

  // ------------------------------------------------------- HU07: seleccionar el tipo de documento
  const rosa = await nueva()
  await paso('HU07 · Nuevo documento lista solo los tipos del área, con su origen', async () => {
    await primerIngreso(rosa, 'rquispe', TEMPORAL, PROPIA)
    await rosa.getByRole('link', { name: 'Nuevo documento' }).click()
    await rosa.getByText('Seleccione el tipo de documento que desea emitir').waitFor()
    assert.deepEqual((await tarjetas(rosa)).sort(), [
      'Certificado de Capacitación',
      'Certificado de Reconocimiento',
    ])
    const capacitacion = rosa.getByRole('link', { name: /Certificado de Capacitación/ })
    await capacitacion.getByText('Para participantes de talleres y capacitaciones.').waitFor()
    await capacitacion.getByText('Emisión por lista').waitFor()
    await rosa.getByText('Solo se muestran los tipos de documento asignados a su área.').waitFor()
    assert.equal(await rosa.getByText(/Se habilita en el Sprint 2/).count(), 0)
    await foto(rosa, 'hu07_01_seleccion_capacitacion')
  })
  await paso('HU07 · Un tipo de oficio abre el registro por lista', async () => {
    await rosa.getByRole('link', { name: /Certificado de Capacitación/ }).click()
    await rosa.getByRole('heading', { name: 'Emisión por lista: Certificado de Capacitación' }).waitFor()
    await rosa.getByText('Origen: De oficio').waitFor()
    const pasos = await rosa.getByRole('list', { name: 'Pasos' }).getByRole('listitem').allTextContents()
    assert.deepEqual(pasos, ['1Datos del evento', '2Beneficiarios', '3Vista previa'])
    assert.ok(rosa.url().endsWith('#/nuevo-documento/CERTIFICADO_CAPACITACION'))
    await foto(rosa, 'hu07_02_registro_por_lista')
    // Desde el formulario se vuelve a la selección.
    await rosa.getByRole('link', { name: '← Cambiar tipo de documento' }).click()
    await rosa.getByText('Seleccione el tipo de documento que desea emitir').waitFor()
  })
  await paso('HU07 · Un tipo de otra área no se abre por su dirección ni por la API', async () => {
    await rosa.goto(URL + '#/nuevo-documento/CONSTANCIA_PRODUCTOR_ACTIVO')
    await rosa.getByRole('alert').getByText('Este tipo de documento no está asignado a su área.').waitFor()
    assert.equal(await rosa.getByText(/Origen:/).count(), 0)
    assert.equal(await api(rosa, '/api/tipos-documento/CONSTANCIA_PRODUCTOR_ACTIVO'), 403)
    await foto(rosa, 'hu07_03_tipo_de_otra_area')
  })
  await paso('HU07 · Un tipo a solicitud de parte abre el registro individual', async () => {
    const pedro = await nueva()
    await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
    await pedro.getByRole('link', { name: 'Nuevo documento' }).click()
    await pedro.getByText('Seleccione el tipo de documento que desea emitir').waitFor()
    assert.deepEqual((await tarjetas(pedro)).sort(), ['Certificado de Prácticas', 'Certificado de Trabajo'])
    await pedro.getByRole('link', { name: /Certificado de Trabajo/ }).getByText('A solicitud de parte').waitFor()
    await foto(pedro, 'hu07_04_seleccion_administracion')
    await pedro.getByRole('link', { name: /Certificado de Trabajo/ }).click()
    await pedro.getByRole('heading', { name: 'Certificado de Trabajo' }).waitFor()
    await pedro.getByText('Origen: A solicitud de parte').waitFor()
    assert.equal(await pedro.getByRole('list', { name: 'Pasos' }).count(), 0)
    await foto(pedro, 'hu07_05_registro_individual')
    await pedro.context().close()
  })
  await paso('HU07 · Si cambia el área con la sesión abierta, al volver ve los tipos nuevos', async () => {
    await admin.getByRole('button', { name: 'Editar rquispe' }).click()
    await campo(admin, 'Área').selectOption('DESARROLLO_AGRARIO')
    await admin.getByRole('button', { name: 'Guardar cambios' }).click()
    await admin.getByRole('status').getByText('Se guardaron los cambios').waitFor()

    await rosa.getByRole('link', { name: 'Nuevo documento' }).click()
    await rosa.getByRole('link', { name: /Constancia de Productor Activo/ }).waitFor()
    assert.deepEqual(await tarjetas(rosa), ['Constancia de Productor Activo'])
    await rosa.getByRole('banner').getByText('Área encargada – Área de Desarrollo Agrario').waitFor()
    await foto(rosa, 'hu07_06_area_cambiada_en_sesion')
    await rosa.context().close()
  })
  await paso('HU07 · Otro rol no ve la opción ni abre el formulario', async () => {
    const carlos = await nueva()
    await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
    assert.deepEqual(await menu(carlos), ['Inicio', 'Por revisar', 'Documentos firmados'])
    await carlos.goto(URL + '#/nuevo-documento/CERTIFICADO_CAPACITACION')
    await carlos.getByText('No tiene permiso para ver esta sección.').waitFor()
    assert.equal(await api(carlos, '/api/tipos-documento'), 403)
    assert.equal(await api(carlos, '/api/tipos-documento/CERTIFICADO_CAPACITACION'), 403)
    await carlos.context().close()
  })

  await b.close()
  require('node:fs').writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
