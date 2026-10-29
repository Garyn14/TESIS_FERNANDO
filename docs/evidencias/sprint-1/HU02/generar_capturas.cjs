const { chromium } = require('playwright')
;(async () => {
  const [out, url = 'http://localhost:5173/'] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const roles = [
    { codigo: 'ADMINISTRADOR', nombre: 'Administrador', descripcion: 'Gestiona cuentas, áreas y la billetera del director' },
    { codigo: 'AREA_ENCARGADA', nombre: 'Área encargada', descripcion: 'Registra, corrige y reemite los documentos de su área' },
    { codigo: 'DIRECTOR', nombre: 'Director', descripcion: 'Revisa, observa, rechaza, firma y anula documentos' },
    { codigo: 'CONSULTA_INTERNA', nombre: 'Consulta interna', descripcion: 'Mesa de Partes: busca, consulta el historial e imprime documentos' },
  ]
  const base = { activo: true, debeCambiarContrasena: false }
  const cuentas = [
    { ...base, id: 3, nombreUsuario: 'jperez', nombreCompleto: 'Juan Pérez Quispe', rol: 'AREA_ENCARGADA', rolNombre: 'Área encargada', creadoEn: '2026-10-29T15:20:00Z' },
    { ...base, id: 2, nombreUsuario: 'mquispe', nombreCompleto: 'María Quispe Rojas', rol: 'DIRECTOR', rolNombre: 'Director', creadoEn: '2026-10-29T15:10:00Z' },
    { ...base, id: 1, nombreUsuario: 'admin', nombreCompleto: 'Administrador de la plataforma', rol: 'ADMINISTRADOR', rolNombre: 'Administrador', creadoEn: '2026-10-29T14:00:00Z' },
  ]
  const nombreRol = (c) => roles.find((r) => r.codigo === c).nombre
  await p.route('**/api/roles', (r) => r.fulfill({ json: roles }))
  await p.route('**/api/usuarios**', (r) => {
    const req = r.request()
    const m = req.url().match(/\/api\/usuarios\/(\d+)(?:\/(\w+))?$/)
    if (!m) return r.fulfill({ json: cuentas })
    const c = cuentas.find((x) => x.id === Number(m[1]))
    if (req.method() === 'PUT') {
      const d = JSON.parse(req.postData())
      Object.assign(c, d, { rolNombre: nombreRol(d.rol) })
    } else if (m[2] === 'desactivar') {
      if (c.rol === 'ADMINISTRADOR')
        return r.fulfill({ status: 409, json: { mensaje: 'No puede desactivar su propia cuenta.', campos: {} } })
      c.activo = false
    } else if (m[2] === 'reactivar') c.activo = true
    return r.fulfill({ json: c })
  })
  await p.goto(url)
  await p.getByText('María Quispe Rojas').waitFor()
  await p.screenshot({ path: out + '/hu02_1_lista_con_acciones.png' })

  await p.getByRole('button', { name: 'Editar jperez' }).click()
  await p.getByLabel('Rol').selectOption('CONSULTA_INTERNA')
  await p.getByLabel('Nombre completo').fill('Juan Pérez Quispe Huamán')
  await p.screenshot({ path: out + '/hu02_2_editar.png' })
  await p.getByRole('button', { name: 'Guardar cambios' }).click()
  await p.getByRole('status').waitFor()
  await p.screenshot({ path: out + '/hu02_3_editada.png' })

  await p.getByRole('button', { name: 'Desactivar mquispe' }).click()
  await p.getByRole('dialog').waitFor()
  await p.screenshot({ path: out + '/hu02_4_confirmar_desactivar.png' })
  await p.getByRole('button', { name: 'Desactivar cuenta' }).click()
  await p.getByText('⊘ Inactiva').waitFor()
  await p.screenshot({ path: out + '/hu02_5_inactiva.png' })

  await p.getByRole('button', { name: 'Desactivar admin' }).click()
  await p.getByRole('button', { name: 'Desactivar cuenta' }).click()
  await p.getByRole('alert').waitFor()
  await p.screenshot({ path: out + '/hu02_6_propia_cuenta.png' })
  await p.getByRole('button', { name: 'Cancelar' }).click()

  await p.getByRole('button', { name: 'Reactivar mquispe' }).click()
  await p.screenshot({ path: out + '/hu02_7_confirmar_reactivar.png' })
  await b.close()
})()
