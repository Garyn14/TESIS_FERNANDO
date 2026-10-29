import { expect } from 'chai'
import { network } from 'hardhat'

const { ethers } = await network.connect()

// HU06 (DRA-17): roles del contrato. RF08, RNF05 y el control interno "quien administra no firma".
describe('RegistroDocumentos: roles', () => {
  async function desplegar() {
    const [despliega, administrador, respaldo, director, otro] = await ethers.getSigners()
    const contrato = await ethers.deployContract(
      'RegistroDocumentos',
      [administrador.address, respaldo.address],
      despliega,
    )
    const ADMIN = await contrato.DEFAULT_ADMIN_ROLE()
    const FIRMANTE = await contrato.FIRMANTE_ROLE()
    return { contrato, despliega, administrador, respaldo, director, otro, ADMIN, FIRMANTE }
  }

  describe('despliegue (RNF05)', () => {
    it('el Administrador y el respaldo administran; quien despliega no tiene ningún rol', async () => {
      const { contrato, despliega, administrador, respaldo, ADMIN, FIRMANTE } = await desplegar()
      expect(await contrato.esAdministrador(administrador.address)).to.equal(true)
      expect(await contrato.esAdministrador(respaldo.address)).to.equal(true)
      expect(await contrato.hasRole(ADMIN, despliega.address)).to.equal(false)
      expect(await contrato.hasRole(FIRMANTE, despliega.address)).to.equal(false)
    })

    it('el rol de firmante tiene el identificador acordado', async () => {
      const { FIRMANTE } = await desplegar()
      expect(FIRMANTE).to.equal(ethers.id('FIRMANTE_ROLE'))
    })

    it('rechaza la dirección cero y un respaldo igual al Administrador', async () => {
      const [, administrador] = await ethers.getSigners()
      const fabrica = await ethers.getContractFactory('RegistroDocumentos')
      await expect(
        fabrica.deploy(ethers.ZeroAddress, administrador.address),
      ).to.be.revertedWithCustomError(fabrica, 'DireccionInvalida')
      await expect(
        fabrica.deploy(administrador.address, administrador.address),
      ).to.be.revertedWithCustomError(fabrica, 'AdministradoresIguales')
    })
  })

  describe('otorgar y revocar el rol de firmante (RF08)', () => {
    it('el Administrador otorga el rol y se emite RoleGranted', async () => {
      const { contrato, administrador, director, FIRMANTE } = await desplegar()
      await expect(contrato.connect(administrador).otorgarFirmante(director.address))
        .to.emit(contrato, 'RoleGranted')
        .withArgs(FIRMANTE, director.address, administrador.address)
      expect(await contrato.esFirmante(director.address)).to.equal(true)
    })

    it('la billetera de respaldo también puede otorgar y revocar', async () => {
      const { contrato, respaldo, director } = await desplegar()
      await contrato.connect(respaldo).otorgarFirmante(director.address)
      expect(await contrato.esFirmante(director.address)).to.equal(true)
      await contrato.connect(respaldo).revocarFirmante(director.address)
      expect(await contrato.esFirmante(director.address)).to.equal(false)
    })

    it('el Administrador revoca el rol y se emite RoleRevoked', async () => {
      const { contrato, administrador, director, FIRMANTE } = await desplegar()
      await contrato.connect(administrador).otorgarFirmante(director.address)
      await expect(contrato.connect(administrador).revocarFirmante(director.address))
        .to.emit(contrato, 'RoleRevoked')
        .withArgs(FIRMANTE, director.address, administrador.address)
      expect(await contrato.esFirmante(director.address)).to.equal(false)
    })

    it('solo un administrador puede otorgar o revocar', async () => {
      const { contrato, administrador, director, otro, ADMIN } = await desplegar()
      await expect(contrato.connect(otro).otorgarFirmante(director.address))
        .to.be.revertedWithCustomError(contrato, 'AccessControlUnauthorizedAccount')
        .withArgs(otro.address, ADMIN)
      await contrato.connect(administrador).otorgarFirmante(director.address)
      await expect(
        contrato.connect(director).revocarFirmante(director.address),
      ).to.be.revertedWithCustomError(contrato, 'AccessControlUnauthorizedAccount')
    })

    it('rechaza otorgar dos veces o revocar a quien no es firmante', async () => {
      const { contrato, administrador, director } = await desplegar()
      await expect(contrato.connect(administrador).revocarFirmante(director.address))
        .to.be.revertedWithCustomError(contrato, 'NoEsFirmante')
        .withArgs(director.address)
      await contrato.connect(administrador).otorgarFirmante(director.address)
      await expect(contrato.connect(administrador).otorgarFirmante(director.address))
        .to.be.revertedWithCustomError(contrato, 'YaEsFirmante')
        .withArgs(director.address)
    })

    it('rechaza la dirección cero como firmante', async () => {
      const { contrato, administrador } = await desplegar()
      await expect(
        contrato.connect(administrador).otorgarFirmante(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(contrato, 'DireccionInvalida')
    })
  })

  describe('control interno: quien administra no firma', () => {
    it('una billetera administradora no puede ser firmante', async () => {
      const { contrato, administrador, respaldo, FIRMANTE } = await desplegar()
      await expect(contrato.connect(administrador).otorgarFirmante(respaldo.address))
        .to.be.revertedWithCustomError(contrato, 'AdministradorNoPuedeFirmar')
        .withArgs(respaldo.address)
      // Tampoco por la función estándar de OpenZeppelin.
      await expect(
        contrato.connect(administrador).grantRole(FIRMANTE, administrador.address),
      ).to.be.revertedWithCustomError(contrato, 'AdministradorNoPuedeFirmar')
    })

    it('una billetera firmante no puede ser administradora', async () => {
      const { contrato, administrador, director, ADMIN } = await desplegar()
      await contrato.connect(administrador).otorgarFirmante(director.address)
      await expect(contrato.connect(administrador).grantRole(ADMIN, director.address))
        .to.be.revertedWithCustomError(contrato, 'FirmanteNoPuedeAdministrar')
        .withArgs(director.address)
    })
  })

  describe('siempre queda al menos un administrador', () => {
    it('se puede quitar un administrador, pero no el último', async () => {
      const { contrato, administrador, respaldo, ADMIN } = await desplegar()
      await contrato.connect(administrador).revokeRole(ADMIN, respaldo.address)
      expect(await contrato.esAdministrador(respaldo.address)).to.equal(false)
      await expect(
        contrato.connect(administrador).renounceRole(ADMIN, administrador.address),
      ).to.be.revertedWithCustomError(contrato, 'UltimoAdministrador')
      expect(await contrato.esAdministrador(administrador.address)).to.equal(true)
    })

    it('un administrador nuevo cuenta para el mínimo', async () => {
      const { contrato, administrador, respaldo, otro, ADMIN } = await desplegar()
      await contrato.connect(administrador).grantRole(ADMIN, otro.address)
      await contrato.connect(administrador).revokeRole(ADMIN, respaldo.address)
      await contrato.connect(otro).renounceRole(ADMIN, otro.address)
      await expect(
        contrato.connect(administrador).renounceRole(ADMIN, administrador.address),
      ).to.be.revertedWithCustomError(contrato, 'UltimoAdministrador')
    })
  })
})
