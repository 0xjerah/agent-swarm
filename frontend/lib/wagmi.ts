import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains' // Replace with actual EIP-7702 chain
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia], // Update to EIP-7702 supported chain
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'AgentSwarm',
        url: 'https://agentswarm.vercel.app',
      },
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
})