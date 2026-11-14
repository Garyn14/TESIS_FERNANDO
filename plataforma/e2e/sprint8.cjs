// Prueba de punta a punta real del Sprint 8: navegador + portal + backend, sin simulaciones.
// Recorre la ayuda del portal público (épica E8): DRA-70, "¿Cómo verificar un documento?", y
// DRA-71, las preguntas frecuentes.
// DRA-66 y DRA-68 son de infraestructura: se prueban en el servidor de AWS en Docker y en QA.
const { chromium, devices } = require('playwright')
const assert = require('node:assert/strict')

const [out] = process.argv.slice(2)
const PORTAL = process.env.E2E_PORTAL ?? 'http://localhost:5174'
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
    await p.getByRole('navigation', { name: 'Ayuda' }).getByRole('link').click()
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

  await b.close()
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message || String(e))
  process.exit(1)
})
