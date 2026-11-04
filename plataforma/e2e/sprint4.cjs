// Prueba de punta a punta real del Sprint 4: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía (levantar.sh). El Área encargada envía sus
// documentos por la API desde el navegador (la pantalla ya la recorre sprint2.cjs) y el Director
// trabaja desde la pantalla. Recorre HU13, HU14 y HU15.
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
    await admin.context().close()
  })

  const pedro = await nueva()
  const carlos = await nueva()
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

  await b.close()
  fs.writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
