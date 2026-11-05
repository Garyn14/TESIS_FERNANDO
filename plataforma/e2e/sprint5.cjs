// Prueba de punta a punta real del Sprint 5: navegador + frontend + backend + PostgreSQL + IPFS +
// red Besu local, sin simulaciones. Requiere el entorno de levantar.sh. Recorre HU21 (comprobar la
// autenticidad de un documento con su registro en la blockchain y el PDF en IPFS), sin sesión, como
// lo hará el portal público.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
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
  const verificar = (token) =>
    anonimo.evaluate(async (t) => {
      const inicio = performance.now()
      const r = await fetch('/api/verificacion/' + t)
      return { estado: r.status, cuerpo: await r.json(), ms: performance.now() - inicio }
    }, token)
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
    assert.deepEqual(r.cuerpo, { resultado: 'NO_VALIDO', mensaje: 'No encontramos un documento válido con estos datos.', tipo: null, titular: null, fechaEmision: null, anuladoEn: null, versionCorregida: false })
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
    execFileSync('docker', ['stop', 'e2e-ipfs'])
    try {
      const r = await verificar(tokenDe(kevin))
      guardar('hu21_06_no_disponible', r.cuerpo)
      assert.equal(r.estado, 503)
      assert.equal(r.cuerpo.mensaje, 'No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos.')
      assert.equal(r.cuerpo.resultado, undefined)
    } finally {
      execFileSync('docker', ['start', 'e2e-ipfs'])
    }
    await esperarHasta('IPFS de vuelta', async () => (await verificar(tokenDe(kevin))).estado === 200, 60_000)
  })
  await paso('HU21 · Cada verificación responde en menos de dos segundos (RNF01)', async () => {
    for (let i = 0; i < 5; i++) tiempos.push((await verificar(tokenDe(kevin))).ms)
    const maximo = Math.max(...tiempos)
    fs.writeFileSync(`${out}/hu21_07_tiempos.txt`, tiempos.map((t) => t.toFixed(0) + ' ms').join('\n') + `\nmáximo: ${maximo.toFixed(0)} ms\n`)
    assert.ok(maximo < 2000, `la más lenta tardó ${maximo} ms`)
  })

  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
