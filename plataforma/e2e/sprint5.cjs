// Prueba de punta a punta real del Sprint 5: navegador + frontend + backend + PostgreSQL + IPFS +
// red Besu local, sin simulaciones. Requiere el entorno de levantar.sh. Recorre HU21 (comprobar la
// autenticidad de un documento con su registro en la blockchain y el PDF en IPFS), sin sesión, como
// lo hará el portal público; HU19 (el portal público al que lleva el código QR, en un celular) y
// HU20 (verificar con el código impreso, y el límite de 10 consultas por minuto por IP).
const { chromium, devices } = require('playwright')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
// Contenedores del entorno de prueba: los de levantar.sh, o los del servidor de AWS en Docker
// (infra/aws/pruebas/de-punta-a-punta.sh).
const CONTENEDOR_PG = process.env.E2E_CONTENEDOR_PG ?? 'e2e-pg'
const CONTENEDOR_IPFS = process.env.E2E_CONTENEDOR_IPFS ?? 'e2e-ipfs'
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { Contract, JsonRpcProvider, Wallet, getAddress } = require('ethers')
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
    [
      'function consultar(string codigo) view returns (bool, (bytes32 hashPdf, bytes32 dniHmac, address firmante, uint64 registradoEn))',
      'function anulacion(string codigo) view returns (bool, uint64)',
      'function reemplazadoPor(string codigo) view returns (string)',
    ],
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
    execFileSync('docker', ['exec', CONTENEDOR_PG, 'psql', '-U', 'plataforma', '-d', 'plataforma', '-At', '-F', '|', '-c', sql])
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
    // Como en sprint3.cjs: deja al Director listo para firmar y anular (HU29).
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

  const pedro = await nueva()
  const carlos = await nueva()
  billeteras.get(carlos).usar(B.director.clave)
  await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
  await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
  const esperarHasta = async (descripcion, condicion, maximo = 120_000) => {
    const limite = Date.now() + maximo
    while (Date.now() < limite) {
      if (await condicion()) return
      await new Promise((listo) => setTimeout(listo, 1000))
    }
    throw new Error('No se cumplió a tiempo: ' + descripcion)
  }
  // El contrato con una billetera, como lo usaría el navegador (sin pasar por la pantalla).
  const contratoCon = (clave) =>
    new Contract(
      DESPLIEGUE.contrato,
      [
        'function anularDocumento(string codigo)',
        'error NoRegistrado(string codigo)',
        'error YaAnulado(string codigo)',
        'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
      ],
      new Wallet(clave, nodo),
    )
  const contratoDirector = contratoCon(B.director.clave)
  const sinCosto = { gasPrice: 0n, type: 0 }
  const ultimoEvento = (codigo) =>
    psql(`SELECT h.evento, h.detalle, coalesce(u.nombre_usuario, '(sistema)') FROM documento_historial h JOIN documento d ON d.id = h.documento_id LEFT JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = '${codigo}' ORDER BY h.id DESC LIMIT 1`).split('|')
  const anulado = async (codigo) => {
    const [si, fecha] = await registro.anulacion(codigo)
    return { si, fecha: Number(fecha) }
  }
  const anonimo = await nueva()
  /** Verificación pública desde un navegador sin sesión, con el tiempo de respuesta. */
  // HU20: cada consulta desde otra IP (X-Forwarded-For, que el backend acepta del proxy local),
  // para que el límite de 10 por minuto no corte la prueba.
  let visitante = 0
  const otraIp = () => `198.51.100.${(++visitante % 250) + 1}`
  const verificar = (token) =>
    anonimo.evaluate(async ([t, ip]) => {
      const inicio = performance.now()
      const r = await fetch('/api/verificacion/' + t, { headers: { 'X-Forwarded-For': ip } })
      return { estado: r.status, cuerpo: await r.json(), ms: performance.now() - inicio }
    }, [token, otraIp()])
  const tokenDe = (codigo) => psql(`SELECT token_qr FROM documento WHERE codigo = '${codigo}'`)
  const guardar = (nombre, datos) => fs.writeFileSync(`${out}/${nombre}.json`, JSON.stringify(datos, null, 2) + '\n')
  const tiempos = []

  let lucia, kevin, martha, pendiente
  await paso('Preparación · El área envía cuatro documentos y el Director firma tres con su billetera', async () => {
    const codigos = []
    for (const [exp, n, a, dni] of [
      ['EXP-2026-005391', 'Lucía', 'Paredes Quinto', '45829364'],
      ['EXP-2026-005392', 'Kevin', 'Ramos Ccanto', '46385127'],
      ['EXP-2026-005401', 'Martha', 'Rojas Inga', '44200001'],
      ['EXP-2026-005402', 'Nilo', 'Huamán Soto', '44200002'],
    ]) {
      const r = await enviar(pedro, '/api/documentos', trabajo(exp, n, a, dni))
      assert.equal(r.estado, 201)
      codigos.push(r.cuerpo.codigo)
    }
    ;[lucia, kevin, martha, pendiente] = codigos
    for (const codigo of [lucia, kevin, martha])
      assert.equal((await enviar(carlos, '/api/revision/documentos/' + codigo, {})).estado, 200)
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    for (const nombre of ['Lucía Paredes Quinto', 'Kevin Ramos Ccanto', 'Martha Rojas Inga'])
      await carlos.getByRole('checkbox', { name: new RegExp('Seleccionar ' + nombre) }).check()
    await carlos.getByRole('region', { name: 'Selección para firmar' }).getByRole('button', { name: 'Firmar seleccionados' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmaron 3 documentos.').waitFor({ timeout: 60_000 })
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
  })

  // ------------------------------------------------- HU21: comprobar la autenticidad del documento
  await paso('HU21 · Un documento firmado se verifica sin sesión: Válido, con la fecha del bloque y sin datos internos', async () => {
    const transaccionesAntes = await nodo.getTransactionCount(B.director.direccion)
    const r = await verificar(tokenDe(lucia))
    assert.equal(r.estado, 200)
    guardar('hu21_01_valido', r.cuerpo)
    tiempos.push(r.ms)
    assert.equal(r.cuerpo.resultado, 'VALIDO')
    assert.equal(r.cuerpo.mensaje, 'El documento es auténtico: coincide con su registro en la blockchain.')
    assert.equal(r.cuerpo.tipo, 'Certificado de Trabajo')
    assert.equal(r.cuerpo.titular, 'Lucía Paredes Quinto')
    assert.equal(r.cuerpo.versionCorregida, false)
    // La fecha de emisión es la del bloque del registro, leída directo del nodo.
    const [, registrado] = await registro.consultar(lucia)
    assert.equal(Date.parse(r.cuerpo.fechaEmision) / 1000, Number(registrado.registradoEn))
    // El hash registrado es el SHA-256 del PDF guardado en IPFS.
    const cid = psql(`SELECT cid FROM documento WHERE codigo = '${lucia}'`)
    const pdf = Buffer.from(await (await fetch(`http://127.0.0.1:8082/ipfs/${cid}`)).arrayBuffer())
    assert.equal('0x' + require('node:crypto').createHash('sha256').update(pdf).digest('hex'), registrado.hashPdf)
    const texto = JSON.stringify(r.cuerpo)
    for (const dato of ['45829364', lucia, cid, psql(`SELECT dni_hmac FROM documento WHERE codigo = '${lucia}'`)])
      assert.ok(!texto.includes(dato), 'la respuesta incluye ' + dato)
    // Solo lectura: la verificación no envía transacciones.
    assert.equal(await nodo.getTransactionCount(B.director.direccion), transaccionesAntes)
  })
  await paso('HU21 · Si el PDF guardado no coincide con el hash registrado, es No válido y no entrega datos', async () => {
    const original = psql(`SELECT cid FROM documento WHERE codigo = '${kevin}'`)
    // Un PDF distinto en el mismo IPFS privado, puesto en lugar del original.
    const forma = new FormData()
    forma.append('file', new Blob([Buffer.from('%PDF-1.7 documento alterado')]), 'alterado.pdf')
    const agregado = await (await fetch('http://127.0.0.1:5002/api/v0/add?cid-version=1&pin=false', { method: 'POST', body: forma })).json()
    psql(`UPDATE documento SET cid = '${agregado.Hash}' WHERE codigo = '${kevin}'`)
    const r = await verificar(tokenDe(kevin))
    guardar('hu21_02_pdf_alterado', r.cuerpo)
    tiempos.push(r.ms)
    assert.deepEqual(r.cuerpo, { resultado: 'NO_VALIDO', mensaje: 'No encontramos un documento válido con estos datos.', tipo: null, titular: null, fechaEmision: null, anuladoEn: null, versionCorregida: false, venceEn: null })
    psql(`UPDATE documento SET cid = '${original}' WHERE codigo = '${kevin}'`)
    assert.equal((await verificar(tokenDe(kevin))).cuerpo.resultado, 'VALIDO')
    // También es No válido un documento que no se emitió, un token inexistente o mal formado.
    for (const token of [tokenDe(pendiente), 'A'.repeat(43), 'no-es-un-token'])
      assert.equal((await verificar(token)).cuerpo.resultado, 'NO_VALIDO', token)
  })
  await paso('HU21 · Anulado en el contrato: se informa la fecha del bloque de la anulación', async () => {
    const tx = await contratoDirector.anularDocumento(martha, sinCosto)
    const recibo = await tx.wait()
    // Manda el contrato: es Anulado aunque la sincronización todavía no lo haya aplicado.
    const r = await verificar(tokenDe(martha))
    guardar('hu21_03_anulado', r.cuerpo)
    tiempos.push(r.ms)
    assert.equal(r.cuerpo.resultado, 'ANULADO')
    assert.equal(r.cuerpo.mensaje, 'Este documento fue anulado y ya no es válido.')
    assert.equal(r.cuerpo.titular, 'Martha Rojas Inga')
    assert.equal(Date.parse(r.cuerpo.anuladoEn) / 1000, (await nodo.getBlock(recibo.blockNumber)).timestamp)
    assert.equal(r.cuerpo.versionCorregida, false)
  })
  let nuevaLucia
  await paso('HU21 · Reemplazado por una reemisión: Anulado, con "versión corregida" y sin revelar su código', async () => {
    const reemision = await enviar(pedro, `/api/documentos/${lucia}/reemision`, {
      nombres: 'Lucía', apellidos: 'Paredes Quintana', dni: '45829364',
      datos: { cargo: 'secretaria', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
      motivo: 'El apellido estaba mal escrito',
    })
    assert.equal(reemision.estado, 201)
    nuevaLucia = reemision.cuerpo.codigo
    await carlos.goto(URL + '#/por-revisar/' + nuevaLucia)
    await carlos.getByRole('button', { name: 'Firmar' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmó 1 documento.').waitFor({ timeout: 60_000 })
    const r = await verificar(tokenDe(lucia))
    guardar('hu21_04_reemplazado', r.cuerpo)
    tiempos.push(r.ms)
    assert.equal(r.cuerpo.resultado, 'ANULADO')
    assert.equal(r.cuerpo.versionCorregida, true)
    assert.ok(!JSON.stringify(r.cuerpo).includes(nuevaLucia))
    assert.equal(await registro.reemplazadoPor(lucia), nuevaLucia)
    const nueva = await verificar(tokenDe(nuevaLucia))
    guardar('hu21_05_reemision_valida', nueva.cuerpo)
    tiempos.push(nueva.ms)
    assert.equal(nueva.cuerpo.resultado, 'VALIDO')
    assert.equal(nueva.cuerpo.titular, 'Lucía Paredes Quintana')
  })
  await paso('HU21 · Si IPFS no responde, no se informa No válido: "No se pudo verificar…" (503)', async () => {
    execFileSync('docker', ['stop', CONTENEDOR_IPFS])
    try {
      const r = await verificar(tokenDe(kevin))
      guardar('hu21_06_no_disponible', r.cuerpo)
      assert.equal(r.estado, 503)
      assert.equal(r.cuerpo.mensaje, 'No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.')
      assert.equal(r.cuerpo.resultado, undefined)
    } finally {
      execFileSync('docker', ['start', CONTENEDOR_IPFS])
    }
    await esperarHasta('IPFS de vuelta', async () => (await verificar(tokenDe(kevin))).estado === 200, 60_000)
  })
  await paso('HU21 · Cada verificación responde en menos de dos segundos (RNF01)', async () => {
    for (let i = 0; i < 5; i++) tiempos.push((await verificar(tokenDe(kevin))).ms)
    const maximo = Math.max(...tiempos)
    fs.writeFileSync(`${out}/hu21_07_tiempos.txt`, tiempos.map((t) => t.toFixed(0) + ' ms').join('\n') + `\nmáximo: ${maximo.toFixed(0)} ms\n`)
    assert.ok(maximo < 2000, `la más lenta tardó ${maximo} ms`)
  })

  // ---------------------------------------------- HU19: verificar mediante el código QR (portal)
  const PORTAL = process.env.E2E_PORTAL ?? 'http://localhost:5174'
  // Un celular, sin sesión ni billetera: quien escanea el QR del documento.
  const celular = await (
    await b.newContext({ ...devices['Pixel 7'], extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.10' } })
  ).newPage()
  const fotoCelular = (nombre) => celular.screenshot({ path: `${out}/${nombre}.png`, fullPage: true })
  const fechaEnLima = (segundos) =>
    new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(segundos * 1000))
  const abrirQr = async (codigo, titulo) => {
    const inicio = Date.now()
    await celular.goto(`${PORTAL}/verificar/${tokenDe(codigo)}`)
    await celular.getByRole('heading', { name: titulo, level: 1 }).waitFor()
    return Date.now() - inicio
  }
  await paso('HU19 · El portal se abre sin registro y su portada explica cómo verificar con el QR', async () => {
    await celular.goto(PORTAL)
    await celular.getByRole('heading', { name: 'Verifique un documento' }).waitFor()
    await celular.getByText('Escanéelo con la cámara de su celular.').waitFor()
    // Sin inicio de sesión: ningún campo de contraseña; el único campo es el del código (HU20).
    assert.equal(await celular.locator('input[type=password]').count(), 0)
    assert.equal(await celular.locator('input').count(), 1)
    await celular.getByLabel('Código de verificación').waitFor()
    const galletas = await celular.context().cookies()
    assert.equal(galletas.length, 0, JSON.stringify(galletas))
    await fotoCelular('hu19_01_portada_celular')
  })
  await paso('HU19 · Al abrir el QR de un documento válido: el resultado en menos de dos segundos y el documento completo', async () => {
    const ms = await abrirQr(kevin, 'Documento válido')
    fs.writeFileSync(`${out}/hu19_tiempo_valido.txt`, `${ms} ms desde que se abre el enlace del QR hasta que se ve el resultado\n`)
    assert.ok(ms < 2000, `tardó ${ms} ms`)
    const resultado = celular.getByRole('region', { name: 'Documento válido' })
    const [, registrado] = await registro.consultar(kevin)
    for (const texto of ['Certificado de Trabajo', 'Kevin Ramos Ccanto', fechaEnLima(Number(registrado.registradoEn)), 'Vigente'])
      await resultado.getByText(texto, { exact: true }).waitFor()
    const documento = celular.getByRole('region', { name: 'Documento completo' })
    await documento.getByRole('link', { name: 'Abrir el documento' }).waitFor()
    await documento.getByRole('link', { name: 'Descargar PDF' }).waitFor()
    // El documento que muestra el portal es el PDF cuyo hash está en la blockchain.
    // El documento se dibuja dentro de la página: los celulares no muestran un PDF incrustado.
    const visor = documento.getByRole('img', { name: 'Documento verificado' })
    await visor.locator('canvas').first().waitFor({ timeout: 15_000 })
    assert.ok((await visor.locator('canvas').first().boundingBox()).height > 200)
    const src = await documento.getByRole('link', { name: 'Abrir el documento' }).getAttribute('href')
    const pdf = await celular.evaluate(async (u) => {
      const r = await fetch(u)
      return { tipo: r.headers.get('content-type'), bytes: Array.from(new Uint8Array(await r.arrayBuffer())) }
    }, src)
    assert.equal(pdf.tipo, 'application/pdf')
    assert.equal('0x' + require('node:crypto').createHash('sha256').update(Buffer.from(pdf.bytes)).digest('hex'), registrado.hashPdf)
    await fotoCelular('hu19_02_valido_celular')
    const escritorio = await (
      await b.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.11' } })
    ).newPage()
    await escritorio.goto(`${PORTAL}/verificar/${tokenDe(kevin)}`)
    await escritorio.getByRole('heading', { name: 'Documento válido', level: 1 }).waitFor()
    await escritorio.getByRole('img', { name: 'Documento verificado' }).locator('canvas').first().waitFor({ timeout: 15_000 })
    await escritorio.screenshot({ path: `${out}/hu19_03_valido_escritorio.png`, fullPage: true })
    await escritorio.context().close()
  })
  await paso('HU19 · Un documento reemplazado se ve Anulado, con la fecha y la versión corregida, sin el documento', async () => {
    await abrirQr(lucia, 'Documento anulado')
    const resultado = celular.getByRole('region', { name: 'Documento anulado' })
    await resultado.getByText('Fecha de anulación').waitFor()
    await resultado.getByText('Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.').waitFor()
    assert.equal(await celular.getByRole('region', { name: 'Documento completo' }).count(), 0)
    assert.ok(!(await celular.content()).includes(nuevaLucia))
    assert.equal(await celular.evaluate((u) => fetch(u).then((r) => r.status), `/api/verificacion/${tokenDe(lucia)}/documento`), 404)
    await fotoCelular('hu19_04_anulado_celular')
  })
  await paso('HU19 · Un documento no emitido o un enlace inválido se ven No válidos, sin datos', async () => {
    await abrirQr(pendiente, 'Documento no válido')
    const resultado = celular.getByRole('region', { name: 'Documento no válido' })
    await resultado.getByText('No encontramos un documento válido con estos datos.').waitFor()
    assert.equal(await resultado.getByText('Titular').count(), 0)
    assert.equal(await celular.getByRole('region', { name: 'Documento completo' }).count(), 0)
    await fotoCelular('hu19_05_no_valido_celular')
    await celular.goto(`${PORTAL}/verificar/enlace-alterado`)
    await celular.getByRole('heading', { name: 'Documento no válido', level: 1 }).waitFor()
  })
  await paso('HU19 · Si la verificación no está disponible, se puede intentar nuevamente', async () => {
    execFileSync('docker', ['stop', CONTENEDOR_IPFS])
    try {
      await celular.goto(`${PORTAL}/verificar/${tokenDe(kevin)}`)
      await celular.getByRole('alert').getByText('No se pudo verificar el documento en este momento.', { exact: false }).waitFor()
      await fotoCelular('hu19_06_no_disponible_celular')
    } finally {
      execFileSync('docker', ['start', CONTENEDOR_IPFS])
    }
    await esperarHasta('IPFS de vuelta', async () => (await verificar(tokenDe(kevin))).estado === 200, 60_000)
    await celular.getByRole('button', { name: 'Intentar nuevamente' }).click()
    await celular.getByRole('heading', { name: 'Documento válido', level: 1 }).waitFor()
  })

  // ------------------------------------- HU20: verificar mediante el código de verificación
  const conCodigo = await (
    await b.newContext({ ...devices['Pixel 7'], extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.20' } })
  ).newPage()
  const campoCodigo = () => conCodigo.getByLabel('Código de verificación')
  await paso('HU20 · Con el código escrito en minúsculas y con espacios: el resultado, solo con los datos básicos', async () => {
    await conCodigo.goto(PORTAL)
    const escrito = kevin.toLowerCase().replaceAll('-', ' ')
    await campoCodigo().fill(escrito)
    const inicio = Date.now()
    await conCodigo.getByRole('button', { name: 'Verificar' }).click()
    const resultado = conCodigo.getByRole('region', { name: 'Documento válido' })
    await resultado.waitFor()
    const ms = Date.now() - inicio
    fs.writeFileSync(`${out}/hu20_tiempo_valido.txt`, `${ms} ms desde que se pulsa "Verificar" hasta que se ve el resultado\n`)
    assert.ok(ms < 2000, `tardó ${ms} ms`)
    assert.equal(await campoCodigo().inputValue(), kevin)
    const [, registrado] = await registro.consultar(kevin)
    for (const texto of ['Certificado de Trabajo', 'Kevin Ramos Ccanto', fechaEnLima(Number(registrado.registradoEn)), 'Vigente'])
      await resultado.getByText(texto, { exact: true }).waitFor()
    // RF40: con el código no se muestra el documento.
    assert.equal(await conCodigo.getByRole('region', { name: 'Documento completo' }).count(), 0)
    assert.equal(await conCodigo.locator('canvas').count(), 0)
    await conCodigo.getByText('Para ver el documento completo, escanee su código QR.').waitFor()
    await conCodigo.screenshot({ path: `${out}/hu20_01_valido_con_codigo.png`, fullPage: true })
  })
  await paso('HU20 · Un código con otro formato se señala sin consultar al servidor; uno anulado muestra su fecha', async () => {
    const pedidos = []
    const anotar = (r) => r.url().includes('/api/verificacion') && pedidos.push(r.url())
    conCodigo.on('request', anotar)
    await campoCodigo().fill('DRA-2026-F8R2M0')
    await conCodigo.getByRole('button', { name: 'Verificar' }).click()
    await conCodigo.getByText('Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA.').waitFor()
    assert.equal(await campoCodigo().getAttribute('aria-invalid'), 'true')
    await conCodigo.screenshot({ path: `${out}/hu20_02_formato_invalido.png`, fullPage: true })
    conCodigo.off('request', anotar)
    assert.deepEqual(pedidos, [])
    await campoCodigo().fill(martha)
    await conCodigo.getByRole('button', { name: 'Verificar' }).click()
    const anulado = conCodigo.getByRole('region', { name: 'Documento anulado' })
    await anulado.getByText('Fecha de anulación').waitFor()
    await anulado.getByText('Martha Rojas Inga').waitFor()
    await conCodigo.screenshot({ path: `${out}/hu20_03_anulado_con_codigo.png`, fullPage: true })
  })
  await paso('HU20 · Cada IP tiene 10 consultas por minuto, entre código y QR; la siguiente recibe 429', async () => {
    // Un visitante nuevo, con su propia IP (la del contexto, sin otra en cada consulta).
    const limitado = await (
      await b.newContext({ ...devices['Pixel 7'], extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.30' } })
    ).newPage()
    await limitado.goto(PORTAL)
    const consultar = (ruta) =>
      limitado.evaluate(async (r) => {
        const res = await fetch(r)
        return { estado: res.status, espera: res.headers.get('retry-after'), cuerpo: await res.json() }
      }, ruta)
    const respuestas = []
    for (let i = 0; i < 5; i++) {
      respuestas.push(await consultar(`/api/verificacion/codigo/${kevin}`))
      respuestas.push(await consultar(`/api/verificacion/${tokenDe(kevin)}`))
    }
    assert.deepEqual(respuestas.map((r) => r.estado), Array(10).fill(200))
    const undecima = await consultar(`/api/verificacion/codigo/${kevin}`)
    guardar('hu20_04_demasiadas_consultas', { estado: undecima.estado, 'retry-after': undecima.espera, ...undecima.cuerpo })
    assert.equal(undecima.estado, 429)
    assert.ok(Number(undecima.espera) >= 1 && Number(undecima.espera) <= 60, undecima.espera)
    assert.equal(undecima.cuerpo.mensaje, 'Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.')
    assert.equal((await consultar(`/api/verificacion/${tokenDe(kevin)}`)).estado, 429)
    // La pantalla lo informa.
    await limitado.getByLabel('Código de verificación').fill(kevin)
    await limitado.getByRole('button', { name: 'Verificar' }).click()
    await limitado.getByRole('alert').getByText('Hizo demasiadas consultas en poco tiempo.', { exact: false }).waitFor()
    await limitado.screenshot({ path: `${out}/hu20_05_demasiadas_consultas.png`, fullPage: true })
    await limitado.context().close()
    // Otro visitante sigue consultando.
    await campoCodigo().fill(kevin)
    await conCodigo.getByRole('button', { name: 'Verificar' }).click()
    await conCodigo.getByRole('region', { name: 'Documento válido' }).waitFor()
  })
  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
