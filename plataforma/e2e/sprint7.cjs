// Prueba de punta a punta real del Sprint 7: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Crea sus propias cuentas desde la
// pantalla Usuarios y recorre las historias del Sprint 7: DRA-60 (qué tipos de documento emite cada
// área) y DRA-61 (crear, renombrar, deshabilitar y reactivar áreas).
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

  // ------------------------------------------- DRA-61: crear, renombrar, deshabilitar y reactivar
  const SANIDAD = 'Área de Sanidad Agraria'
  const SANIDAD_FORESTAL = 'Área de Sanidad Agraria y Forestal'
  const ventanaArea = (titulo) => admin.getByRole('dialog', { name: titulo })
  const areas = async () => {
    await admin.getByRole('link', { name: 'Áreas y documentos' }).click()
    await tarjetaDe(admin, 'Área de Administración').waitFor()
  }
  /** Las áreas que ofrece el formulario de cuentas (HU05). */
  const areasDelFormulario = async () => {
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
    await campo(admin, 'Rol').selectOption('AREA_ENCARGADA')
    const opciones = await campo(admin, 'Área').locator('option').allTextContents()
    await admin.getByRole('button', { name: 'Cancelar' }).click()
    return opciones
  }
  await paso('DRA-61 · El Administrador crea un área: nace activa, sin tipos, y no admite un nombre repetido', async () => {
    await admin.getByRole('button', { name: 'Nueva área' }).click()
    await campo(admin, 'Nombre del área').fill('area de sanidad AGRARIA ')
    await ventanaArea('Nueva área').getByRole('button', { name: 'Crear área' }).click()
    await admin.getByRole('status').getByText('Se creó el área «area de sanidad AGRARIA». Asígnele sus tipos de documento.').waitFor()
    // Se corrige el nombre: solo cambian mayúsculas y tildes de su propio nombre.
    await tarjetaDe(admin, 'area de sanidad AGRARIA').getByRole('button', { name: 'Cambiar el nombre de area de sanidad AGRARIA' }).click()
    await campo(admin, 'Nombre del área').fill(SANIDAD)
    await ventanaArea('Cambiar el nombre del área').getByRole('button', { name: 'Guardar nombre' }).click()
    const tarjeta = tarjetaDe(admin, SANIDAD)
    await tarjeta.getByRole('note').getByText('Esta área no puede emitir documentos.').waitFor()
    assert.equal(psql("SELECT codigo, activa FROM area WHERE nombre = 'Área de Sanidad Agraria'"), 'SANIDAD_AGRARIA|t')
    await foto(admin, 'dra61_01_area_creada')
    // El mismo nombre sin tildes ni mayúsculas ya existe.
    await admin.getByRole('button', { name: 'Nueva área' }).click()
    await campo(admin, 'Nombre del área').fill('AREA DE SANIDAD AGRARIA')
    await ventanaArea('Nueva área').getByRole('button', { name: 'Crear área' }).click()
    await ventanaArea('Nueva área').getByRole('alert').getByText('Ya existe un área con ese nombre.').waitFor()
    await foto(admin, 'dra61_02_nombre_repetido')
    await ventanaArea('Nueva área').getByRole('button', { name: 'Cancelar' }).click()
    assert.equal(await admin.getByRole('button', { name: /Eliminar/ }).count(), 0)
    await tarjeta.getByLabel('Asignar otro tipo de documento').selectOption('CERTIFICADO_TRABAJO')
    await tarjeta.getByRole('button', { name: 'Asignar' }).click()
    await admin.getByRole('status').getByText(`${SANIDAD} ya puede emitir Certificado de Trabajo.`).waitFor()
  })
  const luis = await nueva()
  let enTramite
  await paso('DRA-61 · La nueva área aparece en Usuarios y su persona registra un documento', async () => {
    assert.ok((await areasDelFormulario()).includes(SANIDAD))
    await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
    await campo(admin, 'Nombre de usuario').fill('lvargas')
    await campo(admin, 'Nombre completo').fill('Luis Vargas Inga')
    await campo(admin, 'Rol').selectOption('AREA_ENCARGADA')
    await campo(admin, 'Área').selectOption({ label: SANIDAD })
    await campo(admin, 'Contraseña temporal').fill(TEMPORAL)
    await admin.getByRole('button', { name: 'Crear cuenta' }).click()
    await admin.getByRole('status').getByText('Se creó la cuenta "lvargas"').waitFor()
    await primerIngreso(luis, 'lvargas', TEMPORAL, PROPIA)
    await luis.getByText(`Emisor de área – ${SANIDAD}`).waitFor()
    await luis.getByRole('link', { name: 'Nuevo documento' }).click()
    await luis.getByRole('link', { name: /Certificado de Trabajo/ }).waitFor()
    assert.deepEqual(await tarjetas(luis), ['Certificado de Trabajo'])
    const r = await enviar(luis, '/api/documentos', trabajo('EXP-2026-007101'))
    assert.equal(r.estado, 201)
    enTramite = r.cuerpo.codigo
  })
  await paso('DRA-61 · Cambiar el nombre se ve en la plataforma; el código y el historial anterior no cambian', async () => {
    await areas()
    await tarjetaDe(admin, SANIDAD).getByRole('button', { name: `Cambiar el nombre de ${SANIDAD}` }).click()
    const campoNombre = campo(admin, 'Nombre del área')
    assert.equal(await campoNombre.inputValue(), SANIDAD)
    await campoNombre.fill(SANIDAD_FORESTAL)
    await foto(admin, 'dra61_03_cambiar_nombre')
    await ventanaArea('Cambiar el nombre del área').getByRole('button', { name: 'Guardar nombre' }).click()
    await admin.getByRole('status').getByText(`«${SANIDAD}» ahora se llama «${SANIDAD_FORESTAL}».`).waitFor()
    const historial = admin.getByRole('region', { name: 'Historial de cambios' })
    await historial.getByText(`Nombre: ${SANIDAD} → ${SANIDAD_FORESTAL}`).waitFor()
    await historial.getByText(`${SANIDAD}: se asignó Certificado de Trabajo`).waitFor()
    assert.equal(psql(`SELECT codigo FROM area WHERE nombre = '${SANIDAD_FORESTAL}'`), 'SANIDAD_AGRARIA')
    // Luis ve el nombre nuevo al volver a cargar la plataforma, también en la ficha de su documento.
    await luis.reload()
    await luis.getByText(`Emisor de área – ${SANIDAD_FORESTAL}`).waitFor()
    await foto(luis, 'dra61_04_luis_con_el_nombre_nuevo')
    const ficha = await luis.evaluate((c) => fetch('/api/documentos/' + c).then((x) => x.json()), enTramite)
    assert.equal(ficha.areaNombre, SANIDAD_FORESTAL)
  })
  await paso('DRA-61 · No se deshabilita un área con personas activas', async () => {
    await tarjetaDe(admin, SANIDAD_FORESTAL).getByRole('button', { name: `Deshabilitar ${SANIDAD_FORESTAL}` }).click()
    const ventana = ventanaArea('Deshabilitar área')
    await ventana.getByText('Sus documentos en trámite siguen su flujo y los firmados siguen siendo válidos.', { exact: false }).waitFor()
    await ventana.getByRole('button', { name: 'Deshabilitar' }).click()
    await ventana.getByRole('alert').getByText('No se puede deshabilitar: el área tiene 1 persona activa. Muévalas a otra área desde Usuarios.').waitFor()
    await foto(admin, 'dra61_05_area_con_personas')
    await ventana.getByRole('button', { name: 'Cancelar' }).click()
    assert.equal(psql(`SELECT activa FROM area WHERE codigo = 'SANIDAD_AGRARIA'`), 't')
  })
  await paso('DRA-61 · Sin personas activas, se deshabilita: no aparece en Usuarios y conserva sus tipos', async () => {
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    await admin.getByRole('button', { name: 'Desactivar lvargas' }).click()
    await admin.getByRole('button', { name: 'Desactivar cuenta' }).click()
    await admin.getByRole('status').waitFor()
    await areas()
    await tarjetaDe(admin, SANIDAD_FORESTAL).getByRole('button', { name: `Deshabilitar ${SANIDAD_FORESTAL}` }).click()
    await ventanaArea('Deshabilitar área').getByRole('button', { name: 'Deshabilitar' }).click()
    await admin.getByRole('status').getByText(`Se deshabilitó «${SANIDAD_FORESTAL}».`).waitFor()
    const seccion = admin.getByRole('region', { name: 'Áreas deshabilitadas' })
    await seccion.getByText(SANIDAD_FORESTAL).waitFor()
    await seccion.getByText('Conserva: Certificado de Trabajo').waitFor()
    assert.equal(await tarjetaDe(admin, SANIDAD_FORESTAL).count(), 0)
    await foto(admin, 'dra61_06_area_deshabilitada')
    assert.ok(!(await areasDelFormulario()).includes(SANIDAD_FORESTAL))
  })
  await paso('DRA-61 · Su documento en trámite sigue su flujo, y su cuenta no se reactiva sin moverla', async () => {
    assert.equal((await enviar(carlos, `/api/revision/documentos/${enTramite}`, {})).estado, 200)
    const o = await enviar(carlos, `/api/revision/documentos/${enTramite}/observacion`, { motivo: 'Falta la fecha de fin del contrato' })
    assert.equal(o.estado, 200)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${enTramite}'`), 'OBSERVADO')
    await admin.getByRole('button', { name: 'Reactivar lvargas' }).click()
    await admin.getByRole('button', { name: 'Reactivar cuenta' }).click()
    await admin.getByRole('alert').getByText(`El área «${SANIDAD_FORESTAL}» está deshabilitada. Edite la cuenta y asígnele otra área antes de reactivarla.`).waitFor()
    await foto(admin, 'dra61_07_cuenta_en_area_deshabilitada')
    await admin.getByRole('button', { name: 'Cancelar' }).click()
  })
  await paso('DRA-61 · Al reactivarla vuelve con sus tipos, y todo queda en el historial', async () => {
    await areas()
    const seccion = admin.getByRole('region', { name: 'Áreas deshabilitadas' })
    await seccion.getByRole('button', { name: `Reactivar ${SANIDAD_FORESTAL}` }).click()
    const ventana = ventanaArea('Reactivar área')
    await ventana.getByText('Vuelve con los tipos de documento que tenía.', { exact: false }).waitFor()
    await ventana.getByRole('button', { name: 'Reactivar' }).click()
    await admin.getByRole('status').getByText(`Se reactivó «${SANIDAD_FORESTAL}».`).waitFor()
    assert.match((await emite(admin, SANIDAD_FORESTAL)).join(' | '), /Certificado de Trabajo/)
    const historial = admin.getByRole('region', { name: 'Historial de cambios' })
    await historial.getByText(`${SANIDAD_FORESTAL}: se reactivó`).waitFor()
    await historial.getByText(`${SANIDAD_FORESTAL}: se deshabilitó`).waitFor()
    await foto(admin, 'dra61_08_area_reactivada_e_historial')
    assert.equal(
      psql("SELECT string_agg(evento, ',' ORDER BY id) FROM catalogo_historial WHERE evento LIKE 'AREA_%'"),
      'AREA_CREADA,AREA_RENOMBRADA,AREA_RENOMBRADA,AREA_DESHABILITADA,AREA_REACTIVADA',
    )
    // Ahora sí se reactiva la cuenta de Luis, que vuelve a registrar el Certificado de Trabajo.
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    await admin.getByRole('button', { name: 'Reactivar lvargas' }).click()
    await admin.getByRole('button', { name: 'Reactivar cuenta' }).click()
    await admin.getByRole('status').waitFor()
    const deNuevo = await nueva()
    await ingresar(deNuevo, 'lvargas', PROPIA)
    await deNuevo.getByRole('link', { name: 'Nuevo documento' }).click()
    await deNuevo.getByRole('link', { name: /Certificado de Trabajo/ }).waitFor()
    assert.deepEqual(await tarjetas(deNuevo), ['Certificado de Trabajo'])
  })

  await b.close()
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message || String(e))
  process.exit(1)
})
