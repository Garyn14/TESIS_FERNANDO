// Prueba de punta a punta real del Sprint 4: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). El Área encargada envía sus
// documentos por la API desde el navegador (la pantalla ya la recorre sprint2.cjs) y el Director
// trabaja desde la pantalla, con la billetera de prueba en la red Besu local. Recorre HU13, HU14,
// HU15, HU29 (anular un documento firmado, también desde la sincronización con la blockchain) y
// HU30 (reemitir un documento firmado: al firmarse, el original se anula en la misma transacción).
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
  let lucia, kevin
  await paso('Preparación · El área envía dos documentos y el Director los revisa', async () => {
    await primerIngreso(pedro, 'pmorales', TEMPORAL, PROPIA)
    await primerIngreso(carlos, 'cmendoza', TEMPORAL, PROPIA)
    const a = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005391', 'Lucía', 'Paredes Quinto', '45829364'))
    const k = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005392', 'Kevin', 'Ramos Ccanto', '46385127'))
    assert.equal(a.estado, 201)
    assert.equal(k.estado, 201)
    lucia = a.cuerpo.codigo
    kevin = k.cuerpo.codigo
  })

  // ------------------------------------------------------------- HU13: observar un documento
  const MOTIVO = 'El cargo no coincide con el contrato de trabajo'
  const ventana = () => carlos.getByRole('dialog', { name: 'Observar documento' })
  await paso('HU13 · La revisión de un documento tiene el botón Observar, que pide un motivo obligatorio', async () => {
    await carlos.getByRole('link', { name: 'Por revisar' }).click()
    await carlos.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' }).getByRole('link').click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar' }).waitFor()
    await carlos.getByRole('button', { name: 'Observar' }).click()
    const confirmar = ventana().getByRole('button', { name: 'Confirmar' })
    assert.ok(await confirmar.isDisabled())
    assert.equal(await ventana().getByLabel('Motivo').getAttribute('placeholder'), 'Explique qué debe corregirse')
    assert.equal(await ventana().getByText('El rechazo es definitivo', { exact: false }).count(), 0)
    await ventana().getByLabel('Motivo').fill('   ')
    assert.ok(await confirmar.isDisabled())
    await ventana().getByLabel('Motivo').fill(MOTIVO)
    assert.ok(await confirmar.isEnabled())
    await foto(carlos, 'hu13_01_ventana_observar_documento')
  })
  await paso('HU13 · Al confirmar, el documento queda Observado con su motivo y su historial', async () => {
    await ventana().getByRole('button', { name: 'Confirmar' }).click()
    await carlos.getByRole('status').getByText('El documento fue observado y volvió al área.').waitFor()
    await carlos.getByText(MOTIVO).waitFor()
    assert.equal(await carlos.getByRole('button', { name: 'Firmar' }).count(), 0)
    assert.equal(await carlos.getByRole('button', { name: 'Observar' }).count(), 0)
    await foto(carlos, 'hu13_02_documento_observado')
    assert.equal(psql(`SELECT estado, motivo FROM documento WHERE codigo = '${lucia}'`), `OBSERVADO|${MOTIVO}`)
    assert.equal(
      psql(`SELECT h.evento, h.detalle, u.nombre_usuario FROM documento_historial h JOIN documento d ON d.id = h.documento_id JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = '${lucia}' ORDER BY h.id DESC LIMIT 1`),
      `OBSERVADO|Observado por Ing. Carlos Mendoza Rivera: ${MOTIVO}|cmendoza`,
    )
    assert.equal(psql(`SELECT count(*) FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${lucia}' AND h.realizado_en IS NOT NULL`), '3')
  })
  await paso('HU13 · El documento sale de Por revisar; el otro sigue', async () => {
    await carlos.getByRole('link', { name: 'Volver a Por revisar', exact: true }).click()
    await carlos.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' }).waitFor()
    assert.equal(await carlos.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' }).count(), 0)
    await foto(carlos, 'hu13_03_bandeja_sin_el_observado')
  })
  await paso('HU13 · El Área encargada lo ve Observado, con el motivo en su detalle', async () => {
    await pedro.getByRole('link', { name: 'Mis documentos' }).click()
    const fila = pedro.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' })
    await fila.getByText('Observado').waitFor()
    await pedro.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' }).getByText('Pendiente').waitFor()
    await foto(pedro, 'hu13_04_mis_documentos_observado')
    await fila.getByRole('link').click()
    await pedro.getByText('El Director lo observó y lo devolvió al área para que lo corrija.').waitFor()
    await pedro.getByText(MOTIVO).waitFor()
    await foto(pedro, 'hu13_05_detalle_con_motivo')
  })
  await paso('HU13 · El motivo es obligatorio, solo se observa un Pendiente y solo el Director observa', async () => {
    const vacio = await enviar(carlos, `/api/revision/documentos/${kevin}/observacion`, { motivo: '  ' })
    assert.equal(vacio.estado, 400)
    assert.equal(vacio.cuerpo.campos.motivo, 'Indique el motivo.')
    const otraVez = await enviar(carlos, `/api/revision/documentos/${lucia}/observacion`, { motivo: 'Otra' })
    assert.equal(otraVez.estado, 404)
    assert.equal(otraVez.cuerpo.mensaje, 'Este documento no está pendiente de revisión.')
    assert.equal((await enviar(pedro, `/api/revision/documentos/${kevin}/observacion`, { motivo: 'x' })).estado, 403)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${kevin}'`), 'PENDIENTE')
  })

  // ------------------------------------------------------------- HU14: rechazar un documento
  const RECHAZO = 'El solicitante no trabajó en la agencia en ese periodo'
  const ventanaRechazo = () => carlos.getByRole('dialog', { name: 'Rechazar documento' })
  await paso('HU14 · "Rechazar" abre la ventana de motivo con el aviso de que es definitivo', async () => {
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    await carlos.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' }).getByRole('link').click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('button', { name: 'Observar' }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar' }).waitFor()
    await carlos.getByRole('button', { name: 'Rechazar' }).click()
    await ventanaRechazo().getByText('El rechazo es definitivo. El documento no podrá reenviarse.').waitFor()
    const confirmar = ventanaRechazo().getByRole('button', { name: 'Confirmar' })
    assert.ok(await confirmar.isDisabled())
    await ventanaRechazo().getByLabel('Motivo').fill(RECHAZO)
    assert.ok(await confirmar.isEnabled())
    await foto(carlos, 'hu14_01_ventana_rechazar_documento')
  })
  await paso('HU14 · Al confirmar, el documento queda Rechazado con su motivo y su historial', async () => {
    await ventanaRechazo().getByRole('button', { name: 'Confirmar' }).click()
    await carlos.getByRole('status').getByText('El documento fue rechazado.').waitFor()
    await carlos.getByText(RECHAZO).waitFor()
    for (const accion of ['Rechazar', 'Observar', 'Firmar'])
      assert.equal(await carlos.getByRole('button', { name: accion }).count(), 0)
    await foto(carlos, 'hu14_02_documento_rechazado')
    assert.equal(psql(`SELECT estado, motivo FROM documento WHERE codigo = '${kevin}'`), `RECHAZADO|${RECHAZO}`)
    assert.equal(
      psql(`SELECT h.evento, h.detalle, u.nombre_usuario FROM documento_historial h JOIN documento d ON d.id = h.documento_id JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = '${kevin}' ORDER BY h.id DESC LIMIT 1`),
      `RECHAZADO|Rechazado por Ing. Carlos Mendoza Rivera: ${RECHAZO}|cmendoza`,
    )
  })
  await paso('HU14 · El rechazo es definitivo: no se revisa, observa ni rechaza de nuevo', async () => {
    for (const [ruta, cuerpo] of [
      [`/api/revision/documentos/${kevin}/rechazo`, { motivo: 'Otra vez' }],
      [`/api/revision/documentos/${kevin}/observacion`, { motivo: 'Corregir' }],
      [`/api/revision/documentos/${kevin}`, {}],
    ])
      assert.equal((await enviar(carlos, ruta, cuerpo)).estado, 404, ruta)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${kevin}'`), 'RECHAZADO')
    await carlos.getByRole('link', { name: 'Volver a Por revisar', exact: true }).click()
    await carlos.getByText('¡Todo al día!').waitFor()
    await foto(carlos, 'hu14_03_bandeja_al_dia')
  })
  await paso('HU14 · El Área encargada lo ve Rechazado, con el motivo y el aviso de que es definitivo', async () => {
    await pedro.goto(URL + '#/mis-documentos')
    await pedro.reload()
    const fila = pedro.locator('main tbody tr', { hasText: 'Kevin Ramos Ccanto' })
    await fila.getByText('Rechazado').waitFor()
    await pedro.locator('main tbody tr', { hasText: 'Lucía Paredes Quinto' }).getByText('Observado').waitFor()
    await foto(pedro, 'hu14_04_mis_documentos_rechazado')
    await fila.getByRole('link').click()
    await pedro.getByText('El Director lo rechazó. El rechazo es definitivo.').waitFor()
    await pedro.getByText(RECHAZO).waitFor()
    await foto(pedro, 'hu14_05_detalle_rechazado')
  })
  await paso('HU14 · El motivo es obligatorio y solo el Director rechaza', async () => {
    const r = await enviar(pedro, '/api/documentos', trabajo('EXP-2026-005393', 'Iris', 'Pari Quispe', '44100003'))
    assert.equal(r.estado, 201)
    const iris = r.cuerpo.codigo
    const vacio = await enviar(carlos, `/api/revision/documentos/${iris}/rechazo`, { motivo: '' })
    assert.equal(vacio.estado, 400)
    assert.equal(vacio.cuerpo.campos.motivo, 'Indique el motivo.')
    assert.equal((await enviar(pedro, `/api/revision/documentos/${iris}/rechazo`, { motivo: 'x' })).estado, 403)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${iris}'`), 'PENDIENTE')
  })

  // ------------------------------------------------- HU15: corregir y reenviar un observado
  await paso('HU15 · El área corrige el documento observado con el formulario precargado y el motivo a la vista', async () => {
    await pedro.goto(URL + '#/mis-documentos/' + lucia)
    await pedro.getByRole('link', { name: 'Corregir y reenviar' }).click()
    await pedro.getByRole('heading', { name: 'Corregir y reenviar – Certificado de Trabajo' }).waitFor()
    await pedro.getByText(MOTIVO).waitFor()
    const campoDe = (etiqueta) => pedro.getByLabel(etiqueta, { exact: false })
    assert.equal(await campoDe('N.° de expediente').inputValue(), 'EXP-2026-005391')
    assert.equal(await campoDe('Apellidos').inputValue(), 'Paredes Quinto')
    assert.equal(await campoDe('Cargo').inputValue(), 'asistente administrativa')
    assert.equal(await campoDe('Fecha de inicio').inputValue(), '02/01/2025')
    await campoDe('Cargo').fill('secretaria')
    await campoDe('Apellidos').fill('Paredes Quintana')
    await foto(pedro, 'hu15_01_correccion_precargada')
    await pedro.getByRole('button', { name: 'Continuar a vista previa' }).click()
    await pedro.getByRole('figure').getByText('como secretaria', { exact: false }).waitFor()
    await pedro.getByRole('button', { name: 'Reenviar a revisión' }).click()
    await pedro.getByRole('dialog', { name: '¿Reenviar a revisión?' }).getByRole('button', { name: 'Reenviar' }).click()
    await pedro.getByText('✓ Documento corregido y reenviado a revisión').waitFor()
    await foto(pedro, 'hu15_02_reenviado')
  })
  await paso('HU15 · Vuelve a Pendiente con su mismo código, sin la revisión anterior y con los cambios en el historial', async () => {
    assert.equal(
      psql(`SELECT estado, motivo IS NULL, revisado_en IS NULL, corregido_en IS NOT NULL, apellidos FROM documento WHERE codigo = '${lucia}'`),
      'PENDIENTE|t|t|t|Paredes Quintana',
    )
    const [evento, detalle, quien] = psql(
      `SELECT h.evento, h.detalle, u.nombre_usuario FROM documento_historial h JOIN documento d ON d.id = h.documento_id JOIN usuario u ON u.id = h.realizado_por WHERE d.codigo = '${lucia}' ORDER BY h.id DESC LIMIT 1`,
    ).split('|')
    assert.equal(evento, 'CORREGIDO')
    assert.equal(quien, 'pmorales')
    for (const parte of [
      'Corregido y reenviado a revisión por Pedro Morales Ccanto (Área de Administración).',
      'Apellidos: Paredes Quinto → Paredes Quintana',
      'Cargo: asistente administrativa → secretaria',
    ])
      assert.ok(detalle.includes(parte), detalle)
    // La observación sigue en el historial.
    assert.ok(psql(`SELECT string_agg(h.evento, ',' ORDER BY h.id) FROM documento_historial h JOIN documento d ON d.id = h.documento_id WHERE d.codigo = '${lucia}'`).includes('OBSERVADO,CORREGIDO'))
  })
  await paso('HU15 · En Por revisar aparece como "Corregido" y sin revisar; el Director lo revisa de nuevo', async () => {
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    const fila = carlos.locator('main tbody tr', { hasText: 'Lucía Paredes Quintana' })
    await fila.getByText('Corregido').waitFor()
    await fila.getByText('Sin revisar').waitFor()
    await foto(carlos, 'hu15_03_bandeja_corregido')
    await fila.getByRole('link').click()
    await carlos.getByRole('heading', { name: 'Revisión – Certificado de Trabajo' }).waitFor()
    await carlos.getByRole('figure').getByText('como secretaria', { exact: false }).waitFor()
    await carlos.getByRole('button', { name: 'Firmar' }).waitFor()
    assert.equal(psql(`SELECT revisado_en IS NOT NULL FROM documento WHERE codigo = '${lucia}'`), 't')
  })
  const rosa = await nueva()
  let gladys, juanDni
  await paso('HU15 · En un lote, el certificado observado se corrige desde su fila, sin repetir un DNI del lote', async () => {
    await primerIngreso(rosa, 'rquispe', TEMPORAL, PROPIA)
    juanDni = '45218736'
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
        { nombres: 'Juan', apellidos: 'Ccori Pari', dni: juanDni },
        { nombres: 'Gladys', apellidos: 'Sanchez Naupari', dni: '45903318' },
        { nombres: 'Nelly', apellidos: 'Mayta Huarcaya', dni: '48132760' },
      ],
    })
    assert.equal(l.estado, 201)
    const numero = l.cuerpo.numero
    const revisado = await enviar(carlos, `/api/revision/lotes/${numero}`, {})
    gladys = revisado.cuerpo.documentos.find((d) => d.nombres === 'Gladys').codigo
    const obs = await enviar(carlos, `/api/revision/lotes/${numero}/observacion`, { codigos: [gladys], motivo: 'El apellido no coincide con el DNI' })
    assert.equal(obs.estado, 200)

    await rosa.goto(URL + '#/mis-documentos/lote/' + numero)
    await rosa.getByRole('heading', { name: `Lote ${numero}` }).waitFor()
    await rosa.locator('main tbody tr', { hasText: 'Gladys' }).getByRole('button', { name: 'Corregir' }).click()
    const ventana = rosa.getByRole('dialog', { name: 'Corregir certificado' })
    await ventana.getByText('El apellido no coincide con el DNI').waitFor()
    await ventana.getByLabel('DNI', { exact: false }).fill(juanDni)
    await ventana.getByRole('button', { name: 'Reenviar a revisión' }).click()
    await ventana.getByText('El DNI ya está en otro certificado de este lote.').waitFor()
    await ventana.getByLabel('DNI', { exact: false }).fill('45903318')
    await ventana.getByLabel('Apellidos', { exact: false }).fill('Sánchez Ñaupari')
    await foto(rosa, 'hu15_04_corregir_certificado_del_lote')
    await ventana.getByRole('button', { name: 'Reenviar a revisión' }).click()
    await rosa.getByRole('status').getByText('se corrigió y se reenvió a revisión', { exact: false }).waitFor()
    await rosa.locator('main tbody tr', { hasText: 'Sánchez Ñaupari' }).getByText('Pendiente').waitFor()
    await foto(rosa, 'hu15_05_lote_con_certificado_reenviado')
    assert.equal(psql(`SELECT estado, apellidos, revisado_en IS NULL FROM documento WHERE codigo = '${gladys}'`), 'PENDIENTE|Sánchez Ñaupari|t')
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    await carlos.locator('main tbody tr', { hasText: `Lote ${numero}` }).getByText('Corregido').waitFor()
  })
  await paso('HU15 · Solo se corrige un observado del área propia, y solo el área', async () => {
    const cuerpo = { numeroExpediente: 'EXP-2026-005392', nombres: 'Kevin', apellidos: 'Ramos', dni: '46385127', datos: {} }
    const rechazado = await enviar(pedro, `/api/documentos/${kevin}/correccion`, cuerpo)
    assert.equal(rechazado.estado, 409)
    assert.equal(rechazado.cuerpo.mensaje, 'Solo se corrige un documento observado. Este documento no está observado.')
    assert.equal((await enviar(pedro, `/api/documentos/${lucia}/correccion`, cuerpo)).estado, 409)
    assert.equal((await enviar(rosa, `/api/documentos/${lucia}/correccion`, cuerpo)).estado, 403)
    assert.equal((await enviar(carlos, `/api/documentos/${lucia}/correccion`, cuerpo)).estado, 403)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${kevin}'`), 'RECHAZADO')
  })

  // ------------------------------------------------------------- HU29: anular un documento firmado
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
  const ventanaAnular = () => carlos.getByRole('dialog', { name: 'Anular con su billetera' })
  const pedirAnulacion = async (codigo, motivo) => {
    await carlos.getByRole('button', { name: `Anular ${codigo}` }).click()
    const ventana = carlos.getByRole('dialog', { name: 'Anular documento' })
    await ventana.getByText('La anulación es definitiva. El documento dejará de ser válido cuando se verifique su autenticidad.').waitFor()
    assert.ok(await ventana.getByRole('button', { name: 'Confirmar' }).isDisabled())
    await ventana.getByLabel('Motivo', { exact: false }).fill(motivo)
    await ventana.getByRole('button', { name: 'Confirmar' }).click()
    await ventanaAnular().getByText('Anular 1 documento').waitFor()
  }
  let martha, nilo, olga
  await paso('Preparación HU29 · El área envía tres documentos y el Director los firma con su billetera', async () => {
    const nuevos = []
    for (const [exp, n, a, dni] of [
      ['EXP-2026-005401', 'Martha', 'Rojas Inga', '44200001'],
      ['EXP-2026-005402', 'Nilo', 'Huamán Soto', '44200002'],
      ['EXP-2026-005403', 'Olga', 'Pari Ccanto', '44200003'],
    ]) {
      const r = await enviar(pedro, '/api/documentos', trabajo(exp, n, a, dni))
      assert.equal(r.estado, 201)
      assert.equal((await enviar(carlos, '/api/revision/documentos/' + r.cuerpo.codigo, {})).estado, 200)
      nuevos.push(r.cuerpo.codigo)
    }
    ;[martha, nilo, olga] = nuevos
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    for (const nombre of ['Martha Rojas Inga', 'Nilo Huamán Soto', 'Olga Pari Ccanto'])
      await carlos.getByRole('checkbox', { name: new RegExp('Seleccionar ' + nombre) }).check()
    await carlos.getByRole('region', { name: 'Selección para firmar' }).getByRole('button', { name: 'Firmar seleccionados' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByText('Firmar 3 documentos').waitFor()
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmaron 3 documentos.').waitFor({ timeout: 60_000 })
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
    for (const codigo of nuevos) assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${codigo}'`), 'FIRMADO')
  })
  await paso('HU29 · Documentos firmados lista los firmados con su beneficiario, DNI, área, fecha y estado, y filtra', async () => {
    await carlos.getByRole('link', { name: 'Documentos firmados' }).click()
    const fila = carlos.locator('main tbody tr', { hasText: martha })
    await fila.waitFor()
    for (const texto of ['Certificado de Trabajo', 'Martha Rojas Inga', 'DNI 44200001', 'Área de Administración', 'Firmado'])
      await fila.getByText(texto, { exact: false }).first().waitFor()
    const cabeceras = await carlos.locator('main thead th').allTextContents()
    assert.deepEqual(cabeceras, ['Código o lote', 'Tipo', 'Beneficiario(s)', 'Área', 'Fecha de firma', 'Estado', 'Acciones'])
    assert.equal(await carlos.locator('main tbody tr').count(), 3)
    await foto(carlos, 'hu29_01_documentos_firmados')
    await carlos.getByRole('searchbox').fill('nilo')
    await carlos.locator('main tbody tr', { hasText: martha }).waitFor({ state: 'detached' })
    assert.equal(await carlos.locator('main tbody tr').count(), 1)
    await carlos.getByRole('searchbox').fill(olga)
    await carlos.locator('main tbody tr', { hasText: 'Olga Pari Ccanto' }).waitFor()
    await carlos.getByRole('searchbox').fill('')
  })
  let hashMartha
  await paso('HU29 · El Director anula con motivo y su billetera; queda registrado en la blockchain real', async () => {
    hashMartha = psql(`SELECT hash_pdf FROM documento WHERE codigo = '${martha}'`)
    await pedirAnulacion(martha, 'El certificado se emitió con el cargo equivocado')
    const direccion = getAddress(B.director.direccion)
    await ventanaAnular().getByText(`(${direccion.slice(0, 6)}…${direccion.slice(-4)})`).waitFor()
    await ventanaAnular().getByText('Sin costo').waitFor()
    // El servidor guardó el motivo antes de ir a la blockchain; el documento sigue firmado.
    assert.equal(psql(`SELECT estado, motivo_anulacion FROM documento WHERE codigo = '${martha}'`), 'FIRMADO|El certificado se emitió con el cargo equivocado')
    await foto(carlos, 'hu29_02_confirmar_anulacion')
    const antes = billeteras.get(carlos).estado.transacciones.length
    await ventanaAnular().getByRole('button', { name: 'Confirmar' }).click()
    await ventanaAnular().getByText('Documento anulado.').waitFor({ timeout: 60_000 })
    await foto(carlos, 'hu29_03_documento_anulado')
    assert.equal(billeteras.get(carlos).estado.transacciones.length, antes + 1)
    const tx = billeteras.get(carlos).estado.transacciones.at(-1)

    const [estado, transaccion, bloque, anuladoEn, anuladoPor, motivo] = psql(
      `SELECT d.estado, d.transaccion_anulacion, d.bloque_anulacion, extract(epoch FROM d.anulado_en)::bigint, u.nombre_usuario, d.motivo_anulacion
       FROM documento d JOIN usuario u ON u.id = d.anulado_por WHERE d.codigo = '${martha}'`,
    ).split('|')
    assert.equal(estado, 'ANULADO')
    assert.equal(transaccion, tx)
    assert.equal(anuladoPor, 'cmendoza')
    assert.equal(motivo, 'El certificado se emitió con el cargo equivocado')
    const recibo = await nodo.getTransactionReceipt(tx)
    assert.equal(Number(bloque), recibo.blockNumber)
    assert.equal(Number(anuladoEn), (await nodo.getBlock(recibo.blockNumber)).timestamp)
    // En la blockchain: anulado con la fecha del bloque, y el registro original intacto.
    const enCadena = await anulado(martha)
    assert.equal(enCadena.si, true)
    assert.equal(enCadena.fecha, Number(anuladoEn))
    const [registrado, r] = await registro.consultar(martha)
    assert.equal(registrado, true)
    assert.equal(r.hashPdf, '0x' + hashMartha)
    const [evento, detalle, quien] = ultimoEvento(martha)
    assert.equal(evento, 'ANULADO')
    assert.equal(quien, 'cmendoza')
    // La confirmación del navegador y la sincronización (cada 3 s en la prueba) leen el mismo evento:
    // el que llega primero lo aplica, una sola vez.
    assert.ok(
      [`Anulado por`, `Anulación confirmada por la sincronización: anulado por`].some((inicio) =>
        detalle.startsWith(`${inicio} Ing. Carlos Mendoza Rivera con la billetera ${direccion}; transacción ${tx}`),
      ),
      detalle,
    )
    assert.ok(detalle.endsWith('Motivo: El certificado se emitió con el cargo equivocado'), detalle)

    await ventanaAnular().getByRole('button', { name: 'Volver a Documentos firmados' }).click()
    const fila = carlos.locator('main tbody tr', { hasText: martha })
    await fila.getByText('Anulado', { exact: true }).waitFor()
    await fila.getByText('Motivo: El certificado se emitió con el cargo equivocado').waitFor()
    assert.equal(await fila.getByRole('button').count(), 0)
    await foto(carlos, 'hu29_04_firmados_con_anulado')
  })
  await paso('HU29 · Si el Director cancela en la billetera, el documento sigue Firmado y se descarta el motivo', async () => {
    billeteras.get(carlos).rechazar(1)
    await pedirAnulacion(nilo, 'Prueba de cancelación')
    await ventanaAnular().getByRole('button', { name: 'Confirmar' }).click()
    await ventanaAnular().getByText('Anulación cancelada en la billetera. El documento sigue firmado.').waitFor()
    await foto(carlos, 'hu29_05_anulacion_cancelada')
    assert.equal(psql(`SELECT estado, motivo_anulacion IS NULL, anulacion_solicitada_en IS NULL FROM documento WHERE codigo = '${nilo}'`), 'FIRMADO|t|t')
    assert.equal((await anulado(nilo)).si, false)
    assert.notEqual(ultimoEvento(nilo)[0], 'ANULADO')
    await ventanaAnular().getByRole('button', { name: 'Cerrar' }).click()
    await carlos.locator('main tbody tr', { hasText: nilo }).getByRole('button', { name: `Anular ${nilo}` }).waitFor()
  })
  await paso('HU29 · Si el navegador se cierra antes de confirmar, la sincronización lo marca Anulado con el motivo guardado', async () => {
    const s = await enviar(carlos, `/api/anulacion/${olga}/solicitud`, { motivo: 'Se emitió por duplicado' })
    assert.equal(s.estado, 200)
    // La billetera envía la anulación y el navegador se cierra: el servidor nunca recibe la confirmación.
    const tx = await contratoDirector.anularDocumento(olga, sinCosto)
    const recibo = await tx.wait()
    await esperarHasta('Olga Anulado por la sincronización', () => psql(`SELECT estado FROM documento WHERE codigo = '${olga}'`) === 'ANULADO', 60_000)
    assert.equal(
      psql(`SELECT d.transaccion_anulacion, d.bloque_anulacion, u.nombre_usuario, d.motivo_anulacion FROM documento d JOIN usuario u ON u.id = d.anulado_por WHERE d.codigo = '${olga}'`),
      `${tx.hash}|${recibo.blockNumber}|cmendoza|Se emitió por duplicado`,
    )
    const [evento, detalle] = ultimoEvento(olga)
    assert.equal(evento, 'ANULADO')
    assert.ok(detalle.startsWith('Anulación confirmada por la sincronización: anulado por Ing. Carlos Mendoza Rivera'), detalle)
    assert.ok(detalle.endsWith('Motivo: Se emitió por duplicado'), detalle)
    // Ningún documento tiene dos eventos ANULADO, aunque se vean en la confirmación y en la sincronización.
    assert.equal(psql(`SELECT count(*) FROM (SELECT documento_id FROM documento_historial WHERE evento = 'ANULADO' GROUP BY documento_id HAVING count(*) > 1) x`), '0')
  })
  await paso('HU29 · Solo se anula un firmado, con motivo; el contrato rechaza anular dos veces, un código no registrado u otra billetera', async () => {
    const pendiente = await enviar(carlos, `/api/anulacion/${lucia}/solicitud`, { motivo: 'No corresponde' })
    assert.equal(pendiente.estado, 409)
    assert.equal(pendiente.cuerpo.mensaje, 'Solo se anula un documento firmado.')
    assert.equal((await enviar(carlos, `/api/anulacion/${martha}/solicitud`, { motivo: 'Otra vez' })).estado, 409)
    const sinMotivo = await enviar(carlos, `/api/anulacion/${nilo}/solicitud`, { motivo: '   ' })
    assert.equal(sinMotivo.estado, 400)
    assert.equal(psql(`SELECT estado, motivo_anulacion IS NULL FROM documento WHERE codigo = '${nilo}'`), 'FIRMADO|t')
    const falla = async (promesa, error) => {
      await assert.rejects(promesa, (e) => {
        assert.equal(e.revert?.name, error, e.shortMessage)
        return true
      })
    }
    await falla(contratoDirector.anularDocumento.staticCall(martha), 'YaAnulado')
    await falla(contratoDirector.anularDocumento.staticCall('DRA-2026-ZZZZZZ'), 'NoRegistrado')
    await falla(contratoCon(B.otra.clave).anularDocumento.staticCall(nilo), 'AccessControlUnauthorizedAccount')
    assert.equal((await anulado(nilo)).si, false)
  })
  await paso('HU29 · El Área encargada ve el documento Anulado (gris, tachado) y el motivo en su detalle', async () => {
    await pedro.goto(URL + '#/mis-documentos')
    await pedro.reload()
    const fila = pedro.locator('main tbody tr', { hasText: martha })
    const estado = fila.getByText('Anulado', { exact: true })
    await estado.waitFor()
    assert.match(await estado.getAttribute('class'), /line-through/)
    await foto(pedro, 'hu29_06_mis_documentos_anulado')
    await fila.getByRole('link', { name: martha }).click()
    await pedro.getByText('El Director lo anuló: ya no es válido.', { exact: false }).waitFor()
    await pedro.getByText('El certificado se emitió con el cargo equivocado').waitFor()
    await foto(pedro, 'hu29_07_detalle_anulado')
  })
  await paso('HU29 · Solo el Director anula y ve Documentos firmados', async () => {
    assert.equal(await api(pedro, '/api/firmados'), 403)
    assert.equal((await enviar(pedro, `/api/anulacion/${nilo}/solicitud`, { motivo: 'x' })).estado, 403)
    assert.equal((await enviar(rosa, `/api/anulacion/${nilo}/confirmacion`, { transaccion: '0x' + '1'.repeat(64) })).estado, 403)
    assert.equal(await api(carlos, '/api/firmados'), 200)
    const anonimo = await nueva()
    assert.equal(await api(anonimo, '/api/firmados'), 401)
    assert.ok(!(await menu(pedro)).includes('Documentos firmados'))
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${nilo}'`), 'FIRMADO')
  })

  // ------------------------------------------------------- HU30: reemitir un documento firmado
  const MOTIVO_REEMISION = 'El segundo apellido del beneficiario estaba mal escrito'
  let nuevoNilo
  await paso('HU30 · El área reemite un firmado: el formulario viene precargado, con el mismo expediente y el motivo obligatorio', async () => {
    await pedro.goto(URL + '#/mis-documentos/' + nilo)
    await pedro.reload()
    await pedro.getByRole('link', { name: /Reemitir con corrección/ }).click()
    await pedro.getByRole('heading', { name: 'Reemitir con corrección – Certificado de Trabajo' }).waitFor()
    await pedro.getByText(`Reemisión de ${nilo}. Cuando el Director firme el nuevo documento, el original se anulará automáticamente.`).waitFor()
    assert.equal(await pedro.getByLabel('Apellidos', { exact: false }).inputValue(), 'Huamán Soto')
    assert.equal(await pedro.getByLabel('Cargo', { exact: false }).inputValue(), 'asistente administrativa')
    assert.equal(await pedro.getByLabel('N.° de expediente', { exact: false }).count(), 0)
    await pedro.getByText('EXP-2026-005402').waitFor()
    const continuar = pedro.getByRole('button', { name: 'Continuar a vista previa' })
    await continuar.click()
    await pedro.getByText('Ingrese el motivo de la reemisión.').waitFor()
    await pedro.getByLabel('Motivo de la reemisión').fill(MOTIVO_REEMISION)
    await continuar.click()
    await pedro.getByText('Corrija al menos un dato del documento.').waitFor()
    await pedro.getByLabel('Apellidos', { exact: false }).fill('Huamán Sotomayor')
    await foto(pedro, 'hu30_01_formulario_de_reemision')
    await continuar.click()
    await pedro.getByRole('figure').getByText('Huamán Sotomayor', { exact: false }).waitFor()
    await pedro.getByRole('button', { name: 'Enviar a revisión' }).click()
    const confirmar = pedro.getByRole('dialog', { name: '¿Enviar la reemisión a revisión?' })
    await confirmar.getByText(`el original (${nilo}) se anulará automáticamente`, { exact: false }).waitFor()
    await confirmar.getByRole('button', { name: 'Enviar' }).click()
    const enviado = pedro.getByRole('status')
    await enviado.getByText('✓ Reemisión enviada a revisión').waitFor()
    nuevoNilo = await enviado.locator('strong.font-mono').textContent()
    await foto(pedro, 'hu30_02_reemision_enviada')
    assert.notEqual(nuevoNilo, nilo)
    assert.equal(
      psql(`SELECT d.estado, d.numero_expediente, o.codigo, d.motivo_reemision, d.apellidos FROM documento d JOIN documento o ON o.id = d.reemplaza_a WHERE d.codigo = '${nuevoNilo}'`),
      `PENDIENTE|EXP-2026-005402|${nilo}|${MOTIVO_REEMISION}|Huamán Sotomayor`,
    )
    const [evento, detalle, quien] = ultimoEvento(nilo)
    assert.equal(evento, 'REEMISION_SOLICITADA')
    assert.equal(quien, 'pmorales')
    assert.equal(detalle, `Reemisión solicitada por Pedro Morales Ccanto (Área de Administración): ${nuevoNilo}. Motivo: ${MOTIVO_REEMISION}`)
    const [registro0, detalleNuevo] = ultimoEvento(nuevoNilo)
    assert.equal(registro0, 'REGISTRADO')
    assert.ok(detalleNuevo.startsWith(`Reemisión de ${nilo} registrada y enviada a revisión por Pedro Morales Ccanto`), detalleNuevo)
    assert.ok(detalleNuevo.endsWith('Cambios: Apellidos: Huamán Soto → Huamán Sotomayor.'), detalleNuevo)
  })
  await paso('HU30 · El original sigue Firmado con "Reemisión en revisión"; no se reemite dos veces ni se anula por separado', async () => {
    await pedro.goto(URL + '#/mis-documentos/' + nilo)
    await pedro.reload()
    await pedro.getByText('Reemisión en revisión:', { exact: false }).waitFor()
    assert.equal(await pedro.getByRole('link', { name: /Reemitir con corrección/ }).count(), 0)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${nilo}'`), 'FIRMADO')
    const otra = await enviar(pedro, `/api/documentos/${nilo}/reemision`, {
      nombres: 'Nilo', apellidos: 'Huamán S.', dni: '44200002',
      datos: { cargo: 'asistente administrativa', fechaInicio: '2025-01-02', fechaFin: '2026-09-30' },
      motivo: 'Otra',
    })
    assert.equal(otra.estado, 409)
    assert.equal(otra.cuerpo.mensaje, `Este documento ya tiene una reemisión en revisión: ${nuevoNilo}.`)
    const anular = await enviar(carlos, `/api/anulacion/${nilo}/solicitud`, { motivo: 'Por separado' })
    assert.equal(anular.estado, 409)
    await carlos.goto(URL + '#/firmados')
    await carlos.reload()
    const fila = carlos.locator('main tbody tr', { hasText: nilo })
    await fila.getByText('Reemisión en revisión:', { exact: false }).waitFor()
    assert.equal(await fila.getByRole('button').count(), 0)
  })
  await paso('HU30 · El Director la ve como "Reemisión", con los cambios y el motivo, y al firmarla el original se anula en la misma transacción', async () => {
    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    const fila = carlos.locator('main tbody tr', { hasText: 'Nilo Huamán Sotomayor' })
    await fila.getByText('Reemisión', { exact: true }).waitFor()
    await foto(carlos, 'hu30_03_bandeja_con_reemision')
    await fila.getByRole('link').click()
    const nota = carlos.getByRole('note')
    await nota.getByText(`Este documento reemplaza a ${nilo}`, { exact: false }).waitFor()
    await nota.getByText('Apellidos: Huamán Soto → Huamán Sotomayor').waitFor()
    await nota.getByText(MOTIVO_REEMISION, { exact: false }).waitFor()
    await foto(carlos, 'hu30_04_revision_con_cambios')
    await carlos.getByRole('button', { name: 'Firmar' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByText('Firmar 1 documento').waitFor()
    const antes = billeteras.get(carlos).estado.transacciones.length
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmó 1 documento.').waitFor({ timeout: 60_000 })
    assert.equal(billeteras.get(carlos).estado.transacciones.length, antes + 1)
    const tx = billeteras.get(carlos).estado.transacciones.at(-1)
    await esperarHasta('el original Anulado', () => psql(`SELECT estado FROM documento WHERE codigo = '${nilo}'`) === 'ANULADO', 30_000)
    assert.equal(psql(`SELECT estado, transaccion FROM documento WHERE codigo = '${nuevoNilo}'`), `FIRMADO|${tx}`)
    assert.equal(
      psql(`SELECT transaccion_anulacion, motivo_anulacion FROM documento WHERE codigo = '${nilo}'`),
      `${tx}|Reemplazado por ${nuevoNilo}. Motivo de la reemisión: ${MOTIVO_REEMISION}`,
    )
    // En la blockchain, leído directo del nodo: una sola transacción registró el nuevo y anuló el original.
    const recibo = await nodo.getTransactionReceipt(tx)
    assert.equal(recibo.status, 1)
    assert.equal(recibo.logs.length, 3)
    assert.equal((await registro.consultar(nuevoNilo))[0], true)
    assert.equal((await anulado(nilo)).si, true)
    assert.equal(await registro.reemplazadoPor(nilo), nuevoNilo)
    assert.equal((await registro.consultar(nilo))[0], true)
    const [evento, detalle] = ultimoEvento(nilo)
    assert.equal(evento, 'ANULADO')
    assert.ok(/^(Anulado|Anulación confirmada por la sincronización: anulado) por reemisión \(reemplazado por /.test(detalle), detalle)
    assert.ok(detalle.includes(nuevoNilo) && detalle.includes(`transacción ${tx}`), detalle)
    await foto(carlos, 'hu30_05_reemision_firmada')
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
  })
  await paso('HU30 · El área ve el original Anulado, "Reemplazado por" la reemisión, y la reemisión con su motivo', async () => {
    await pedro.goto(URL + '#/mis-documentos/' + nilo)
    await pedro.reload()
    await pedro.getByText('Se anuló al firmarse su reemisión', { exact: false }).waitFor()
    await pedro.getByRole('link', { name: nuevoNilo }).first().waitFor()
    await foto(pedro, 'hu30_06_original_reemplazado')
    await pedro.getByRole('link', { name: nuevoNilo }).first().click()
    await pedro.getByText(`Reemisión de ${nilo}.`, { exact: false }).waitFor()
    await pedro.getByText(MOTIVO_REEMISION).waitFor()
    await pedro.getByText('Firmado', { exact: true }).first().waitFor()
    await foto(pedro, 'hu30_07_detalle_de_la_reemision')
  })
  await paso('HU30 · Un certificado de un lote se reemite desde su fila, en el mismo lote y sin repetir un DNI vigente', async () => {
    const numero = psql(`SELECT l.numero FROM lote l JOIN documento d ON d.lote_id = l.id WHERE d.codigo = '${gladys}'`)
    // El Director firma el lote: revisarlo y "Firmar lote".
    await carlos.goto(URL + '#/por-revisar/lote/' + numero)
    await carlos.getByRole('button', { name: 'Firmar lote' }).click()
    const firma = carlos.getByRole('dialog', { name: 'Firmar con su billetera' })
    await firma.getByText('Firmar 3 certificados').waitFor()
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmaron 3 certificados.').waitFor({ timeout: 60_000 })
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
    const juan = psql(`SELECT codigo FROM documento WHERE lote_id = (SELECT id FROM lote WHERE numero = '${numero}') AND nombres = 'Juan'`)

    await rosa.goto(URL + '#/mis-documentos/lote/' + numero)
    await rosa.reload()
    await rosa.getByRole('button', { name: `Reemitir con corrección ${juan}` }).click()
    const ventana = rosa.getByRole('dialog', { name: 'Reemitir certificado' })
    await ventana.getByLabel('DNI', { exact: false }).fill('45903318')
    await ventana.getByLabel('Apellidos', { exact: false }).fill('Ccori Párraga')
    await ventana.getByLabel('Motivo de la reemisión').fill('El segundo apellido no coincide con el DNI')
    await ventana.getByRole('button', { name: 'Enviar a revisión' }).click()
    await ventana.getByText('El DNI ya está en otro certificado de este lote.').waitFor()
    await ventana.getByLabel('DNI', { exact: false }).fill(juanDni)
    await foto(rosa, 'hu30_08_reemitir_certificado_del_lote')
    await ventana.getByRole('button', { name: 'Enviar a revisión' }).click()
    await rosa.getByRole('status').getByText(`✓ La reemisión de ${juan} se envió a revisión`, { exact: false }).waitFor()
    const nuevoJuan = psql(`SELECT d.codigo FROM documento d JOIN documento o ON o.id = d.reemplaza_a WHERE o.codigo = '${juan}'`)
    assert.equal(psql(`SELECT l.numero, d.estado, d.apellidos FROM documento d JOIN lote l ON l.id = d.lote_id WHERE d.codigo = '${nuevoJuan}'`), `${numero}|PENDIENTE|Ccori Párraga`)
    await rosa.locator('main tbody tr', { hasText: juan }).getByText('Reemisión en revisión:', { exact: false }).waitFor()

    await carlos.goto(URL + '#/por-revisar')
    await carlos.reload()
    await carlos.locator('main tbody tr', { hasText: `Lote ${numero}` }).getByText('Reemisión', { exact: true }).waitFor()
    await carlos.goto(URL + '#/por-revisar/lote/' + numero)
    await carlos.getByText(`↻ Reemisión de ${juan}: Apellidos: Ccori Pari → Ccori Párraga`).waitFor()
    await foto(carlos, 'hu30_09_lote_con_reemision')
    await carlos.getByRole('button', { name: 'Firmar lote' }).click()
    await firma.getByText('Firmar 1 certificado').waitFor()
    await firma.getByRole('button', { name: 'Confirmar' }).click()
    await firma.getByText('Se firmó 1 certificado.').waitFor({ timeout: 60_000 })
    await esperarHasta('el certificado original Anulado', () => psql(`SELECT estado FROM documento WHERE codigo = '${juan}'`) === 'ANULADO', 30_000)
    assert.equal(await registro.reemplazadoPor(juan), nuevoJuan)
    assert.equal(psql(`SELECT estado FROM documento WHERE codigo = '${nuevoJuan}'`), 'FIRMADO')
    await firma.getByRole('button', { name: 'Volver a Por revisar' }).click()
    await rosa.reload()
    // El motivo de la anulación dice qué certificado lo reemplazó.
    await rosa.locator('main tbody tr', { hasText: juan }).getByText(`Motivo: Reemplazado por ${nuevoJuan}`, { exact: false }).waitFor()
    await foto(rosa, 'hu30_10_lote_con_certificado_reemplazado')
  })
  await paso('HU30 · Solo el área del documento reemite, y solo un firmado', async () => {
    const cuerpo = { nombres: 'Lucía', apellidos: 'Paredes', dni: '45829364', datos: {}, motivo: 'x' }
    const pendiente = await enviar(pedro, `/api/documentos/${lucia}/reemision`, cuerpo)
    assert.equal(pendiente.estado, 409)
    assert.equal(pendiente.cuerpo.mensaje, 'Solo se reemite un documento firmado.')
    assert.equal((await enviar(pedro, `/api/documentos/${nilo}/reemision`, cuerpo)).estado, 409)
    assert.equal((await enviar(rosa, `/api/documentos/${nuevoNilo}/reemision`, cuerpo)).estado, 403)
    assert.equal((await enviar(carlos, `/api/documentos/${nuevoNilo}/reemision`, cuerpo)).estado, 403)
    assert.equal(psql(`SELECT count(*) FROM documento WHERE reemplaza_a = (SELECT id FROM documento WHERE codigo = '${nuevoNilo}')`), '0')
  })

  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
