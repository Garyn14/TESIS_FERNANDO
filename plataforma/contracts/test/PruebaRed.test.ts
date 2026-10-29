import { expect } from 'chai'
import { network } from 'hardhat'

const { ethers } = await network.connect()

describe('PruebaRed', () => {
  it('emite Registrado con la huella y la cuenta emisora', async () => {
    const [cuenta] = await ethers.getSigners()
    const contrato = await ethers.deployContract('PruebaRed')
    const huella = ethers.keccak256(ethers.toUtf8Bytes('PDF de prueba'))

    await expect(contrato.registrar(huella))
      .to.emit(contrato, 'Registrado')
      .withArgs(huella, cuenta.address)
  })
})
