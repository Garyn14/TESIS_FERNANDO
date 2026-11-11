// Prueba de punta a punta real del Sprint 7: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Crea sus propias cuentas desde la
// pantalla Usuarios y recorre las historias del Sprint 7: DRA-60 (qué tipos de documento emite cada
// área).
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
// Contenedores del entorno de prueba: los de levantar.sh, o los del servidor de AWS en Docker
// (infra/aws/pruebas/de-punta-a-punta.sh).
const CONTENEDOR_PG = process.env.E2E_CONTENEDOR_PG ?? 'e2e-pg'

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
  /** POST a la API con la sesión y el token CSRF del navegador. */
  const enviar = (p, ruta, cuerpo) =>
    p.evaluate(
      async ([r, c]) => {
        const cookie = document.cookie.split('; ').find((x) => x.startsWith('XSRF-TOKEN='))
        const respuesta = await fetch(r, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(cookie?.split('=')[1] ?? ''),
          },
          body: JSON.stringify(c),
        })
        return { estado: respuesta.status, cuerpo: await respuesta.json() }
      },
      [ruta, cuerpo],
    )
  const psql = (sql) =>
    execFileSync('docker', ['exec', CONTENEDOR_PG, 'psql', '-U', 'plataforma', '-d', 'plataforma', '-At', '-F', '|', '-c', sql])
      .toString()
      .trim()
  const foto = (p, nombre) => p.screenshot({ path: `${out}/${nombre}.png`, fullPage: true })
  /** Tarjetas de la pantalla Nuevo documento: nombre de cada tipo. */
  const tarjetas = (p) => p.locator('main ul > li a span.text-lg').allTextContents()
  const trabajo = (expediente) => ({
    tipo: 'CERTIFICADO_TRABAJO',
    numeroExpediente: expediente,
    nombres: 'Lucía',
    apellidos: 'Paredes Quinto',
    dni: '45829364',
    datos: { cargo: 'asistente administrativa', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
  })

  // ------------------------------------------------------------- Preparación: cuentas reales
  const admin = await nueva()
  await paso('Preparación · El Administrador crea las cuentas desde la pantalla Usuarios', async () => {
    await primerIngreso(admin, 'admin', ADMIN_TEMPORAL, ADMIN_CLAVE)
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol, area] of [
      ['rquispe', 'Rosa Quispe Huamán', 'AREA_ENCARGADA', 'CAPACITACION'],
      ['pmorales', 'Pedro Morales Ccanto', 'AREA_ENCARGADA', 'ADMINISTRACION'],
      ['jsoto', 'José Soto Ramos', 'AREA_ENCARGADA', 'ADMINISTRACION'],
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

  const rosa = await nueva()
  const pedro = await nueva()
  const carlos = await nueva()
  let observado
  await paso('Preparación · Pedro envía un Certificado de Trabajo y el Director lo observa', async () => {
    await primerIngreso(rosa, 'rquispe', TEMPORAL, PROPIA)
    await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
    await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
    const r = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-007001'))
    assert.equal(r.estado, 201)
    observado = r.cuerpo.codigo
    assert.equal((await enviar(carlos, `/api/revision/documentos/${observado}`, {})).estado, 200)
    const o = await enviar(carlos, `/api/revision/documentos/${observado}/observacion`, {
      motivo: 'El cargo no coincide con el contrato',
    })
    assert.equal(o.estado, 200)
  })

  // ------------------------------------------- DRA-60: qué tipos de documento emite cada área
  const tarjetaDe = (p, area) => p.getByRole('article', { name: area })
  const emite = async (p, area) =>
    tarjetaDe(p, area).getByRole('list', { name: `Documentos que emite ${area}` }).getByRole('listitem').locator('span').allTextContents()
  await paso('DRA-60 · El Administrador tiene la pantalla "Áreas y documentos" con cada área, sus tipos y sus personas', async () => {
    assert.deepEqual(await menu(admin), ['Inicio', 'Usuarios', 'Billetera del director', 'Áreas y documentos'])
    await admin.getByRole('link', { name: 'Áreas y documentos' }).click()
    await tarjetaDe(admin, 'Área de Administración').getByText('2 personas del área').waitFor()
    await tarjetaDe(admin, 'Área de Capacitación').getByText('1 persona del área').waitFor()
    await tarjetaDe(admin, 'Área de Desarrollo Agrario').getByText('0 personas del área').waitFor()
    const capacitacion = (await emite(admin, 'Área de Capacitación')).join(' | ')
    assert.match(capacitacion, /Certificado de Capacitación/)
    assert.match(capacitacion, /Certificado de Reconocimiento/)
    await admin.getByText('Todavía no hay cambios.').waitFor()
    await foto(admin, 'dra60_01_areas_y_documentos')
  })
  await paso('DRA-60 · Solo el Administrador ve la pantalla y usa su API', async () => {
    assert.ok(!(await menu(pedro)).includes('Áreas y documentos'))
    await pedro.goto(URL + '#/areas')
    await pedro.getByText('No tiene permiso para ver esta sección').waitFor()
    assert.equal(await api(pedro, '/api/catalogo'), 403)
    assert.equal(await api(carlos, '/api/catalogo'), 403)
    await pedro.goto(URL + '#/inicio')
  })
  await paso('DRA-60 · Asigna la Constancia de Productor Activo al Área de Capacitación y Rosa la ve sin volver a ingresar', async () => {
    await rosa.getByRole('link', { name: 'Nuevo documento' }).click()
    await rosa.getByRole('link', { name: /Certificado de Reconocimiento/ }).waitFor()
    assert.deepEqual((await tarjetas(rosa)).sort(), ['Certificado de Capacitación', 'Certificado de Reconocimiento'])
    const tarjeta = tarjetaDe(admin, 'Área de Capacitación')
    await tarjeta.getByLabel('Asignar otro tipo de documento').selectOption('CONSTANCIA_PRODUCTOR_ACTIVO')
    await tarjeta.getByRole('button', { name: 'Asignar' }).click()
    await admin.getByRole('status').getByText('Área de Capacitación ya puede emitir Constancia de Productor Activo.').waitFor()
    await foto(admin, 'dra60_02_tipo_asignado')
    // La siguiente pantalla de Rosa ya lo muestra; el tipo sigue también en Desarrollo Agrario.
    await rosa.getByRole('link', { name: 'Inicio' }).click()
    await rosa.getByRole('link', { name: 'Nuevo documento' }).click()
    await rosa.getByRole('link', { name: /Constancia de Productor Activo/ }).waitFor()
    assert.deepEqual((await tarjetas(rosa)).sort(), [
      'Certificado de Capacitación',
      'Certificado de Reconocimiento',
      'Constancia de Productor Activo',
    ])
    assert.match((await emite(admin, 'Área de Desarrollo Agrario')).join(' | '), /Constancia de Productor Activo/)
    await foto(rosa, 'dra60_03_rosa_ve_el_tipo_nuevo')
  })
  await paso('DRA-60 · Quitar pide confirmación con las personas afectadas', async () => {
    await tarjetaDe(admin, 'Área de Administración').getByRole('button', { name: 'Quitar Certificado de Trabajo de Área de Administración' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Quitar tipo de documento' })
    await ventana.getByText('¿Quitar «Certificado de Trabajo» del Área de Administración?').waitFor()
    await ventana.getByText('2 personas del área dejarán de poder registrar documentos de este tipo. Los documentos ya registrados siguen su trámite.').waitFor()
    await foto(admin, 'dra60_04_confirmar_quitar')
    await ventana.getByRole('button', { name: 'Quitar' }).click()
    await admin.getByRole('status').getByText('Área de Administración ya no emite Certificado de Trabajo.').waitFor()
    assert.doesNotMatch((await emite(admin, 'Área de Administración')).join(' | '), /Certificado de Trabajo/)
  })
  await paso('DRA-60 · Pedro ya no puede registrar un Certificado de Trabajo nuevo', async () => {
    await pedro.getByRole('link', { name: 'Nuevo documento' }).click()
    await pedro.getByRole('link', { name: /Certificado de Prácticas/ }).waitFor()
    assert.deepEqual(await tarjetas(pedro), ['Certificado de Prácticas'])
    assert.equal((await enviar(pedro, '/api/documentos', trabajo('EXP-2026-007002'))).estado, 403)
    await foto(pedro, 'dra60_05_pedro_sin_certificado_de_trabajo')
  })
  await paso('DRA-60 · Pero corrige y reenvía su Certificado de Trabajo observado', async () => {
    await pedro.goto(URL + '#/mis-documentos/' + observado)
    await pedro.getByRole('link', { name: 'Corregir y reenviar' }).click()
    await pedro.getByRole('heading', { name: 'Corregir y reenviar – Certificado de Trabajo' }).waitFor()
    await pedro.getByLabel('Cargo', { exact: false }).fill('secretaria')
    await pedro.getByRole('button', { name: 'Continuar a vista previa' }).click()
    await pedro.getByRole('figure').getByText('como secretaria', { exact: false }).waitFor()
    await pedro.getByRole('button', { name: 'Reenviar a revisión' }).click()
    await pedro.getByRole('dialog', { name: '¿Reenviar a revisión?' }).getByRole('button', { name: 'Reenviar' }).click()
    await pedro.getByText('✓ Documento corregido y reenviado a revisión').waitFor()
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${observado}'`), 'PENDIENTE')
    await foto(pedro, 'dra60_06_observado_corregido')
  })
  await paso('DRA-60 · Un área sin tipos muestra la advertencia, y los cambios quedan en el historial', async () => {
    await admin.reload()
    await tarjetaDe(admin, 'Área de Desarrollo Agrario').getByRole('button', { name: 'Quitar Constancia de Productor Activo de Área de Desarrollo Agrario' }).click()
    await admin.getByRole('dialog', { name: 'Quitar tipo de documento' }).getByRole('button', { name: 'Quitar' }).click()
    await tarjetaDe(admin, 'Área de Desarrollo Agrario').getByRole('note').getByText('Esta área no puede emitir documentos.').waitFor()
    const historial = admin.getByRole('region', { name: 'Historial de cambios' })
    await historial.getByText('Área de Desarrollo Agrario: se quitó Constancia de Productor Activo').waitFor()
    await historial.getByText('Área de Administración: se quitó Certificado de Trabajo').waitFor()
    await historial.getByText('Área de Capacitación: se asignó Constancia de Productor Activo').waitFor()
    assert.equal(
      psql("SELECT h.evento, u.nombre_usuario FROM catalogo_historial h JOIN usuario u ON u.id = h.realizado_por ORDER BY h.id LIMIT 1"),
      'TIPO_ASIGNADO|admin',
    )
    await foto(admin, 'dra60_07_area_sin_tipos_e_historial')
  })

  await b.close()
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message || String(e))
  process.exit(1)
})
