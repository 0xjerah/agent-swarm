# AgentSwarm Deployment Guide

This guide walks you through deploying the AgentSwarm smart contracts to Sepolia testnet and configuring the frontend.

## Prerequisites

1. **Wallet with Sepolia ETH**
   - Get Sepolia ETH from: https://sepoliafaucet.com/
   - Need ~0.05 ETH for deployment

2. **Sepolia Testnet Tokens** (for testing)
   - Get USDC, WETH, DAI from Aave faucet: https://staging.aave.com/faucet/

3. **RPC Provider** (Optional but recommended)
   - Use public RPC: `https://rpc.sepolia.org`
   - Or get Infura/Alchemy key for better reliability

---

## Step 1: Configure Deployment Environment

### 1.1 Create `.env` file in contracts directory

```bash
cd contracts
cp .env.example .env
```

### 1.2 Edit `.env` and add your private key

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Etherscan API key for verification (optional)
ETHERSCAN_API_KEY=your_etherscan_key_here
```

**⚠️ IMPORTANT:** Never commit your `.env` file to git!

---

## Step 2: Deploy Smart Contracts

### 2.1 Ensure contracts are compiled

```bash
cd contracts
forge build
```

You should see:
```
Compiler run successful with warnings:
```

### 2.2 Deploy to Sepolia

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

**Expected Output:**
```
Deploying to Sepolia testnet...
Deployer address: 0x...
MasterAgent deployed at: 0xABCD...
DCAAgent deployed at: 0xEF12...
YieldAgent deployed at: 0x3456...

=== Deployment Summary ===
Network: Sepolia

=== Contract Addresses ===
MasterAgent: 0xABCD...
DCAAgent: 0xEF12...
YieldAgent: 0x3456...
```

### 2.3 Save the deployed addresses!

Copy the three contract addresses from the output. You'll need them for the frontend.

---

## Step 3: Generate and Update Frontend ABIs

### 3.1 Generate TypeScript ABIs from compiled contracts

```bash
cd contracts
bash scripts/generate-abis.sh
```

This creates:
- `frontend/lib/abis/generated/masterAgent.ts`
- `frontend/lib/abis/generated/dcaAgent.ts`
- `frontend/lib/abis/generated/yieldAgent.ts`

### 3.2 Verify ABI generation

```bash
ls -la ../frontend/lib/abis/generated/
```

You should see the three `.ts` files.

---

## Step 4: Update Frontend Configuration

### 4.1 Update `.env` with deployed addresses

Edit `frontend/.env`:

```bash
cd ../frontend
nano .env  # or use your preferred editor
```

Replace the placeholder addresses with your deployed contract addresses:

```env
# Contract addresses (from deployment)
NEXT_PUBLIC_MASTER_AGENT=0xABCD...  # Your MasterAgent address
NEXT_PUBLIC_DCA_AGENT=0xEF12...     # Your DCAAgent address
NEXT_PUBLIC_YIELD_AGENT=0x3456...   # Your YieldAgent address

# Token addresses on Sepolia testnet (already configured)
NEXT_PUBLIC_USDC_ADDRESS=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
NEXT_PUBLIC_WETH_ADDRESS=0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
NEXT_PUBLIC_DAI_ADDRESS=0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357

# Protocol addresses on Sepolia (already configured)
NEXT_PUBLIC_UNISWAP_ROUTER=0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
NEXT_PUBLIC_AAVE_POOL=0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951

# Network
NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia testnet
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org

