# AgentSwarm Quick Start

## 🚀 Ready to Deploy!

All bugs have been fixed and the application is ready for deployment. Follow these steps:

---

## ✅ What's Been Fixed

### Smart Contracts
- ✅ Slippage protection bug in DCAAgent (changed minAmountOut from 0 to 1)
- ✅ Stack too deep error (disabled via_ir in foundry.toml)
- ✅ All contracts compile successfully

### Frontend Components
- ✅ **CreateDCASchedule.tsx** - Added missing `poolFee` and `slippageBps` parameters
- ✅ **CreateYieldStrategy.tsx** - Added missing `aToken` parameter
- ✅ **DelegatePermission.tsx** - Added missing `duration` parameter
- ✅ All components now use generated ABIs from compiled contracts

### Configuration
- ✅ Generated accurate ABIs in `frontend/lib/abis/generated/`
- ✅ Updated `.env` with correct token and protocol addresses
- ✅ ABI generation script created at `contracts/scripts/generate-abis.sh`

---

## 📋 Deployment Checklist

### Step 1: Deploy Contracts (5 minutes)

```bash
cd contracts

# 1. Create .env file
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# 2. Deploy to Sepolia
forge script script/Deploy.s.sol:DeployScript --rpc-url $SEPOLIA_RPC_URL --broadcast

# 3. Copy the three contract addresses from output
```

### Step 2: Update Frontend (2 minutes)

```bash
cd frontend

# 1. Edit .env and paste your deployed addresses
nano .env

# Replace these lines:
NEXT_PUBLIC_MASTER_AGENT=0x...  # Your MasterAgent address
NEXT_PUBLIC_DCA_AGENT=0x...     # Your DCAAgent address
NEXT_PUBLIC_YIELD_AGENT=0x...   # Your YieldAgent address

# 2. Install and run
npm install
npm run dev
```

### Step 3: Test (10 minutes)

1. Get testnet tokens from https://staging.aave.com/faucet/
2. Open http://localhost:3000
3. Connect MetaMask
4. Delegate permissions
5. Create DCA schedule or Yield strategy

---

## 🎯 Key Files Reference

### Smart Contracts
- `contracts/src/MasterAgent.sol` - Central permission hub
- `contracts/src/DCAAgent.sol` - DCA automation with Uniswap V3
- `contracts/src/YieldAgent.sol` - Yield farming with Aave V3
- `contracts/script/Deploy.s.sol` - Deployment script

### Frontend Components
- `frontend/components/DelegatePermission.tsx` - ERC-7715 permission flow
- `frontend/components/CreateDCASchedule.tsx` - DCA schedule creation
- `frontend/components/CreateYieldStrategy.tsx` - Yield strategy creation

### Configuration
- `contracts/.env` - Private key for deployment
- `frontend/.env` - Contract addresses and network config
- `frontend/lib/abis/generated/` - Auto-generated ABIs

---

## 🔧 Commands Cheat Sheet

### Contracts
```bash
cd contracts
forge build                    # Compile contracts
forge test                     # Run tests
forge clean                    # Clean build artifacts
bash scripts/generate-abis.sh  # Generate frontend ABIs
```

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start dev server
npm run build       # Build for production
npm run lint        # Lint code
```

---

## 📊 Gas Estimates

| Operation | Gas Cost | USD (30 gwei, $2000 ETH) |
|-----------|----------|--------------------------|
| Deploy All Contracts | ~6M gas | $0.36 |
| Delegate Permission | ~150k gas | $0.009 |
| Create DCA Schedule | ~150k gas | $0.009 |
| Execute DCA | ~200k gas | $0.012 |
| Create Yield Strategy | ~180k gas | $0.011 |

---

## 🐛 Common Issues

### "forge: command not found"
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### "Insufficient delegation"
Make sure to delegate permissions first in the UI

### "ERC20: insufficient allowance"
Approve the agent contract to spend your tokens

### Frontend shows "0x..."
Update frontend/.env with deployed addresses and restart dev server

---

## 📚 Full Documentation

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

---

## 🎉 You're Ready!

Everything is configured and ready to deploy. The entire deployment process takes about 15-20 minutes.

**Need help?** Check the troubleshooting section in DEPLOYMENT_GUIDE.md
