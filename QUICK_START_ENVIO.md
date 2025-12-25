# Quick Start Guide - Envio Indexer Setup

This guide will get you up and running with the complete AgentSwarm stack including Envio indexer, frontend, and automation keeper.

## 🎉 Production Indexer Available!

**The Envio indexer is already deployed and running in production:**
- **GraphQL Endpoint**: `https://indexer.dev.hyperindex.xyz/678f00d/v1/graphql`
- **Status**: ✅ Live and indexing from block 9908095
- **Network**: Sepolia testnet (11155111)

You can use the production endpoint directly or run your own local indexer for development.

## Prerequisites

- Node.js >= 18.0.0
- npm or pnpm
- Envio API Token (only needed for local development - get from [envio.dev/app/api-tokens](https://envio.dev/app/api-tokens))

## Step-by-Step Setup

### 1. Configure Envio Indexer

```bash
cd indexer

# Create .env file with your API token
cp .env.example .env

# Edit .env and add your token:
# ENVIO_API_TOKEN="your-token-here"

# Install dependencies
npm install

# Generate TypeScript types from schema
npm run codegen
```

**✅ Configuration Complete!**

### 2. Start Envio Indexer

```bash
# Still in indexer directory
npm run dev
```

You should see:
```
✓ HyperSync connected to Sepolia
✓ Indexing from block 9908095
✓ GraphQL API started at http://localhost:8080/v1/graphql
✓ GraphQL Playground at http://localhost:8080 (password: testing)
```

**✅ Indexer Running!** Keep this terminal open.

### 3. Verify Indexer (Optional)

Open a new terminal and test the GraphQL API:

```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ GlobalStats { id totalUsers totalDCAExecutions } }"}'
```

Or visit http://localhost:8080 in your browser to use GraphQL Playground.

### 4. Start Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000

**✅ Frontend Running!** The app now uses real-time GraphQL data.

### 5. Start Automation Keeper (Optional)

For automated DCA execution, open **another terminal**:

```bash
cd automation

# Create .env file with keeper private key
cp .env.example .env

# Edit .env and configure:
# KEEPER_PRIVATE_KEY=0x...
# ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql

# Install dependencies
npm install

# Start keeper
npm start
```

**✅ Keeper Running!** It will execute DCA schedules automatically.

## What's Running?

You should now have **3 services** running:

| Service | Port | Purpose |
|---------|------|---------|
| Envio Indexer | 8080 | GraphQL API for blockchain data |
| Frontend | 3000 | User interface |
| Keeper (optional) | - | Automated DCA execution |

## Testing the Stack

1. **Connect Wallet** on http://localhost:3000
2. **Delegate Permissions** to DCA Agent
3. **Create DCA Schedule** (e.g., 10 USDC → WETH every 5 minutes)
4. **View Transaction History** - See all events instantly
5. **Check Schedule Stats** - Real-time execution data
6. **Execute Schedule** - Watch stats update automatically!

## GraphQL Features

### Real-Time Updates
- Frontend polls GraphQL every 5 seconds
- New executions appear automatically
- No page refresh needed!

### Complete History
- No block limits (unlike RPC calls)
- All historical events indexed
- Price tracking for each execution

### Efficient Queries
- Single GraphQL query vs 10+ RPC calls
- ~10x faster load times
- Aggregate stats pre-calculated

## Troubleshooting

### Indexer won't start
**Error:** `ENVIO_API_TOKEN not set`
- **Fix:** Create `indexer/.env` with your API token
- Remember: Must be prefixed with `ENVIO_`

### Frontend can't connect to GraphQL
**Error:** "Error loading data" in UI
- **Fix:** Make sure indexer is running on port 8080
- Check: `curl http://localhost:8080/v1/graphql`

### Keeper can't find schedules
**Error:** "No schedules found"
- **Fix:** Create a DCA schedule first in the frontend
- Verify: Check GraphQL Playground for `DCASchedule` entries

### GraphQL Playground 401 Unauthorized
- **Password:** `testing` (set in indexer)
- Visit: http://localhost:8080

## Environment Variables Summary

### Indexer (`indexer/.env`) - Local Development Only
```env
ENVIO_API_TOKEN="your-token-here"
```

### Frontend (`frontend/.env`)
```env
# Production (default - already configured)
NEXT_PUBLIC_GRAPHQL_URL=https://indexer.dev.hyperindex.xyz/678f00d/v1/graphql

# Or use local development:
# NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/v1/graphql
```

### Keeper (`automation/.env`)
```env
KEEPER_PRIVATE_KEY=0x...
DCA_AGENT_ADDRESS=0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795

# Production (default)
ENVIO_GRAPHQL_URL=https://indexer.dev.hyperindex.xyz/678f00d/v1/graphql

# Or use local development:
# ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql
```

## Next Steps

- 📖 Read [GRAPHQL_FRONTEND_INTEGRATION.md](GRAPHQL_FRONTEND_INTEGRATION.md) for detailed frontend integration
- 📖 Read [ENVIO_SETUP_COMPLETE.md](ENVIO_SETUP_COMPLETE.md) for indexer architecture
- 📖 Read [automation/README.md](automation/README.md) for keeper deployment options

## Quick Commands Reference

```bash
# Start all services (in separate terminals)

# Terminal 1: Indexer
cd indexer && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Keeper (optional)
cd automation && npm start
```

## Stop Services

Press `Ctrl+C` in each terminal to stop the respective service.

---

**Stack Ready!** 🎉

You now have a complete real-time blockchain data stack:
- ✅ Envio indexer with HyperSync
- ✅ GraphQL API with no block limits
- ✅ Frontend with real-time updates
- ✅ Automated keeper service

Enjoy building on AgentSwarm! 🐝
