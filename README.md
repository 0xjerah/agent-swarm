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

Envio GraphQL:        https://indexer.dev.hyperindex.xyz/f171fe6/v1/graphql
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

## Documentation

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

## Team

Built for the ERC-7715 & Envio ecosystem

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**AgentSwarm** - Autonomous DeFi made simple, secure, and scalable with ERC-7715 & Envio
