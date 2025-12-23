#!/usr/bin/env node
import { createWalletClient, createPublicClient, http, formatUnits, parseAbi } from 'viem';
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

// Load ABIs
const dcaAgentABI = JSON.parse(readFileSync(join(__dirname, '../frontend/lib/abis/generated/dcaAgent.ts'), 'utf-8')
  .replace('export const dcaAgentABI = ', '')
  .replace(' as const;', ''));

// Validate configuration
if (!KEEPER_PRIVATE_KEY) {
  console.error('❌ KEEPER_PRIVATE_KEY not set in .env file');
  process.exit(1);
}

if (!DCA_AGENT_ADDRESS) {
  console.error('❌ DCA_AGENT_ADDRESS not set in .env file');
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

// Event tracking
const DCAScheduleCreatedTopic = '0x' + 'DCAScheduleCreated'.padEnd(64, '0'); // Simplified - proper event hash needed

// State tracking
const trackedUsers = new Set();
const lastExecutionTimes = new Map(); // user:scheduleId -> timestamp

console.log('🤖 AgentSwarm Keeper Service Starting...');
console.log('📋 Configuration:');
console.log(`   Keeper Address: ${account.address}`);
console.log(`   DCA Agent: ${DCA_AGENT_ADDRESS}`);
console.log(`   RPC URL: ${RPC_URL}`);
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

// Get all schedules for a user
async function getUserSchedules(userAddress) {
  try {
    const scheduleCount = await publicClient.readContract({
      address: DCA_AGENT_ADDRESS,
      abi: dcaAgentABI,
      functionName: 'getUserScheduleCount',
      args: [userAddress],
    });

    const schedules = [];
    for (let i = 0; i < Number(scheduleCount); i++) {
      const schedule = await publicClient.readContract({
        address: DCA_AGENT_ADDRESS,
        abi: dcaAgentABI,
        functionName: 'getSchedule',
        args: [userAddress, BigInt(i)],
      });

      if (schedule.active) {
        schedules.push({ id: i, ...schedule });
      }
    }

    return schedules;
  } catch (error) {
    console.error(`   Error fetching schedules for ${userAddress}:`, error.message);
    return [];
  }
}

// Check if schedule is ready to execute
function isScheduleReady(schedule) {
  const now = Math.floor(Date.now() / 1000);
  const nextExecution = Number(schedule.lastExecutionTime) + Number(schedule.intervalSeconds);
  return now >= nextExecution;
}

// Execute a DCA schedule
async function executeDCASchedule(userAddress, scheduleId) {
  try {
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
        args: [userAddress, BigInt(scheduleId)],
        account,
      });
    } catch (simError) {
      console.error(`   ❌ Simulation failed: ${simError.message}`);
      return false;
    }

    // Execute the transaction
    const hash = await walletClient.writeContract({
      address: DCA_AGENT_ADDRESS,
      abi: dcaAgentABI,
      functionName: 'executeDCA',
      args: [userAddress, BigInt(scheduleId)],
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

      // Update last execution time
      lastExecutionTimes.set(`${userAddress}:${scheduleId}`, Math.floor(Date.now() / 1000));
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

// Discover new users by scanning DCAScheduleCreated events
async function discoverNewUsers() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(10000); // Last ~2 hours of blocks

    const logs = await publicClient.getLogs({
      address: DCA_AGENT_ADDRESS,
      fromBlock,
      toBlock: currentBlock,
    });

    for (const log of logs) {
      try {
        const decoded = publicClient.decodeEventLog({
          abi: dcaAgentABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'DCAScheduleCreated') {
          const userAddress = decoded.args.user;
          if (!trackedUsers.has(userAddress)) {
            trackedUsers.add(userAddress);
            console.log(`👤 Discovered new user: ${userAddress}`);
          }
        }
      } catch {
        // Skip logs that don't decode
      }
    }
  } catch (error) {
    console.error('Error discovering users:', error.message);
  }
}

// Main monitoring loop
async function monitorAndExecute() {
  console.log(`\n⏰ ${new Date().toLocaleString()} - Checking schedules...`);

  try {
    // Check keeper balance periodically
    await checkKeeperBalance();

    // Discover new users
    await discoverNewUsers();

    if (trackedUsers.size === 0) {
      console.log('   No users to monitor yet. Waiting for DCA schedules...');
      return;
    }

    console.log(`   Monitoring ${trackedUsers.size} user(s)`);

    let totalChecked = 0;
    let totalExecuted = 0;

    // Check each user's schedules
    for (const userAddress of trackedUsers) {
      const schedules = await getUserSchedules(userAddress);

      for (const schedule of schedules) {
        totalChecked++;

        if (isScheduleReady(schedule)) {
          console.log(`   🔔 Schedule #${schedule.id} for ${userAddress} is ready!`);
          const success = await executeDCASchedule(userAddress, schedule.id);
          if (success) totalExecuted++;
        }
      }
    }

    console.log(`   📊 Checked ${totalChecked} schedule(s), executed ${totalExecuted}`);
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

    // Initial discovery
    await discoverNewUsers();

    console.log('\n✅ Keeper service started successfully!\n');
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
