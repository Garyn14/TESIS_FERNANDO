// Graba el video cuadro por cuadro: node grabar.cjs inicio fin salida.mp4 [fps]
// Une la pista final (../pista-final.mp3) en el mismo tramo.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [inicio, fin, salida, fps = '30'] = process.argv.slice(2);
  const a = Number(inicio), b = Number(fin), f = Number(fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-',
    '-ss', inicio, '-t', String(b - a), '-i', path.join(__dirname, '..', 'pista-final.mp3'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const nav = await chromium.launch();
  const pg = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', (e) => { console.error('ERROR', e.message); process.exit(1); });
  await pg.goto('file://' + path.join(__dirname, 'index.html'));
  await pg.evaluate(() => document.fonts.ready);
  const total = Math.round((b - a) * f);
  for (let i = 0; i < total; i++) {
    await pg.evaluate((t) => seek(t), a + i / f);
    const img = await pg.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`cuadro ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await nav.close();
})();
