// Prepara la blockchain para la prueba de punta a punta (HU06): crea billeteras de prueba nuevas
// y despliega un RegistroDocumentos nuevo en la red Besu local, con el Administrador y el
// respaldo como administradores del contrato. Escribe .despliegue.json (no se versiona: contiene
// claves de prueba). Uso: node preparar-blockchain.cjs  (requiere la red Besu levantada).
const { execFileSync } = require('node:child_process')
const { readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { Wallet } = require('ethers')

const contratos = path.join(__dirname, '..', 'contracts')
const nueva = () => {
  const w = Wallet.createRandom()
  return { direccion: w.address, clave: w.privateKey }
}
const billeteras = { administrador: nueva(), respaldo: nueva(), director: nueva(), otra: nueva() }

execFileSync('npx', ['hardhat', 'run', 'scripts/desplegar.ts', '--network', 'besuLocal'], {
  cwd: contratos,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: {
    ...process.env,
    BESU_RPC_URL: process.env.BESU_RPC_URL ?? 'http://localhost:8545',
    ADMIN_BILLETERA: billeteras.administrador.direccion,
    RESPALDO_BILLETERA: billeteras.respaldo.direccion,
  },
})
const despliegue = JSON.parse(readFileSync(path.join(contratos, 'despliegues', '20260.json'), 'utf8'))
writeFileSync(
  path.join(__dirname, '.despliegue.json'),
  JSON.stringify({ contrato: despliegue.direccion, bloque: despliegue.bloque, billeteras }, null, 2),
)
console.log(despliegue.direccion)
