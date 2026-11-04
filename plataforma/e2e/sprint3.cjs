// Prueba de punta a punta real del Sprint 3: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Las áreas registran sus documentos
// por la API desde el navegador (la pantalla de registro ya la recorre sprint2.cjs) y el Director
// trabaja desde la pantalla. Recorre HU10 y HU16.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

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
    execFileSync('docker', ['exec', 'e2e-pg', 'psql', '-U', 'plataforma', '-d', 'plataforma', '-At', '-F', '|', '-c', sql])
      .toString()
      .trim()
  const foto = (p, nombre) => p.screenshot({ path: `${out}/${nombre}.png`, fullPage: true })
  const trabajo = (expediente, nombres, apellidos, dni) => ({
    tipo: 'CERTIFICADO_TRABAJO',
    numeroExpediente: expediente,
    nombres,
    apellidos,
    dni,
    datos: { cargo: 'asistente administrativa', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
  })

  // ------------------------------------------------------------- Preparación: cuentas reales
  const admin = await nueva()
  await paso('Preparación · El Administrador crea las cuentas desde la pantalla Usuarios', async () => {
    await primerIngreso(admin, 'admin', ADMIN_TEMPORAL, ADMIN_CLAVE)
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol, area] of [
      ['pmorales', 'Pedro Morales Ccanto', 'AREA_ENCARGADA', 'ADMINISTRACION'],
      ['rquispe', 'Rosa Quispe Huamán', 'AREA_ENCARGADA', 'CAPACITACION'],
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
    await admin.context().close()
  })

  // Tres envíos, en este orden: un certificado, un lote y otro certificado.
  const pedro = await nueva()
  const rosa = await nueva()
  let primero, lote, ultimo
  await paso('Preparación · Las áreas envían un documento, un lote y otro documento, en ese orden', async () => {
    await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
    await primerIngreso(rosa, 'rquispe', TEMPORAL, PROPIA)
    const a = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005391', 'Lucía', 'Paredes Quinto', '45829364'))
    assert.equal(a.estado, 201)
    primero = a.cuerpo.codigo
    const l = await enviar(rosa, '/api/lotes', {
      tipo: 'CERTIFICADO_CAPACITACION',
      datos: {
        nombreEvento: 'Manejo integrado de plagas en café',
        fechaInicio: '2026-09-14',
        fechaFin: '2026-09-16',
        duracionHoras: '24',
        lugar: 'Local comunal de Río Negro, Satipo',
        areaOrganizadora: 'Área de Capacitación',
      },
      beneficiarios: [
        { nombres: 'Juan', apellidos: 'Ccori Pari', dni: '45218736' },
        { nombres: 'María Elena', apellidos: 'Rojas Soto', dni: '47390125' },
        { nombres: 'Pedro', apellidos: 'Huaman Inga', dni: '43876512' },
      ],
    })
    assert.equal(l.estado, 201)
    lote = l.cuerpo.numero
    const z = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005392', 'Kevin', 'Ramos Ccanto', '46385127'))
    assert.equal(z.estado, 201)
    ultimo = z.cuerpo.codigo
  })

  // ------------------------------------------------------- HU10: bandeja "Por revisar"
  const carlos = await nueva()
  const filas = () => carlos.locator('main tbody tr')
  await paso('HU10 · La bandeja muestra los pendientes del más antiguo al más reciente, con el lote en una fila', async () => {
    await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
    await carlos.getByRole('link', { name: 'Por revisar' }).click()
    await carlos.getByText('Documentos enviados por las áreas, del más antiguo al más reciente.').waitFor()
    await filas().first().waitFor()
    assert.equal(await filas().count(), 3)
    await filas().nth(0).getByText('Lucía Paredes Quinto').waitFor()
    await filas().nth(0).getByText('EXP-2026-005391').waitFor()
    await filas().nth(0).getByText('Área de Administración').waitFor()
    await filas().nth(0).getByText('Pedro Morales Ccanto').waitFor()
    await filas()
      .nth(1)
      .getByText(`Lote ${lote} · Manejo integrado de plagas en café · 3 certificados`, { exact: false })
      .waitFor()
    await filas().nth(2).getByText('Kevin Ramos Ccanto').waitFor()
    assert.equal(await carlos.locator('main').getByText('Sin revisar').count(), 3)
    assert.equal(await carlos.getByText(/Se habilita en el Sprint 3/).count(), 0)
    await foto(carlos, 'hu10_01_bandeja_sin_revisar')
  })
  await paso('HU10 · Abrir un documento muestra sus datos y su vista previa, y lo registra como revisado', async () => {
    await filas().nth(0).getByRole('link').click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByText('EXP-2026-005391').waitFor()
    const certificado = carlos.getByRole('figure')
    await certificado.getByText('Lucía Paredes Quinto', { exact: false }).waitFor()
    await certificado.getByText('Ing. Carlos Mendoza Rivera').waitFor()
    await carlos.getByText(/Quedó registrado como revisado/).waitFor()
    await foto(carlos, 'hu10_02_revision_de_documento')
    await carlos.getByRole('link', { name: '← Volver a Por revisar' }).click()
    await filas().nth(0).getByText('✓ Revisado').waitFor()
    await filas().nth(1).getByText('Sin revisar').waitFor()
  })
  await paso('HU10 · En el lote se recorren los certificados y la relación; abrirlo revisa los tres', async () => {
    await filas().nth(1).getByRole('link').click()
    await carlos.getByRole('heading', { name: `Revisión de lote – Lote ${lote}` }).waitFor()
    await carlos.getByText('Enviado por Rosa Quispe Huamán', { exact: false }).waitFor()
    await carlos.getByText('Certificado 1 de 3').waitFor()
    await carlos.getByRole('figure').getByText('Juan Ccori Pari', { exact: false }).waitFor()
    await carlos.getByRole('button', { name: 'Siguiente ›' }).click()
    await carlos.getByText('Certificado 2 de 3').waitFor()
    await carlos.getByRole('figure').getByText('María Elena Rojas Soto', { exact: false }).waitFor()
    const relacion = carlos.getByRole('complementary', { name: 'Beneficiarios del lote' })
    await relacion.getByRole('button', { name: /Pedro Huaman Inga/ }).click()
    await carlos.getByText('Certificado 3 de 3').waitFor()
    await relacion.getByText('43876512').waitFor()
    await foto(carlos, 'hu10_03_revision_de_lote')
    await carlos.getByRole('link', { name: '← Volver a Por revisar' }).click()
    await filas().nth(1).getByText('✓ Revisado').waitFor()
    await filas().nth(2).getByText('Sin revisar').waitFor()
    await foto(carlos, 'hu10_04_bandeja_con_revisados')
  })
  await paso('HU10 · En la base queda quién revisó y cuándo; volver a abrir no duplica el registro', async () => {
    await filas().nth(0).getByRole('link').click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('link', { name: '← Volver a Por revisar' }).click()
    const doc = psql(
      `SELECT u.nombre_usuario, d.revisado_en IS NOT NULL,
              (SELECT count(*) FROM documento_historial h WHERE h.documento_id = d.id AND h.evento = 'REVISADO')
       FROM documento d JOIN usuario u ON u.id = d.revisado_por WHERE d.codigo = '${primero}'`,
    ).split('|')
    assert.deepEqual(doc, ['cmendoza', 't', '1'])
    assert.equal(
      psql(`SELECT count(*) FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${lote}' AND d.revisado_en IS NOT NULL`),
      '3',
    )
    assert.equal(psql(`SELECT revisado_en IS NULL FROM documento WHERE codigo = '${ultimo}'`), 't')
  })
  // ------------------------------------------------------------- HU16: PDF final y su hash
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']
  const [anio, mes, dia] = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }).split('-').map(Number)
  const hoyEnLetras = `${dia} de ${MESES[mes - 1]} de ${anio}`
  /** Descarga la muestra del PDF con la sesión del Director y devuelve su texto. */
  const muestra = async (codigo, archivo) => {
    const enlace = carlos.getByRole('link', { name: 'Ver muestra del PDF final ↗' })
    assert.equal(await enlace.getAttribute('href'), `/api/revision/documentos/${codigo}/pdf`)
    const respuesta = await carlos.context().request.get(new globalThis.URL(await enlace.getAttribute('href'), URL).href)
    assert.equal(respuesta.status(), 200)
    assert.equal(respuesta.headers()['content-type'], 'application/pdf')
    const ruta = `${out}/${archivo}.pdf`
    fs.writeFileSync(ruta, await respuesta.body())
    return execFileSync('pdftotext', ['-layout', ruta, '-']).toString().replace(/\s+/g, ' ')
  }
  /** Lee el QR de la primera página con ZXing (del repositorio local de Maven). */
  const leerQr = (pdf, png) => {
    execFileSync('pdftoppm', ['-png', '-r', '110', '-singlefile', pdf, png])
    const m2 = path.join(os.homedir(), '.m2/repository')
    const jar = (g, a, v) => path.join(m2, g, a, v, `${a}-${v}.jar`)
    const clase = [jar('com/google/zxing', 'core', '3.5.3'), jar('com/google/zxing', 'javase', '3.5.3'), jar('com/beust', 'jcommander', '1.82')].join(':')
    const salida = execFileSync('java', ['-cp', clase, 'com.google.zxing.client.j2se.CommandLineRunner', `${png}.png`]).toString()
    return salida.split('Parsed result:')[1].trim().split('\n')[0]
  }
  await paso('HU16 · La muestra del PDF final trae la fecha de emisión, el código, la leyenda y los datos revisados', async () => {
    await carlos.goto(URL + '#/por-revisar/' + primero)
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    const texto = await muestra(primero, 'hu16_muestra_certificado_de_trabajo')
    for (const esperado of [
      'AGENCIA AGRARIA SATIPO – DRA JUNÍN',
      'CERTIFICADO',
      'LUCÍA PAREDES QUINTO',
      'como asistente administrativa, del 02/01/2025 al 30/09/2026',
      `Fecha de emisión: ${hoyEnLetras}`,
      primero,
      'Ing. Carlos Mendoza Rivera',
      'Firmado digitalmente mediante blockchain',
      `Verifique la autenticidad de este documento en localhost:5174 con el código ${primero}`,
      'MUESTRA – SIN VALOR',
    ])
      assert.ok(texto.includes(esperado), `falta en el PDF: ${esperado}`)
    assert.ok(!texto.includes('VISTA PREVIA') && !texto.includes('45829364'))
  })
  await paso('HU16 · El QR del PDF lleva la dirección de verificación con el token del documento', async () => {
    const token = psql(`SELECT token_qr FROM documento WHERE codigo = '${primero}'`)
    const leido = leerQr(`${out}/hu16_muestra_certificado_de_trabajo.pdf`, `${out}/hu16_01_muestra_certificado_de_trabajo`)
    assert.equal(leido, `http://localhost:5174/verificar/${token}`)
    // La muestra no cambia el documento: sigue Pendiente.
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${primero}'`), 'PENDIENTE')
  })
  await paso('HU16 · Cada certificado de un lote tiene su propia muestra, con su nombre y su código', async () => {
    await carlos.goto(URL + '#/por-revisar/lote/' + lote)
    await carlos.getByRole('heading', { name: `Revisión de lote – Lote ${lote}` }).waitFor()
    await carlos.getByRole('button', { name: 'Siguiente ›' }).click()
    await carlos.getByText('Certificado 2 de 3').waitFor()
    const codigo = psql(`SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${lote}' AND d.nombres = 'María Elena'`)
    const texto = await muestra(codigo, 'hu16_muestra_certificado_del_lote')
    assert.ok(texto.includes('MARÍA ELENA ROJAS SOTO') && texto.includes(codigo))
    assert.ok(texto.includes("'Manejo integrado de plagas en café', realizado del 14 al 16 de setiembre de 2026"))
    execFileSync('pdftoppm', ['-png', '-r', '110', '-singlefile', `${out}/hu16_muestra_certificado_del_lote.pdf`, `${out}/hu16_02_muestra_certificado_del_lote`])
    await foto(carlos, 'hu16_03_enlace_a_la_muestra')
  })
  await paso('HU10 · Solo el Director ve la bandeja', async () => {
    assert.deepEqual(await menu(pedro), ['Inicio', 'Mis documentos', 'Nuevo documento'])
    await pedro.goto(URL + '#/por-revisar')
    await pedro.getByText('No tiene permiso para ver esta sección.').waitFor()
    assert.equal(await api(pedro, '/api/revision'), 403)
    assert.equal((await enviar(pedro, '/api/revision/documentos/' + ultimo, {})).estado, 403)
    assert.equal(await api(pedro, `/api/revision/documentos/${ultimo}/pdf`), 403)
  })

  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
