// Prueba de punta a punta real de HU01, HU02 y HU03: frontend + backend + PostgreSQL, sin
// simulaciones. El backend debe correr con SESION_INACTIVIDAD=1m para probar la expiración.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')

const [out, URL = 'http://localhost:5173/', ADMIN_CLAVE = 'Admin2026!'] = process.argv.slice(2)
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
  const ingresar = async (p, u, c) => {
    await p.getByLabel('Usuario', { exact: true }).fill(u)
    await p.getByLabel('Contraseña', { exact: true }).fill(c)
    await p.getByRole('button', { name: 'Ingresar' }).click()
  }
  const menu = async (p) =>
    (await p.getByRole('navigation', { name: 'Menú principal' }).getByRole('link').allTextContents())
  const foto = (p, nombre) => p.screenshot({ path: `${out}/${nombre}.png` })

  const admin = await nueva()
  await paso('HU03 · Muestra el inicio de sesión sin sesión', async () => {
    await admin.getByRole('button', { name: 'Ingresar' }).waitFor()
    await foto(admin, 'hu03_01_login')
  })
  await paso('HU03 · Usuario o contraseña incorrectos, conserva el usuario', async () => {
    await ingresar(admin, 'admin', 'Incorrecta1')
    await admin.getByRole('alert').getByText('Usuario o contraseña incorrectos.').waitFor()
    assert.equal(await admin.getByLabel('Usuario', { exact: true }).inputValue(), 'admin')
    await foto(admin, 'hu03_02_credenciales_incorrectas')
  })
  await paso('HU03 · El Administrador entra y ve solo su menú', async () => {
    await ingresar(admin, 'ADMIN', ADMIN_CLAVE)
    await admin.getByRole('button', { name: 'Cerrar sesión' }).waitFor()
    assert.deepEqual(await menu(admin), ['Inicio', 'Usuarios', 'Billetera del director'])
    await foto(admin, 'hu03_03_inicio_administrador')
  })

  await paso('HU01 · Crea tres cuentas reales, una por rol', async () => {
    await admin.getByRole('link', { name: 'Usuarios' }).click()
    for (const [u, n, rol] of [
      ['rquispe', 'Rosa Quispe Huamán', 'AREA_ENCARGADA'],
      ['cmendoza', 'Ing. Carlos Mendoza Rivera', 'DIRECTOR'],
      ['ltorres', 'Luis Torres Paredes', 'CONSULTA_INTERNA'],
    ]) {
      await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
      await admin.getByLabel('Nombre de usuario').fill(u)
      await admin.getByLabel('Nombre completo').fill(n)
      await admin.getByLabel('Rol').selectOption(rol)
      await admin.getByLabel('Contraseña temporal').fill('Demo2026')
      await admin.getByRole('button', { name: 'Crear cuenta' }).click()
      await admin.getByRole('status').getByText(`Se creó la cuenta "${u}"`).waitFor()
    }
    await foto(admin, 'hu03_04_cuentas_reales')
  })
  await paso('HU01 · No permite repetir un usuario con otras mayúsculas', async () => {
    await admin.getByRole('button', { name: 'Nueva cuenta' }).click()
    await admin.getByLabel('Nombre de usuario').fill('RQuispe')
    await admin.getByLabel('Nombre completo').fill('Otra Rosa')
    await admin.getByLabel('Rol').selectOption('DIRECTOR')
    await admin.getByLabel('Contraseña temporal').fill('Demo2026')
    await admin.getByRole('button', { name: 'Crear cuenta' }).click()
    await admin.getByText('El nombre de usuario ya está registrado.').waitFor()
    await admin.getByRole('button', { name: 'Cancelar' }).click()
  })

  for (const [u, esperado, archivo] of [
    ['rquispe', ['Inicio', 'Mis documentos', 'Nuevo documento'], 'hu03_05_menu_area_encargada'],
    ['cmendoza', ['Inicio', 'Por revisar', 'Documentos firmados'], 'hu03_06_menu_director'],
    ['ltorres', ['Inicio', 'Buscar documentos'], 'hu03_07_menu_consulta_interna'],
  ]) {
    await paso(`HU03 · Menú de ${u} con solo sus vistas`, async () => {
      const p = await nueva()
      await ingresar(p, u, 'Demo2026')
      await p.getByRole('button', { name: 'Cerrar sesión' }).waitFor()
      assert.deepEqual(await menu(p), esperado)
      await foto(p, archivo)
      await p.context().close()
    })
  }

  await paso('HU03 · Una dirección sin permiso no muestra la pantalla ni sus datos', async () => {
    const p = await nueva()
    await ingresar(p, 'ltorres', 'Demo2026')
    await p.getByRole('button', { name: 'Cerrar sesión' }).waitFor()
    await p.goto(URL + '#/usuarios')
    await p.getByText('No tiene permiso para ver esta sección.').waitFor()
    const api = await p.evaluate(() => fetch('/api/usuarios').then((r) => r.status))
    assert.equal(api, 403)
    await foto(p, 'hu03_08_sin_permiso')
    await p.context().close()
  })

  await paso('HU03 · Tres intentos fallidos bloquean la cuenta una hora', async () => {
    const p = await nueva()
    for (let i = 1; i <= 3; i++) {
      await ingresar(p, 'cmendoza', 'Mala000' + i)
      await p.getByRole('alert').waitFor()
    }
    await p.getByRole('alert').getByText(/bloqueada por 3 intentos fallidos/).waitFor()
    await ingresar(p, 'cmendoza', 'Demo2026')
    await p.getByRole('alert').getByText(/bloqueada por 3 intentos fallidos/).waitFor()
    await foto(p, 'hu03_09_cuenta_bloqueada')
    await p.context().close()
  })

  await paso('HU02+HU03 · Desactivar cierra la sesión abierta de la persona', async () => {
    const luis = await nueva()
    await ingresar(luis, 'ltorres', 'Demo2026')
    await luis.getByRole('button', { name: 'Cerrar sesión' }).waitFor()

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
    await ingresar(p, 'ltorres', 'Demo2026')
    await p.getByRole('alert').getByText('Su cuenta está desactivada.', { exact: false }).waitFor()
    await foto(p, 'hu03_11_cuenta_desactivada')
    await p.context().close()
  })

  await paso('HU02+HU03 · Cambiar el rol cambia el menú abierto en la siguiente pantalla', async () => {
    const rosa = await nueva()
    await ingresar(rosa, 'rquispe', 'Demo2026')
    await rosa.getByRole('link', { name: 'Mis documentos' }).waitFor()

    await admin.getByRole('button', { name: 'Editar rquispe' }).click()
    await admin.getByLabel('Rol').selectOption('CONSULTA_INTERNA')
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

  await paso('HU03 · Cerrar sesión la termina en el servidor', async () => {
    const otra = await nueva()
    await ingresar(otra, 'admin', ADMIN_CLAVE)
    await otra.getByRole('button', { name: 'Cerrar sesión' }).click()
    await otra.getByRole('button', { name: 'Ingresar' }).waitFor()
    const estado = await otra.evaluate(() => fetch('/api/sesion').then((r) => r.status))
    assert.equal(estado, 401)
    await otra.context().close()
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
