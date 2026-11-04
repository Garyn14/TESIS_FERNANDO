// Prueba del contrato RegistroDocumentos en la red Besu real (HU06): se despliega con dos
// administradores, el Administrador otorga y revoca el rol de firmante, y el respaldo también puede
// hacerlo. Con el rol, el director registra 50 documentos en una sola transacción (HU11), el máximo
// permitido, y se consultan; después anula uno (HU29). Todas las billeteras son nuevas y sin saldo: la red no cobra gas (RNF11).
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

// HU29: el firmante anula un documento registrado y la anulación se consulta.
const anulacion = await (
  await contrato.connect(director).anularDocumento(codigos[0], sinCosto)
).wait()
assert.equal(anulacion?.status, 1)
assert.equal((await contrato.anulacion(codigos[0]))[0], true)
assert.equal((await contrato.anulacion(codigos[1]))[0], false)

// HU30: 50 reemisiones en una transacción: registra los nuevos y anula sus originales.
const nuevos = codigos.slice(1).map((c) => c.replace('-P', '-R'))
nuevos.push('DRA-2026-R99999')
const originales = [...codigos.slice(1), 'DRA-2026-R00001']
// El último reemplaza a una reemisión ya registrada en la misma transacción.
const reemision = await (
  await contrato.connect(director).registrarReemisiones(
    nuevos,
    nuevos.map((c) => ethers.sha256(ethers.toUtf8Bytes('pdf ' + c))),
    nuevos.map((c) => ethers.sha256(ethers.toUtf8Bytes('dni ' + c))),
    originales,
    sinCosto,
  )
).wait()
assert.equal(reemision?.status, 1)
assert.equal(reemision?.logs.length, 150)
assert.equal(await contrato.reemplazadoPor(codigos[49]), 'DRA-2026-R00049')
assert.equal((await contrato.anulacion(codigos[49]))[0], true)
assert.equal((await contrato.consultar('DRA-2026-R00049'))[0], true)

await (await contrato.connect(respaldo).revocarFirmante(director.address, sinCosto)).wait()
assert.equal(await contrato.esFirmante(director.address), false)

for (const cuenta of [despliega, administrador, respaldo, director]) {
  assert.equal(await ethers.provider.getBalance(cuenta.address), 0n)
}
console.log(
  `RegistroDocumentos ${await contrato.getAddress()}: otorgado en el bloque ${otorgar?.blockNumber}, 50 documentos registrados en el bloque ${registro?.blockNumber} (gas ${registro?.gasUsed}), uno anulado en el bloque ${anulacion?.blockNumber}, 50 reemisiones en el bloque ${reemision?.blockNumber} (gas ${reemision?.gasUsed}) y revocado por el respaldo; sin costo`,
)
