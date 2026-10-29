// Billetera de prueba para Playwright (HU06): reemplaza a MetaMask con un proveedor EIP-1193
// inyectado en la página. Firma transacciones REALES con una clave de prueba y las envía a la red
// Besu local; las consultas (eth_call, recibos) van directo al nodo. La interfaz recorre el mismo
// camino que con MetaMask: pedir cuentas, cambiar o agregar la red, eth_sendTransaction y esperar
// el recibo. Solo para pruebas: nunca usar con claves reales.
const { JsonRpcProvider, Wallet, toBeHex } = require('ethers')

/**
 * Instala la billetera en un contexto de Playwright.
 * @returns {{ usar: (clave: string) => void, redesAgregadas: string[], transacciones: string[] }}
 */
async function instalarBilletera(contexto, rpcUrl) {
  const nodo = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true })
  let cuenta = null
  // Empieza en otra red (Ethereum, 0x1) para probar el cambio de red, como un MetaMask nuevo.
  let redActual = '0x1'
  const redesConocidas = new Set(['0x1'])
  const estado = { redesAgregadas: [], transacciones: [] }

  const atender = async ({ method, params = [] }) => {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return cuenta ? [cuenta.address] : []
      case 'eth_chainId':
        return redActual
      case 'wallet_switchEthereumChain':
        if (!redesConocidas.has(params[0].chainId))
          throw { code: 4902, message: 'Red desconocida' }
        redActual = params[0].chainId
        return null
      case 'wallet_addEthereumChain':
        redesConocidas.add(params[0].chainId)
        estado.redesAgregadas.push(params[0].chainName)
        redActual = params[0].chainId
        return null
      case 'eth_sendTransaction': {
        const { to, data } = params[0]
        const tx = await cuenta.connect(nodo).sendTransaction({ to, data, gasPrice: 0n, type: 0 })
        estado.transacciones.push(tx.hash)
        return tx.hash
      }
      default:
        if (redActual !== toBeHex(20260)) throw { code: 4901, message: 'Red equivocada' }
        return nodo.send(method, params)
    }
  }

  await contexto.exposeFunction('__billeteraDePrueba', async (pedido) => {
    try {
      return { resultado: await atender(pedido) }
    } catch (e) {
      return { error: { code: e.code ?? -32603, message: e.message ?? String(e) } }
    }
  })
  await contexto.addInitScript(() => {
    window.ethereum = {
      isMetaMask: false,
      request: async (pedido) => {
        const { resultado, error } = await window.__billeteraDePrueba(pedido)
        if (error) throw Object.assign(new Error(error.message), { code: error.code })
        return resultado
      },
      on() {},
      removeListener() {},
    }
  })
  return { ...estado, usar: (clave) => (cuenta = new Wallet(clave)), estado }
}

module.exports = { instalarBilletera }
