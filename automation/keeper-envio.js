#!/usr/bin/env node
import { createWalletClient, createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Configuration
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const DCA_AGENT_ADDRESS = process.env.DCA_AGENT_ADDRESS;
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60') * 1000; // Convert to ms
const MAX_GAS_PRICE = BigInt(process.env.MAX_GAS_PRICE || '50000000000'); // 50 gwei default
const ENVIO_GRAPHQL_URL = process.env.ENVIO_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';

// Load ABIs
const dcaAgentABI = JSON.parse(readFileSync(join(__dirname, '../frontend/lib/abis/generated/dcaAgent.ts'), 'utf-8')
  .replace('export const dcaAgentABI = ', '')
  .replace(' as const;', ''));

// Validate configuration
if (!KEEPER_PRIVATE_KEY) {
  console.error(' KEEPER_PRIVATE_KEY not set in .env file');
  process.exit(1);
}

if (!DCA_AGENT_ADDRESS) {
  console.error(' DCA_AGENT_ADDRESS not set in .env file');
  process.exit(1);
}

// Setup clients
const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
});

console.log(' AgentSwarm Keeper Service (Envio-Powered) Starting...');
console.log(' Configuration:');
console.log(`   Keeper Address: ${account.address}`);
console.log(`   DCA Agent: ${DCA_AGENT_ADDRESS}`);
console.log(`   RPC URL: ${RPC_URL}`);
console.log(`   Envio GraphQL: ${ENVIO_GRAPHQL_URL}`);
console.log(`   Check Interval: ${CHECK_INTERVAL / 1000}s`);
console.log(`   Max Gas Price: ${formatUnits(MAX_GAS_PRICE, 9)} gwei`);
console.log('');

// Check keeper balance
async function checkKeeperBalance() {
  const balance = await publicClient.getBalance({ address: account.address });
  const balanceEth = formatUnits(balance, 18);

  if (balance < BigInt('10000000000000000')) { // Less than 0.01 ETH
    console.warn(`⚠️  Low keeper balance: ${balanceEth} ETH`);
    console.warn('   Please fund the keeper wallet to continue operations');
  } else {
    console.log(`💰 Keeper Balance: ${balanceEth} ETH`);
  }

  return balance;
}

// Query Envio for ready-to-execute schedules
async function getReadySchedules() {
  const currentTime = Math.floor(Date.now() / 1000);

  const query = `
    query GetReadySchedules {
      DCASchedule(
        where: {
          active: { _eq: true }
        }
      ) {
        id
        user
        scheduleId
        amountPerPurchase
        intervalSeconds
        lastExecutionTime
        totalExecutions
      }
    }
  `;

  try {
    const response = await fetch(ENVIO_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return [];
    }

    // Filter schedules that are ready to execute
    const allSchedules = result.data?.DCASchedule || [];
    const readySchedules = allSchedules.filter(schedule => {
      const lastExecution = Number(schedule.lastExecutionTime);
      const interval = Number(schedule.intervalSeconds);
      const nextExecution = lastExecution + interval;
      return currentTime >= nextExecution;
    });

    return readySchedules;
  } catch (error) {
    console.error('Error fetching schedules from Envio:', error.message);
    return [];
  }
}

// Execute a DCA schedule
async function executeDCASchedule(schedule) {
  try {
    const userAddress = schedule.user;
    const scheduleId = BigInt(schedule.scheduleId);

    console.log(`   ⚙️  Executing schedule #${scheduleId} for ${userAddress}...`);

    // Check gas price
    const gasPrice = await publicClient.getGasPrice();
    if (gasPrice > MAX_GAS_PRICE) {
      console.log(`   ⏸️  Gas price too high: ${formatUnits(gasPrice, 9)} gwei (max: ${formatUnits(MAX_GAS_PRICE, 9)} gwei)`);
      return false;
    }

    // Simulate first to check if it will succeed
    try {
      await publicClient.simulateContract({
        address: DCA_AGENT_ADDRESS,
        abi: dcaAgentABI,
        functionName: 'executeDCA',
        args: [userAddress, scheduleId],
        account,
      });
    } catch (simError) {
      console.error(`    Simulation failed: ${simError.message}`);
      return false;
    }

    // Execute the transaction
    const hash = await walletClient.writeContract({
      address: DCA_AGENT_ADDRESS,
      abi: dcaAgentABI,
      functionName: 'executeDCA',
      args: [userAddress, scheduleId],
      gas: BigInt(500000),
    });

    console.log(`   📤 Transaction sent: ${hash}`);
    console.log(`   🔗 https://sepolia.etherscan.io/tx/${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      // Parse DCAExecuted event
      const dcaExecutedLog = receipt.logs.find(log => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: dcaAgentABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === 'DCAExecuted';
        } catch {
          return false;
        }
      });

      if (dcaExecutedLog) {
        const decoded = publicClient.decodeEventLog({
          abi: dcaAgentABI,
          data: dcaExecutedLog.data,
          topics: dcaExecutedLog.topics,
        });

        console.log(`   ✅ Execution successful!`);
        console.log(`   💸 Spent: ${formatUnits(decoded.args.amountSpent, 6)} USDC`);
        console.log(`   🎯 Received: ${formatUnits(decoded.args.amountReceived, 18)} WETH`);
      } else {
        console.log(`   ✅ Execution successful!`);
      }

      return true;
    } else {
      console.error(`   ❌ Transaction failed`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Execution error:`, error.message);
    return false;
  }
}

// Main monitoring loop
async function monitorAndExecute() {
  console.log(`\n⏰ ${new Date().toLocaleString()} - Checking schedules...`);

  try {
    // Check keeper balance periodically
    await checkKeeperBalance();

    // Get ready schedules from Envio
    const readySchedules = await getReadySchedules();

    if (readySchedules.length === 0) {
      console.log('   No schedules ready for execution.');
      return;
    }

    console.log(`   Found ${readySchedules.length} schedule(s) ready for execution`);

    let totalExecuted = 0;

    // Execute each ready schedule
    for (const schedule of readySchedules) {
      console.log(`   🔔 Schedule #${schedule.scheduleId} for ${schedule.user} is ready!`);
      const success = await executeDCASchedule(schedule);
      if (success) totalExecuted++;
    }

    console.log(`   📊 Executed ${totalExecuted}/${readySchedules.length} schedule(s)`);
  } catch (error) {
    console.error('❌ Error in monitoring loop:', error);
  }
}

// Graceful shutdown
let isShuttingDown = false;

process.on('SIGINT', () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('\n\n🛑 Shutting down keeper service...');
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    console.log('\n\n🛑 Shutting down keeper service...');
    process.exit(0);
  }
});

// Start the keeper service
async function start() {
  try {
    // Initial balance check
    await checkKeeperBalance();

    // Test Envio connection
    console.log('\n🔍 Testing Envio connection...');
    const testSchedules = await getReadySchedules();
    console.log(`✅ Envio connected! Found ${testSchedules.length} active schedule(s)\n`);

    console.log('✅ Keeper service started successfully!\n');
    console.log('Press Ctrl+C to stop\n');

    // Initial check
    await monitorAndExecute();

    // Set up periodic checks
    setInterval(monitorAndExecute, CHECK_INTERVAL);
  } catch (error) {
    console.error('❌ Failed to start keeper service:', error);
    process.exit(1);
  }
}

start();
