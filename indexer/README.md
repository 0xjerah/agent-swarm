# AgentSwarm Envio Indexer

This indexer tracks all events from the AgentSwarm protocol contracts (MasterAgent, DCAAgent, YieldAgent) on Sepolia testnet.

*For detailed Envio documentation, refer to [docs.envio.dev](https://docs.envio.dev)*

## Overview

The indexer provides a GraphQL API for querying:
- User activity and stats
- Delegated permissions (ERC-7715)
- DCA schedules and executions
- Yield strategies and deposits
- Transaction history
- Protocol-wide statistics

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate code from schema:
```bash
npm run codegen
```

### Run

```bash
pnpm dev
```

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
```

## Querying Data

The GraphQL endpoint will be available at `http://localhost:8080/v1/graphql`

### Example: Get user's DCA schedules
```graphql
query GetUserSchedules($userAddress: String!) {
  DCASchedule(where: { user: { _eq: $userAddress }, active: { _eq: true } }) {
    id
    user
    scheduleId
    amountPerPurchase
    intervalSeconds
    totalExecutions
    totalUSDCSpent
    totalWETHReceived
    averagePrice
    active
  }
}
```

### Example: Get ready-to-execute schedules
```graphql
query GetReadySchedules($currentTime: BigInt!) {
  DCASchedule(
    where: {
      active: { _eq: true }
      lastExecutionTime: { _is_null: false }
    }
  ) {
    id
    user
    scheduleId
    lastExecutionTime
    intervalSeconds
  }
}
```

### Example: Get protocol stats
```graphql
query GetGlobalStats {
  GlobalStats(where: { id: { _eq: "global" } }) {
    totalUsers
    activeUsers
    totalDCAExecutions
    totalUSDCVolume
    totalWETHVolume
    totalYieldDeposited
  }
}
```

## Architecture

### Contracts Indexed
- **MasterAgent** (`0x1fd734c9c78e9c34238c2b5f4E936368727326f6`) - Permission delegations (ERC-7715)
- **DCAAgent** (`0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795`) - DCA schedules and executions
- **YieldAgent** (`0xb95adacB74E981bcfB1e97B4d277E51A95753C8F`) - Yield strategies

### Event Handlers
All event handlers are in [src/EventHandlers.ts](src/EventHandlers.ts).

### Integration with Automation
The keeper service (`automation/keeper.js`) uses this indexer's GraphQL API to discover DCA schedules ready for execution.

## Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)
