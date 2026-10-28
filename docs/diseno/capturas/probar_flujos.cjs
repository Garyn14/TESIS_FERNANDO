const { chromium } = require('playwright');
const URL = 'http://localhost:4173/';
const results = [];
(async () => {
  const browser = await chromium.launch();
  async function flow(name, fn) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.setDefaultTimeout(6000);
    await page.goto(URL);
    const h = mk(page, name);
    try { await fn(h); } catch (e) { results.push([name, 'FAIL', String(e).split('\n')[0]]); await page.screenshot({ path: `/tmp/claude-0/-home-user-tesis-fernando/e091af79-f0ed-5e6d-ad16-d25fe6bfd333/scratchpad/fail_${name}.png` }); }
    if (errs.length) results.push([name, 'CONSOLE', errs.join(' | ')]);
    await ctx.close();
  }
  function mk(page, name) {
    const h = {
      page,
      btn: (t) => page.getByRole('button', { name: t, exact: true }).last().click(),
      text: (t) => page.getByText(t, { exact: true }).first().click(),
      login: async (u) => { await page.getByPlaceholder('Ingrese su usuario').fill(u); await page.getByPlaceholder('Ingrese su contraseña').fill('Demo2026'); await h.btn('Ingresar'); },
      logout: async () => { await page.getByRole('button', { name: 'Cerrar sesión' }).click(); },
      expect: async (label, re) => {
        try { await page.getByText(re).first().waitFor({ timeout: 8000 }); results.push([name, 'PASS', label]); }
        catch { results.push([name, 'FAIL', label]); }
      },
      reason: async (t) => { await page.locator('textarea').last().fill(t); await h.btn('Confirmar'); },
      wallet: async () => { await page.getByRole('button', { name: 'Confirmar' }).last().click(); },
      back: () => page.getByText(/Volver a Por revisar/).first().click(),
    };
    return h;
  }

  await flow('F2b_cancelar_firma', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText('Manejo integrado de plagas en café').first().click();
    await h.btn('Firmar lote'); await h.btn('Cancelar');
    await h.expect('mensaje firma cancelada', /Firma cancelada/);
  });

  await flow('F3_imprimir', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText('Manejo integrado de plagas en café').first().click();
    await h.btn('Firmar lote'); await h.wallet();
    await h.expect('firma 8', /Se firmaron 8 certificados/);
    await h.btn('Volver a Por revisar'); await h.logout();
    await h.login('ltorres'); await h.text('Buscar documentos');
    await h.page.getByText(/Imprimir lote \(8\)/).first().click();
    await h.expect('imprimir lote', /Se enviaron 8 certificados a impresión/);
    await h.page.getByText('DRA-2026-J4C7QX').first().click();
    await h.btn('Imprimir');
    await h.expect('historial duplicado', /Duplicado impreso por/);
  });

  await flow('F4_observar_beneficiario', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText('Manejo integrado de plagas en café').first().click();
    await h.page.getByLabel('Seleccionar Gladys Sanchez Ñaupari').check();
    await h.btn('Observar seleccionados');
    await h.reason('El DNI no coincide con la lista de asistencia del taller');
    await h.btn('Firmar lote'); await h.wallet();
    await h.expect('firma 7', /Se firmaron 7 certificados/);
    await h.expect('1 observado', /1 certificado fue observado/);
    await h.btn('Volver a Por revisar'); await h.logout();
    await h.login('rquispe'); await h.text('Mis documentos');
    await h.page.getByText('Gladys Sanchez Ñaupari').first().click();
    await h.expect('recuadro observado', /Observado por Ing\. Carlos Mendoza Rivera/);
    await h.page.locator('input[value="45903318"]').fill('45903319');
    await h.btn('Reenviar a revisión');
    await h.expect('reenviado', /Documento reenviado a revisión/);
    await h.logout(); await h.login('cmendoza'); await h.text('Por revisar');
    await h.expect('etiqueta Corregido', /^Corregido$/);
  });

  await flow('F5_observar_lote', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText('Manejo integrado de plagas en café').first().click();
    await h.btn('Observar lote'); await h.reason('Fechas del taller incorrectas');
    await h.expect('lote observado', /Lote observado/);
    await h.logout(); await h.login('rquispe');
    await h.page.getByLabel('Abrir notificaciones').click();
    await h.expect('aviso a Rosa', /observó el Lote 2026-007/);
  });

  await flow('F5_rechazar_lote', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText('Manejo integrado de plagas en café').first().click();
    await h.btn('Rechazar lote'); await h.reason('Evento no autorizado');
    await h.logout(); await h.login('rquispe');
    await h.page.getByLabel('Abrir notificaciones').click();
    await h.expect('aviso rechazo a Rosa', /rechazó el Lote 2026-007/);
  });

  await flow('F6_rechazar_individual', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    await h.text('Teodoro Inga Mamani');
    await h.btn('Rechazar'); await h.reason('No figura en el padrón de productores');
    await h.logout(); await h.login('ltorres');
    await h.page.getByLabel('Abrir notificaciones').click();
    await h.expect('aviso a Mesa de Partes', /Rechazo para comunicar al solicitante/);
    await h.page.getByText(/Rechazo para comunicar/).first().click();
    await h.expect('detalle rechazado', /No figura en el padrón/);
  });

  await flow('F7_firma_con_falla', async (h) => {
    await h.login('cmendoza'); await h.text('Por revisar');
    for (const n of ['Kevin Ramos Ccanto', 'Lucía Paredes Quinto', 'María Elena Rojas Soto']) { await h.text(n); await h.back(); }
    for (const c of ['DRA-2026-V3J7XC', 'DRA-2026-F8R2MA', 'DRA-2026-P3W8TR']) await h.page.getByLabel(`Seleccionar ${c}`).check();
    await h.btn('Firmar seleccionados'); await h.wallet();
    await h.expect('falla parcial', /no pudo prepararse/);
    await h.expect('2 firmados', /Se firmaron 2 documentos/);
    await h.btn('Volver a Por revisar');
    await h.page.getByLabel('Seleccionar DRA-2026-F8R2MA').check();
    await h.btn('Firmar seleccionados'); await h.wallet();
    await h.expect('reintento ok', /Se firm(ó|aron) 1 documento/);
  });

  await flow('F8_reemision', async (h) => {
    await h.login('rquispe'); await h.text('Mis documentos');
    await h.page.getByText('DRA-2026-H5R8NZ').first().click();
    await h.btn('Reemitir con corrección');
    await h.page.locator('input[value="Huaman Inga"]').fill('Huamán Inga');
    await h.page.locator('textarea').last().fill('Corrección del apellido del beneficiario');
    await h.btn('Enviar a revisión');
    await h.expect('reemisión enviada', /Reemisión enviada a revisión/);
    await h.logout(); await h.login('cmendoza'); await h.text('Por revisar');
    await h.page.getByText(/Pedro Huamán Inga/).first().click();
    await h.expect('reemplaza a', /Este documento reemplaza a DRA-2026-H5R8NZ/);
    await h.expect('cambio', /Huaman Inga → Huamán Inga/);
    await h.btn('Firmar'); await h.wallet();
    await h.expect('original anulado', /DRA-2026-H5R8NZ fue anulado y reemplazado/);
  });

  await flow('F9_anular', async (h) => {
    await h.login('cmendoza'); await h.text('Documentos firmados');
    await h.page.getByText(/Lote 2026-006/).first().click();
    await h.page.getByRole('button', { name: 'Anular' }).last().click();
    await h.reason('Emitido por error: el beneficiario no asistió al taller');
    await h.wallet();
    await h.expect('anulado', /Documento anulado/);
    await h.logout(); await h.login('rquispe'); await h.text('Mis documentos');
    await h.expect('1 anulado en lote', /1 anulado/);
  });

  await flow('F10_busquedas', async (h) => {
    await h.login('ltorres'); await h.text('Buscar documentos');
    const s = h.page.getByPlaceholder(/Buscar por nombre/);
    await s.fill('Ccori'); await h.expect('nombre', /Ccori Pari/);
    await s.fill('45218736'); await h.expect('DNI', /Ccori Pari/);
    await s.fill('004817'); await h.expect('expediente', /Teodoro Inga Mamani/);
    await s.fill('Quintanilla'); await h.expect('sin resultados', /No se encontraron documentos/);
  });

  await flow('login_otros', async (h) => {
    await h.page.getByPlaceholder('Ingrese su usuario').fill('nadie');
    await h.page.getByPlaceholder('Ingrese su contraseña').fill('x');
    await h.btn('Ingresar');
    await h.expect('error login', /Usuario o contraseña incorrectos/);
  });

  for (const r of results) console.log(r.join(' | '));
  await browser.close();
})();
