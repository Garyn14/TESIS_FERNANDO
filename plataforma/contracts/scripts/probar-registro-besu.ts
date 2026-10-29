// Prueba del contrato RegistroDocumentos en la red Besu real (HU06): se despliega con dos
// administradores, el Administrador otorga y revoca el rol de firmante, y el respaldo también puede
// hacerlo. Todas las billeteras son nuevas y sin saldo: la red no cobra gas (RNF11).
//
// Uso: BESU_RPC_URL=http://localhost:8545 npx hardhat run scripts/probar-registro-besu.ts --network besuLocal
import assert from 'node:assert/strict'
import { network } from 'hardhat'

const { ethers } = await network.connect()
const nueva = () => ethers.Wallet.createRandom().connect(ethers.provider)
const [despliega, administrador, respaldo, director] = [nueva(), nueva(), nueva(), nueva()]
const sinCosto = { gasPrice: 0n, type: 0 }

const fabrica = await ethers.getContractFactory('RegistroDocumentos', despliega)
const contrato = await fabrica.deploy(administrador.address, respaldo.address, sinCosto)
await contrato.waitForDeployment()
assert.equal(await contrato.esAdministrador(despliega.address), false)

const otorgar = await (
  await contrato.connect(administrador).otorgarFirmante(director.address, sinCosto)
).wait()
assert.equal(otorgar?.status, 1)
assert.equal(await contrato.esFirmante(director.address), true)

await (await contrato.connect(respaldo).revocarFirmante(director.address, sinCosto)).wait()
assert.equal(await contrato.esFirmante(director.address), false)

for (const cuenta of [despliega, administrador, respaldo]) {
  assert.equal(await ethers.provider.getBalance(cuenta.address), 0n)
}
console.log(
  `RegistroDocumentos ${await contrato.getAddress()}: otorgado en el bloque ${otorgar?.blockNumber} y revocado por el respaldo; sin costo`,
)
