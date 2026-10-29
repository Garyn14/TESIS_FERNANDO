import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable, defineConfig } from 'hardhat/config'

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: '0.8.30',
      },
      production: {
        version: '0.8.30',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    // Red Besu local (docker compose de plataforma/infra), se agrega en DRA-45.
    besuLocal: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('BESU_RPC_URL'),
    },
  },
})
