import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable, defineConfig } from 'hardhat/config'

// Compilador local opcional (WASM de solc, por ejemplo node_modules/solc/soljson.js del paquete
// npm "solc"), para redes donde no se puede descargar el compilador oficial. En la CI no se usa.
const compiladorLocal = process.env.SOLC_RUTA ? { path: process.env.SOLC_RUTA } : {}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.30',
        ...compiladorLocal,
        // Debe coincidir con el último hito activado en el génesis de Besu (cancunTime).
        settings: { evmVersion: 'cancun' },
      },
      production: {
        version: '0.8.30',
        ...compiladorLocal,
        settings: {
          evmVersion: 'cancun',
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    // Red Besu local de plataforma/infra (perfil besu del docker compose).
    besuLocal: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('BESU_RPC_URL'),
    },
  },
})
