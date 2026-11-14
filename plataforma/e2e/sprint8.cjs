// Prueba de punta a punta real del Sprint 8: navegador + portal + backend, sin simulaciones.
// Recorre la ayuda del portal público (épica E8): DRA-70, "¿Cómo verificar un documento?", y
// DRA-71, las preguntas frecuentes. Y el manual de usuario de la plataforma (DRA-75), con un
// documento real: se registra, se firma con la billetera de prueba y se entrega. De ese recorrido
// salen las capturas del manual; con E2E_ACTUALIZAR_MANUAL=1 se copian a frontend/src/ayuda/capturas.
// Por último, la guía de operación (DRA-74), solo para el Administrador.
// DRA-66 y DRA-68 son de infraestructura: se prueban en el servidor de AWS en Docker y en QA.
const { chromium, devices } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { getAddress } = require('ethers')
const { instalarBilletera } = require('./billetera-de-prueba.cjs')

const [out, PLATAFORMA = 'http://localhost:5173/', ADMIN_TEMPORAL = 'Admin2026!'] = process.argv.slice(2)
const PORTAL = process.env.E2E_PORTAL ?? 'http://localhost:5174'
const BESU = process.env.BESU_RPC_URL ?? 'http://localhost:8545'
const DESPLIEGUE = JSON.parse(fs.readFileSync(process.env.E2E_DESPLIEGUE ?? `${__dirname}/.despliegue.json`, 'utf8'))
const B = DESPLIEGUE.billeteras
const ADMIN_CLAVE = 'AdminPropia26'
const TEMPORAL = 'Demo2026'
const PROPIA = 'Propia2026'
const CAPTURAS_DEL_MANUAL = path.join(__dirname, '..', 'frontend', 'src', 'ayuda', 'capturas')
const resultados = []
const paso = async (nombre, fn) => {
  await fn()
  resultados.push('✓ ' + nombre)
  console.log('✓ ' + nombre)
}

const TITULOS = [
  'Documento válido',
  'Documento anulado',
  'Documento vencido',
  'Documento no válido',
  'Existe una versión corregida',
  'No se pudo verificar en este momento',
]

