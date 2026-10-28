const { chromium } = require('playwright');
const OUT = process.argv[2];
const URL = 'http://localhost:4173/';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  let n = 0;
  const shot = async (name) => { n++; const f = `${OUT}/${String(n).padStart(2,'0')}_${name}.png`; await page.waitForTimeout(400); const h = await page.evaluate(() => Math.max(900, document.documentElement.scrollHeight)); await page.setViewportSize({ width: 1440, height: h }); await page.waitForTimeout(200); await page.screenshot({ path: f }); await page.setViewportSize({ width: 1440, height: 900 }); console.log('OK', f); };
  const step = async (name, fn) => { try { await fn(); await shot(name); } catch (e) { console.log('FAIL', name, String(e).split('\n')[0]); } };
  const click = (t, opts={}) => page.getByText(t, { exact: true, ...opts }).first().click();
  const btn = (t) => page.getByRole('button', { name: t, exact: true }).first().click();
  const login = async (u) => {
    await page.getByPlaceholder('Ingrese su usuario').fill(u);
    await page.getByPlaceholder('Ingrese su contraseña').fill('Demo2026');
    await btn('Ingresar');
    await page.waitForTimeout(500);
  };
  const logout = async () => { await btn('Cerrar sesión'); await page.waitForTimeout(300); };

  await page.goto(URL);
  await step('login', async () => {});
  await step('login_error', async () => {
    await page.getByPlaceholder('Ingrese su usuario').fill('rquispe');
    await page.getByPlaceholder('Ingrese su contraseña').fill('mal');
    await btn('Ingresar');
  });
  await page.getByPlaceholder('Ingrese su usuario').fill('');
  // ---- Rosa
  await step('area_inicio', async () => { await login('rquispe'); });
  await step('area_notificaciones', async () => { await page.locator('header button').first().click(); });
  await page.keyboard.press('Escape'); await page.mouse.click(700, 600);
  await step('area_mis_documentos', async () => { await click('Mis documentos'); });
  await step('area_nuevo_documento', async () => { await page.getByRole('button', { name: 'Nuevo documento' }).last().click(); });
  await step('area_emision_lista_vacia', async () => { await click('Certificado de Capacitación'); });
  await step('area_emision_lista_error_dni', async () => { await btn('Importar desde Excel'); });
  await step('area_emision_lista_corregida', async () => {
    await page.locator('input[value="4419823"]').fill('44198236');
  });
  await step('area_vista_previa', async () => { await btn('Continuar a vista previa'); });
  await step('area_confirmar_envio', async () => { await btn('Enviar a revisión'); });
  await step('area_envio_exitoso', async () => { await page.getByRole('button', { name: 'Enviar', exact: true }).last().click(); });
  await step('area_documento_observado', async () => { await click('DRA-2026-K7M4PX'); });
  await logout();
  // ---- Director
  await step('director_inicio', async () => { await login('cmendoza'); });
  await step('director_por_revisar', async () => { await click('Por revisar'); });
  await step('director_revision_individual', async () => { await click('Teodoro Inga Mamani'); });
  await step('director_modal_rechazo', async () => { await btn('Rechazar'); });
  await btn('Cancelar').catch(()=>{});
  await click('Por revisar').catch(()=>{});
  await step('director_revision_lote', async () => { await page.getByText('Manejo integrado de plagas en café').first().click(); });
  await step('director_billetera', async () => { await btn('Firmar lote'); });
  await step('director_firma_progreso', async () => { await page.getByRole('button', { name: 'Confirmar' }).last().click(); await page.waitForTimeout(1200); });
  await step('director_firma_resultado', async () => { await page.getByText(/Se firmaron/).first().waitFor({ timeout: 15000 }); });
  await step('director_documentos_firmados', async () => { await btn('Volver a Por revisar'); await click('Documentos firmados'); });
  await logout();
  // ---- Luis
  await step('consulta_inicio', async () => { await login('ltorres'); });
  await step('consulta_buscar', async () => { await click('Buscar documentos'); });
  await step('consulta_buscar_ccori', async () => { await page.getByPlaceholder(/Buscar por nombre/).fill('Ccori'); });
  await step('consulta_detalle', async () => { await page.getByText('DRA-2026-J4C7QX').first().click(); });
  await step('consulta_detalle_tecnico', async () => { await page.getByText('Detalle técnico de auditoría').first().click(); });
  await step('consulta_documento_final', async () => { await btn('Ver documento'); });
  console.log('ERRORS', JSON.stringify(errors));
  await browser.close();
})();