# Enable Advanced Permissions (ERC-7715)
NEXT_PUBLIC_ENABLE_ADVANCED_PERMISSIONS=true
```

---

## Step 5: Install and Run Frontend

### 5.1 Install dependencies

```bash
cd frontend
npm install
```

### 5.2 Run development server

```bash
npm run dev
```

The app will be available at: http://localhost:3000

---

## Step 6: Testing the Application

### 6.1 Get Testnet Tokens

1. Visit Aave Sepolia Faucet: https://staging.aave.com/faucet/
2. Connect your wallet
3. Get USDC, WETH, DAI tokens

### 6.2 Connect Wallet

1. Open http://localhost:3000
2. Click "Launch App" or "Connect MetaMask"
3. Approve the connection in MetaMask

### 6.3 Approve Token Spending

Before using the agents, approve them to spend your tokens:

**For DCA Agent:**
```solidity
// In MetaMask, go to USDC contract on Sepolia
// Call approve(DCA_AGENT_ADDRESS, LARGE_AMOUNT)
```

**For Yield Agent:**
```solidity
// Approve both USDC and aUSDC to YieldAgent
```

### 6.4 Delegate Permissions

1. Go to "Delegate Permissions" tab
2. Set daily spending limit (e.g., 100 USDC)
3. Choose duration (7, 30, or 90 days)
4. Click "Grant Advanced Permissions"
   - Step 1: Signs ERC-7715 permission request
   - Step 2: Confirms on-chain delegation transaction

### 6.5 Create DCA Schedule

1. Go to "DCA Schedule" tab
2. Enter amount per purchase (e.g., 10 USDC)
3. Select interval (hourly, daily, weekly)
4. Choose pool fee (0.05%, 0.30%, 1.00%)
5. Set slippage tolerance (0.1% - 3%)
6. Click "Create DCA Schedule"

### 6.6 Create Yield Strategy

1. Go to "Yield Strategy" tab
2. Enter target allocation (e.g., 1000 USDC)
3. Select strategy type (currently only Aave Supply works)
4. Click "Create Yield Strategy"

---

## Troubleshooting

### Contract compilation fails
```bash
cd contracts
forge clean
forge build
```

### "Insufficient delegation" error
- Make sure you've delegated permissions in Step 6.4
- Check that your daily limit covers the transaction amount

### "ERC20: insufficient allowance" error
- Approve the agent contracts to spend your tokens (Step 6.3)

### Frontend shows "0x..." addresses
- Make sure you updated `.env` with deployed addresses
- Restart the dev server: `npm run dev`

### Transaction fails with "Too soon to execute"
- DCA schedules have intervals (wait for the interval to pass)
- Check `canExecute(user, scheduleId)` to see if ready

---

## Contract Addresses Reference

### Deployed Contracts (You'll fill these in)
- MasterAgent: `[YOUR_ADDRESS]`
- DCAAgent: `[YOUR_ADDRESS]`
- YieldAgent: `[YOUR_ADDRESS]`

### Sepolia Testnet Protocols (Pre-configured)
- Uniswap V3 Router: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
- Aave V3 Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- Aave V3 Rewards: `0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb`

### Sepolia Testnet Tokens (Pre-configured)
- USDC: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- WETH: `0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c`
- DAI: `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357`
- aUSDC (Aave): `0x16dA4541aD1807f4443d92D26044C1147406EB80`

---

## Important Notes

### ERC-7715 Support
- ERC-7715 (Advanced Permissions) is experimental
- May require MetaMask Flask or custom build
- Check MetaMask documentation for latest support

### Security
- ✅ All contracts have been reviewed and bugs fixed
- ✅ Slippage protection implemented in DCA
- ✅ Daily spending limits enforced
- ✅ Time-based permission expiry
- ⚠️ This is testnet - do not use on mainnet without audit

### Gas Costs (Approximate on Sepolia)
- Deploy MasterAgent: ~1.5M gas
- Deploy DCAAgent: ~2M gas
- Deploy YieldAgent: ~2.5M gas
- Create DCA Schedule: ~150k gas
- Create Yield Strategy: ~180k gas
- Execute DCA: ~200k gas

---

## Next Steps

1. ✅ Deploy contracts
2. ✅ Configure frontend
3. ✅ Test with testnet tokens
4. Build automation for `executeDCA()` and `executeDeposit()` calls
5. Implement Permission Tree visualization
6. Add analytics dashboard
7. Deploy to production network (after audit)

---

## Support & Resources

- **Aave Faucet**: https://staging.aave.com/faucet/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **MetaMask Docs**: https://docs.metamask.io/
- **Foundry Book**: https://book.getfoundry.sh/

---

Good luck with your deployment! 🚀
