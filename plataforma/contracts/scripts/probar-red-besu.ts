// Prueba de humo de la red Besu local (DRA-45): una cuenta nueva, sin saldo, despliega un
// contrato, envía una transacción y se lee el evento emitido. Comprueba que la red produce
// bloques, que tiene 4 validadores QBFT y que las transacciones no cuestan nada (RNF11).
//
// Uso: BESU_RPC_URL=http://localhost:8545 npx hardhat run scripts/probar-red-besu.ts --network besuLocal
import assert from 'node:assert/strict'
import { network } from 'hardhat'

const { ethers } = await network.connect()
const provider = ethers.provider

const red = await provider.getNetwork()
assert.equal(red.chainId, 20260n, 'chainId inesperado')

const validadores: string[] = await provider.send('qbft_getValidatorsByBlockNumber', ['latest'])
assert.equal(validadores.length, 4, 'se esperaban 4 validadores QBFT')

const cuenta = ethers.Wallet.createRandom().connect(provider)
assert.equal(await provider.getBalance(cuenta.address), 0n)

const sinCosto = { gasPrice: 0n, type: 0 }
const fabrica = await ethers.getContractFactory('PruebaRed', cuenta)
const contrato = await fabrica.deploy(sinCosto)
await contrato.waitForDeployment()

const huella = ethers.keccak256(ethers.toUtf8Bytes('PDF de prueba'))
const recibo = await (await contrato.registrar(huella, sinCosto)).wait()
assert.equal(recibo?.status, 1, 'la transacción falló')

const eventos = await contrato.queryFilter(contrato.filters.Registrado(huella), recibo?.blockNumber)
assert.equal(eventos.length, 1, 'no se encontró el evento')
assert.equal(eventos[0].args.emisor, cuenta.address)

assert.equal(await provider.getBalance(cuenta.address), 0n, 'la cuenta pagó por las transacciones')

console.log(
  `chainId ${red.chainId} · ${validadores.length} validadores · bloque ${recibo?.blockNumber}`,
)
console.log(
  `Contrato ${await contrato.getAddress()} desplegado y evento leído; saldo de la cuenta: 0`,
)
