// Prueba de punta a punta real de HU01 a HU06: navegador + frontend + backend + PostgreSQL, sin
// simulaciones. Requiere una base de datos vacía y el backend con SESION_INACTIVIDAD=1m (ver
// levantar.sh), para probar la expiración en un minuto.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { Contract, JsonRpcProvider, getAddress } = require('ethers')
const { instalarBilletera } = require('./billetera-de-prueba.cjs')

// HU06: billeteras de prueba y contrato desplegado por levantar.sh.
const BESU = process.env.BESU_RPC_URL ?? 'http://localhost:8545'
const DESPLIEGUE = JSON.parse(readFileSync(process.env.E2E_DESPLIEGUE ?? `${__dirname}/.despliegue.json`, 'utf8'))
const B = DESPLIEGUE.billeteras
const contratoEnCadena = new Contract(
  DESPLIEGUE.contrato,
  ['function esFirmante(address) view returns (bool)'],
  new JsonRpcProvider(BESU),
)

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
  const billeteras = new Map()
  const nueva = async () => {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } })
    const p = await c.newPage()
    billeteras.set(p, await instalarBilletera(c, BESU))
    await p.goto(URL)
    return p
  }
  const campo = (p, etiqueta) => p.getByLabel(etiqueta, { exact: true })
  const ingresar = async (p, u, c) => {
    await campo(p, 'Usuario').fill(u)
    await campo(p, 'Contraseña').fill(c)
    await p.getByRole('button', { name: 'Ingresar' }).click()
  }
  const cambiarContrasena = async (p, actual, nueva, etiquetaActual = 'Contraseña actual') => {
    await campo(p, etiquetaActual).fill(actual)
    await campo(p, 'Contraseña nueva').fill(nueva)
    await campo(p, 'Repita la contraseña nueva').fill(nueva)
    await p.getByRole('button', { name: 'Cambiar contraseña' }).last().click()
  }
  /** Primer ingreso con contraseña temporal: obliga a cambiarla (HU04). */
  const primerIngreso = async (p, u, temporal, propia) => {
    await ingresar(p, u, temporal)
    await p.getByRole('heading', { name: 'Cambie su contraseña' }).waitFor()
    await cambiarContrasena(p, temporal, propia, 'Contraseña temporal')
    await p.getByRole('navigation', { name: 'Menú principal' }).waitFor()
  }
  const menu = async (p) =>
    p.getByRole('navigation', { name: 'Menú principal' }).getByRole('link').allTextContents()
  const api = (p, ruta) => p.evaluate((r) => fetch(r).then((x) => x.status), ruta)
  const foto = (p, nombre) => p.screenshot({ path: `${out}/${nombre}.png` })

  // ---------------------------------------------------------------- HU03: inicio de sesión
  const admin = await nueva()
  await paso('HU03 · Muestra el inicio de sesión sin sesión', async () => {
    await admin.getByRole('button', { name: 'Ingresar' }).waitFor()
    await foto(admin, 'hu03_01_login')
  })
  await paso('HU03 · Usuario o contraseña incorrectos, conserva el usuario', async () => {
    await ingresar(admin, 'admin', 'Incorrecta1')
    await admin.getByRole('alert').getByText('Usuario o contraseña incorrectos.').waitFor()
    assert.equal(await campo(admin, 'Usuario').inputValue(), 'admin')
    await foto(admin, 'hu03_02_credenciales_incorrectas')
  })

  // ------------------------------------------------- HU04: cambio obligatorio del Administrador
  await paso('HU04 · Con contraseña temporal solo puede cambiarla, también en la API', async () => {
    await ingresar(admin, 'ADMIN', ADMIN_TEMPORAL)
    await admin.getByRole('heading', { name: 'Cambie su contraseña' }).waitFor()
    assert.equal(await admin.getByRole('navigation').count(), 0)
    assert.equal(await api(admin, '/api/usuarios'), 403)
    await foto(admin, 'hu04_01_cambio_obligatorio')
  })
  await paso('HU04 · El cambio exige la contraseña actual', async () => {
    await cambiarContrasena(admin, 'NoEsLaTemporal', ADMIN_CLAVE, 'Contraseña temporal')
    await admin.getByText('La contraseña actual no es correcta.').waitFor()
    await foto(admin, 'hu04_02_actual_incorrecta')
  })
  await paso('HU04+HU03 · Tras cambiarla, entra con el menú del Administrador', async () => {
    await cambiarContrasena(admin, ADMIN_TEMPORAL, ADMIN_CLAVE, 'Contraseña temporal')
    await admin.getByRole('navigation', { name: 'Menú principal' }).waitFor()
    assert.deepEqual(await menu(admin), ['Inicio', 'Usuarios', 'Billetera del director'])
    await foto(admin, 'hu03_03_inicio_administrador')
  })

  // ------------------------------------------------------------------ HU01: crear cuentas
  await paso('HU01+HU05 · Crea tres cuentas reales, una por rol; el Área encargada exige área', async () => {
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol] of [
      ['rquispe', 'Rosa Quispe Huamán', 'AREA_ENCARGADA'],
      ['cmendoza', 'Ing. Carlos Mendoza Rivera', 'DIRECTOR'],
      ['ltorres', 'Luis Torres Paredes', 'CONSULTA_INTERNA'],
    ]) {
      await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
      await campo(admin, 'Nombre de usuario').fill(u)
      await campo(admin, 'Nombre completo').fill(n)
      await campo(admin, 'Rol').selectOption(rol)
      await campo(admin, 'Contraseña temporal').fill(TEMPORAL)
      if (rol === 'AREA_ENCARGADA') {
        // HU05: sin área no se guarda.
        await admin.getByRole('button', { name: 'Crear cuenta' }).click()
        await admin.getByText('Seleccione el área de la persona.').waitFor()
        await campo(admin, 'Área').selectOption('CAPACITACION')
        await admin.getByText('Emite: Certificado de Capacitación, Certificado de Reconocimiento.').waitFor()
        await foto(admin, 'hu05_01_area_obligatoria')
      }
      await admin.getByRole('button', { name: 'Crear cuenta' }).click()
      await admin.getByRole('status').getByText(`Se creó la cuenta "${u}"`).waitFor()
    }
    await foto(admin, 'hu03_04_cuentas_reales')
  })
  await paso('HU01 · No permite repetir un usuario con otras mayúsculas', async () => {
    await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
    await campo(admin, 'Nombre de usuario').fill('RQuispe')
    await campo(admin, 'Nombre completo').fill('Otra Rosa')
    await campo(admin, 'Rol').selectOption('DIRECTOR')
    await campo(admin, 'Contraseña temporal').fill(TEMPORAL)
    await admin.getByRole('button', { name: 'Crear cuenta' }).click()
    await admin.getByText('El nombre de usuario ya está registrado.').waitFor()
    await admin.getByRole('button', { name: 'Cancelar' }).click()
  })

  // ---------------------------------------------------- HU03 + HU04: menú de cada rol
  for (const [u, esperado, archivo] of [
    ['rquispe', ['Inicio', 'Mis documentos', 'Nuevo documento'], 'hu03_05_menu_area_encargada'],
    ['cmendoza', ['Inicio', 'Por revisar', 'Documentos firmados'], 'hu03_06_menu_director'],
    ['ltorres', ['Inicio', 'Buscar documentos'], 'hu03_07_menu_consulta_interna'],
  ]) {
    await paso(`HU04+HU03 · ${u}: cambia la temporal y ve solo su menú`, async () => {
      const p = await nueva()
      await primerIngreso(p, u, TEMPORAL, PROPIA)
      assert.deepEqual(await menu(p), esperado)
      await foto(p, archivo)
      await p.context().close()
    })
  }

  // ---------------------------------------------------------------- HU05: área del usuario
  await paso('HU05 · El Área encargada ve su área y solo los tipos de documento de su área', async () => {
    const rosa = await nueva()
    await ingresar(rosa, 'rquispe', PROPIA)
    await rosa.getByRole('banner').getByText('Área encargada – Área de Capacitación').waitFor()
    await rosa.getByRole('heading', { name: 'Documentos que emite Área de Capacitación' }).waitFor()
    const tipos = await rosa.evaluate(() =>
      fetch('/api/tipos-documento').then((r) => r.json()).then((t) => t.map((x) => x.codigo).sort()),
    )
    assert.deepEqual(tipos, ['CERTIFICADO_CAPACITACION', 'CERTIFICADO_RECONOCIMIENTO'])
    await foto(rosa, 'hu05_02_inicio_con_area')

    // HU05: el Administrador le cambia el área con la sesión abierta.
    await admin.getByRole('button', { name: 'Editar rquispe' }).click()
    await campo(admin, 'Área').selectOption('DESARROLLO_AGRARIO')
    await foto(admin, 'hu05_03_editar_area')
    await admin.getByRole('button', { name: 'Guardar cambios' }).click()
    await admin.getByRole('status').getByText('Se guardaron los cambios').waitFor()
    await admin.getByText('Área de Desarrollo Agrario').waitFor()
    await foto(admin, 'hu05_04_lista_con_area')

    await rosa.getByRole('link', { name: 'Inicio' }).click()
    await rosa.getByRole('heading', { name: 'Documentos que emite Área de Desarrollo Agrario' }).waitFor()
    await rosa.getByText('Constancia de Productor Activo').waitFor()
    assert.equal(await rosa.getByText('Certificado de Capacitación').count(), 0)
    await foto(rosa, 'hu05_05_area_cambiada_en_sesion')
    await rosa.context().close()
  })

  // ---------------------------------------------- HU06: billetera del director y rol de firmante
  const fila = (p, texto) => p.locator('tr', { hasText: texto })
  await paso('HU06 · La pantalla lista al director sin billetera', async () => {
    await admin.getByRole('link', { name: 'Billetera del director' }).click()
    await fila(admin, 'cmendoza').getByText('Sin billetera').waitFor()
    await admin.getByText(DESPLIEGUE.contrato).waitFor()
    await foto(admin, 'hu06_01_sin_billetera')
  })
  await paso('HU06 · Valida el formato, la suma de verificación y que no sea administradora', async () => {
    await admin.getByRole('button', { name: 'Registrar la billetera de cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Billetera del director' })
    const direccion = campo(ventana, 'Dirección de la billetera')
    await direccion.fill('0x12345')
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    await ventana.getByText('40 caracteres hexadecimales').waitFor()
    // Un error de tipeo en una letra: la suma de verificación EIP-55 lo detecta.
    const conError = B.director.direccion.replace(/[a-f]/, (l) => l.toUpperCase())
    await direccion.fill(conError)
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    await ventana.getByText('EIP-55', { exact: false }).waitFor()
    await foto(admin, 'hu06_02_error_de_tipeo')
    await direccion.fill(B.administrador.direccion)
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    await ventana.getByText('administradora del contrato', { exact: false }).waitFor()
    await direccion.fill(B.director.direccion.toLowerCase())
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    await fila(admin, 'cmendoza').getByText(getAddress(B.director.direccion)).waitFor()
    await fila(admin, 'cmendoza').getByText('Sin rol de firmante').waitFor()
    await foto(admin, 'hu06_03_billetera_registrada')
  })
  await paso('HU06 · Una billetera que no administra el contrato no puede otorgar', async () => {
    billeteras.get(admin).usar(B.otra.clave)
    await admin.getByRole('button', { name: 'Otorgar el rol de firmante a cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Otorgar rol de firmante' })
    await ventana.getByRole('button', { name: 'Conectar billetera y continuar' }).click()
    await ventana.getByRole('alert').getByText('no es administradora del contrato', { exact: false }).waitFor()
    assert.equal(billeteras.get(admin).estado.transacciones.length, 0)
    await foto(admin, 'hu06_04_billetera_no_administradora')
    await ventana.getByRole('button', { name: 'Cancelar' }).click()
  })
  await paso('HU06 · El Administrador otorga el rol con su billetera, en la blockchain real', async () => {
    billeteras.get(admin).usar(B.administrador.clave)
    await admin.getByRole('button', { name: 'Otorgar el rol de firmante a cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Otorgar rol de firmante' })
    await ventana.getByRole('button', { name: 'Conectar billetera y continuar' }).click()
    await ventana.getByText(getAddress(B.administrador.direccion)).waitFor()
    await ventana.getByText('Sin costo').waitFor()
    // La red de la plataforma se agregó a la billetera porque no la conocía.
    assert.deepEqual(billeteras.get(admin).estado.redesAgregadas, ['Plataforma DRA Satipo'])
    await foto(admin, 'hu06_05_confirmar_otorgamiento')
    await ventana.getByRole('button', { name: 'Confirmar en la billetera' }).click()
    await ventana.getByText('Rol de firmante otorgado', { exact: false }).waitFor({ timeout: 60_000 })
    await foto(admin, 'hu06_06_rol_otorgado')
    await ventana.getByRole('button', { name: 'Listo' }).click()
    await fila(admin, 'cmendoza').getByText('✓ Firmante activo').waitFor()
    assert.equal(billeteras.get(admin).estado.transacciones.length, 1)
    // Comprobación independiente, directo en la blockchain.
    assert.equal(await contratoEnCadena.esFirmante(B.director.direccion), true)
  })
  await paso('HU06 · No se puede cambiar la billetera mientras tenga el rol de firmante', async () => {
    await admin.getByRole('button', { name: 'Cambiar la billetera de cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Billetera del director' })
    await campo(ventana, 'Dirección de la billetera').fill(B.otra.direccion)
    await ventana.getByRole('button', { name: 'Guardar billetera' }).click()
    await ventana.getByText('Revóquelo antes de cambiar la billetera', { exact: false }).waitFor()
    await ventana.getByRole('button', { name: 'Cancelar' }).click()
  })
  await paso('HU06 · El Administrador revoca el rol; el estado se lee de la blockchain', async () => {
    await admin.getByRole('button', { name: 'Revocar el rol de firmante de cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: '¿Revocar el rol de firmante?' })
    await ventana.getByText('Los documentos firmados antes siguen siendo válidos', { exact: false }).waitFor()
    await ventana.getByRole('button', { name: 'Conectar billetera y continuar' }).click()
    await ventana.getByRole('button', { name: 'Confirmar en la billetera' }).click()
    await ventana.getByText('Rol de firmante revocado', { exact: false }).waitFor({ timeout: 60_000 })
    await foto(admin, 'hu06_07_rol_revocado')
    await ventana.getByRole('button', { name: 'Listo' }).click()
    await fila(admin, 'cmendoza').getByText('Sin rol de firmante').waitFor()
    assert.equal(await contratoEnCadena.esFirmante(B.director.direccion), false)
    // Se recarga la pantalla: el estado viene de la blockchain, no de lo que recuerda el navegador.
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    await admin.getByRole('link', { name: 'Billetera del director' }).click()
    await fila(admin, 'cmendoza').getByText('Sin rol de firmante').waitFor()
    await admin.getByRole('link', { name: 'Usuarios' }).click()
  })
  await paso('HU06 · Solo el Administrador ve la pantalla de billeteras', async () => {
    const p = await nueva()
    await ingresar(p, 'cmendoza', PROPIA)
    await p.getByRole('navigation', { name: 'Menú principal' }).waitFor()
    assert.equal(await p.getByRole('link', { name: 'Billetera del director' }).count(), 0)
    assert.equal(await api(p, '/api/billeteras'), 403)
    await p.context().close()
  })

  await paso('HU03 · Una dirección sin permiso no muestra la pantalla ni sus datos', async () => {
    const p = await nueva()
    await ingresar(p, 'ltorres', PROPIA)
    await p.getByRole('navigation', { name: 'Menú principal' }).waitFor()
    await p.goto(URL + '#/usuarios')
    await p.getByText('No tiene permiso para ver esta sección.').waitFor()
    assert.equal(await api(p, '/api/usuarios'), 403)
    await foto(p, 'hu03_08_sin_permiso')
    await p.context().close()
  })

  // ------------------------------------------------- HU03 + HU04: bloqueo y restablecimiento
  await paso('HU03 · Tres intentos fallidos bloquean la cuenta una hora', async () => {
    const p = await nueva()
    for (let i = 1; i <= 3; i++) {
      await ingresar(p, 'cmendoza', 'Mala000' + i)
      await p.getByRole('alert').waitFor()
    }
    await p.getByRole('alert').getByText(/bloqueada por 3 intentos fallidos/).waitFor()
    await ingresar(p, 'cmendoza', PROPIA)
    await p.getByRole('alert').getByText(/bloqueada por 3 intentos fallidos/).waitFor()
    await foto(p, 'hu03_09_cuenta_bloqueada')
    await p.context().close()
  })
  await paso('HU04 · La lista de Usuarios muestra hasta cuándo está bloqueada y cabe a 1280 px', async () => {
    await admin.getByRole('link', { name: 'Inicio' }).click()
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    await admin.getByText(/Bloqueada hasta/).waitFor()
    // Con las tres acciones por cuenta, la tabla cabe a 1280 px sin desplazarse.
    const desborde = await admin.locator('table').evaluate((t) => t.parentElement.scrollWidth - t.parentElement.clientWidth)
    assert.equal(desborde, 0)
    await foto(admin, 'hu04_03_bloqueada_en_lista')
  })
  let temporalCarlos
  await paso('HU04 · El Administrador restablece: genera la temporal y la muestra', async () => {
    await admin.getByRole('button', { name: 'Restablecer la contraseña de cmendoza' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Restablecer contraseña' })
    await ventana.getByRole('button', { name: 'Generar' }).click()
    temporalCarlos = await campo(ventana, 'Contraseña temporal').inputValue()
    assert.equal(temporalCarlos.length, 12)
    await ventana.getByRole('button', { name: 'Restablecer contraseña' }).click()
    await ventana.getByText(temporalCarlos).waitFor()
    await foto(admin, 'hu04_04_restablecida')
    await ventana.getByRole('button', { name: 'Listo' }).click()
    assert.equal(await admin.getByText(/Bloqueada hasta/).count(), 0)
  })
  await paso('HU04 · Restablecer desbloquea y obliga a cambiar la contraseña', async () => {
    const p = await nueva()
    await ingresar(p, 'cmendoza', PROPIA)
    await p.getByRole('alert').getByText('Usuario o contraseña incorrectos.').waitFor()
    await primerIngreso(p, 'cmendoza', temporalCarlos, PROPIA)
    assert.deepEqual(await menu(p), ['Inicio', 'Por revisar', 'Documentos firmados'])
    await p.context().close()
  })
  await paso('HU04 · Restablecer cierra la sesión abierta de la persona', async () => {
    const rosa = await nueva()
    await ingresar(rosa, 'rquispe', PROPIA)
    await rosa.getByRole('link', { name: 'Mis documentos' }).waitFor()

    await admin.getByRole('button', { name: 'Restablecer la contraseña de rquispe' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Restablecer contraseña' })
    await campo(ventana, 'Contraseña temporal').fill('TemporalRosa1')
    await ventana.getByRole('button', { name: 'Restablecer contraseña' }).click()
    await ventana.getByRole('button', { name: 'Listo' }).click()

    await rosa.getByRole('link', { name: 'Mis documentos' }).click()
    await rosa.getByRole('status').getByText('El Administrador restableció su contraseña.', { exact: false }).waitFor()
    await foto(rosa, 'hu04_05_sesion_cerrada_por_restablecimiento')
    await primerIngreso(rosa, 'rquispe', 'TemporalRosa1', PROPIA)
    await rosa.context().close()
  })
  await paso('HU04 · El Administrador no restablece su propia contraseña', async () => {
    await admin.getByRole('button', { name: 'Restablecer la contraseña de admin' }).click()
    const ventana = admin.getByRole('dialog', { name: 'Restablecer contraseña' })
    await campo(ventana, 'Contraseña temporal').fill('Temporal99')
    await ventana.getByRole('button', { name: 'Restablecer contraseña' }).click()
    await ventana.getByRole('alert').getByText('Para su propia cuenta use', { exact: false }).waitFor()
    await ventana.getByRole('button', { name: 'Cancelar' }).click()
  })
  await paso('HU04 · Cambiar la contraseña desde el encabezado cierra las otras sesiones', async () => {
    const equipoA = await nueva()
    const equipoB = await nueva()
    await ingresar(equipoA, 'cmendoza', PROPIA)
    await ingresar(equipoB, 'cmendoza', PROPIA)
    await equipoA.getByRole('navigation', { name: 'Menú principal' }).waitFor()
    await equipoB.getByRole('navigation', { name: 'Menú principal' }).waitFor()

    await equipoA.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await cambiarContrasena(equipoA, PROPIA, 'OtraPropia26')
    await equipoA.getByRole('status').getByText('Su contraseña se cambió.', { exact: false }).waitFor()
    await foto(equipoA, 'hu04_06_cambio_voluntario')
    await equipoA.getByRole('button', { name: 'Listo' }).click()

    await equipoB.getByRole('link', { name: 'Por revisar' }).click()
    await equipoB.getByRole('status').getByText('Su contraseña se cambió en otra sesión.', { exact: false }).waitFor()
    await foto(equipoB, 'hu04_07_otra_sesion_cerrada')

    // La sesión desde la que se cambió sigue activa.
    await equipoA.getByRole('link', { name: 'Por revisar' }).click()
    await equipoA.getByText('Se habilita en el Sprint 3', { exact: false }).waitFor()
    await equipoA.context().close()
    await equipoB.context().close()
  })

  // ---------------------------------------------------------- HU02 + HU03: estado y rol
  await paso('HU02+HU03 · Desactivar cierra la sesión abierta de la persona', async () => {
    const luis = await nueva()
    await ingresar(luis, 'ltorres', PROPIA)
    await luis.getByRole('navigation', { name: 'Menú principal' }).waitFor()

    await admin.getByRole('button', { name: 'Desactivar ltorres' }).click()
    await admin.getByRole('button', { name: 'Desactivar cuenta' }).click()
    await admin.getByText('⊘ Inactiva').waitFor()

    await luis.getByRole('link', { name: 'Buscar documentos' }).click()
    await luis.getByRole('status').getByText('Su cuenta fue desactivada.', { exact: false }).waitFor()
    await foto(luis, 'hu03_10_sesion_cerrada_por_desactivacion')
    await luis.context().close()
  })
  await paso('HU02 · Una cuenta desactivada no puede iniciar sesión', async () => {
    const p = await nueva()
    await ingresar(p, 'ltorres', PROPIA)
    await p.getByRole('alert').getByText('Su cuenta está desactivada.', { exact: false }).waitFor()
    await foto(p, 'hu03_11_cuenta_desactivada')
    await p.context().close()
  })
  await paso('HU02+HU03 · Cambiar el rol cambia el menú abierto en la siguiente pantalla', async () => {
    const rosa = await nueva()
    await ingresar(rosa, 'rquispe', PROPIA)
    await rosa.getByRole('link', { name: 'Mis documentos' }).waitFor()

    await admin.getByRole('button', { name: 'Editar rquispe' }).click()
    await campo(admin, 'Rol').selectOption('CONSULTA_INTERNA')
    await admin.getByRole('button', { name: 'Guardar cambios' }).click()
    await admin.getByRole('status').getByText('Se guardaron los cambios').waitFor()

    await rosa.getByRole('link', { name: 'Inicio' }).click()
    await rosa.getByRole('link', { name: 'Buscar documentos' }).waitFor()
    assert.deepEqual(await menu(rosa), ['Inicio', 'Buscar documentos'])
    await rosa.context().close()
  })
  await paso('HU02 · El Administrador no puede desactivar su propia cuenta', async () => {
    await admin.getByRole('button', { name: 'Desactivar admin' }).click()
    await admin.getByRole('button', { name: 'Desactivar cuenta' }).click()
    await admin.getByRole('alert').getByText('No puede desactivar su propia cuenta.').waitFor()
    await admin.getByRole('button', { name: 'Cancelar' }).click()
  })

  // ------------------------------------------------------------------ HU03: fin de sesión
  await paso('HU03 · Cerrar sesión la termina en el servidor', async () => {
    const p = await nueva()
    await ingresar(p, 'admin', ADMIN_CLAVE)
    await p.getByRole('button', { name: 'Cerrar sesión' }).click()
    await p.getByRole('button', { name: 'Ingresar' }).waitFor()
    assert.equal(await api(p, '/api/sesion'), 401)
    await p.context().close()
  })
  await paso('HU03 · La sesión expira por inactividad (1 minuto en esta prueba; 30 en producción)', async () => {
    await admin.waitForTimeout(65_000)
    await admin.getByRole('link', { name: 'Inicio' }).click()
    await admin.getByRole('status').getByText('Su sesión expiró por inactividad.', { exact: false }).waitFor()
    await foto(admin, 'hu03_12_sesion_expirada')
  })

  await b.close()
  require('node:fs').writeFileSync(`${out}/resultado.txt`, resultados.join('\n') + '\n')
  console.log(`\n${resultados.length} pasos correctos`)
})().catch((e) => {
  console.error('✗ FALLÓ:', e.message)
  process.exit(1)
})