;(async () => {
  const b = await chromium.launch()
  const guia = (p) => p.getByRole('heading', { level: 1, name: '¿Cómo verificar un documento?' })

  await paso('DRA-70 · Desde la portada se llega a la guía "¿Cómo verificar un documento?"', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(PORTAL)
    await p.getByRole('heading', { name: 'Verifique un documento' }).waitFor()
    await p.screenshot({ path: `${out}/dra70_01_portada_con_enlace.png`, fullPage: true })
    await p.getByRole('main').getByRole('link', { name: '¿Cómo verificar un documento?' }).click()
    await guia(p).waitFor()
    assert.equal(new URL(p.url()).pathname, '/como-verificar')
    await p.close()
  })

  await paso('DRA-70 · La guía explica el QR, el código, dónde están y los 6 resultados', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(`${PORTAL}/como-verificar`)
    await guia(p).waitFor()
    for (const seccion of [
      'Con el código QR (recomendado)',
      'Con el código de verificación',
      'Dónde están en el documento',
      'Qué significa cada resultado',
      'Si el resultado no es el esperado',
    ])
      await p.getByRole('region', { name: seccion }).waitFor()
    await p
      .getByRole('img', { name: 'Dónde están el código QR y el código de verificación' })
      .waitFor()
    const titulos = await p
      .getByRole('region', { name: 'Qué significa cada resultado' })
      .getByRole('heading', { level: 3 })
      .allTextContents()
    assert.deepEqual(titulos, TITULOS)
    const texto = await p.getByRole('article').innerText()
    for (const tecnico of [/\bhash\b/i, /\bIPFS\b/, /\bBesu\b/, /\btoken\b/i])
      assert.doesNotMatch(texto, tecnico)
    await p.screenshot({ path: `${out}/dra70_02_guia_escritorio.png`, fullPage: true })
    await p.close()
  })

  await paso('DRA-70 · Un QR que no corresponde a ningún documento lleva a la guía', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    // El backend real responde No válido: el token no existe.
    await p.goto(`${PORTAL}/verificar/token-que-no-existe-en-la-base-de-datos-0000000`)
    const resultado = p.getByRole('region', { name: 'Documento no válido' })
    await resultado.waitFor({ timeout: 60_000 })
    await p.screenshot({ path: `${out}/dra70_03_no_valido_con_enlace.png`, fullPage: true })
    await resultado.getByRole('link', { name: 'Vea cómo verificar un documento' }).click()
    await guia(p).waitFor()
    await p.close()
  })

  await paso('DRA-70 · El pie de cada página lleva a la guía, y la guía vuelve a verificar', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(PORTAL)
    await p
      .getByRole('navigation', { name: 'Ayuda' })
      .getByRole('link', { name: '¿Cómo verificar un documento?' })
      .click()
    await guia(p).waitFor()
    await p.getByRole('link', { name: 'Verificar un documento', exact: true }).click()
    await p.getByLabel('Código de verificación').waitFor()
    assert.equal(new URL(p.url()).pathname, '/')
    await p.close()
  })

  await paso('DRA-70 · En el celular la guía se lee sin desplazarse de lado', async () => {
    const c = await b.newContext({ ...devices['Pixel 7'] })
    const p = await c.newPage()
    await p.goto(`${PORTAL}/como-verificar`)
    await guia(p).waitFor()
    const [ancho, pantalla] = await p.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ])
    assert.ok(ancho <= pantalla, `la página mide ${ancho} px en una pantalla de ${pantalla} px`)
    await p.screenshot({ path: `${out}/dra70_04_guia_celular.png`, fullPage: true })
    await c.close()
  })

  const faq = (p) => p.getByRole('heading', { level: 1, name: 'Preguntas frecuentes' })
  const detalle = (p, texto) => p.locator('details', { has: p.getByRole('heading', { name: texto }) })

  await paso('DRA-71 · Desde la portada se llega a las preguntas frecuentes, en tres grupos y cerradas', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(PORTAL)
    await p.getByRole('main').getByRole('link', { name: 'Preguntas frecuentes' }).click()
    await faq(p).waitFor()
    assert.equal(new URL(p.url()).pathname, '/preguntas-frecuentes')
    for (const grupo of [
      'Sobre la verificación',
      'Si usted es el titular del documento',
      'Si usted recibe un documento (empleadores y entidades)',
    ])
      await p.getByRole('region', { name: grupo }).waitFor()
    const abiertas = await p.locator('details[open]').count()
    assert.equal(abiertas, 0)
    assert.ok((await p.locator('details').count()) >= 12)
    await p.screenshot({ path: `${out}/dra71_01_preguntas_cerradas.png`, fullPage: true })
    await p.close()
  })

  await paso('DRA-71 · Una pregunta se abre y se cierra al pulsarla, también con el teclado', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(`${PORTAL}/preguntas-frecuentes`)
    const costo = detalle(p, '¿Verificar un documento tiene algún costo?')
    await costo.locator('summary').click()
    await costo.getByText('La verificación es gratuita').waitFor()
    assert.equal(await costo.evaluate((d) => d.open), true)
    await costo.locator('summary').click()
    assert.equal(await costo.evaluate((d) => d.open), false)
    // Con el teclado: Tab hasta el título y Enter.
    const datos = detalle(p, '¿Qué datos míos se muestran al verificar?')
    await datos.locator('summary').focus()
    await p.keyboard.press('Enter')
    await datos.getByText('Nunca se muestra su DNI.').waitFor()
    await p.screenshot({ path: `${out}/dra71_02_pregunta_abierta.png`, fullPage: true })
    await p.close()
  })

  await paso('DRA-71 · El enlace de una pregunta la abre directamente, en el celular', async () => {
    const c = await b.newContext({ ...devices['Pixel 7'] })
    const p = await c.newPage()
    await p.goto(`${PORTAL}/preguntas-frecuentes#perdi-mi-documento`)
    const perdi = detalle(p, 'Perdí mi documento o se dañó el código QR. ¿Qué hago?')
    await perdi.getByText('acérquese a la Agencia Agraria Satipo').waitFor()
    assert.equal(await perdi.evaluate((d) => d.open), true)
    const [ancho, pantalla] = await p.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ])
    assert.ok(ancho <= pantalla, `la página mide ${ancho} px en una pantalla de ${pantalla} px`)
    await p.screenshot({ path: `${out}/dra71_03_enlace_directo_celular.png` })
    await c.close()
  })

  await paso('DRA-71 · Se llega también desde el pie y desde la guía de cómo verificar', async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(`${PORTAL}/como-verificar`)
    await p.getByRole('link', { name: 'preguntas frecuentes', exact: true }).click()
    await faq(p).waitFor()
    await p.goto(PORTAL)
    await p.getByRole('navigation', { name: 'Ayuda' }).getByRole('link', { name: 'Preguntas frecuentes' }).click()
    await faq(p).waitFor()
    await p.close()
  })

  // ------------------------------------------------ DRA-75: manual de usuario de la plataforma
  const billeteras = new Map()
  const nueva = async () => {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await c.newPage()
    billeteras.set(p, await instalarBilletera(c, BESU))
    await p.goto(PLATAFORMA)
    return p
  }
  const campo = (p, etiqueta) => p.getByLabel(etiqueta, { exact: true })
  const ingresar = async (p, u, c) => {
    await campo(p, 'Usuario').fill(u)
    await campo(p, 'Contraseña').fill(c)
    await p.getByRole('button', { name: 'Ingresar' }).click()
  }
  const primerIngreso = async (p, u, temporal, propia) => {
    await ingresar(p, u, temporal)
    await p.getByRole('heading', { name: 'Cambie su contraseña' }).waitFor()
    await campo(p, 'Contraseña temporal').fill(temporal)
    await campo(p, 'Contraseña nueva').fill(propia)
    await campo(p, 'Repita la contraseña nueva').fill(propia)
    await p.getByRole('button', { name: 'Cambiar contraseña' }).last().click()
    await p.getByRole('navigation', { name: 'Menú principal' }).waitFor()
  }
  /** Captura del manual, en la carpeta de la prueba. Se copian al frontend al final (ver abajo). */
  const capturaDelManual = async (p, nombre) => {
    fs.mkdirSync(`${out}/manual`, { recursive: true })
    await p.screenshot({ path: `${out}/manual/${nombre}.png` })
  }

  const admin = await nueva()
  await paso('DRA-75 · Preparación: cuentas reales y la billetera del Director habilitada', async () => {
    await primerIngreso(admin, 'admin', ADMIN_TEMPORAL, ADMIN_CLAVE)
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol, area] of [
      ['pmorales', 'Pedro Morales Ccanto', 'AREA_ENCARGADA', 'ADMINISTRACION'],
      ['cmendoza', 'Ing. Carlos Mendoza Rivera', 'DIRECTOR', null],
      ['ltorres', 'Luz Torres Rojas', 'CONSULTA_INTERNA', null],
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
    await admin.getByRole('link', { name: 'Billetera del director' }).click()
    await admin.getByRole('button', { name: 'Registrar la billetera de cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Billetera del director' })
    await campo(ventana, 'Dirección de la billetera').fill(B.director.direccion)
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    const fila = admin.locator('tr', { hasText: 'cmendoza' })
    await fila.getByText(getAddress(B.director.direccion)).waitFor()
    billeteras.get(admin).usar(B.administrador.clave)
    await admin.getByRole('button', { name: 'Otorgar el rol de firmante a cmendoza' }).click()
    const otorgar = admin.getByRole('dialog', { name: 'Otorgar rol de firmante' })
    await otorgar.getByRole('button', { name: 'Conectar billetera y continuar' }).click()
    await otorgar.getByRole('button', { name: 'Confirmar en la billetera' }).click()
    await otorgar.getByText('Rol de firmante otorgado', { exact: false }).waitFor({ timeout: 60_000 })
    await otorgar.getByRole('button', { name: 'Listo' }).click()
    await fila.getByText('✓ Firmante activo').waitFor()
  })

  const pedro = await nueva()
  await paso('DRA-75 · El inicio de cada rol lleva al manual, a la sección de su rol', async () => {
    await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
    const ayuda = pedro.getByRole('complementary', { name: '¿Necesita ayuda?' })
    await ayuda.waitFor()
    await capturaDelManual(pedro, 'inicio')
    await ayuda.getByRole('link', { name: 'Ver lo que hace el rol Emisor de área' }).click()
    await pedro.waitForURL(/#\/manual\/para-el-emisor-de-area$/)
    const seccion = pedro.getByRole('heading', { level: 2, name: 'Para el Emisor de área' })
    await seccion.waitFor()
    assert.ok(await seccion.isVisible())
    // La sección queda arriba de la pantalla, no al final de la página.
    const { y } = await seccion.boundingBox()
    assert.ok(y < 300, `la sección está a ${y} px del borde superior`)
    // El manual está en el menú de todos: también el del Administrador.
    await admin.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Manual de usuario' }).click()
    await admin.getByRole('navigation', { name: 'Contenido del manual' }).waitFor()
    // Un solo título en pantalla: el del encabezado de la página.
    assert.equal(await admin.getByRole('heading', { level: 1, name: 'Manual de usuario' }).count(), 1)
    await admin.screenshot({ path: `${out}/dra75_01_manual.png`, fullPage: true })
  })

  await paso('DRA-75 · Al imprimir sale solo el manual, sin el menú ni el encabezado', async () => {
    await admin.emulateMedia({ media: 'print' })
    assert.equal(await admin.getByRole('navigation', { name: 'Menú principal' }).isVisible(), false)
    assert.equal(await admin.getByRole('banner').isVisible(), false)
    assert.equal(await admin.getByRole('button', { name: 'Imprimir o guardar en PDF' }).isVisible(), false)
    assert.ok(await admin.getByRole('heading', { level: 2, name: 'Para el Director' }).isVisible())
    assert.ok(await admin.getByRole('article').getByRole('heading', { level: 1, name: 'Manual de usuario' }).isVisible())
    await admin.pdf({ path: `${out}/dra75_02_manual_impreso.pdf`, format: 'A4' })
    await admin.emulateMedia({ media: 'screen' })
  })

  await paso('DRA-74 · El Administrador abre la guía de operación desde su inicio', async () => {
    await admin.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Inicio' }).click()
    await admin.getByRole('complementary', { name: '¿Necesita ayuda?' }).getByRole('link', { name: 'Abrir la guía de operación' }).click()
    const indice = admin.getByRole('navigation', { name: 'Contenido de la guía' })
    await indice.waitFor()
    assert.equal(await indice.getByRole('link').count(), 10)
    // Una sección del medio: las últimas no pueden subir más allá del final de la página.
    await indice.getByRole('link', { name: 'Respaldos' }).click()
    await admin.waitForURL(/#\/operacion\/respaldos$/)
    const seccion = admin.getByRole('heading', { level: 2, name: 'Respaldos' })
    const { y } = await seccion.boundingBox()
    assert.ok(y < 300, `la sección está a ${y} px del borde superior`)
    // Los documentos técnicos se abren en GitHub, en otra pestaña.
    const github = admin.getByRole('link', { name: 'Respaldos y recuperación' })
    assert.equal(await github.getAttribute('target'), '_blank')
    assert.match(await github.getAttribute('href'), /^https:\/\/github\.com\/.+\/respaldos\.md$/)
    await admin.goto(PLATAFORMA + '#/operacion')
    await indice.waitFor()
    await admin.screenshot({ path: `${out}/dra74_01_guia.png`, fullPage: true })
  })

  await paso('DRA-74 · Los demás roles no tienen la guía en su menú ni pueden abrirla', async () => {
    const menu = await pedro.getByRole('navigation', { name: 'Menú principal' }).getByRole('link').allTextContents()
    assert.ok(!menu.includes('Guía de operación'), menu.join(', '))
    await pedro.goto(PLATAFORMA + '#/operacion')
    await pedro.getByText('No tiene permiso para ver esta sección').waitFor()
    assert.equal(await pedro.getByRole('navigation', { name: 'Contenido de la guía' }).count(), 0)
    await pedro.screenshot({ path: `${out}/dra74_02_sin_permiso.png` })
    await pedro.goto(PLATAFORMA + '#/inicio')
  })

  let codigo
  await paso('DRA-75 · Capturas del manual: registrar un documento', async () => {
    await pedro.getByRole('link', { name: 'Nuevo documento' }).click()
    await pedro.getByRole('link', { name: /Certificado de Trabajo/ }).click()
    await pedro.getByRole('heading', { name: 'Certificado de Trabajo' }).waitFor()
    await pedro.getByLabel(/^N\.° de expediente/).fill('EXP-2026-008001')
    await campo(pedro, 'DNI').fill('45829364')
    await campo(pedro, 'Nombres').fill('Lucía')
    await campo(pedro, 'Apellidos').fill('Paredes Quinto')
    await pedro.getByLabel(/^Cargo/).fill('asistente administrativa')
    await campo(pedro, 'Fecha de inicio').fill('02/01/2025')
    await campo(pedro, 'Fecha de fin').fill('30/09/2026')
    await pedro.getByRole('button', { name: 'Continuar a vista previa' }).click()
    await pedro.getByRole('figure', { name: 'Vista previa: Certificado de Trabajo' }).waitFor()
    // La captura muestra el botón que se pulsa.
    await pedro.getByRole('button', { name: 'Enviar a revisión' }).scrollIntoViewIfNeeded()
    await capturaDelManual(pedro, 'registrar')
    await pedro.getByRole('button', { name: 'Enviar a revisión' }).click()
    await pedro.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Enviar' }).click()
    const aviso = pedro.getByRole('status')
    await aviso.getByText('Documento enviado a revisión').waitFor()
    codigo = await aviso.locator('strong').textContent()
    assert.match(codigo, /^DRA-\d{4}-[A-Z0-9]{6}$/)
  })

  const carlos = await nueva()
  await paso('DRA-75 · Capturas del manual: revisar y firmar', async () => {
    await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
    billeteras.get(carlos).usar(B.director.clave)
    await carlos.goto(PLATAFORMA + '#/por-revisar/' + codigo)
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar' }).scrollIntoViewIfNeeded()
    await capturaDelManual(carlos, 'firmar')
    await carlos.getByRole('button', { name: 'Firmar' }).click()
    const dialogo = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await dialogo.getByRole('button', { name: 'Confirmar' }).click()
    await dialogo.getByText('Se firmó 1 documento.').waitFor({ timeout: 60_000 })
  })

  await paso('DRA-75 · Capturas del manual: buscar y entregar', async () => {
    const luz = await nueva()
    await primerIngreso(luz, 'ltorres', TEMPORAL, PROPIA)
    await luz.goto(PLATAFORMA + '#/buscar/' + codigo)
    await luz.getByRole('button', { name: 'Imprimir' }).waitFor({ timeout: 60_000 })
    await capturaDelManual(luz, 'entregar')
  })

  await b.close()
  // Se copian al terminar: si se copiaran durante la prueba, el servidor de Vite recargaría la
  // plataforma en medio de un paso.
  if (process.env.E2E_ACTUALIZAR_MANUAL)
    for (const archivo of fs.readdirSync(`${out}/manual`))
      fs.copyFileSync(`${out}/manual/${archivo}`, path.join(CAPTURAS_DEL_MANUAL, archivo))
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message || String(e))
  process.exit(1)
})
