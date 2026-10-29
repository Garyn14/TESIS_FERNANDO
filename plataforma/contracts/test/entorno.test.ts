import { expect } from 'chai'
import { network } from 'hardhat'

// Verifica que el entorno de pruebas de Hardhat funcione. Las pruebas del contrato se agregan en el Sprint 2.
describe('Entorno de pruebas', () => {
  it('levanta la red simulada con cuentas de prueba', async () => {
    const { ethers } = await network.connect()
    const cuentas = await ethers.getSigners()
    expect(cuentas.length).to.be.greaterThan(0)
    expect(await ethers.provider.getBlockNumber()).to.equal(0)
  })
})
