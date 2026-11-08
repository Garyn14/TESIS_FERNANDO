// Comprobaciones de las rutas de CloudFront y del aviso de servidor apagado (DRA-54), contra el
// CloudFront simulado de de-punta-a-punta.sh. Lo llama ese script al final, con el último servidor
// todavía encendido; a la mitad detiene el nginx del servidor, como si el EC2 estuviera apagado.
//
//   node cloudfront.cjs <carpeta de capturas> <contenedor nginx del servidor>
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')

const [salida, NGINX] = process.argv.slice(2)
const PLATAFORMA = 'http://localhost:5173'
const PORTAL = 'http://localhost:5174'
const resultados = []
async function paso(nombre, fn) {
  await fn()
  resultados.push(nombre)
  console.log(`✓ ${nombre}`)
}

;(async () => {
  const navegador = await chromium.launch()
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await paso('Portal: el enlace del QR (/verificar/{token}) carga la aplicación', async () => {
      const r = await fetch(`${PORTAL}/verificar/3f9c2a7b-0d14-4c55-9a77-1b2c3d4e5f60`)
      assert.equal(r.status, 200)
      assert.match(r.headers.get('content-type'), /text\/html/)
    })
    await paso('Portal: solo publica /api/verificacion; el resto de la API no llega al servidor', async () => {
      const verificacion = await fetch(`${PORTAL}/api/verificacion/codigo/DRA-2026-ABCDEF`)
      assert.match(verificacion.headers.get('content-type'), /application\/json/)
      const usuarios = await fetch(`${PORTAL}/api/usuarios`)
      assert.match(usuarios.headers.get('content-type'), /text\/html/, 'devolvió la API en lugar de la aplicación')
      const rpc = await fetch(`${PORTAL}/rpc`, { method: 'POST', body: '{}' })
      assert.notEqual(rpc.status, 200)
    })
    await paso('Plataforma: /api y /rpc llegan al servidor; un archivo inexistente no', async () => {
      assert.equal((await fetch(`${PLATAFORMA}/api/salud`)).status, 200)
      const rpc = await fetch(`${PLATAFORMA}/rpc`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      })
      assert.equal((await rpc.json()).result, '0x4f24')
      assert.equal((await fetch(`${PLATAFORMA}/no-existe.js`)).status, 403)
    })

    execFileSync('docker', ['stop', NGINX], { stdio: 'ignore' })
    try {
      await paso('Servidor apagado: la API responde 503 con el aviso en el formato del backend', async () => {
        const r = await fetch(`${PLATAFORMA}/api/sesion`)
        assert.equal(r.status, 503)
        assert.match((await r.json()).mensaje, /está apagado o encendiéndose/)
      })
      await paso('Servidor apagado: la plataforma carga y muestra el aviso en el inicio de sesión', async () => {
        await pagina.goto(PLATAFORMA)
        await pagina.getByText(/está apagado o encendiéndose/).waitFor()
        await pagina.screenshot({ path: `${salida}/dra54_01_plataforma_con_servidor_apagado.png` })
      })
      await paso('Servidor apagado: el portal carga y muestra el aviso al verificar', async () => {
        await pagina.goto(`${PORTAL}/verificar/3f9c2a7b-0d14-4c55-9a77-1b2c3d4e5f60`)
        await pagina.getByText(/está apagado o encendiéndose/).waitFor()
        await pagina.screenshot({ path: `${salida}/dra54_02_portal_con_servidor_apagado.png` })
      })
    } finally {
      execFileSync('docker', ['start', NGINX], { stdio: 'ignore' })
    }
    await paso('Servidor encendido de nuevo: la plataforma vuelve a responder', async () => {
      for (let i = 0; i < 30; i++) {
        if ((await fetch(`${PLATAFORMA}/api/salud`)).status === 200) return
        await new Promise((r) => setTimeout(r, 1000))
      }
      assert.fail('la API no volvió a responder')
    })
    console.log(`\n${resultados.length} pasos correctos`)
  } catch (e) {
    console.error('✗ FALLÓ:', e.stack ?? e.message)
    process.exitCode = 1
  } finally {
    await navegador.close()
  }
})()
