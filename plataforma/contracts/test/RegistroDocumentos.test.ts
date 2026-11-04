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

// HU11 (DRA-22): registro de los documentos firmados (RF31, RF32).
describe('RegistroDocumentos: registro de documentos', () => {
  async function conFirmante() {
    const [despliega, administrador, respaldo, director, otro] = await ethers.getSigners()
    const contrato = await ethers.deployContract(
      'RegistroDocumentos',
      [administrador.address, respaldo.address],
      despliega,
    )
    await contrato.connect(administrador).otorgarFirmante(director.address)
    return { contrato, administrador, director, otro }
  }
  const hash = (texto: string) => ethers.sha256(ethers.toUtf8Bytes(texto))
  const lote = (n: number, prefijo = 'DRA-2026-A') => {
    const codigos = Array.from({ length: n }, (_, i) => `${prefijo}${String(i).padStart(5, '0')}`)
    return {
      codigos,
      hashes: codigos.map((c) => hash('pdf ' + c)),
      hmacs: codigos.map((c) => hash('dni ' + c)),
    }
  }

  it('el firmante registra documentos; se emite un evento por cada uno y se pueden consultar', async () => {
    const { contrato, director } = await conFirmante()
    const { codigos, hashes, hmacs } = lote(2)
    const tx = contrato.connect(director).registrarDocumentos(codigos, hashes, hmacs)
    await expect(tx)
      .to.emit(contrato, 'DocumentoRegistrado')
      .withArgs(ethers.id(codigos[0]), codigos[0], hashes[0], hmacs[0], director.address)
    await expect(tx)
      .to.emit(contrato, 'DocumentoRegistrado')
      .withArgs(ethers.id(codigos[1]), codigos[1], hashes[1], hmacs[1], director.address)
    const bloque = await ethers.provider.getBlock((await (await tx).wait())!.blockNumber)
    const [registrado, registro] = await contrato.consultar(codigos[1])
    expect(registrado).to.equal(true)
    expect(registro.hashPdf).to.equal(hashes[1])
    expect(registro.dniHmac).to.equal(hmacs[1])
    expect(registro.firmante).to.equal(director.address)
    // La fecha oficial de emisión es la del bloque (RF32).
    expect(registro.registradoEn).to.equal(BigInt(bloque!.timestamp))
  })

  it('un código no registrado se consulta como no registrado', async () => {
    const { contrato } = await conFirmante()
    const [registrado, registro] = await contrato.consultar('DRA-2026-NOEXIS')
    expect(registrado).to.equal(false)
    expect(registro.hashPdf).to.equal(ethers.ZeroHash)
  })

  it('solo una billetera con el rol de firmante registra; ni el Administrador puede', async () => {
    const { contrato, administrador, otro } = await conFirmante()
    const { codigos, hashes, hmacs } = lote(1)
    for (const cuenta of [administrador, otro]) {
      await expect(
        contrato.connect(cuenta).registrarDocumentos(codigos, hashes, hmacs),
      ).to.be.revertedWithCustomError(contrato, 'AccessControlUnauthorizedAccount')
    }
  })

  it('un firmante revocado ya no registra, y lo registrado antes se mantiene (RF08)', async () => {
    const { contrato, administrador, director } = await conFirmante()
    const primero = lote(1, 'DRA-2026-B')
    await contrato
      .connect(director)
      .registrarDocumentos(primero.codigos, primero.hashes, primero.hmacs)
    await contrato.connect(administrador).revocarFirmante(director.address)
    const segundo = lote(1, 'DRA-2026-C')
    await expect(
      contrato
        .connect(director)
        .registrarDocumentos(segundo.codigos, segundo.hashes, segundo.hmacs),
    ).to.be.revertedWithCustomError(contrato, 'AccessControlUnauthorizedAccount')
    expect((await contrato.consultar(primero.codigos[0]))[0]).to.equal(true)
  })

  it('un código no se registra dos veces, ni en la misma transacción', async () => {
    const { contrato, director } = await conFirmante()
    const { codigos, hashes, hmacs } = lote(1)
    await contrato.connect(director).registrarDocumentos(codigos, hashes, hmacs)
    await expect(contrato.connect(director).registrarDocumentos(codigos, [hash('otro')], hmacs))
      .to.be.revertedWithCustomError(contrato, 'CodigoYaRegistrado')
      .withArgs(codigos[0])
    const doble = lote(1, 'DRA-2026-D').codigos
    await expect(
      contrato
        .connect(director)
        .registrarDocumentos([doble[0], doble[0]], [hash('a'), hash('b')], [hash('c'), hash('d')]),
    ).to.be.revertedWithCustomError(contrato, 'CodigoYaRegistrado')
    // Si uno falla, no se registra ninguno de la transacción.
    expect((await contrato.consultar(doble[0]))[0]).to.equal(false)
  })

  it('acepta hasta 50 por transacción; 0 o 51 se rechazan', async () => {
    const { contrato, director } = await conFirmante()
    expect(await contrato.MAXIMO_POR_TRANSACCION()).to.equal(50n)
    const cincuenta = lote(50)
    await contrato
      .connect(director)
      .registrarDocumentos(cincuenta.codigos, cincuenta.hashes, cincuenta.hmacs)
    expect((await contrato.consultar(cincuenta.codigos[49]))[0]).to.equal(true)
    const muchos = lote(51, 'DRA-2026-E')
    await expect(
      contrato.connect(director).registrarDocumentos(muchos.codigos, muchos.hashes, muchos.hmacs),
    )
      .to.be.revertedWithCustomError(contrato, 'CantidadInvalida')
      .withArgs(51)
    await expect(contrato.connect(director).registrarDocumentos([], [], []))
      .to.be.revertedWithCustomError(contrato, 'CantidadInvalida')
      .withArgs(0)
  })

  it('rechaza listas de distinto largo, códigos vacíos o largos y hashes vacíos', async () => {
    const { contrato, director } = await conFirmante()
    const c = contrato.connect(director)
    await expect(
      c.registrarDocumentos(['DRA-2026-F00001'], [], [hash('x')]),
    ).to.be.revertedWithCustomError(contrato, 'LongitudesDistintas')
    await expect(
      c.registrarDocumentos([''], [hash('a')], [hash('b')]),
    ).to.be.revertedWithCustomError(contrato, 'CodigoInvalido')
    await expect(
      c.registrarDocumentos(['X'.repeat(33)], [hash('a')], [hash('b')]),
    ).to.be.revertedWithCustomError(contrato, 'CodigoInvalido')
    await expect(
      c.registrarDocumentos(['DRA-2026-F00002'], [ethers.ZeroHash], [hash('b')]),
    ).to.be.revertedWithCustomError(contrato, 'DatosIncompletos')
    await expect(
      c.registrarDocumentos(['DRA-2026-F00003'], [hash('a')], [ethers.ZeroHash]),
    ).to.be.revertedWithCustomError(contrato, 'DatosIncompletos')
  })
})
