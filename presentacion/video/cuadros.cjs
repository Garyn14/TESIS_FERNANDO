// Toma capturas sueltas: node cuadros.cjs carpeta t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [dir, ...tiempos] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', (e) => console.error('ERROR', e.message));
  await pg.goto('file://' + path.join(__dirname, 'index.html'));
  await pg.evaluate(() => document.fonts.ready);
  for (const t of tiempos) {
    await pg.evaluate((x) => seek(x), Number(t));
    await pg.screenshot({ path: path.join(dir, `t${t}.png`), scale: 'css' });
  }
  await b.close();
})();
