const { chromium } = require('playwright')
;(async () => {
  const out = process.argv[2]
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const cuentas = [
    { id: 2, nombreUsuario: 'mquispe', nombreCompleto: 'María Quispe Rojas', rol: 'DIRECTOR', rolNombre: 'Director', activo: true, debeCambiarContrasena: true, creadoEn: '2026-10-29T15:10:00Z' },
    { id: 1, nombreUsuario: 'admin', nombreCompleto: 'Administrador de la plataforma', rol: 'ADMINISTRADOR', rolNombre: 'Administrador', activo: true, debeCambiarContrasena: false, creadoEn: '2026-10-29T14:00:00Z' },
  ]
  const roles = [
    { codigo: 'ADMINISTRADOR', nombre: 'Administrador', descripcion: 'Gestiona cuentas, áreas y la billetera del director' },
    { codigo: 'AREA_ENCARGADA', nombre: 'Área encargada', descripcion: 'Registra, corrige y reemite los documentos de su área' },
    { codigo: 'DIRECTOR', nombre: 'Director', descripcion: 'Revisa, observa, rechaza, firma y anula documentos' },
    { codigo: 'CONSULTA_INTERNA', nombre: 'Consulta interna', descripcion: 'Mesa de Partes: busca, consulta el historial e imprime documentos' },
  ]
  await p.route('**/api/roles', (r) => r.fulfill({ json: roles }))
  await p.route('**/api/usuarios', (r) => {
    if (r.request().method() === 'GET') return r.fulfill({ json: cuentas })
    const d = JSON.parse(r.request().postData())
    if (d.nombreUsuario === 'mquispe')
      return r.fulfill({ status: 409, json: { mensaje: 'El nombre de usuario ya está registrado.', campos: { nombreUsuario: 'El nombre de usuario ya está registrado.' } } })
    return r.fulfill({ status: 201, json: { id: 3, ...d, rolNombre: 'Área encargada', activo: true, debeCambiarContrasena: true, creadoEn: new Date().toISOString() } })
  })
  await p.goto('http://localhost:5173/')
  await p.getByText('María Quispe Rojas').waitFor()
  await p.screenshot({ path: out + '/hu01_1_lista.png' })
  await p.getByRole('button', { name: 'Nueva cuenta' }).click()
  await p.getByRole('button', { name: 'Crear cuenta' }).click()
  await p.screenshot({ path: out + '/hu01_2_validacion.png' })
  await p.getByLabel('Nombre de usuario').fill('MQuispe')
  await p.getByLabel('Nombre completo').fill('Otra María')
  await p.getByLabel('Rol').selectOption('AREA_ENCARGADA')
  await p.getByLabel('Contraseña temporal').fill('Clave2026!')
  await p.getByRole('button', { name: 'Crear cuenta' }).click()
  await p.getByText('El nombre de usuario ya está registrado.').waitFor()
  await p.screenshot({ path: out + '/hu01_3_duplicado.png' })
  await p.getByLabel('Nombre de usuario').fill('jperez')
  await p.getByLabel('Nombre completo').fill('Juan Pérez Quispe')
  await p.getByRole('button', { name: 'Crear cuenta' }).click()
  await p.getByRole('status').waitFor()
  await p.screenshot({ path: out + '/hu01_4_creada.png' })
  await p.setViewportSize({ width: 390, height: 844 })
  await p.screenshot({ path: out + '/hu01_5_movil.png', fullPage: true })
  await b.close()
})()
