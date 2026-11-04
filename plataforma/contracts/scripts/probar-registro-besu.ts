// Prueba del contrato RegistroDocumentos en la red Besu real (HU06): se despliega con dos
// administradores, el Administrador otorga y revoca el rol de firmante, y el respaldo también puede
// hacerlo. Con el rol, el director registra 50 documentos en una sola transacción (HU11), el máximo
// permitido, y se consultan. Todas las billeteras son nuevas y sin saldo: la red no cobra gas (RNF11).
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

// HU11: el firmante registra el máximo por transacción y el registro se consulta.
const codigos = Array.from({ length: 50 }, (_, i) => `DRA-2026-P${String(i).padStart(5, '0')}`)
const hashes = codigos.map((c) => ethers.sha256(ethers.toUtf8Bytes('pdf ' + c)))
const hmacs = codigos.map((c) => ethers.sha256(ethers.toUtf8Bytes('dni ' + c)))
const registro = await (
  await contrato.connect(director).registrarDocumentos(codigos, hashes, hmacs, sinCosto)
).wait()
assert.equal(registro?.status, 1)
assert.equal(registro?.logs.length, 50)
const [registrado, datos] = await contrato.consultar(codigos[49])
assert.equal(registrado, true)
assert.equal(datos.hashPdf, hashes[49])
assert.equal(datos.firmante, director.address)

await (await contrato.connect(respaldo).revocarFirmante(director.address, sinCosto)).wait()
assert.equal(await contrato.esFirmante(director.address), false)

for (const cuenta of [despliega, administrador, respaldo, director]) {
  assert.equal(await ethers.provider.getBalance(cuenta.address), 0n)
}
console.log(
  `RegistroDocumentos ${await contrato.getAddress()}: otorgado en el bloque ${otorgar?.blockNumber}, 50 documentos registrados en el bloque ${registro?.blockNumber} (gas ${registro?.gasUsed}) y revocado por el respaldo; sin costo`,
)
