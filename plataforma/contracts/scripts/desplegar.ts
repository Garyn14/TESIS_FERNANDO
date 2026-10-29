// Despliega RegistroDocumentos (HU06). El rol de administrador queda en dos billeteras: la del
// Administrador de la plataforma y una de respaldo guardada fuera de línea (RNF05). La cuenta que
// despliega no recibe ningún rol: puede ser una cuenta temporal sin saldo (la red no cobra gas).
//
// Uso:
//   ADMIN_BILLETERA=0x... RESPALDO_BILLETERA=0x... BESU_RPC_URL=http://localhost:8545 \
//     npx hardhat run scripts/desplegar.ts --network besuLocal
//
// Escribe despliegues/<chainId>.json con la dirección del contrato, que el backend recibe en
// PLATAFORMA_CONTRATO_DIRECCION.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { network } from 'hardhat'

const administrador = process.env.ADMIN_BILLETERA
const respaldo = process.env.RESPALDO_BILLETERA
assert.ok(administrador && respaldo, 'Defina ADMIN_BILLETERA y RESPALDO_BILLETERA')

const { ethers } = await network.connect()
const red = await ethers.provider.getNetwork()

// Cuenta temporal para desplegar: no conserva ningún rol ni necesita saldo.
const despliega = ethers.Wallet.createRandom().connect(ethers.provider)
const fabrica = await ethers.getContractFactory('RegistroDocumentos', despliega)
const contrato = await fabrica.deploy(
  ethers.getAddress(administrador),
  ethers.getAddress(respaldo),
  { gasPrice: 0n, type: 0 },
)
const recibo = await contrato.deploymentTransaction()?.wait()
await contrato.waitForDeployment()

assert.equal(await contrato.esAdministrador(administrador), true)
assert.equal(await contrato.esAdministrador(respaldo), true)
assert.equal(await contrato.esAdministrador(despliega.address), false)

const registro = {
  contrato: 'RegistroDocumentos',
  direccion: await contrato.getAddress(),
  chainId: Number(red.chainId),
  bloque: recibo?.blockNumber,
  transaccion: recibo?.hash,
  administrador: ethers.getAddress(administrador),
  respaldo: ethers.getAddress(respaldo),
  fecha: new Date().toISOString(),
}
await mkdir('despliegues', { recursive: true })
await writeFile(`despliegues/${registro.chainId}.json`, JSON.stringify(registro, null, 2) + '\n')
console.log(JSON.stringify(registro, null, 2))
