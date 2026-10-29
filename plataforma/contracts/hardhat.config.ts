import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable, defineConfig } from 'hardhat/config'

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.30',
        // Debe coincidir con el último hito activado en el génesis de Besu (cancunTime).
        settings: { evmVersion: 'cancun' },
      },
      production: {
        version: '0.8.30',
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
