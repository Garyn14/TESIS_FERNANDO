// Prueba de punta a punta real del Sprint 2: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Crea sus propias cuentas desde la
// pantalla Usuarios y recorre HU07, HU08 y HU09.
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
      ['lhuaman', 'Luz Huamán Ccori', 'AREA_ENCARGADA', 'CAPACITACION'],
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
    const pasos = await pedro.getByRole('list', { name: 'Pasos' }).getByRole('listitem').allTextContents()
    assert.deepEqual(pasos, ['1Datos de la solicitud', '2Vista previa'])
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

  // ------------------------------------------------- HU08: registro a solicitud de parte
  const EXPEDIENTE = 'EXP-2026-005391'
  const pedro = await nueva()
  const formulario = (p) => ({
    expediente: p.getByLabel(/^N\.° de expediente/),
    dni: campo(p, 'DNI'),
    nombres: campo(p, 'Nombres'),
    apellidos: campo(p, 'Apellidos'),
    cargo: p.getByLabel(/^Cargo/),
    inicio: campo(p, 'Fecha de inicio'),
    fin: campo(p, 'Fecha de fin'),
  })
  const continuar = (p) => p.getByRole('button', { name: 'Continuar a vista previa' }).click()
  let codigo
  await paso('HU08 · Exige el expediente y valida cada campo antes de la vista previa', async () => {
    await ingresar(pedro, 'pmorales', PROPIA)
    await pedro.getByRole('link', { name: 'Nuevo documento' }).click()
    await pedro.getByRole('link', { name: /Certificado de Trabajo/ }).click()
    await pedro.getByRole('heading', { name: 'Certificado de Trabajo' }).waitFor()
    const f = formulario(pedro)
    await f.dni.fill('4582936')
    await f.inicio.fill('02/05/2026')
    await f.fin.fill('01/05/2026')
    await continuar(pedro)
    await pedro.getByText('Ingrese el número de expediente.').waitFor()
    await pedro.getByText('El DNI debe tener 8 dígitos.').waitFor()
    await pedro.getByText('Ingrese los nombres.').waitFor()
    await pedro.getByText('La fecha de fin no puede ser anterior a la de inicio.').waitFor()
    await f.expediente.fill('2026-5391')
    await continuar(pedro)
    await pedro.getByText('Use el formato EXP-AAAA-NNNNNN, por ejemplo EXP-2026-004817.').waitFor()
    await foto(pedro, 'hu08_01_validaciones')
  })
  await paso('HU08 · La vista previa usa la plantilla del tipo y se puede volver sin perder datos', async () => {
    const f = formulario(pedro)
    await f.expediente.fill(EXPEDIENTE.toLowerCase())
    await f.dni.fill('45829364')
    await f.nombres.fill('Lucía')
    await f.apellidos.fill('Paredes Quinto')
    await f.cargo.fill('asistente administrativa')
    await f.inicio.fill('02/01/2025')
    await f.fin.fill('30/09/2026')
    // Observación del PO: las fechas se ven en día/mes/año, aunque el navegador esté en inglés.
    assert.equal(await f.inicio.inputValue(), '02/01/2025')
    assert.equal(await f.inicio.getAttribute('placeholder'), 'dd/mm/aaaa')
    await continuar(pedro)
    const certificado = pedro.getByRole('figure', { name: 'Vista previa: Certificado de Trabajo' })
    await certificado.waitFor()
    for (const texto of [
      'VISTA PREVIA',
      'CERTIFICADO',
      'Lucía Paredes Quinto',
      'como asistente administrativa, del 02/01/2025 al 30/09/2026',
      'Fecha de emisión: se asignará al firmar',
      'Ing. Carlos Mendoza Rivera',
    ])
      await certificado.getByText(texto, { exact: false }).first().waitFor()
    await pedro.getByText(EXPEDIENTE).waitFor()
    await foto(pedro, 'hu08_02_vista_previa')
    await pedro.getByRole('button', { name: 'Volver' }).click()
    assert.equal(await formulario(pedro).cargo.inputValue(), 'asistente administrativa')
    await continuar(pedro)
    await certificado.waitFor()
  })
  await paso('HU08 · Al enviar, con confirmación, queda Pendiente con su código de verificación', async () => {
    await pedro.getByRole('button', { name: 'Enviar a revisión' }).click()
    const ventana = pedro.getByRole('dialog', { name: '¿Enviar a revisión?' })
    await ventana.getByText('no se puede modificar mientras esté en revisión', { exact: false }).waitFor()
    await foto(pedro, 'hu08_03_confirmar_envio')
    await ventana.getByRole('button', { name: 'Enviar' }).click()
    const aviso = pedro.getByRole('status')
    await aviso.getByText('Documento enviado a revisión').waitFor()
    codigo = await aviso.locator('strong').textContent()
    assert.match(codigo, new RegExp(`^DRA-${new Date().getFullYear()}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$`))
    await foto(pedro, 'hu08_04_enviado')
  })
  await paso('HU08 · En la base quedan el token del QR y el HMAC del DNI, nunca el DNI en su lugar', async () => {
    const fila = execFileSync('docker', [
      'exec', CONTENEDOR_PG, 'psql', '-U', 'plataforma', '-d', 'plataforma', '-At', '-F', '|', '-c',
      `SELECT estado, numero_expediente, length(token_qr), dni_hmac, (SELECT evento FROM documento_historial h WHERE h.documento_id = d.id) FROM documento d WHERE codigo = '${codigo}'`,
    ]).toString().trim().split('|')
    assert.equal(fila[0], 'PENDIENTE')
    assert.equal(fila[1], EXPEDIENTE)
    assert.equal(fila[2], '43')
    assert.match(fila[3], /^[0-9a-f]{64}$/)
    assert.equal(fila[4], 'REGISTRADO')
    // La API nunca devuelve el HMAC ni el token.
    const json = await pedro.evaluate((c) => fetch('/api/documentos/' + c).then((r) => r.text()), codigo)
    assert.ok(!json.includes(fila[3]) && !json.includes('tokenQr'))
  })
  await paso('HU08 · Mis documentos lo muestra Pendiente y su detalle no se puede editar', async () => {
    await pedro.getByRole('link', { name: 'Mis documentos' }).click()
    const fila = pedro.locator('tr', { hasText: codigo })
    await fila.getByText('Pendiente').waitFor()
    await fila.getByText('Lucía Paredes Quinto').waitFor()
    await fila.getByText(EXPEDIENTE).waitFor()
    assert.equal(await pedro.getByText(/Se habilita en el Sprint 2/).count(), 0)
    await foto(pedro, 'hu08_05_mis_documentos')
    await fila.getByRole('link', { name: codigo }).click()
    await pedro.getByText('no se puede modificar mientras esté Pendiente', { exact: false }).waitFor()
    await pedro.getByRole('figure').getByText('VISTA PREVIA').waitFor()
    assert.equal(await pedro.locator('main').getByRole('button').count(), 0)
    await foto(pedro, 'hu08_06_detalle_pendiente')
  })
  await paso('HU08 · El mismo expediente no se registra dos veces', async () => {
    await pedro.goto(URL + '#/nuevo-documento/CERTIFICADO_PRACTICAS')
    await pedro.getByRole('heading', { name: 'Certificado de Prácticas' }).waitFor()
    await pedro.getByLabel(/^N\.° de expediente/).fill(EXPEDIENTE)
    await campo(pedro, 'DNI').fill('46385127')
    await campo(pedro, 'Nombres').fill('Kevin')
    await campo(pedro, 'Apellidos').fill('Ramos Ccanto')
    await campo(pedro, 'Modalidad').selectOption('preprofesionales')
    await pedro.getByLabel(/^Área donde realizó las prácticas/).fill('Área de Administración')
    await campo(pedro, 'Fecha de inicio').fill('01/06/2026')
    await campo(pedro, 'Fecha de fin').fill('31/08/2026')
    await continuar(pedro)
    await pedro.getByRole('figure').getByText('prácticas preprofesionales en el Área de Administración', { exact: false }).waitFor()
    await pedro.getByRole('button', { name: 'Enviar a revisión' }).click()
    await pedro.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click()
    await pedro.getByText('El número de expediente ya está registrado en otro documento.').waitFor()
    await foto(pedro, 'hu08_07_expediente_repetido')
    await pedro.context().close()
  })
  await paso('HU08 · Un documento de otra área no se lista ni se abre por su dirección', async () => {
    const rosa2 = await nueva()
    await ingresar(rosa2, 'rquispe', PROPIA)
    await rosa2.getByRole('link', { name: 'Mis documentos' }).click()
    await rosa2.getByText('Aún no hay documentos registrados en su área.').waitFor()
    await rosa2.goto(URL + '#/mis-documentos/' + codigo)
    await rosa2.getByRole('alert').getByText('Este documento no pertenece a su área.').waitFor()
    assert.equal(await api(rosa2, '/api/documentos/' + codigo), 403)
    await foto(rosa2, 'hu08_08_documento_de_otra_area')
    await rosa2.context().close()
  })

  // ------------------------------------------------------------- HU09: emisión por lista
  const luz = await nueva()
  const psql = (sql) =>
    execFileSync('docker', ['exec', CONTENEDOR_PG, 'psql', '-U', 'plataforma', '-d', 'plataforma', '-At', '-F', '|', '-c', sql])
      .toString()
      .trim()
  const celda = (p, columna, fila) => p.getByLabel(`${columna} de la fila ${fila}`, { exact: true })
  let lote
  await paso('HU09 · Los datos del evento se validan y el área organizadora viene completa', async () => {
    await primerIngreso(luz, 'lhuaman', TEMPORAL, PROPIA)
    await luz.getByRole('link', { name: 'Nuevo documento' }).click()
    await luz.getByRole('link', { name: /Certificado de Capacitación/ }).click()
    await luz.getByRole('heading', { name: 'Emisión por lista: Certificado de Capacitación' }).waitFor()
    assert.equal(await luz.getByLabel(/^Área organizadora/).inputValue(), 'Área de Capacitación')
    await luz.getByRole('button', { name: 'Continuar' }).click()
    assert.equal(await luz.getByText('Complete este campo.').count(), 3)
    await luz.getByLabel(/^Nombre del taller/).fill('Manejo integrado de plagas en café')
    await campo(luz, 'Fecha de inicio').fill('14/09/2026')
    await campo(luz, 'Fecha de fin').fill('16/09/2026')
    await luz.getByLabel(/^Duración \(horas\)/).fill('24')
    await luz.getByLabel(/^Lugar/).fill('Local comunal de Río Negro, Satipo')
    await foto(luz, 'hu09_01_datos_del_evento')
    await luz.getByRole('button', { name: 'Continuar' }).click()
    await luz.getByText('Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno.').waitFor()
  })
  await paso('HU09 · La plantilla Excel se descarga con sus columnas', async () => {
    const [descarga] = await Promise.all([
      luz.waitForEvent('download'),
      luz.getByRole('button', { name: 'Descargar plantilla Excel' }).click(),
    ])
    assert.equal(descarga.suggestedFilename(), 'plantilla-beneficiarios.xlsx')
    const ruta = await descarga.path()
    // Un .xlsx es un ZIP: empieza con "PK".
    assert.equal(require('node:fs').readFileSync(ruta).subarray(0, 2).toString(), 'PK')
    await luz.getByText('Plantilla descargada.').waitFor()
  })
  await paso('HU09 · Importa la lista desde Excel y señala la fila con error', async () => {
    await luz.getByLabel('Archivo Excel de beneficiarios').setInputFiles(`${__dirname}/datos/beneficiarios-prototipo.xlsx`)
    await luz.getByText('Se importaron 8 beneficiarios desde Excel.').waitFor()
    assert.equal(await celda(luz, 'Nombres', 8).inputValue(), 'Gladys')
    await luz.getByText('El DNI debe tener 8 dígitos.').waitFor()
    await luz.getByText('Hay 1 error en la lista. Corríjalo para continuar.').waitFor()
    assert.ok(await luz.getByRole('button', { name: 'Continuar a vista previa' }).isDisabled())
    await foto(luz, 'hu09_02_importado_con_error')
    await celda(luz, 'DNI', 5).fill('44198236')
    await luz.getByText('✓ 8 beneficiarios listos').waitFor()
    await foto(luz, 'hu09_03_lista_corregida')
  })
  await paso('HU09 · Un DNI repetido se señala en las dos filas', async () => {
    await luz.getByRole('button', { name: 'Agregar beneficiario' }).click()
    await celda(luz, 'Nombres', 9).fill('Juan Carlos')
    await celda(luz, 'Apellidos', 9).fill('Ccori Mamani')
    await celda(luz, 'DNI', 9).fill('45218736')
    await luz.getByText('El DNI se repite en la fila 9.').waitFor()
    await luz.getByText('El DNI se repite en la fila 1.').waitFor()
    await foto(luz, 'hu09_04_dni_repetido')
    await luz.getByRole('button', { name: 'Eliminar la fila 9' }).click()
    await luz.getByText('✓ 8 beneficiarios listos').waitFor()
  })
  await paso('HU09 · La vista previa muestra un certificado de ejemplo y la relación completa', async () => {
    await luz.getByRole('button', { name: 'Continuar a vista previa' }).click()
    const resumen = luz.getByRole('complementary', { name: 'Resumen del lote' })
    await resumen.getByText('8 certificados').waitFor()
    await resumen.getByText('del 14 al 16 de setiembre de 2026').waitFor()
    assert.equal(await resumen.getByRole('listitem').count(), 8)
    const certificado = luz.getByRole('figure')
    await certificado.getByText('VISTA PREVIA').waitFor()
    await certificado.getByText('Juan Ccori Pari', { exact: false }).waitFor()
    await certificado
      .getByText("'Manejo integrado de plagas en café', realizado del 14 al 16 de setiembre de 2026", { exact: false })
      .waitFor()
    await foto(luz, 'hu09_05_vista_previa')
    await luz.getByRole('button', { name: 'Volver' }).click()
    assert.equal(await celda(luz, 'DNI', 5).inputValue(), '44198236')
    await luz.getByRole('button', { name: 'Continuar a vista previa' }).click()
    await resumen.waitFor()
  })
  await paso('HU09 · Al enviar se crea el lote con un documento Pendiente por beneficiario', async () => {
    await luz.getByRole('button', { name: 'Enviar a revisión' }).click()
    const ventana = luz.getByRole('dialog', { name: '¿Enviar a revisión?' })
    await ventana.getByText('¿Enviar 8 certificados a revisión del Director?', { exact: false }).waitFor()
    await foto(luz, 'hu09_06_confirmar_envio')
    await ventana.getByRole('button', { name: 'Enviar' }).click()
    const aviso = luz.getByRole('status')
    await aviso.getByText(/Se enviaron 8 certificados a revisión \(Lote \d{4}-\d{3}\)/).waitFor()
    lote = (await aviso.textContent()).match(/Lote (\d{4}-\d{3})/)[1]
    assert.equal(lote, `${new Date().getFullYear()}-001`)
    await foto(luz, 'hu09_07_enviado')
  })
  await paso('HU09 · En la base hay 8 documentos del lote, cada uno con su código, token y HMAC', async () => {
    const fila = psql(
      `SELECT count(*), count(DISTINCT d.codigo), count(DISTINCT d.token_qr), count(DISTINCT d.dni_hmac),
              bool_and(d.estado = 'PENDIENTE' AND d.origen = 'OFICIO' AND d.numero_expediente IS NULL),
              (SELECT count(*) FROM documento_historial h WHERE h.documento_id IN (SELECT id FROM documento WHERE lote_id = l.id))
       FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${lote}' GROUP BY l.id`,
    ).split('|')
    assert.deepEqual(fila, ['8', '8', '8', '8', 't', '8'])
  })
  await paso('HU09 · Mis documentos muestra el lote en una fila y su detalle lista los 8 certificados', async () => {
    await luz.getByRole('link', { name: 'Mis documentos' }).click()
    const fila = luz.locator('tr', { hasText: `Lote ${lote}` })
    await fila.getByText('8 beneficiarios').waitFor()
    await fila.getByText('Pendiente').waitFor()
    await foto(luz, 'hu09_08_mis_documentos')
    await fila.getByRole('link').click()
    await luz.getByRole('heading', { name: `Lote ${lote}` }).waitFor()
    const tabla = luz.getByRole('table', { name: 'Certificados del lote' })
    assert.equal(await tabla.locator('tbody tr').count(), 8)
    assert.equal(await luz.locator('main').getByRole('button').count(), 0)
    await luz.screenshot({ path: `${out}/hu09_09_detalle_del_lote.png`, fullPage: true })
    await tabla.locator('tbody tr').first().getByRole('link').click()
    await luz.getByRole('link', { name: `Lote ${lote}` }).waitFor()
    await luz.getByRole('figure').getByText('Juan Ccori Pari', { exact: false }).waitFor()
    await foto(luz, 'hu09_10_certificado_del_lote')
  })
  await paso('HU09 · Un lote de otra área no se muestra', async () => {
    const pedro2 = await nueva()
    await ingresar(pedro2, 'pmorales', PROPIA)
    await pedro2.getByRole('navigation', { name: 'Menú principal' }).waitFor()
    await pedro2.goto(URL + '#/mis-documentos/lote/' + lote)
    await pedro2.getByRole('alert').getByText('Este lote no pertenece a su área.').waitFor()
    assert.equal(await api(pedro2, '/api/lotes/' + lote), 403)
    await foto(pedro2, 'hu09_11_lote_de_otra_area')
    await pedro2.context().close()
    await luz.context().close()
  })

  await b.close()
  require('node:fs').writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
