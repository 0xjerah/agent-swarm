import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const MASTER_AGENT_ADDRESS = '0x1fd734c9c78e9c34238c2b5f4E936368727326f6';
const YIELD_AGENT_COMPOUND_ADDRESS = '0x7cbD25A489917C3fAc92EFF1e37C3AE2afccbcf2';

// MasterAgent ABI (only the functions we need)
const masterAgentABI = [
  {
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'agentType', type: 'string' }
    ],
    name: 'registerAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'registeredAgents',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

async function main() {
  // Setup client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://rpc.sepolia.org'),
  });

  // Check if PRIVATE_KEY is set
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env file');
    console.log('\nPlease add your private key to the .env file:');
    console.log('PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://rpc.sepolia.org'),
  });

  console.log('🔍 Checking if Compound V3 Yield Agent is registered...');
  console.log(`Agent address: ${YIELD_AGENT_COMPOUND_ADDRESS}`);
  console.log(`MasterAgent: ${MASTER_AGENT_ADDRESS}`);
  console.log(`Using account: ${account.address}\n`);

  // Check if already registered
  const isRegistered = await publicClient.readContract({
    address: MASTER_AGENT_ADDRESS as `0x${string}`,
    abi: masterAgentABI,
    functionName: 'registeredAgents',
    args: [YIELD_AGENT_COMPOUND_ADDRESS as `0x${string}`],
  });

  if (isRegistered) {
    console.log('✅ Agent is already registered!');
    process.exit(0);
  }

  console.log('⚠️  Agent is NOT registered. Registering now...\n');

  try {
    // Register the agent
    const hash = await walletClient.writeContract({
      address: MASTER_AGENT_ADDRESS as `0x${string}`,
      abi: masterAgentABI,
      functionName: 'registerAgent',
      args: [YIELD_AGENT_COMPOUND_ADDRESS as `0x${string}`, 'YieldAgentCompound'],
    });

    console.log('📝 Transaction submitted:', hash);
    console.log('⏳ Waiting for confirmation...\n');

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ Compound V3 Yield Agent registered successfully!');
      console.log(`Transaction: https://sepolia.etherscan.io/tx/${hash}`);
    } else {
      console.log('❌ Transaction failed');
      console.log(`Transaction: https://sepolia.etherscan.io/tx/${hash}`);
    }
  } catch (error: any) {
    console.error('❌ Error registering agent:', error.message);

    if (error.message.includes('Ownable')) {
      console.log('\n⚠️  Only the contract owner can register agents.');
      console.log('Make sure you are using the correct private key (contract owner).');
    }

    process.exit(1);
  }
}

main();
