// Prueba de punta a punta real del Sprint 3: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). Las áreas registran sus documentos
// por la API desde el navegador (la pantalla de registro ya la recorre sprint2.cjs) y el Director
// trabaja desde la pantalla. Recorre HU10, HU16, HU17 (la preparación de la firma, por la API), HU12
// (observar, rechazar y firmar un lote) y HU11:
// la firma con la billetera de prueba (billetera-de-prueba.cjs) en la red Besu real, comprobada
// directamente en el contrato.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { Contract, JsonRpcProvider, getAddress } = require('ethers')
const { instalarBilletera } = require('./billetera-de-prueba.cjs')

const [out, URL = 'http://localhost:5173/', ADMIN_TEMPORAL = 'Admin2026!'] = process.argv.slice(2)
const ADMIN_CLAVE = 'AdminPropia26'
const TEMPORAL = 'Demo2026'
const PROPIA = 'Propia2026'
const BESU = process.env.BESU_RPC_URL ?? 'http://localhost:8545'
const DESPLIEGUE = JSON.parse(fs.readFileSync(process.env.E2E_DESPLIEGUE ?? `${__dirname}/.despliegue.json`, 'utf8'))
const B = DESPLIEGUE.billeteras
const resultados = []
const paso = async (nombre, fn) => {
  await fn()
  resultados.push('✓ ' + nombre)
  console.log('✓ ' + nombre)
}

