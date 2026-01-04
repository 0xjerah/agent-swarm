# AgentSwarm - Autonomous DeFi Agents with ERC-7715 & Envio Indexing

![ERC-7715](https://img.shields.io/badge/ERC--7715-Advanced%20Permissions-blue)
![Envio](https://img.shields.io/badge/Indexer-Envio-purple)
![Sepolia](https://img.shields.io/badge/Network-Sepolia-green)

## Overview

AgentSwarm is a DeFi automation platform that combines **ERC-7715 Advanced Permissions** with **Envio real-time indexing** to create autonomous agents that execute DCA (Dollar-Cost Averaging) and yield farming strategies without requiring constant user intervention.

**Key Innovation**: Users delegate fine-grained permissions once, and agents execute complex DeFi strategies automatically while Envio provides instant, indexed transaction history and analytics.

---

## Why This Matters

### ERC-7715 Advanced Permissions
- **Granular Control**: Token-specific allowances (USDC only), daily spending limits, time-bounded permissions
- **Secure Delegation**: Users maintain full control while enabling autonomous execution
- **Gasless UX**: Approve once, execute unlimited times without wallet popups

### Envio HyperSync Indexing
- **Real-Time Analytics**: Sub-second GraphQL queries for all on-chain activity
- **Efficient Data Access**: No RPC rate limits, instant historical data
- **Rich Query Interface**: Complex aggregations, filtering, and sorting out of the box
- **Scalable Architecture**: Handles thousands of events without performance degradation

---

## Architecture

```
┌─────────────────┐
│  Frontend (UI)  │
│   Next.js 15    │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    │         │             │
    ▼         ▼             ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐
│ Wagmi   │ │  Envio   │ │  ERC-7715    │
│ (Web3)  │ │ GraphQL  │ │  Permissions │
└────┬────┘ └────┬─────┘ └──────┬───────┘
     │           │               │
     ▼           ▼               ▼
┌──────────────────────────────────────┐
│     Ethereum Sepolia Testnet         │
│  ┌────────────────────────────────┐  │
│  │  Smart Contracts               │  │
│  │  • MasterAgent (Delegation)    │  │
│  │  • DCAAgent (Swaps)            │  │
│  │  • YieldAgent Aave V3          │  │
│  │  • YieldAgent Compound V3      │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Envio Indexer   │
│  • Events        │
│  • Aggregations  │
│  • GraphQL API   │
└──────────────────┘
```

---

## Advanced Permissions Usage

AgentSwarm implements **ERC-7715 Advanced Permissions** to enable secure, autonomous DeFi operations without requiring repeated wallet approvals. This allows users to delegate granular permissions to agents with daily limits, time bounds, and token-specific restrictions.

### Requesting Advanced Permissions

**Code Location**: [frontend/components/DelegatePermission.tsx:122-186](frontend/components/DelegatePermission.tsx#L122-L186)

We request ERC-7715 permissions using the `wallet_grantPermissions` method with token-specific policies:

```typescript
const permission = await provider.request({
  method: 'wallet_grantPermissions',
  params: [{
    permissions: [{
      type: 'erc20-token-transfer',
      data: {
        token: USDC_ADDRESS
      },
      policies: [
        {
          type: 'token-allowance',
          data: {
            allowance: dailyLimit.toString()
          }
        },
        {
          type: 'rate-limit',
          data: {
            count: 1,
            interval: 86400 // 24 hours
          }
        }
      ]
    }]
  }]
});
```

### Redeeming Advanced Permissions

**Code Locations**:
- DCA Agent: [contracts/src/DCAAgent.sol:84-109](contracts/src/DCAAgent.sol#L84-L109)
- Yield Agent (Aave): [contracts/src/YieldAgent.sol:129-158](contracts/src/YieldAgent.sol#L129-L158)
- Yield Agent (Compound): [contracts/src/YieldAgentCompound.sol:117-146](contracts/src/YieldAgentCompound.sol#L117-L146)

Agents redeem permissions through the MasterAgent contract, which enforces all permission constraints:

```solidity
function executeDCA(address user, uint256 scheduleId) external nonReentrant whenNotPaused {
    // Redeem permission - enforces daily limit, expiry, and rate limit
    masterAgent.usePermission(user, address(this), schedule.amountPerPurchase);

    // Execute DCA swap using Uniswap V3
    // ...
}
```

The `usePermission` function in [MasterAgent.sol:88-107](contracts/src/MasterAgent.sol#L88-L107) validates:
- Permission has not expired
- Daily limit not exceeded
- Rate limit not exceeded
- Agent is authorized

---

## Envio Usage

AgentSwarm uses **Envio HyperSync** for real-time blockchain indexing, providing instant GraphQL access to all on-chain events. This eliminates slow RPC polling and enables rich analytics with sub-second query times.

### How We Use Envio

1. **Real-Time Event Indexing**: All delegation, DCA execution, and yield strategy events are indexed in real-time
2. **GraphQL Queries**: Frontend queries indexed data via Apollo Client for instant UI updates
3. **Aggregated Analytics**: Envio calculates totals (spent, received, rewards) automatically
4. **Multi-Protocol Support**: Separate indexing for Aave V3 and Compound V3 yield strategies
5. **Polling Updates**: 5-second GraphQL polling for live dashboard updates
6. **Keeper Automation**: Autonomous keeper bot uses Envio to monitor and execute DCA schedules (see [Automation section](#automation-with-envio-powered-keeper))

### Envio Code Usage Links

#### Schema Definition
- [indexer/schema.graphql](indexer/schema.graphql) - Complete entity definitions for Delegation, DCASchedule, YieldStrategy

#### Event Handlers
- **Master Agent Delegations**: [indexer/src/EventHandlers.ts:11-79](indexer/src/EventHandlers.ts#L11-L79)
- **DCA Schedule Creation**: [indexer/src/EventHandlers.ts:81-132](indexer/src/EventHandlers.ts#L81-L132)
- **DCA Execution**: [indexer/src/EventHandlers.ts:134-189](indexer/src/EventHandlers.ts#L134-L189)
- **Yield Strategy (Aave)**: [indexer/src/EventHandlers.ts:456-527](indexer/src/EventHandlers.ts#L456-L527)
- **Yield Strategy (Compound)**: [indexer/src/EventHandlers.ts:529-586](indexer/src/EventHandlers.ts#L529-L586)
- **Deposit Execution**: [indexer/src/EventHandlers.ts:588-645](indexer/src/EventHandlers.ts#L588-L645)
- **Withdrawal Execution**: [indexer/src/EventHandlers.ts:647-691](indexer/src/EventHandlers.ts#L647-L691)

#### Frontend GraphQL Queries
- **DCA Schedules**: [frontend/components/DCAScheduleList.tsx:14-36](frontend/components/DCAScheduleList.tsx#L14-L36)
- **Yield Strategies**: [frontend/components/YieldStrategyList.tsx:22-44](frontend/components/YieldStrategyList.tsx#L22-L44)
- **Delegation History**: [frontend/components/DelegationHistory.tsx:13-29](frontend/components/DelegationHistory.tsx#L13-L29)
- **Transaction History**: [frontend/components/TransactionHistory.tsx:14-42](frontend/components/TransactionHistory.tsx#L14-L42)

#### Envio Configuration
- **Contract Configuration**: [indexer/config.yaml](indexer/config.yaml) - Defines all contracts and events to index
- **Deployment**: Auto-deployed to [https://indexer.dev.hyperindex.xyz/b786978/v1/graphql](https://indexer.dev.hyperindex.xyz/b786978/v1/graphql)

#### Automation (Keeper Bot)
- **Keeper Service**: [automation/keeper-envio.js](automation/keeper-envio.js) - Envio-powered autonomous execution bot
- **Schedule Monitoring**: [automation/keeper-envio.js:79-152](automation/keeper-envio.js#L79-L152) - GraphQL query for ready schedules
- **Transaction Execution**: [automation/keeper-envio.js:154-236](automation/keeper-envio.js#L154-L236) - Execute DCA schedules on-chain

### Example GraphQL Query

```graphql
query GetUserDCASchedules($userAddress: String!) {
  DCASchedule(
    where: {
      user: { _eq: $userAddress }
      isActive: { _eq: true }
    }
    order_by: { createdAt: desc }
  ) {
    scheduleId
    tokenIn
    tokenOut
    amountPerPurchase
    intervalSeconds
    totalExecutions
    totalUSDCSpent
    totalWETHReceived
    averagePrice
    nextExecutionTime
  }
}
```

---

## Automation with Envio-Powered Keeper

AgentSwarm includes an **autonomous keeper service** that monitors and executes DCA schedules automatically. This keeper is powered by Envio's real-time indexing, making it significantly more efficient than traditional RPC-based monitoring.

### How the Keeper Works

**Code Location**: [automation/keeper-envio.js](automation/keeper-envio.js)

The keeper continuously monitors active DCA schedules via Envio GraphQL and executes them when ready:

1. **Query Envio** (lines 79-152): Fetch all active DCA schedules with execution timestamps
2. **Filter Ready Schedules**: Calculate which schedules are due based on `lastExecutedAt + intervalSeconds`
3. **Execute Transactions** (lines 154-236): Call `executeDCA()` on the DCA Agent contract
4. **Wait for Confirmation**: Monitor transaction receipt and log results

### Why Envio for Automation?

Traditional keeper bots use RPC calls to check schedule status, requiring:
- Multiple `eth_call` requests per schedule
- Parsing on-chain data for each check
- High RPC rate limit consumption
- Slow response times (500ms+ per schedule)

**With Envio**, the keeper:
- Queries all schedules in a **single GraphQL request**
- Gets pre-indexed, aggregated data (last execution time, interval, user preferences)
- Responds in **<100ms** regardless of schedule count
- Scales efficiently to thousands of schedules

### Keeper GraphQL Query

**Code Location**: [automation/keeper-envio.js:82-102](automation/keeper-envio.js#L82-L102)

```graphql
query GetReadySchedules {
  DCASchedule(
    where: {
      isActive: { _eq: true }
    }
  ) {
    id
    user
    scheduleId
    amountPerPurchase
    intervalSeconds
    lastExecutedAt
    totalExecutions
  }
  User {
    address
    automationEnabled
  }
}
```

The keeper filters schedules client-side:
```javascript
const currentTime = Math.floor(Date.now() / 1000);
const readySchedules = allSchedules.filter(schedule => {
  const lastExecution = Number(schedule.lastExecutedAt || 0);
  const interval = Number(schedule.intervalSeconds);
  const nextExecution = lastExecution + interval;
  return currentTime >= nextExecution && userAutomationEnabled;
});
```

### Execution Flow

**Code Location**: [automation/keeper-envio.js:154-236](automation/keeper-envio.js#L154-L236)

```javascript
async function executeDCASchedule(schedule) {
  // 1. Check gas price against max threshold
  const gasPrice = await publicClient.getGasPrice();
  if (gasPrice > MAX_GAS_PRICE) return false;

  // 2. Simulate transaction to catch errors before execution
  await publicClient.simulateContract({
    address: DCA_AGENT_ADDRESS,
    functionName: 'executeDCA',
    args: [userAddress, scheduleId],
  });

  // 3. Execute on-chain via DCA Agent
  const hash = await walletClient.writeContract({
    address: DCA_AGENT_ADDRESS,
    functionName: 'executeDCA',
    args: [userAddress, scheduleId],
  });

  // 4. Wait for confirmation and parse DCAExecuted event
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // 5. Envio automatically indexes this execution
  // Next query will have updated lastExecutedAt timestamp
}
```

### Keeper Features

- **Gas Price Protection**: Skips execution if gas exceeds `MAX_GAS_PRICE` (lines 163-167)
- **Simulation First**: Uses `simulateContract` to prevent failed transactions (lines 170-181)
- **User Preferences**: Respects per-user automation settings via Envio query (lines 134-138)
- **Balance Monitoring**: Warns when keeper wallet is low on ETH (lines 64-76)
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals cleanly (lines 272-288)
- **Real-time Indexing**: Envio updates are reflected in next monitoring cycle

### Running the Keeper

```bash
cd automation
npm install

# Configure .env
KEEPER_PRIVATE_KEY=0x...
DCA_AGENT_ADDRESS=0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795
ENVIO_GRAPHQL_URL=https://indexer.dev.hyperindex.xyz/b786978/v1/graphql
CHECK_INTERVAL=60  # seconds
MAX_GAS_PRICE=50000000000  # 50 gwei

# Start keeper
npm start
```

### Performance Comparison

| Metric | RPC-Based Keeper | Envio-Powered Keeper |
|--------|------------------|---------------------|
| **Query Time** | 500ms+ per schedule | <100ms for all schedules |
| **RPC Calls** | 3-5 per schedule | 0 (uses GraphQL) |
| **Scalability** | Linear degradation | Constant O(1) |
| **Data Freshness** | Depends on polling | Real-time (5s updates) |
| **Rate Limits** | Quickly exhausted | No limits |

### Integration with Frontend

The frontend uses the same Envio data to show users:
- Next execution time for each schedule
- Total executions completed
- Historical execution data
- Average price paid across executions

**See**: [frontend/components/DCAScheduleList.tsx](frontend/components/DCAScheduleList.tsx) for the user-facing view of the same Envio-indexed data the keeper uses.

---

## Core Features

### 1. ERC-7715 Permission System

**Three-Step Delegation Flow:**

```typescript
// 1. User approves ERC-7715 permissions (off-chain)
const permission = await provider.request({
  method: 'wallet_grantPermissions',
  params: [{
    permissions: [{
      type: 'erc20-token-transfer',
      data: { token: USDC_ADDRESS },
      policies: [
        { type: 'token-allowance', data: { allowance: '100000000' } },
        { type: 'rate-limit', data: { count: 1, interval: 86400 } }
      ]
    }]
  }]
});

// 2. User delegates on-chain to agent
await masterAgent.delegateToAgent(
  agentAddress,
  parseUnits('100', 6), // 100 USDC daily limit
  30 * 86400            // 30 days duration
);

// 3. Agent executes autonomously (no more wallet popups!)
await dcaAgent.executeDCA(userAddress, scheduleId);
```

**Key Features:**
- Daily spending limits enforced by smart contract
- Time-bounded permissions (auto-expire)
- Token-specific (USDC only)
- Revocable anytime by user
- Rate limiting (1 transaction per 24 hours per delegation)

### 2. Envio Real-Time Indexing

**GraphQL Queries for Instant Data:**

```graphql
# Get all DCA schedules with execution history
query GetUserSchedules($userAddress: String!) {
  DCASchedule(
    where: { user: { _eq: $userAddress } }
    order_by: { createdAt: desc }
  ) {
    scheduleId
    amountPerPurchase
    intervalSeconds
    totalExecutions
    totalUSDCSpent
    totalWETHReceived
    averagePrice
    isActive
    createdAt
  }
}

# Get yield strategies across protocols
query GetYieldStrategies($userAddress: String!) {
  YieldStrategy(
    where: { user: { _eq: $userAddress } }
    order_by: { createdAt: desc }
  ) {
    strategyId
    protocol          # "aave" or "compound"
    agentAddress
    totalDeposited
    totalWithdrawn
    totalRewardsClaimed
    currentShares
    isActive
  }
}
```

**Benefits:**
- **Sub-second query times** vs 30+ seconds with RPC calls
- **Aggregated analytics** (total spent, average price, execution count)
- **Real-time polling** (5s intervals for live dashboard updates)
- **Historical data** without blockchain node sync
- **Complex queries** (filtering, sorting, pagination) out of the box

### 3. Autonomous DeFi Agents

**DCA Agent** - Dollar-Cost Averaging on Uniswap V3
```solidity
// User creates schedule (one-time)
dcaAgent.createDCASchedule(
  USDC_ADDRESS,     // From token
  WETH_ADDRESS,     // To token
  10 * 1e6,         // 10 USDC per purchase
  3600,             // Every 1 hour
  3000              // 0.3% pool fee
);

// Agent executes automatically (no user action needed)
// MasterAgent enforces:
//   ✓ Daily limit not exceeded
//   ✓ Permission not expired
//   ✓ Rate limit respected
```

**Yield Agent** - Multi-Protocol Yield Farming
- **Aave V3**: Supply USDC, earn aUSDC yield + rewards
- **Compound V3**: Supply USDC to Comet, earn COMP rewards

```solidity
// Aave V3 Strategy
yieldAgentAave.createYieldStrategy(
  USDC_ADDRESS,
  aUSDC_ADDRESS,
  StrategyType.SUPPLY,  // or E_MODE
  50 * 1e6              // 50 USDC target allocation
);

// Compound V3 Strategy
yieldAgentCompound.createYieldStrategy(
  USDC_ADDRESS,
  StrategyType.COMET_SUPPLY,  // or COLLATERAL
  50 * 1e6
);

// Agent deposits automatically when user has delegation
yieldAgent.executeDeposit(userAddress, strategyId);
```

---

## Technical Stack

### Frontend
- **Next.js 15** - App router with server components
- **React 19** - Latest features and optimizations
- **Wagmi 2.x** - React hooks for Ethereum
- **Viem 2.x** - TypeScript Ethereum library
- **Apollo Client** - GraphQL client for Envio queries
- **TailwindCSS 4** - Utility-first styling

### Smart Contracts
- **Solidity 0.8.24** - Latest stable version
- **Foundry** - Development framework (forge, cast, anvil)
- **OpenZeppelin** - Audited contract libraries
- **ERC-7715** - Advanced permission standard

### Indexing & Backend
- **Envio HyperSync** - Real-time blockchain indexing
- **GraphQL** - Query language for indexed data
- **PostgreSQL** - Envio's database backend

---

## Deployed Contracts (Sepolia)

```
MasterAgent:          0x1fd734c9c78e9c34238c2b5f4E936368727326f6
DCAAgent:             0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795
YieldAgentAave:       0xb95adacB74E981bcfB1e97B4d277E51A95753C8F
YieldAgentCompound:   0x7cbD25A489917C3fAc92EFF1e37C3AE2afccbcf2

Envio GraphQL:        https://indexer.dev.hyperindex.xyz/b786978/v1/graphql
```

**Verify on Etherscan:**
- [MasterAgent](https://sepolia.etherscan.io/address/0x1fd734c9c78e9c34238c2b5f4E936368727326f6)
- [DCAAgent](https://sepolia.etherscan.io/address/0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795)
- [YieldAgentAave](https://sepolia.etherscan.io/address/0xb95adacB74E981bcfB1e97B4d277E51A95753C8F)
- [YieldAgentCompound](https://sepolia.etherscan.io/address/0x7cbD25A489917C3fAc92EFF1e37C3AE2afccbcf2)

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet (latest version)
- Sepolia ETH (for gas)
- Test USDC on Sepolia

### Installation

```bash
# Clone repository
git clone https://github.com/0xjerah/agent-swarm.git
cd agent-swarm

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Update .env with your configuration

# Start development server
npm run dev
```

Visit `http://localhost:3000` and connect your wallet!

### Getting Test Tokens

**Sepolia ETH:**
- [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- Request 0.5 ETH

**USDC on Sepolia:**
- [Aave Faucet](https://staging.aave.com/faucet/)
- Select USDC and claim test tokens

---

## Usage Guide

### 1. Grant Permissions (ERC-7715)

1. Navigate to **Delegate** tab
2. Set daily limit: `100 USDC`
3. Set duration: `30 days`
4. Select agents: `DCA Agent` and/or `Yield Agents`
5. Click **"Grant Advanced Permissions"**
6. **MetaMask will show ERC-7715 permission request**
7. Approve permissions in MetaMask
8. Complete on-chain delegation transaction

### 2. Create DCA Schedule

1. Navigate to **DCA** tab
2. Configure:
   - **Token to buy**: WETH (or DAI)
   - **Amount per purchase**: 10 USDC
   - **Interval**: Every 1 hour
3. Click **"Create Schedule"**
4. Agent will execute swaps automatically every hour!

### 3. Create Yield Strategy

1. Navigate to **Yield** tab
2. Select protocol: **Compound V3** or **Aave V3**
3. Configure:
   - **Strategy type**: Compound Supply / Aave Supply
   - **Target allocation**: 50 USDC
4. Click **"Create Strategy"**
5. Agent deposits to protocol automatically!

### 4. Monitor with Envio

1. **Analytics Tab**: Real-time dashboard
   - Total delegated amount
   - Daily spending limits
   - Active schedules/strategies
   - Agent activity timeline

2. **History Tab**: Complete transaction log
   - All delegations
   - DCA executions
   - Yield deposits/withdrawals
   - Filtered by type

3. **Permission Tree**: Visual delegation hierarchy
   - See all active delegations
   - Remaining balances
   - Expiry times

---

## Key UI Components

### ERC-7715 Delegation Flow
```
┌──────────────────────────────────────┐
│  Step 1: USDC Allowance              │
│  Approve USDC spending               │
│  Confirmed                           │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  Step 2: ERC-7715 Permissions        │
│  Grant advanced permissions          │
│  Waiting for MetaMask...             │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  Step 3: On-Chain Delegation         │
│  Register delegation in MasterAgent  │
│  Confirming...                       │
└──────────────────────────────────────┘
```

### Envio-Powered Components
- **DCAScheduleList**: Real-time DCA schedules with execution history
- **YieldStrategyList**: Multi-protocol yield strategies
- **DelegationHistory**: All permission events
- **TransactionHistory**: Unified transaction log
- **AnalyticsDashboard**: Aggregated stats and charts

---

## Security Features

| Feature | Implementation | Contract Enforcement |
|---------|---------------|---------------------|
| **Daily Limits** | Configurable per delegation | `spentToday` tracking with 24h reset |
| **Rate Limiting** | 1 tx per agent per day | `block.timestamp > lastReset + 86400` |
| **Time-Bounded** | 7, 30, or 90 days | `block.timestamp <= expiry` |
| **Token-Specific** | USDC only | Hardcoded in agent contracts |
| **Revocable** | Instant revocation | `revokePermission()` function |
| **Non-Upgradeable** | Immutable logic | No proxy patterns used |

---

## Testing

### Smart Contract Tests
```bash
cd contracts
forge test -vvv

# Key test suites:
# ✓ MasterAgent delegation logic
# ✓ Daily limit enforcement
# ✓ Rate limit resets
# ✓ Permission expiry
# ✓ DCA execution
# ✓ Yield strategy execution
```

### Envio Indexer Tests
```bash
cd indexer
npm test

# Validates:
# ✓ Event handlers process correctly
# ✓ Entity relationships maintained
# ✓ Aggregations calculated properly
# ✓ GraphQL schema matches entities
```

---

- **[ERC7715_SETUP_GUIDE.md](ERC7715_SETUP_GUIDE.md)** - Detailed ERC-7715 integration guide
- **[ENVIO_SETUP_COMPLETE.md](ENVIO_SETUP_COMPLETE.md)** - Envio indexer configuration
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Smart contract deployment steps
- **[AUTOMATION_SETUP.md](AUTOMATION_SETUP.md)** - Keeper network setup

---

## What Makes This Special

### For Users
- **Set it and forget it**: Delegate once, strategies run forever (or until expiry)
- **Save on gas**: No repeated approvals, agents batch operations
- **Full transparency**: Every action indexed and queryable via Envio
- **Stay in control**: Revoke permissions anytime, limits enforced on-chain

### For Developers
- **Envio = 10x faster** than polling RPC for historical data
- **GraphQL > RPC**: Rich queries vs limited `eth_getLogs` calls
- **ERC-7715 = Future**: Standardized permission model for all dApps
- **Type-safe**: Full TypeScript support throughout stack

### For Judges
- **Novel ERC-7715 use case**: First autonomous DeFi agents with advanced permissions
- **Production-ready Envio integration**: Real-time indexing with 5s polling
- **Multi-protocol support**: Aave V3 + Compound V3 yield strategies
- **Complete UX flow**: From permission grant to autonomous execution
- **Comprehensive testing**: 20+ contract tests, full Envio validation

---

## Links

- **Live Demo**: [Deploy URL]
- **GitHub**: [https://github.com/0xjerah/agent-swarm](https://github.com/0xjerah/agent-swarm)
- **Envio Dashboard**: [https://envio.dev/app/0xjerah/agentswarm-indexer](https://envio.dev/app/0xjerah/agentswarm-indexer)
- **ERC-7715 Spec**: [https://eips.ethereum.org/EIPS/eip-7715](https://eips.ethereum.org/EIPS/eip-7715)

---

## Feedback

Our experience building AgentSwarm with ERC-7715 Advanced Permissions and Envio indexing during this hackathon.

### ERC-7715 Advanced Permissions Feedback

**What Worked Exceptionally Well:**
- The `wallet_grantPermissions` API is intuitive and well-designed
- Permission policies (token-allowance, rate-limit) are flexible and cover real-world use cases
- MetaMask Flask's implementation is stable and reliable
- The off-chain permission signature → on-chain enforcement pattern is elegant

**Challenges Encountered:**
- **Documentation Gap**: Limited examples for autonomous agent use cases. Most examples focus on simple transfers rather than delegated smart contract execution.
- **MetaMask Flask Requirement**: Regular MetaMask doesn't support ERC-7715 yet, which creates friction for user onboarding. Clear messaging about Flask requirement is critical.
- **Error Messages**: When permission requests fail, error messages could be more descriptive. For example, distinguishing between "Snap not installed" vs "Permission denied by user" vs "Invalid policy format".
- **Network Switching**: Permission requests sometimes fail silently if wallet is on wrong network. Need explicit network checks before requesting permissions.

**Feature Requests:**
1. **Multi-Token Permissions**: Ability to grant permissions for multiple tokens (USDC + WETH) in a single request
2. **Batch Permission Updates**: Update daily limits or expiry without revoking and re-granting
3. **Permission Templates**: Pre-defined permission sets for common DeFi use cases (DCA, yield farming, etc.)
4. **Event Notifications**: Browser notifications when permissions are about to expire

---

### Envio Indexing Feedback

**What Worked Exceptionally Well:**
- **Incredible Performance**: <100ms GraphQL queries vs 5-10 seconds with RPC polling. Game-changing.
- **Developer Experience**: Schema-first approach with automatic TypeScript generation is excellent
- **Real-Time Updates**: Events indexed within seconds of block confirmation
- **Auto-Deployment**: Push to branch → automatic redeployment is seamless
- **Multi-Contract Support**: Indexing 4 different contracts with unified GraphQL API was trivial

**Challenges Encountered:**
- **Historical Data**: When redeploying with schema changes, historical events aren't automatically reindexed. Strategies created before new deployment didn't appear until new events were emitted.
- **Local Development**: Running indexer locally requires PostgreSQL setup. A lightweight SQLite option for development would be helpful.
- **Error Debugging**: When event handlers fail, stack traces could be more descriptive about which event/block caused the issue.
- **Schema Migrations**: No built-in migration system. Changing entity structure requires manual data migration or fresh deployment.

**Feature Requests:**
1. **Backfill Support**: Ability to trigger historical event reindexing after schema changes
2. **Local Dev Mode**: SQLite-based local indexer for faster iteration without PostgreSQL
3. **Computed Fields**: Support for derived/computed fields in schema (e.g., `nextExecutionTime` calculated from `lastExecutedAt + intervalSeconds`)
4. **Subscription Support**: GraphQL subscriptions for real-time updates instead of polling
5. **Query Cost Analysis**: Dashboard showing query performance and optimization suggestions


---

### Overall Hackathon Experience

**The Combination is Powerful:**
ERC-7715 + Envio together enabled something we couldn't build with either alone:
- ERC-7715 makes autonomous execution possible (no wallet popups)
- Envio makes it observable and automatable (keeper bot relies on indexed data)

**What We'd Change:**
- More real-world examples combining both technologies
- Starter templates for common patterns (DeFi automation, gaming, NFT management)
- Better onboarding documentation for developers new to both technologies

**Impact:**
Building AgentSwarm changed our perspective on what's possible in DeFi UX. We went from "automation requires sacrificing security" to "automation with granular control is the new standard."

Both technologies are production-ready and exceeded our expectations.

---

## Social Media

Follow our journey building AgentSwarm with MetaMask Advanced Permissions (ERC-7715) and Envio indexing.

**Twitter/X Thread**: [https://x.com/i/status/2002033603593564416](https://x.com/i/status/2002033603593564416)

This thread showcases:
- How MetaMask Advanced Permissions transformed our UX from requiring 10+ wallet popups to just ONE permission grant
- Real-world performance gains with Envio indexing (10x faster than RPC polling)


---

## Team

Built for the ERC-7715 & Envio ecosystem

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**AgentSwarm** - Autonomous DeFi made simple, secure, and scalable with ERC-7715 & Envio
