// Prueba de punta a punta real del Sprint 6: navegador + frontend + backend + PostgreSQL + IPFS +
// red Besu local, sin simulaciones. Requiere el entorno de levantar.sh. Recorre HU22 (Mesa de
// Partes busca documentos de todas las áreas por nombre, DNI, código, expediente o lote, con
// filtros por estado), HU23 (la ficha de un documento con su estado explicado y sus datos) y HU24
// (el historial y el detalle técnico de auditoría, comprobado contra IPFS y la red Besu) y HU25
// (descargar o imprimir un documento firmado, con su registro en el historial) y HU26 (el aviso al
// Director de los documentos y lotes pendientes de su revisión) y HU27 (los avisos de resultado al
// Área encargada, con el motivo) y HU28 (los avisos de entrega y de rechazo a Mesa de Partes), con
// documentos firmados, anulados en la blockchain, rechazados, reemitidos y en trámite.
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
      ['lflores', 'Luz Flores Ticona', 'CONSULTA_INTERNA', null],
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
    // Como en sprint5.cjs: deja al Director listo para firmar y anular (HU29).
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
  const rosa = await nueva()
  const carlos = await nueva()
  billeteras.get(carlos).usar(B.director.clave)
  await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
  await primerIngreso(rosa, 'rquispe', TEMPORAL, PROPIA)
  await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
  const esperarHasta = async (descripcion, condicion, maximo = 120_000) => {
    const limite = Date.now() + maximo
    while (Date.now() < limite) {
      if (await condicion()) return
      await new Promise((listo) => setTimeout(listo, 1000))
    }
    throw new Error('No se cumplió a tiempo: ' + descripcion)
  }
  const contratoDirector = new Contract(
    DESPLIEGUE.contrato,
    ['function anularDocumento(string codigo)'],
    new Wallet(B.director.clave, nodo),
  )
  const sinCosto = { gasPrice: 0n, type: 0 }
  const estadoDe = (codigo) => psql(`SELECT estado FROM documento WHERE codigo = '${codigo}'`)

  let lucia, kevin, martha, nilo, lote
  await paso('Preparación · Dos áreas envían documentos y un lote; el Director firma, rechaza y anula', async () => {
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
    ;[lucia, kevin, martha, nilo] = codigos
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
        { nombres: 'Edwin', apellidos: 'Quispe Huamán', dni: '46001234' },
      ],
    })
    assert.equal(l.estado, 201)
    lote = l.cuerpo.numero
    for (const codigo of [lucia, kevin, martha])
      assert.equal((await enviar(carlos, '/api/revision/documentos/' + codigo, {})).estado, 200)
    const rechazo = await enviar(carlos, `/api/revision/documentos/${martha}/rechazo`, {
      motivo: 'La persona no laboró en la agencia en las fechas indicadas.',
    })
    assert.equal(rechazo.estado, 200)
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    for (const nombre of ['Lucía Paredes Quinto', 'Kevin Ramos Ccanto'])
      await carlos.getByRole('checkbox', { name: new RegExp('Seleccionar ' + nombre) }).check()
    await carlos.getByRole('region', { name: 'Selección para firmar' }).getByRole('button', { name: 'Firmar seleccionados' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmaron 2 documentos.').waitFor({ timeout: 60_000 })
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
    // Anulado directo en el contrato: la sincronización lo pasa a Anulado en la base (HU18).
    await (await contratoDirector.anularDocumento(kevin, sinCosto)).wait()
    await esperarHasta('Kevin pasa a Anulado', () => estadoDe(kevin) === 'ANULADO')
    assert.deepEqual(
      [lucia, kevin, martha, nilo].map(estadoDe),
      ['FIRMADO', 'ANULADO', 'RECHAZADO', 'PENDIENTE'],
    )
  })

  // ---------------------------------------------------------------- HU22: buscar documentos
  const luz = await nueva()
  await primerIngreso(luz, 'lflores', TEMPORAL, PROPIA)
  const buscador = () => luz.getByRole('searchbox')
  const tabla = () => luz.getByRole('table')
  /** Textos de la primera columna de cada fila: códigos y "Lote …". */
  const primeraColumna = async () =>
    (await tabla().locator('tbody tr td:first-child').allTextContents()).map((t) => t.replace(/[▸▾]\s*/, '').trim())
  const buscar = async (texto, esperado) => {
    await buscador().fill(texto)
    await esperarHasta(`la búsqueda de «${texto}» muestra ${esperado}`, async () => {
      if (!(await tabla().isVisible())) return false
      return JSON.stringify(await primeraColumna()) === JSON.stringify(esperado)
    }, 10_000)
  }
  const fila = (texto) => tabla().locator('tbody tr', { hasText: texto })

  await paso('HU22 · Mesa de Partes abre Buscar documentos y ve los más recientes de todas las áreas', async () => {
    assert.deepEqual(await menu(luz), ['Inicio', 'Buscar documentos'])
    await luz.getByRole('link', { name: 'Buscar documentos' }).click()
    assert.equal(await luz.getByText('Se habilita en el Sprint 6').count(), 0)
    // El lote es lo último que se envió; los certificados del lote van dentro de su fila.
    await esperarHasta('se cargan los resultados', async () => (await tabla().isVisible()))
    assert.deepEqual(await primeraColumna(), [`Lote ${lote}`, nilo, martha, kevin, lucia])
    await fila(lucia).getByText('Firmado').waitFor()
    await fila(kevin).getByText('Anulado').waitFor()
    await fila(martha).getByText('Rechazado').waitFor()
    await fila(nilo).getByText('Pendiente').waitFor()
    const loteFila = fila(`Lote ${lote}`)
    for (const dato of ['Certificado de Capacitación', '3 certificados', 'Área de Capacitación'])
      await loteFila.getByText(dato).waitFor()
    for (const dato of ['Certificado de Trabajo', 'Lucía Paredes Quinto', '45829364', 'EXP-2026-005391', 'Área de Administración'])
      await fila(lucia).getByText(dato).waitFor()
    // La columna Estado se ve completa a 1280 px, sin desplazar la tabla.
    const estado = await tabla().getByRole('columnheader', { name: 'Estado' }).boundingBox()
    const caja = await tabla().locator('xpath=..').boundingBox()
    assert.ok(estado.x + estado.width <= caja.x + caja.width, 'la columna Estado queda fuera de la vista')
    await foto(luz, 'hu22_01_mas_recientes')
  })
  await paso('HU22 · Por nombre: coincidencias parciales, sin tildes y en cualquier orden', async () => {
    // "huaman" encuentra a Nilo Huamán Soto y, dentro de su lote, a Edwin Quispe Huamán.
    await buscador().fill('huaman')
    await esperarHasta('«huaman» muestra el lote desplegado y a Nilo', async () =>
      (await primeraColumna()).length === 3 && (await luz.getByText('Edwin Quispe Huamán').isVisible()))
    const columnas = await primeraColumna()
    assert.equal(columnas[0], `Lote ${lote}`)
    assert.match(columnas[1], /^DRA-\d{4}-[A-Z2-9]{6}$/)
    assert.equal(columnas[2], nilo)
    await fila(`Lote ${lote}`).getByText('1 de 3 coinciden con la búsqueda').waitFor()
    assert.equal(await luz.getByRole('button', { name: `Lote ${lote}` }).getAttribute('aria-expanded'), 'true')
    assert.equal(await luz.getByText('Juan Ccori Pari').count(), 0)
    await foto(luz, 'hu22_02_nombre_parcial')
    await buscar('SOTO nilo', [nilo])
    await buscar('quint', [lucia])
  })
  await paso('HU22 · Por DNI, código de verificación y número de expediente, completos o parciales', async () => {
    await buscar('45829364', [lucia])
    await buscar(kevin.toLowerCase().replace(/-/g, ' '), [kevin])
    await buscar(kevin.slice(-6).toLowerCase(), [kevin])
    await fila(kevin).getByText('Anulado').waitFor()
    await buscar('005402', [nilo])
    await buscar('exp-2026-005401', [martha])
    await foto(luz, 'hu22_03_por_expediente')
  })
  await paso('HU22 · El número de lote muestra el lote plegado, que se despliega en sus certificados', async () => {
    await buscar(lote, [`Lote ${lote}`])
    const boton = luz.getByRole('button', { name: `Lote ${lote}` })
    assert.equal(await boton.getAttribute('aria-expanded'), 'false')
    assert.equal(await luz.getByText('Juan Ccori Pari').count(), 0)
    await foto(luz, 'hu22_04_lote_plegado')
    await boton.click()
    for (const nombre of ['Juan Ccori Pari', 'María Elena Rojas Soto', 'Edwin Quispe Huamán'])
      await luz.getByText(nombre).waitFor()
    assert.equal((await primeraColumna()).length, 4)
    await foto(luz, 'hu22_05_lote_desplegado')
    // Un DNI de un certificado del lote: el lote aparece desplegado, solo con ese certificado.
    await buscar('47390125', [`Lote ${lote}`, (await fila('María Elena Rojas Soto').locator('td').first().textContent()).trim()])
    await fila(`Lote ${lote}`).getByText('1 de 3 coinciden con la búsqueda').waitFor()
  })
  await paso('HU22 · Los filtros por estado se combinan con el texto', async () => {
    await buscador().fill('')
    const filtrar = async (nombre, esperado) => {
      await luz.getByRole('tab', { name: nombre }).click()
      await esperarHasta(`el filtro ${nombre} muestra ${esperado}`, async () =>
        (await tabla().isVisible()) && JSON.stringify(await primeraColumna()) === JSON.stringify(esperado), 10_000)
      assert.equal(await luz.getByRole('tab', { name: nombre }).getAttribute('aria-selected'), 'true')
    }
    await filtrar('Firmados', [lucia])
    await filtrar('Anulados', [kevin])
    await filtrar('Rechazados', [martha])
    await filtrar('En trámite', [`Lote ${lote}`, nilo])
    await foto(luz, 'hu22_06_en_tramite')
    await buscador().fill('rojas')
    await esperarHasta('«rojas» en trámite solo muestra el lote', async () =>
      JSON.stringify((await primeraColumna()).slice(0, 1)) === JSON.stringify([`Lote ${lote}`]) &&
      (await luz.getByText('María Elena Rojas Soto').isVisible()) &&
      (await luz.getByText('Martha Rojas Inga').count()) === 0, 10_000)
    await luz.getByRole('tab', { name: 'Todos' }).click()
    await esperarHasta('«rojas» en Todos suma a Martha', async () =>
      (await luz.getByText('Martha Rojas Inga').isVisible()) &&
      (await luz.getByText('María Elena Rojas Soto').isVisible()), 10_000)
    assert.deepEqual(await primeraColumna(), [`Lote ${lote}`, (await primeraColumna())[1], martha])
  })
  await paso('HU22 · Sin resultados se informa con un mensaje; con un carácter pide al menos dos', async () => {
    await buscador().fill('Nadie Conestenombre')
    await luz.getByRole('status').getByText('No se encontraron documentos con «Nadie Conestenombre». Revise lo que escribió o busque por otro dato.').waitFor()
    assert.equal(await tabla().count(), 0)
    await foto(luz, 'hu22_07_sin_resultados')
    await buscador().fill('a')
    await luz.getByRole('alert').getByText('Escriba al menos 2 caracteres.').waitFor()
    await foto(luz, 'hu22_08_un_caracter')
  })
  await paso('HU22 · Solo Consulta interna puede buscar: las otras cuentas no ven la opción y reciben 403', async () => {
    for (const p of [pedro, carlos]) {
      assert.ok(!(await menu(p)).includes('Buscar documentos'))
      assert.equal(await api(p, '/api/consulta/documentos?texto=quispe'), 403)
    }
    assert.equal(await api(luz, '/api/consulta/documentos?texto=quispe'), 200)
    const sinSesion = await (await b.newContext()).newPage()
    await sinSesion.goto(URL)
    assert.equal(await api(sinSesion, '/api/consulta/documentos?texto=quispe'), 401)
    // El servidor también rechaza un texto de un carácter.
    assert.equal(await api(luz, '/api/consulta/documentos?texto=a'), 400)
  })

  // ------------------------------------------------------ HU23: ver el estado de un documento
  /** La sesión de prueba expira tras 1 minuto sin uso: si expiró, se vuelve a ingresar. */
  const reingresar = async (p, usuario) => {
    await p.goto(URL + '#/inicio')
    await p.reload()
    const menuPrincipal = p.getByRole('navigation', { name: 'Menú principal' })
    const boton = p.getByRole('button', { name: 'Ingresar' })
    await menuPrincipal.or(boton).first().waitFor()
    if (await boton.isVisible()) {
      await ingresar(p, usuario, PROPIA)
      await menuPrincipal.waitFor()
    }
  }
  const ficha = (nombre) => luz.getByText(nombre, { exact: true }).locator('xpath=following-sibling::dd[1]')
  const explicacion = (texto) => luz.getByRole('region', { name: 'Estado del trámite' }).getByText(texto)
  await paso('HU23 · Desde un resultado se abre la ficha: el estado explicado y los datos básicos', async () => {
    await luz.getByRole('link', { name: 'Buscar documentos' }).click()
    await buscar('45829364', [lucia])
    await tabla().getByRole('link', { name: lucia }).click()
    await luz.getByRole('heading', { name: lucia }).waitFor()
    assert.ok(luz.url().endsWith(`#/buscar/${lucia}?texto=45829364`), luz.url())
    await explicacion('Firmado y registrado en la blockchain. Se puede entregar al ciudadano.').waitFor()
    assert.match(await ficha('Firmado el').textContent(), /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    for (const [etiqueta, valor] of [
      ['Beneficiario', 'Lucía Paredes Quinto'],
      ['DNI', '45829364'],
      ['Tipo', 'Certificado de Trabajo'],
      ['Origen', 'A solicitud de parte'],
      ['N.° de expediente', 'EXP-2026-005391'],
      ['Área', 'Área de Administración'],
    ])
      assert.equal(await ficha(etiqueta).textContent(), valor, etiqueta)
    // La ficha no trae datos técnicos: ni el HMAC del DNI, ni el CID, ni la transacción. Esos van
    // en la auditoría (HU24), con su propio permiso.
    const respuestaFicha = await luz.evaluate((c) => fetch('/api/consulta/documentos/' + c).then((r) => r.text()), lucia)
    for (const columna of ['dni_hmac', 'cid', 'transaccion'])
      assert.ok(!respuestaFicha.includes(psql(`SELECT ${columna} FROM documento WHERE codigo = '${lucia}'`)), columna)
    await foto(luz, 'hu23_01_firmado')
    await luz.getByRole('link', { name: '← Volver a Buscar documentos' }).click()
    await esperarHasta('vuelve con la misma búsqueda', async () =>
      (await buscador().inputValue()) === '45829364' && JSON.stringify(await primeraColumna()) === JSON.stringify([lucia]), 10_000)
  })
  await paso('HU23 · Rechazado, anulado y pendiente: cada estado con su explicación, sus fechas y su motivo', async () => {
    await luz.goto(URL + '#/buscar/' + martha)
    await explicacion('El Director rechazó el documento. Es definitivo: si corresponde, el ciudadano debe iniciar un nuevo trámite.').waitFor()
    await explicacion('Motivo del rechazo:').waitFor()
    await explicacion('La persona no laboró en la agencia en las fechas indicadas.').waitFor()
    await foto(luz, 'hu23_02_rechazado')
    await luz.goto(URL + '#/buscar/' + kevin)
    await explicacion('Fue anulado y ya no es válido.').waitFor()
    assert.match(await ficha('Anulado el').textContent(), /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    await explicacion('Motivo de la anulación:').waitFor()
    await foto(luz, 'hu23_03_anulado')
    await luz.goto(URL + '#/buscar/' + nilo)
    await explicacion('Está en revisión del Director. Todavía no se puede entregar.').waitFor()
    assert.equal(await luz.getByText('Firmado el').count(), 0)
  })
  await paso('HU23 · Un certificado de lote muestra el lote, el evento y el origen de oficio', async () => {
    const edwin = psql("SELECT codigo FROM documento WHERE dni = '46001234'")
    await luz.goto(URL + '#/buscar/' + edwin)
    await luz.getByRole('heading', { name: edwin }).waitFor()
    assert.equal(await ficha('Lote').textContent(), `Lote ${lote}`)
    assert.equal(await ficha('Evento').textContent(), 'Manejo integrado de plagas en café')
    assert.equal(await ficha('Origen').textContent(), 'De oficio')
    assert.equal(await luz.getByText('N.° de expediente').count(), 0)
    await foto(luz, 'hu23_04_certificado_de_lote')
  })
  let nuevaLucia
  await paso('HU23 · Reemisión: el original y su reemisión se enlazan entre sí', async () => {
    await reingresar(pedro, 'pmorales')
    await reingresar(carlos, 'cmendoza')
    const r = await enviar(pedro, `/api/documentos/${lucia}/reemision`, {
      nombres: 'Lucía', apellidos: 'Paredes Quintana', dni: '45829364',
      datos: { cargo: 'secretaria', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
      motivo: 'El apellido estaba mal escrito',
    })
    assert.equal(r.estado, 201)
    const nueva = r.cuerpo.codigo
    nuevaLucia = nueva
    await luz.goto(URL + '#/buscar/' + lucia)
    await explicacion('Tiene una reemisión en revisión:').waitFor()
    await foto(luz, 'hu23_05_reemision_en_revision')
    await luz.getByRole('link', { name: nueva }).click()
    await luz.getByRole('heading', { name: nueva }).waitFor()
    await explicacion('Reemplaza al documento').waitFor()
    // El Director la firma con su billetera: el original queda Anulado y reemplazado.
    await carlos.goto(URL + '#/por-revisar/' + nueva)
    await carlos.getByRole('button', { name: 'Firmar' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmó 1 documento.').waitFor({ timeout: 60_000 })
    await esperarHasta('el original pasa a Anulado', () => estadoDe(lucia) === 'ANULADO')
    await luz.goto(URL + '#/buscar/' + lucia)
    await explicacion('Fue anulado y ya no es válido.').waitFor()
    await explicacion('Fue reemplazado por el documento').waitFor()
    assert.equal(await luz.getByRole('link', { name: nueva }).getAttribute('href'), `#/buscar/${nueva}`)
    await foto(luz, 'hu23_06_reemplazado')
  })
  await paso('HU23 · Un código inexistente se informa; solo Consulta interna ve la ficha', async () => {
    await luz.goto(URL + '#/buscar/DRA-2026-NOEXST')
    await luz.getByRole('alert').getByText('No se encontró el documento DRA-2026-NOEXST.').waitFor()
    await luz.getByRole('link', { name: '← Volver a Buscar documentos' }).waitFor()
    await reingresar(pedro, 'pmorales')
    await reingresar(carlos, 'cmendoza')
    for (const p of [pedro, carlos]) assert.equal(await api(p, '/api/consulta/documentos/' + nilo), 403)
    assert.equal(await api(luz, '/api/consulta/documentos/' + nilo), 200)
  })

  // ------------------------------------------------------ HU24: historial y auditoría
  const historial = () => luz.getByRole('region', { name: 'Historial' }).getByRole('listitem')
  const tecnico = (etiqueta) => luz.getByText(etiqueta, { exact: true }).locator('xpath=following-sibling::dd[1]')
  const FECHA_Y_RESPONSABLE = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · .+/
  await paso('HU24 · El historial muestra cada evento con su fecha, hora y responsable', async () => {
    await luz.goto(URL + '#/buscar/' + kevin)
    await luz.getByRole('region', { name: 'Historial' }).waitFor()
    const eventos = await historial().all()
    const titulos = []
    for (const e of eventos) {
      titulos.push(await e.locator('p').first().textContent())
      assert.match(await e.locator('p').nth(1).textContent(), FECHA_Y_RESPONSABLE)
    }
    assert.deepEqual(titulos, [
      'Registrado y enviado a revisión',
      'Revisado por el Director',
      'Firma iniciada: PDF final guardado en IPFS',
      'Firmado y registrado en la blockchain',
      'Anulado',
    ])
    assert.match(await eventos[0].textContent(), /Pedro Morales Ccanto \(Área encargada\)/)
    assert.match(await eventos[1].textContent(), /Ing\. Carlos Mendoza Rivera \(Director\)/)
    // Lo que dice la base, evento por evento.
    assert.equal(Number(psql(`SELECT count(*) FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${kevin}'`)), eventos.length)
    await foto(luz, 'hu24_01_historial')
    // Un rechazo lleva su motivo en el historial.
    await luz.goto(URL + '#/buscar/' + martha)
    await luz.getByRole('region', { name: 'Historial' }).getByText('Rechazado por el Director').waitFor()
    await luz.getByRole('region', { name: 'Historial' }).getByText('La persona no laboró en la agencia en las fechas indicadas.', { exact: false }).waitFor()
  })
  await paso('HU24 · El detalle técnico está plegado y coincide con IPFS y con la red Besu', async () => {
    await luz.goto(URL + '#/buscar/' + kevin)
    const boton = luz.getByRole('button', { name: /Detalle técnico de auditoría/ })
    await boton.waitFor()
    assert.equal(await boton.getAttribute('aria-expanded'), 'false')
    assert.equal(await luz.getByText('Huella digital del PDF (SHA-256)').count(), 0)
    await boton.click()
    const hash = await tecnico('Huella digital del PDF (SHA-256)').textContent()
    const cid = await tecnico('Identificador en IPFS (CID)').textContent()
    const transaccion = await tecnico('Transacción de la firma').textContent()
    const anulacion = await tecnico('Transacción de la anulación').textContent()
    // El PDF guardado en IPFS tiene ese hash, y es el registrado en el contrato.
    const pdf = Buffer.from(await (await fetch(`http://127.0.0.1:8082/ipfs/${cid}`)).arrayBuffer())
    assert.equal(require('node:crypto').createHash('sha256').update(pdf).digest('hex'), hash.replace(/^0x/, ''))
    const [, registrado] = await registro.consultar(kevin)
    assert.equal(registrado.hashPdf.replace(/^0x/, ''), hash.replace(/^0x/, ''))
    // Las transacciones existen en la red, en los bloques indicados.
    const recibo = await nodo.getTransactionReceipt(transaccion)
    assert.equal(recibo.status, 1)
    assert.equal(String(recibo.blockNumber), await tecnico('Bloque de la firma').textContent())
    assert.equal(getAddress(recibo.from), getAddress(await tecnico('Billetera firmante').textContent()))
    const reciboAnulacion = await nodo.getTransactionReceipt(anulacion)
    assert.equal(String(reciboAnulacion.blockNumber), await tecnico('Bloque de la anulación').textContent())
    assert.equal(getAddress(await tecnico('Contrato RegistroDocumentos').textContent()), getAddress(DESPLIEGUE.contrato))
    await luz.getByRole('button', { name: 'Copiar Transacción de la firma' }).waitFor()
    await foto(luz, 'hu24_02_detalle_tecnico')
    await boton.click()
    assert.equal(await luz.getByText('Huella digital del PDF (SHA-256)').count(), 0)
  })
  await paso('HU24 · Un pendiente todavía no tiene registro en la blockchain; solo Consulta interna ve la auditoría', async () => {
    await luz.goto(URL + '#/buscar/' + nilo)
    await luz.getByRole('button', { name: /Detalle técnico de auditoría/ }).click()
    await luz.getByText('Todavía no tiene registro en la blockchain.').waitFor()
    await foto(luz, 'hu24_03_sin_registro')
    await reingresar(pedro, 'pmorales')
    await reingresar(carlos, 'cmendoza')
    for (const p of [pedro, carlos]) assert.equal(await api(p, `/api/consulta/documentos/${nilo}/auditoria`), 403)
    assert.equal(await api(luz, `/api/consulta/documentos/${nilo}/auditoria`), 200)
  })

  // ------------------------------------------------------ HU25: descargar o imprimir
  const entrega = () => luz.getByRole('region', { name: 'Entrega del documento' })
  const sha256 = (contenido) => require('node:crypto').createHash('sha256').update(contenido).digest('hex')
  const entregasDe = (codigo) =>
    Number(psql(`SELECT count(*) FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${codigo}' AND h.evento IN ('IMPRESO', 'DESCARGADO')`))
  let transaccionesDelDirector
  await paso('HU25 · El filtro Listos para entregar y la ficha muestran lo que falta entregar', async () => {
    transaccionesDelDirector = await nodo.getTransactionCount(B.director.direccion)
    await luz.goto(URL + '#/buscar')
    await luz.reload()
    await luz.getByRole('tab', { name: 'Listos para entregar' }).click()
    // El único firmado que queda es la reemisión de Lucía: el original y Kevin están anulados.
    await esperarHasta('el filtro muestra la reemisión', async () =>
      (await tabla().isVisible()) && JSON.stringify(await primeraColumna()) === JSON.stringify([nuevaLucia]), 10_000)
    await foto(luz, 'hu25_01_listos_para_entregar')
    await tabla().getByRole('link', { name: nuevaLucia }).click()
    await entrega().getByText('Listo para entregar').waitFor()
    for (const nombre of ['Descargar PDF', 'Imprimir']) await entrega().getByRole('button', { name: nombre }).waitFor()
    assert.equal(await entrega().getByRole('link', { name: 'Ver documento' }).getAttribute('href'), `/api/consulta/documentos/${nuevaLucia}/pdf`)
    await foto(luz, 'hu25_02_listo_para_entregar')
  })
  await paso('HU25 · Ver documento muestra el PDF registrado en la blockchain, sin anotarlo', async () => {
    const [pestana] = await Promise.all([
      luz.context().waitForEvent('page'),
      entrega().getByRole('link', { name: 'Ver documento' }).click(),
    ])
    // Se abre en otra pestaña. El Chromium sin interfaz de la prueba no muestra PDF (lo descarga),
    // así que lo que muestra se comprueba con la misma dirección: un PDF para ver (inline).
    assert.ok(pestana)
    const visto = await luz.evaluate(async (c) => {
      const r = await fetch(`/api/consulta/documentos/${c}/pdf`)
      return {
        estado: r.status,
        tipo: r.headers.get('content-type'),
        disposicion: r.headers.get('content-disposition'),
        bytes: Array.from(new Uint8Array(await r.arrayBuffer())),
      }
    }, nuevaLucia)
    assert.equal(visto.estado, 200)
    assert.equal(visto.tipo, 'application/pdf')
    assert.equal(visto.disposicion, `inline; filename="${nuevaLucia}.pdf"`)
    const [, registrado] = await registro.consultar(nuevaLucia)
    assert.equal('0x' + sha256(Buffer.from(visto.bytes)), registrado.hashPdf)
    await pestana.close()
    assert.equal(entregasDe(nuevaLucia), 0)
  })
  await paso('HU25 · Descargar guarda el PDF firmado con su código y queda en el historial', async () => {
    const [descarga] = await Promise.all([
      luz.waitForEvent('download'),
      entrega().getByRole('button', { name: 'Descargar PDF' }).click(),
    ])
    assert.equal(descarga.suggestedFilename(), `${nuevaLucia}.pdf`)
    const archivo = `${out}/hu25_descargado.pdf`
    await descarga.saveAs(archivo)
    const [, registrado] = await registro.consultar(nuevaLucia)
    assert.equal('0x' + sha256(fs.readFileSync(archivo)), registrado.hashPdf)
    fs.rmSync(archivo)
    await entrega().getByText('Entregado: impreso 0 veces, descargado 1 vez').waitFor()
    await luz.getByRole('region', { name: 'Historial' }).getByText('PDF descargado por Luz Flores Ticona (Consulta interna)').waitFor()
  })
  await paso('HU25 · Imprimir y reimprimir: la segunda impresión queda como duplicado, sin una nueva firma', async () => {
    await entrega().getByRole('button', { name: 'Imprimir', exact: true }).click()
    await entrega().getByText('Entregado: impreso 1 vez, descargado 1 vez').waitFor()
    // El PDF se carga en un marco oculto para el diálogo de impresión del navegador.
    await luz.locator('iframe[title="Documento para imprimir"]').first().waitFor({ state: 'attached' })
    await entrega().getByRole('button', { name: 'Imprimir duplicado' }).click()
    await entrega().getByText('Entregado: impreso 2 veces, descargado 1 vez').waitFor()
    const historialDeLuz = luz.getByRole('region', { name: 'Historial' })
    await historialDeLuz.getByText('Impreso por Luz Flores Ticona (Consulta interna)', { exact: true }).waitFor()
    await historialDeLuz.getByText('Duplicado impreso por Luz Flores Ticona (Consulta interna). Impresión n.° 2').waitFor()
    assert.deepEqual(
      psql(`SELECT h.evento FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${nuevaLucia}' AND h.evento IN ('IMPRESO', 'DESCARGADO') ORDER BY h.id`).split('\n'),
      ['DESCARGADO', 'IMPRESO', 'IMPRESO'],
    )
    // Ninguna transacción nueva del Director: no se volvió a firmar.
    assert.equal(await nodo.getTransactionCount(B.director.direccion), transaccionesDelDirector)
    assert.equal(estadoDe(nuevaLucia), 'FIRMADO')
    await foto(luz, 'hu25_03_impreso_y_duplicado')
    // Ya no está entre los listos para entregar.
    await luz.getByRole('link', { name: '← Volver a Buscar documentos' }).click()
    await luz.getByRole('tab', { name: 'Listos para entregar' }).click()
    await luz.getByRole('status').getByText('No hay documentos con este estado.').waitFor()
  })
  await paso('HU25 · Un anulado no se entrega; solo Consulta interna descarga o imprime', async () => {
    await luz.goto(URL + '#/buscar/' + kevin)
    await explicacion('Fue anulado y ya no es válido.').waitFor()
    assert.equal(await luz.getByRole('region', { name: 'Entrega del documento' }).count(), 0)
    const r = await enviar(luz, `/api/consulta/documentos/${kevin}/entregas`, { forma: 'IMPRESION' })
    assert.equal(r.estado, 409)
    assert.equal(r.cuerpo.mensaje, 'El documento está anulado: no se puede entregar.')
    assert.equal(entregasDe(kevin), 0)
    await reingresar(pedro, 'pmorales')
    await reingresar(carlos, 'cmendoza')
    for (const p of [pedro, carlos]) {
      assert.equal(await api(p, `/api/consulta/documentos/${nuevaLucia}/pdf`), 403)
      assert.equal((await enviar(p, `/api/consulta/documentos/${nuevaLucia}/entregas`, { forma: 'DESCARGA' })).estado, 403)
    }
    assert.equal(entregasDe(nuevaLucia), 3)
  })

  // ------------------------------------------------------ HU26: aviso al Director
  const campanaDe = (p) => p.getByRole('banner').getByRole('button', { name: /^Avisos/ })
  const panelDe = (p) => p.getByRole('region', { name: 'Avisos' })
  const sinLeerDe = async (p) => Number((await campanaDe(p).getAttribute('aria-label')).match(/(\d+) sin leer/)?.[1] ?? 0)
  await paso('HU26 · El Director tiene un aviso por cada documento y lote pendiente, con su cantidad sin leer', async () => {
    await reingresar(carlos, 'cmendoza')
    await campanaDe(carlos).waitFor()
    // Desde la preparación: 4 documentos, 1 lote y la reemisión de Lucía (HU23). Un aviso por lote.
    await esperarHasta('la campana muestra 6 sin leer', async () => (await sinLeerDe(carlos)) === 6, 10_000)
    await campanaDe(carlos).click()
    const textos = await panelDe(carlos).getByRole('link').allTextContents()
    assert.equal(textos.length, 6)
    assert.ok(textos[0].startsWith(`Reemisión pendiente: Certificado de Trabajo – Lucía Paredes Quintana (reemplaza a ${lucia})`), textos[0])
    assert.ok(textos[1].startsWith('Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)'), textos[1])
    assert.ok(textos[5].startsWith('Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto'), textos[5])
    for (const texto of textos) assert.match(texto, /hace (un momento|\d+ min)$/)
    assert.equal(Number(psql("SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario = 'cmendoza'")), 6)
    await foto(carlos, 'hu26_01_avisos_del_director')
    await carlos.keyboard.press('Escape')
  })
  let nuevo
  await paso('HU26 · Un documento nuevo avisa al Director, y el aviso abre el documento y queda leído', async () => {
    await reingresar(pedro, 'pmorales')
    const r = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005500', 'Rosa', 'Vílchez Arana', '44200099'))
    assert.equal(r.estado, 201)
    nuevo = r.cuerpo.codigo
    // Al cambiar de pantalla, la campana vuelve a consultar.
    await carlos.getByRole('link', { name: 'Por revisar' }).click()
    await esperarHasta('la campana muestra 7 sin leer', async () => (await sinLeerDe(carlos)) === 7, 10_000)
    await campanaDe(carlos).click()
    const aviso = panelDe(carlos).getByRole('link').first()
    assert.ok((await aviso.textContent()).startsWith('Nuevo documento pendiente: Certificado de Trabajo – Rosa Vílchez Arana'))
    await aviso.click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    assert.ok(carlos.url().endsWith('#/por-revisar/' + nuevo), carlos.url())
    await esperarHasta('queda leído', async () => (await sinLeerDe(carlos)) === 6, 10_000)
    assert.equal(psql(`SELECT leido_en IS NOT NULL FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario = 'cmendoza' AND a.enlace = 'por-revisar/${nuevo}'`), 't')
    await foto(carlos, 'hu26_02_aviso_abre_el_documento')
  })
  await paso('HU26 · El aviso de un lote abre el lote; Marcar todos como leídos deja la campana sin cantidad', async () => {
    await campanaDe(carlos).click()
    await panelDe(carlos).getByRole('link', { name: /Nuevo lote pendiente: Lote 2026-001/ }).click()
    await carlos.getByRole('heading', { name: 'Revisión de lote – Lote 2026-001' }).waitFor()
    await esperarHasta('quedan 5 sin leer', async () => (await sinLeerDe(carlos)) === 5, 10_000)
    await campanaDe(carlos).click()
    await panelDe(carlos).getByRole('button', { name: 'Marcar todos como leídos' }).click()
    await esperarHasta('la campana queda sin cantidad', async () => (await campanaDe(carlos).getAttribute('aria-label')) === 'Avisos', 10_000)
    await foto(carlos, 'hu26_03_todos_leidos')
    await carlos.keyboard.press('Escape')
    // Los avisos son de cada persona: el área que envió no recibió avisos de revisión.
    assert.equal(Number(psql("SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario IN ('pmorales', 'rquispe') AND a.tipo = 'PENDIENTE_REVISION'")), 0)
    // Otra persona no puede marcar un aviso del Director.
    const id = psql("SELECT a.id FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario = 'cmendoza' LIMIT 1")
    assert.equal((await enviar(luz, `/api/avisos/${id}/lectura`, {})).estado, 404)
  })

  // ------------------------------------------------------ HU27: avisos al Área encargada
  await paso('HU27 · El área recibe un aviso por cada firmado, rechazado y anulado, con el motivo', async () => {
    await reingresar(pedro, 'pmorales')
    await campanaDe(pedro).waitFor()
    // Firmados Lucía y Kevin; rechazada Martha; Kevin anulado en la blockchain; la reemisión de
    // Lucía firmada (HU23), que anuló al original.
    await esperarHasta('la campana del área muestra 6 sin leer', async () => (await sinLeerDe(pedro)) === 6, 10_000)
    await campanaDe(pedro).click()
    const textos = (await panelDe(pedro).getByRole('link').allTextContents()).map((x) => x.replace(/(hace .*|ayer|\d{2}\/\d{2}\/\d{4})$/, ''))
    assert.deepEqual([...textos].sort(), [
      `Anulado: Certificado de Trabajo – Kevin Ramos Ccanto. Motivo: Anulado en la blockchain; el motivo no llegó a registrarse en la plataforma.`,
      `Anulado: Certificado de Trabajo – Lucía Paredes Quinto. Motivo: Reemplazado por ${nuevaLucia}. Motivo de la reemisión: El apellido estaba mal escrito`,
      'Firmado: Certificado de Trabajo – Kevin Ramos Ccanto',
      'Firmado: Certificado de Trabajo – Lucía Paredes Quintana',
      'Firmado: Certificado de Trabajo – Lucía Paredes Quinto',
      'Rechazado: Certificado de Trabajo – Martha Rojas Inga. Motivo: La persona no laboró en la agencia en las fechas indicadas.',
    ])
    await foto(pedro, 'hu27_01_avisos_del_area')
    await panelDe(pedro).getByRole('link', { name: /Rechazado: Certificado de Trabajo – Martha Rojas Inga/ }).click()
    await pedro.getByRole('heading', { name: 'Certificado de Trabajo' }).waitFor()
    assert.ok(pedro.url().endsWith('#/mis-documentos/' + martha), pedro.url())
    await pedro.getByText('La persona no laboró en la agencia en las fechas indicadas.').waitFor()
    await esperarHasta('queda leído', async () => (await sinLeerDe(pedro)) === 5, 10_000)
    await foto(pedro, 'hu27_02_aviso_abre_el_documento')
    // Los avisos del área (abren Mis documentos) no llegan al Director, a Mesa de Partes ni a la otra
    // área. Mesa de Partes recibe los suyos (HU28), que abren Buscar documentos.
    assert.equal(Number(psql("SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario IN ('cmendoza', 'lflores', 'rquispe') AND a.enlace LIKE 'mis-documentos/%'")), 0)
  })
  await paso('HU27 · Una observación de certificados de un lote es un solo aviso, que abre el lote', async () => {
    await reingresar(carlos, 'cmendoza')
    const certificados = psql("SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '2026-001' ORDER BY d.id").split('\n')
    const r = await enviar(carlos, '/api/revision/lotes/2026-001/observacion', {
      codigos: certificados.slice(0, 2),
      motivo: 'Falta el segundo apellido.',
    })
    assert.equal(r.estado, 200)
    await reingresar(rosa, 'rquispe')
    await esperarHasta('la campana de Capacitación muestra 1 sin leer', async () => (await sinLeerDe(rosa)) === 1, 10_000)
    await campanaDe(rosa).click()
    const aviso = panelDe(rosa).getByRole('link')
    assert.equal(await aviso.count(), 1)
    assert.ok((await aviso.textContent()).startsWith('Lote 2026-001 – Manejo integrado de plagas en café: 2 certificados observados. Motivo: Falta el segundo apellido.'))
    await foto(rosa, 'hu27_03_aviso_de_lote')
    await aviso.click()
    await rosa.getByRole('heading', { name: 'Lote 2026-001' }).waitFor()
    assert.ok(rosa.url().endsWith('#/mis-documentos/lote/2026-001'), rosa.url())
    // El área de Administración no recibe los avisos de Capacitación.
    assert.equal(Number(psql("SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario = 'pmorales' AND a.enlace LIKE '%lote/2026-001'")), 0)
  })

  // ------------------------------------------------------ HU28: avisos a Mesa de Partes
  await paso('HU28 · Mesa de Partes recibe "Listo para entregar" por cada firmado y el rechazo con expediente y motivo', async () => {
    await reingresar(luz, 'lflores')
    await campanaDe(luz).waitFor()
    // Firmados Lucía, Kevin y la reemisión de Lucía; rechazada Martha. Ni las observaciones ni las
    // anulaciones se avisan a Mesa de Partes.
    await esperarHasta('la campana de Mesa de Partes muestra 4 sin leer', async () => (await sinLeerDe(luz)) === 4, 10_000)
    await campanaDe(luz).click()
    const textos = (await panelDe(luz).getByRole('link').allTextContents()).map((x) => x.replace(/(hace .*|ayer|\d{2}\/\d{2}\/\d{4})$/, ''))
    assert.deepEqual([...textos].sort(), [
      'Listo para entregar: Certificado de Trabajo – Kevin Ramos Ccanto (expediente EXP-2026-005392)',
      'Listo para entregar: Certificado de Trabajo – Lucía Paredes Quintana (expediente EXP-2026-005391)',
      'Listo para entregar: Certificado de Trabajo – Lucía Paredes Quinto (expediente EXP-2026-005391)',
      'Rechazado: Certificado de Trabajo – Martha Rojas Inga (expediente EXP-2026-005401). Motivo: La persona no laboró en la agencia en las fechas indicadas.',
    ])
    await foto(luz, 'hu28_01_avisos_de_mesa_de_partes')
    // El aviso de la reemisión abre su ficha, lista para imprimir.
    await panelDe(luz).getByRole('link', { name: /Listo para entregar: Certificado de Trabajo – Lucía Paredes Quintana/ }).click()
    await luz.getByRole('heading', { name: nuevaLucia }).waitFor()
    assert.ok(luz.url().endsWith('#/buscar/' + nuevaLucia), luz.url())
    await entrega().getByRole('button', { name: /Imprimir/ }).waitFor()
    await esperarHasta('queda leído', async () => (await sinLeerDe(luz)) === 3, 10_000)
    await foto(luz, 'hu28_02_aviso_abre_la_ficha')
    // Solo Mesa de Partes: el área y el Director no reciben estos avisos.
    assert.equal(Number(psql("SELECT count(*) FROM aviso a JOIN usuario u ON u.id = a.destinatario_id WHERE u.nombre_usuario IN ('pmorales', 'rquispe', 'cmendoza') AND a.tipo = 'LISTO_PARA_ENTREGAR'")), 0)
  })
  await paso('HU28 · La firma de certificados de un lote es un solo aviso, que abre la búsqueda del lote', async () => {
    await reingresar(carlos, 'cmendoza')
    // El tercer certificado del lote sigue pendiente (los otros dos se observaron en HU27).
    const tercero = psql("SELECT d.codigo FROM documento d JOIN lote l ON l.id = d.lote_id WHERE l.numero = '2026-001' AND d.estado = 'PENDIENTE'")
    assert.equal((await enviar(carlos, '/api/revision/lotes/2026-001', {})).estado, 200)
    await carlos.goto(URL + '#/por-revisar/lote/2026-001')
    await carlos.reload()
    await carlos.getByRole('heading', { name: 'Revisión de lote – Lote 2026-001' }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar lote' }).click()
    const firma = carlos.getByRole('dialog')
    await firma.getByText('Firmar 1 certificado').waitFor()
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText(/Se firmó 1 certificado/).waitFor({ timeout: 60_000 })
    assert.equal(estadoDe(tercero), 'FIRMADO')
    await luz.getByRole('link', { name: 'Buscar documentos' }).click()
    await esperarHasta('llega el aviso del lote', async () => (await sinLeerDe(luz)) === 4, 10_000)
    await campanaDe(luz).click()
    const aviso = panelDe(luz).getByRole('link').first()
    assert.ok((await aviso.textContent()).startsWith('Listo para entregar: Lote 2026-001 – Manejo integrado de plagas en café: 1 certificado firmado'))
    await foto(luz, 'hu28_03_aviso_de_lote')
    await aviso.click()
    await esperarHasta('se busca el lote', async () => (await buscador().inputValue()) === '2026-001', 10_000)
    await fila('Lote 2026-001').waitFor()
  })

  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message || String(e))
  console.error(e.stack)
  process.exit(1)
})