;(async () => {
  const b = await chromium.launch()
  const billeteras = new Map()
  const nueva = async () => {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await c.newPage()
    billeteras.set(p, await instalarBilletera(c, BESU))
    await p.goto(URL)
    return p
  }
  // Lectura independiente del contrato, directo en la red Besu (no pasa por el backend).
  const nodo = new JsonRpcProvider(BESU, undefined, { staticNetwork: true })
  const registro = new Contract(
    DESPLIEGUE.contrato,
    ['function consultar(string codigo) view returns (bool, (bytes32 hashPdf, bytes32 dniHmac, address firmante, uint64 registradoEn))'],
    nodo,
  )
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
  })
  await paso('Preparación · El Administrador registra la billetera del Director y le otorga el rol de firmante', async () => {
    // La pantalla ya la recorre sprint1.cjs (HU06); aquí solo se deja al Director listo para firmar.
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
  billeteras.get(carlos).usar(B.director.clave)
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
    return execFileSync('pdftotext', ['-raw', ruta, '-']).toString().replace(/\s+/g, ' ')
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
  // ------------------------------------------------------- HU17: PDF final en el IPFS privado
  const IPFS = 'http://127.0.0.1:5002/api/v0'
  const ipfs = (operacion, salida) =>
    execFileSync('curl', ['-sf', '-X', 'POST', `${IPFS}/${operacion}`, ...(salida ? ['-o', salida] : [])]).toString()
  const sha256 = (ruta) => require('node:crypto').createHash('sha256').update(fs.readFileSync(ruta)).digest('hex')
  const eventos = (codigo) =>
    psql(`SELECT string_agg(h.evento, ',' ORDER BY h.id) FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${codigo}'`)
  const delLote = () =>
    psql(`SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${lote}' ORDER BY d.id`).split('\n')
  await paso('HU17 · Al preparar la firma, el PDF final queda en IPFS, fijado, con su CID y su hash', async () => {
    const r = await enviar(carlos, '/api/firma/preparacion', { codigos: [primero] })
    assert.equal(r.estado, 200)
    assert.equal(r.cuerpo.noPreparados.length, 0)
    const { codigo, hash, cid } = r.cuerpo.preparados[0]
    assert.equal(codigo, primero)
    assert.match(hash, /^[0-9a-f]{64}$/)
    assert.match(cid, /^bafy/)
    assert.deepEqual(psql(`SELECT estado, cid, hash_pdf, fecha_emision FROM documento WHERE codigo = '${primero}'`).split('|'), [
      'PROCESANDO_FIRMA',
      cid,
      hash,
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),
    ])
    assert.equal(eventos(primero), 'REGISTRADO,REVISADO,PREPARADO')
    // Lo recuperado de IPFS por su CID es el mismo archivo del hash (RF30), y es el PDF final.
    const ruta = `${out}/hu17_pdf_final_desde_ipfs.pdf`
    ipfs(`cat?arg=${cid}`, ruta)
    assert.equal(sha256(ruta), hash)
    const texto = execFileSync('pdftotext', ['-raw', ruta, '-']).toString().replace(/\s+/g, ' ')
    assert.ok(texto.includes(`Fecha de emisión: ${hoyEnLetras}`) && texto.includes(primero) && texto.includes('LUCÍA PAREDES QUINTO'))
    assert.ok(!texto.includes('MUESTRA') && !texto.includes('VISTA PREVIA'))
    const token = psql(`SELECT token_qr FROM documento WHERE codigo = '${primero}'`)
    assert.equal(leerQr(ruta, `${out}/hu17_01_pdf_final_desde_ipfs`), `http://localhost:5174/verificar/${token}`)
    assert.equal(JSON.parse(ipfs(`pin/ls?arg=${cid}`)).Keys[cid].Type, 'recursive')
    // El nodo es privado: sin nodos de arranque ni pares.
    assert.equal((JSON.parse(ipfs('bootstrap/list')).Peers ?? []).length, 0)
  })
  await paso('HU17 · El documento sale de Por revisar y el área lo ve en Procesando firma', async () => {
    await carlos.goto(URL + '#/por-revisar')
    await filas().first().waitFor()
    assert.equal(await filas().count(), 2)
    assert.equal(await carlos.locator('main').getByText('Lucía Paredes Quinto').count(), 0)
    await pedro.goto(URL + '#/mis-documentos')
    const fila = pedro.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' })
    await fila.getByText('Procesando firma').waitFor()
    await pedro.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' }).getByText('Pendiente').waitFor()
    await foto(pedro, 'hu17_02_mis_documentos_procesando_firma')
  })
  await paso('HU17 · Si IPFS no responde, el documento vuelve a Pendiente con el error en su historial', async () => {
    const [juan] = delLote()
    execFileSync('docker', ['stop', 'e2e-ipfs'])
    let r
    try {
      r = await enviar(carlos, '/api/firma/preparacion', { codigos: [juan, ultimo] })
    } finally {
      execFileSync('docker', ['start', 'e2e-ipfs'])
    }
    assert.equal(r.estado, 200)
    assert.equal(r.cuerpo.preparados.length, 0)
    assert.deepEqual(r.cuerpo.noPreparados, [
      { codigo: juan, motivo: 'No se pudo guardar el PDF. El documento volvió a Pendiente.' },
      { codigo: ultimo, motivo: 'El documento aún no fue revisado.' },
    ])
    assert.equal(psql(`SELECT estado, cid IS NULL FROM documento WHERE codigo = '${juan}'`), 'PENDIENTE|t')
    assert.equal(eventos(juan), 'REGISTRADO,REVISADO,ERROR_ALMACENAMIENTO')
    await carlos.reload()
    await filas().first().waitFor()
    await filas().nth(0).getByText('✓ Revisado').waitFor()
  })
  await paso('HU17 · Con IPFS de nuevo en línea, los tres certificados del lote se guardan, cada uno con su CID', async () => {
    for (let i = 0; i < 60; i++) {
      try {
        ipfs('id')
        break
      } catch {
        await new Promise((listo) => setTimeout(listo, 1000))
      }
    }
    const codigos = delLote()
    const r = await enviar(carlos, '/api/firma/preparacion', { codigos })
    assert.equal(r.estado, 200)
    assert.deepEqual(r.cuerpo.preparados.map((p) => p.codigo), codigos)
    assert.equal(new Set(r.cuerpo.preparados.map((p) => p.cid)).size, 3)
    for (const { cid, hash } of r.cuerpo.preparados) {
      const ruta = `${out}/hu17_lote_${cid.slice(-8)}.pdf`
      ipfs(`cat?arg=${cid}`, ruta)
      assert.equal(sha256(ruta), hash)
      fs.rmSync(ruta)
    }
    assert.equal(eventos(codigos[0]), 'REGISTRADO,REVISADO,ERROR_ALMACENAMIENTO,PREPARADO')
    // Volver a prepararlos no los guarda dos veces.
    const otra = await enviar(carlos, '/api/firma/preparacion', { codigos })
    assert.equal(otra.cuerpo.preparados.length, 0)
    assert.ok(otra.cuerpo.noPreparados.every((n) => n.motivo === 'El documento ya está en proceso de firma.'))
  })
  await paso('HU17 · Solo el Director prepara la firma', async () => {
    assert.equal((await enviar(pedro, '/api/firma/preparacion', { codigos: [ultimo] })).estado, 403)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${ultimo}'`), 'PENDIENTE')
  })
  // ------------------------------------------------------- HU11: firma con la billetera
  const dialogo = () => carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
  const enCadena = async (codigo) => {
    const [registrado, r] = await registro.consultar(codigo)
    return { registrado, hashPdf: r.hashPdf, firmante: r.firmante, registradoEn: Number(r.registradoEn) }
  }
  const casilla = (texto) => carlos.getByRole('checkbox', { name: new RegExp('Seleccionar ' + texto) })
  const barra = () => carlos.getByRole('region', { name: 'Selección para firmar' })
  await paso('HU11 · Si la firma no se completa, los preparados vuelven a Pendiente tras comprobarlo en el contrato', async () => {
    // Los documentos que dejó preparados HU17 nunca se registraron en la blockchain.
    const codigos = [primero, ...delLote()]
    const r = await enviar(carlos, '/api/firma/cancelacion', { codigos, motivo: 'Firma no completada' })
    assert.equal(r.estado, 200)
    assert.deepEqual(r.cuerpo.devueltos, codigos)
    for (const codigo of codigos) {
      assert.equal(psql(`SELECT estado, cid IS NULL, revisado_en IS NOT NULL FROM documento WHERE codigo = '${codigo}'`), 'PENDIENTE|t|t')
      assert.ok(eventos(codigo).endsWith(',FIRMA_CANCELADA'))
      assert.equal((await enCadena(codigo)).registrado, false)
    }
  })
  await paso('HU11 · En Por revisar solo se puede seleccionar lo revisado', async () => {
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload() // ya estaba en Por revisar: se recarga la bandeja
    await filas().first().waitFor()
    assert.equal(await filas().count(), 3)
    const kevin = casilla('Kevin Ramos Ccanto')
    assert.ok(await kevin.isDisabled())
    assert.equal(await kevin.getAttribute('title'), 'Revise el documento antes de seleccionarlo.')
    assert.ok(await casilla('Lucía Paredes Quinto').isEnabled())
    assert.ok(await casilla(`Lote ${lote}`).isEnabled())
    assert.equal(await barra().count(), 0)
  })
  let firmaDeLucia
  await paso('HU11 · El Director firma un documento desde su revisión; queda registrado en la blockchain real', async () => {
    await carlos.goto(URL + '#/por-revisar/' + primero)
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar' }).click()
    await dialogo().getByText('Firmar 1 documento').waitFor()
    const direccion = getAddress(B.director.direccion)
    await dialogo().getByText(`(${direccion.slice(0, 6)}…${direccion.slice(-4)})`).waitFor()
    await dialogo().getByText('Ing. Carlos Mendoza Rivera', { exact: false }).waitFor()
    await dialogo().getByText('Sin costo').waitFor()
    await foto(carlos, 'hu11_01_confirmar_firma')
    const antes = billeteras.get(carlos).estado.transacciones.length
    await dialogo().getByRole('button', { name: 'Confirmar' }).click()
    await dialogo().getByText('Se firmó 1 documento.').waitFor({ timeout: 60_000 })
    await foto(carlos, 'hu11_02_firma_lista')
    assert.equal(billeteras.get(carlos).estado.transacciones.length, antes + 1)

    const [estado, transaccion, bloque, billetera, firmadoEn, hash, cid, firmadoPor] = psql(
      `SELECT d.estado, d.transaccion, d.bloque, d.billetera_firmante, extract(epoch FROM d.firmado_en)::bigint,
              d.hash_pdf, d.cid, u.nombre_usuario
       FROM documento d JOIN usuario u ON u.id = d.firmado_por WHERE d.codigo = '${primero}'`,
    ).split('|')
    assert.equal(estado, 'FIRMADO')
    assert.equal(transaccion, billeteras.get(carlos).estado.transacciones.at(-1))
    assert.equal(billetera, direccion)
    assert.equal(firmadoPor, 'cmendoza')
    // Comprobación independiente en el contrato: el hash del PDF, la billetera y la fecha del bloque.
    const r = await enCadena(primero)
    assert.equal(r.registrado, true)
    assert.equal(r.hashPdf, '0x' + hash)
    assert.equal(r.firmante, direccion)
    assert.equal(String(r.registradoEn), firmadoEn)
    const recibo = await nodo.getTransactionReceipt(transaccion)
    assert.equal(recibo.status, 1)
    assert.equal(recibo.blockNumber, Number(bloque))
    assert.equal(recibo.gasPrice, 0n)
    // El PDF guardado en IPFS es el del hash registrado (RF30, RF31).
    const ruta = `${out}/hu11_pdf_firmado_desde_ipfs.pdf`
    ipfs(`cat?arg=${cid}`, ruta)
    assert.equal('0x' + sha256(ruta), r.hashPdf)
    assert.equal(eventos(primero).split(',').at(-1), 'FIRMADO')
    firmaDeLucia = { transaccion, bloque }

    await dialogo().getByRole('button', { name: 'Volver a Por revisar' }).click()
    await carlos.getByText('Documentos enviados por las áreas, del más antiguo al más reciente.').waitFor()
    await filas().first().waitFor()
    assert.equal(await carlos.locator('main').getByText('Lucía Paredes Quinto').count(), 0)
  })
  await paso('HU11 · Si el Director cancela en la billetera, el lote vuelve a Pendiente y no se registra', async () => {
    await casilla(`Lote ${lote}`).check()
    await barra().getByText('1 seleccionado (3 certificados)').waitFor()
    await foto(carlos, 'hu11_03_barra_de_seleccion')
    await barra().getByRole('button', { name: 'Firmar seleccionados' }).click()
    await dialogo().getByText('Firmar 3 documentos').waitFor()
    billeteras.get(carlos).rechazar(1)
    await dialogo().getByRole('button', { name: 'Confirmar' }).click()
    await dialogo().getByText('No se firmó ningún documento.').waitFor({ timeout: 60_000 })
    await dialogo().getByText('3 documentos no se pudieron firmar y volvieron a Por revisar:').waitFor()
    assert.equal(await dialogo().getByText('Firma cancelada en la billetera.', { exact: false }).count(), 3)
    await foto(carlos, 'hu11_04_firma_cancelada')
    for (const codigo of delLote()) {
      assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${codigo}'`), 'PENDIENTE')
      assert.ok(eventos(codigo).endsWith(',PREPARADO,FIRMA_CANCELADA'))
      assert.equal((await enCadena(codigo)).registrado, false)
    }
    await dialogo().getByRole('button', { name: 'Volver a Por revisar' }).click()
    await dialogo().waitFor({ state: 'detached' })
    await filas().first().waitFor()
    await filas().nth(0).getByText('✓ Revisado').waitFor()
  })
  let grande
  await paso('HU11 · Más de 50 documentos se registran en dos transacciones; si una falla, la otra sigue', async () => {
    const l = await enviar(rosa, '/api/lotes', {
      tipo: 'CERTIFICADO_CAPACITACION',
      datos: {
        nombreEvento: 'Injertos y podas en cacao',
        fechaInicio: '2026-10-05',
        fechaFin: '2026-10-07',
        duracionHoras: '24',
        lugar: 'Local comunal de Mazamari',
        areaOrganizadora: 'Área de Capacitación',
      },
      beneficiarios: Array.from({ length: 52 }, (_, i) => ({ nombres: 'Ana', apellidos: 'Soto Inga', dni: String(41000000 + i) })),
    })
    assert.equal(l.estado, 201)
    grande = l.cuerpo.numero
    // El Director lo revisa: abrir el lote cuenta para sus 52 certificados.
    await carlos.goto(URL + '#/por-revisar/lote/' + grande)
    await carlos.getByRole('heading', { name: `Revisión de lote – Lote ${grande}` }).waitFor()
    await carlos.getByRole('link', { name: '← Volver a Por revisar' }).click()
    await carlos.getByText(`Lote ${grande} · Injertos y podas en cacao · 52 certificados`, { exact: false }).waitFor()
    await casilla(`Lote ${lote}`).check()
    await casilla(`Lote ${grande}`).check()
    await barra().getByText('2 seleccionados (55 certificados)').waitFor()
    await barra().getByRole('button', { name: 'Firmar seleccionados' }).click()
    await dialogo().getByText('Firmar 55 documentos').waitFor()
    await dialogo().getByText('se registrarán en 2 operaciones', { exact: false }).waitFor()
    // La segunda transacción se cancela en la billetera; la primera sigue.
    const antes = billeteras.get(carlos).estado.transacciones.length
    billeteras.get(carlos).rechazar(2)
    await dialogo().getByRole('button', { name: 'Confirmar' }).click()
    await dialogo().getByText('Se firmaron 50 documentos.').waitFor({ timeout: 120_000 })
    await dialogo().getByText('5 documentos no se pudieron firmar y volvieron a Por revisar:').waitFor()
    await foto(carlos, 'hu11_05_firma_en_dos_operaciones')
    const enviadas = billeteras.get(carlos).estado.transacciones.slice(antes)
    assert.equal(enviadas.length, 1)
    assert.equal((await nodo.getTransactionReceipt(enviadas[0])).logs.length, 50)
    const conteo = (estado) =>
      psql(`SELECT count(*) FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero IN ('${lote}', '${grande}') AND d.estado = '${estado}'`)
    assert.equal(conteo('FIRMADO'), '50')
    assert.equal(conteo('PENDIENTE'), '5')
    assert.equal(psql(`SELECT count(DISTINCT transaccion) FROM documento WHERE transaccion = '${enviadas[0]}'`), '1')
    await dialogo().getByRole('button', { name: 'Volver a Por revisar' }).click()
  })
  await paso('HU11 · Los 5 que volvieron se firman en otra operación', async () => {
    // La bandeja se recarga al cerrar la ventana: el lote queda con sus 5 pendientes.
    await carlos.getByText(`Lote ${grande} · Injertos y podas en cacao · 5 certificados`, { exact: false }).waitFor()
    await casilla(`Lote ${grande}`).check()
    await barra().getByText('1 seleccionado (5 certificados)').waitFor()
    await barra().getByRole('button', { name: 'Firmar seleccionados' }).click()
    await dialogo().getByRole('button', { name: 'Confirmar' }).click()
    await dialogo().getByText('Se firmaron 5 documentos.').waitFor({ timeout: 60_000 })
    await dialogo().getByRole('button', { name: 'Volver a Por revisar' }).click()
    await carlos.getByText(`Lote ${grande}`, { exact: false }).waitFor({ state: 'detached' })
    assert.equal(await filas().count(), 1)
    await filas().nth(0).getByText('Kevin Ramos Ccanto').waitFor()
    assert.equal(
      psql(`SELECT count(*), count(DISTINCT transaccion) FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${grande}' AND d.estado = 'FIRMADO'`),
      '52|2',
    )
    for (const codigo of psql(`SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${grande}' ORDER BY d.id DESC LIMIT 3`).split('\n'))
      assert.equal((await enCadena(codigo)).registrado, true)
    await foto(carlos, 'hu11_06_bandeja_despues_de_firmar')
  })
  await paso('HU11 · El área ve sus documentos Firmados; la firma no costó nada', async () => {
    await pedro.goto(URL + '#/mis-documentos')
    await pedro.reload() // ya estaba en Mis documentos (HU17)
    await pedro.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' }).getByText('Firmado').waitFor()
    await pedro.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' }).getByText('Pendiente').waitFor()
    await foto(pedro, 'hu11_07_mis_documentos_firmado')
    await pedro.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' }).getByRole('link').click()
    await pedro.getByText('Firmado por el Director y registrado en la blockchain.').waitFor()
    await rosa.goto(URL + '#/mis-documentos')
    await rosa.reload()
    await rosa.locator('main tbody tr', { hasText: `Lote ${grande}` }).getByText('Firmado').waitFor()
    await foto(rosa, 'hu11_08_mis_documentos_lote_firmado')
    assert.equal(await nodo.getBalance(B.director.direccion), 0n)
    assert.ok(firmaDeLucia.transaccion)
  })
  // ------------------------------------------------------- HU12: revisar y firmar un lote
  const nuevoLote = async (nombreEvento, beneficiarios) => {
    const r = await enviar(rosa, '/api/lotes', {
      tipo: 'CERTIFICADO_CAPACITACION',
      datos: {
        nombreEvento,
        fechaInicio: '2026-10-12',
        fechaFin: '2026-10-13',
        duracionHoras: '16',
        lugar: 'Local comunal de Pichanaqui',
        areaOrganizadora: 'Área de Capacitación',
      },
      beneficiarios,
    })
    assert.equal(r.estado, 201)
    return r.cuerpo.numero
  }
  const porNombre = (numero, nombres) =>
    psql(`SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${numero}' AND d.nombres = '${nombres}'`)
  const motivoDeVentana = (titulo) => carlos.getByRole('dialog', { name: titulo })
  let abonos
  await paso('HU12 · En la revisión del lote, el Director observa y rechaza beneficiarios con su motivo', async () => {
    abonos = await nuevoLote('Elaboración de abonos orgánicos', [
      { nombres: 'Rocío', apellidos: 'Huamán Soto', dni: '42000001' },
      { nombres: 'Elmer', apellidos: 'Quispe Rojas', dni: '42000002' },
      { nombres: 'Nilda', apellidos: 'Pari Ccori', dni: '42000003' },
      { nombres: 'Wilmer', apellidos: 'Inga Pérez', dni: '42000004' },
      { nombres: 'Flor', apellidos: 'Soto Ramos', dni: '42000005' },
    ])
    await carlos.goto(URL + '#/por-revisar/lote/' + abonos)
    await carlos.getByRole('heading', { name: `Revisión de lote – Lote ${abonos}` }).waitFor()
    const observar = carlos.getByRole('button', { name: 'Observar seleccionados' })
    assert.ok(await observar.isDisabled())
    await carlos.getByRole('checkbox', { name: 'Marcar a Elmer Quispe Rojas' }).check()
    await observar.click()
    let ventana = motivoDeVentana('Observar beneficiarios seleccionados')
    assert.ok(await ventana.getByRole('button', { name: 'Confirmar' }).isDisabled())
    await ventana.getByLabel('Motivo').fill('El DNI no coincide con la lista de asistencia del taller')
    await foto(carlos, 'hu12_01_ventana_de_motivo')
    await ventana.getByRole('button', { name: 'Confirmar' }).click()
    await carlos.getByRole('status').getByText('1 certificado fue observado y volvió al área.').waitFor()

    await carlos.getByRole('checkbox', { name: 'Marcar a Wilmer Inga Pérez' }).check()
    await carlos.getByRole('button', { name: 'Rechazar seleccionados' }).click()
    ventana = motivoDeVentana('Rechazar beneficiarios seleccionados')
    await ventana.getByText('El rechazo es definitivo. El documento no podrá reenviarse.').waitFor()
    await ventana.getByLabel('Motivo').fill('No asistió al taller')
    await foto(carlos, 'hu12_02_ventana_de_rechazo')
    await ventana.getByRole('button', { name: 'Confirmar' }).click()
    await carlos.getByRole('status').getByText('1 certificado fue rechazado.').waitFor()
    const relacion = carlos.getByRole('complementary', { name: 'Beneficiarios del lote' })
    await relacion.getByText('Observado').waitFor()
    await relacion.getByText('Rechazado').waitFor()
    // Los ya decididos no se pueden marcar: su casilla deja de mostrarse.
    assert.equal(await carlos.getByRole('checkbox', { name: 'Marcar a Elmer Quispe Rojas' }).count(), 0)
    assert.equal(await carlos.getByRole('checkbox', { name: /^Marcar a / }).count(), 3)
    await foto(carlos, 'hu12_03_lote_con_observado_y_rechazado')

    const elmer = porNombre(abonos, 'Elmer')
    assert.equal(psql(`SELECT estado, motivo FROM documento WHERE codigo = '${elmer}'`), 'OBSERVADO|El DNI no coincide con la lista de asistencia del taller')
    assert.equal(
      psql(`SELECT h.evento, h.detalle, u.nombre_usuario FROM documento_historial h JOIN documento d ON d.id = h.documento_id JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = '${elmer}' ORDER BY h.id DESC LIMIT 1`),
      'OBSERVADO|Observado por Ing. Carlos Mendoza Rivera: El DNI no coincide con la lista de asistencia del taller|cmendoza',
    )
    assert.equal(psql(`SELECT estado, motivo FROM documento WHERE codigo = '${porNombre(abonos, 'Wilmer')}'`), 'RECHAZADO|No asistió al taller')
  })
  await paso('HU12 · "Firmar lote" firma los 3 que siguen Pendientes, en la blockchain real', async () => {
    await carlos.getByRole('button', { name: 'Firmar lote' }).click()
    await dialogo().getByText('Firmar 3 certificados').waitFor()
    await dialogo().getByRole('button', { name: 'Confirmar' }).click()
    await dialogo().getByText('Se firmaron 3 certificados.').waitFor({ timeout: 60_000 })
    await dialogo().getByText('1 certificado fue observado y devuelto al área.').waitFor()
    await dialogo().getByText('1 certificado fue rechazado.').waitFor()
    await foto(carlos, 'hu12_04_firma_del_lote')
    assert.equal(
      psql(`SELECT count(*), count(DISTINCT d.transaccion) FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${abonos}' AND d.estado = 'FIRMADO'`),
      '3|1',
    )
    for (const [nombre, registrado] of [['Rocío', true], ['Nilda', true], ['Flor', true], ['Elmer', false], ['Wilmer', false]])
      assert.equal((await enCadena(porNombre(abonos, nombre))).registrado, registrado, nombre)
    await dialogo().getByRole('button', { name: 'Volver a Por revisar' }).click()
    await carlos.getByText(`Lote ${abonos}`, { exact: false }).waitFor({ state: 'detached' })
    await filas().first().waitFor()
  })
  await paso('HU12 · El área ve cuántos certificados del lote hay en cada estado y el motivo de cada uno', async () => {
    await rosa.goto(URL + '#/mis-documentos')
    await rosa.reload()
    const fila = rosa.locator('main tbody tr', { hasText: `Lote ${abonos}` })
    await fila.getByText('Observado 1').waitFor()
    await fila.getByText('Firmado 3').waitFor()
    await fila.getByText('Rechazado 1').waitFor()
    await foto(rosa, 'hu12_05_mis_documentos_estados_del_lote')
    await fila.getByRole('link').click()
    await rosa.getByRole('heading', { name: `Lote ${abonos}` }).waitFor()
    await rosa.getByText('Motivo: El DNI no coincide con la lista de asistencia del taller').waitFor()
    await rosa.getByText('Motivo: No asistió al taller').waitFor()
    await foto(rosa, 'hu12_06_detalle_del_lote_con_motivos')
  })
  await paso('HU12 · Observar el lote completo lo devuelve al área y lo saca de Por revisar', async () => {
    const completo = await nuevoLote('Cosecha de café de calidad', [
      { nombres: 'Teófilo', apellidos: 'Ramos Inga', dni: '42000011' },
      { nombres: 'Marleny', apellidos: 'Soto Pari', dni: '42000012' },
    ])
    await carlos.goto(URL + '#/por-revisar/lote/' + completo)
    await carlos.getByRole('heading', { name: `Revisión de lote – Lote ${completo}` }).waitFor()
    await carlos.getByRole('button', { name: 'Observar lote' }).click()
    const ventana = motivoDeVentana('Observar lote')
    await ventana.getByLabel('Motivo').fill('Falta la lista de asistencia firmada')
    await ventana.getByRole('button', { name: 'Confirmar' }).click()
    await carlos.getByRole('status').getByText('2 certificados fueron observados y volvieron al área.').waitFor()
    await carlos.getByText('El lote ya no tiene certificados pendientes.').waitFor()
    await foto(carlos, 'hu12_07_lote_observado_completo')
    assert.equal(
      psql(`SELECT string_agg(DISTINCT d.estado, ',') FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '${completo}'`),
      'OBSERVADO',
    )
    await carlos.goto(URL + '#/por-revisar')
    await filas().first().waitFor()
    assert.equal(await carlos.getByText(`Lote ${completo}`, { exact: false }).count(), 0)
  })
  await paso('HU12 · El motivo es obligatorio y solo el Director observa o rechaza', async () => {
    const r = await enviar(carlos, `/api/revision/lotes/${abonos}/observacion`, { codigos: [], motivo: '  ' })
    assert.equal(r.estado, 400)
    assert.equal(r.cuerpo.campos.motivo, 'Indique el motivo.')
    assert.equal((await enviar(pedro, `/api/revision/lotes/${abonos}/observacion`, { motivo: 'x' })).estado, 403)
    assert.equal((await enviar(rosa, `/api/revision/lotes/${abonos}/rechazo`, { motivo: 'x' })).estado, 403)
  })
  await paso('HU11 · Solo el Director firma', async () => {
    assert.equal(await api(pedro, '/api/firma/billetera'), 403)
    assert.equal((await enviar(pedro, '/api/firma/confirmacion', { transaccion: firmaDeLucia.transaccion })).estado, 403)
    assert.equal((await enviar(pedro, '/api/firma/cancelacion', { codigos: [primero] })).estado, 403)
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
