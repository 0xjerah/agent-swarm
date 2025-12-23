# AgentSwarm Keeper Service 🤖

Automated execution service for DCA schedules using ERC-7715 delegated permissions.

## What Does This Do?

This keeper service **automatically executes DCA schedules** when they're ready, eliminating the need for users to manually click "Execute" and approve MetaMask popups.

### The Magic of ERC-7715

1. **User creates DCA schedule** → Delegates permissions to DCA Agent
2. **Keeper monitors schedules** → Checks every 60 seconds
3. **When ready** → Keeper's wallet executes DCA (pays gas)
4. **User gets WETH** → No popup, no manual intervention needed! ✨

## How It Works

```
┌─────────────┐
│   User      │ Creates schedule + Delegates USDC permission
└──────┬──────┘
       │
       v
┌─────────────────────────────────────────────┐
│         DCA Schedule (On-chain)             │
│  - Amount: 250 USDC                         │
│  - Interval: Every 24h                      │
│  - Active: true                             │
└──────┬──────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────┐
│      Keeper Service (This script)           │
│  - Monitors all schedules                   │
│  - Checks if execution time passed          │
│  - Executes with keeper's wallet            │
│  - Keeper pays gas (~$0.10-0.50)            │
└──────┬──────────────────────────────────────┘
       │
       v
┌─────────────┐
│  Uniswap    │ USDC → WETH swap
└──────┬──────┘
       │
       v
┌─────────────┐
│   User      │ Receives WETH automatically!
└─────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd automation
npm install
```

### 2. Create Keeper Wallet

The keeper needs its own wallet to pay for gas. You have two options:

**Option A: Generate New Wallet**
```bash
node -e "import('viem').then(v => console.log('Private Key:', v.privateKeyToAccount(v.generatePrivateKey()).privateKey))"
```

**Option B: Use Existing Wallet**
Export private key from MetaMask or use any test wallet.

⚠️ **Security Note:** This wallet will have access to pay gas. Only fund it with small amounts of ETH needed for gas.

### 3. Fund the Keeper Wallet

The keeper needs Sepolia ETH to pay for gas:

1. Get the keeper's address:
   ```bash
   node -e "import('viem/accounts').then(v => console.log('Address:', v.privateKeyToAccount('YOUR_PRIVATE_KEY').address))"
   ```

2. Get Sepolia ETH from faucet:
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - https://sepoliafaucet.com/
   - https://faucet.quicknode.com/ethereum/sepolia

3. Fund with **0.01-0.05 ETH** (enough for hundreds of executions)

### 4. Configure Environment

Edit `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit with your keeper private key
nano .env
```

Set your keeper's private key:
```env
KEEPER_PRIVATE_KEY=0xYOUR_KEEPER_PRIVATE_KEY_HERE
```

### 5. Run the Keeper

**Development (with auto-restart):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Run in background (Linux/Mac):**
```bash
nohup npm start > keeper.log 2>&1 &
```

**Run in background (PM2):**
```bash
npm install -g pm2
pm2 start keeper.js --name agentswarm-keeper
pm2 save
pm2 startup
```

## How to Use

### For Users

1. **Create DCA schedule** in the frontend
2. **Delegate permissions** to DCA Agent (approve USDC spending)
3. **That's it!** Keeper will execute automatically when ready

### For Keeper Operators

1. **Monitor logs** to see executions:
   ```bash
   tail -f keeper.log  # If using nohup
   pm2 logs            # If using PM2
   ```

2. **Check keeper balance** periodically:
   ```bash
   # The keeper will warn when balance is low
   ```

3. **Refund when needed**:
   - Keeper warns when balance < 0.01 ETH
   - Each execution costs ~0.0001-0.0005 ETH in gas

## Gas Costs

- **Per execution:** ~0.0001-0.0005 ETH (~$0.10-0.50 on mainnet)
- **Daily (10 executions):** ~0.001-0.005 ETH
- **Monthly (300 executions):** ~0.03-0.15 ETH

On Sepolia testnet, gas is free (test ETH has no value).

## Configuration Options

Edit `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `KEEPER_PRIVATE_KEY` | - | Private key of wallet that pays gas |
| `RPC_URL` | Public RPC | Sepolia RPC endpoint |
| `DCA_AGENT_ADDRESS` | Latest deployment | DCA Agent contract address |
| `CHECK_INTERVAL` | 60 | Seconds between schedule checks |
| `MAX_GAS_PRICE` | 50 gwei | Skip execution if gas too high |

## Troubleshooting

### Keeper won't start

**Error:** `KEEPER_PRIVATE_KEY not set`
- Solution: Add private key to `.env` file

**Error:** `DCA_AGENT_ADDRESS not set`
- Solution: Verify contract address in `.env`

### Executions failing

**Error:** `Insufficient delegation`
- Solution: User needs to delegate permissions to DCA Agent

**Error:** `Too soon to execute`
- Solution: Schedule interval hasn't passed yet (working as intended)

**Error:** `Gas price too high`
- Solution: Increase `MAX_GAS_PRICE` in `.env` or wait for lower gas

### No schedules found

- Make sure users have created DCA schedules
- Keeper auto-discovers users from blockchain events
- Check that `DCA_AGENT_ADDRESS` is correct

## Production Deployment

### Option 1: VPS (Recommended for hackathons/demos)

Deploy to a cheap VPS ($5/month):

1. **Digital Ocean / AWS / Linode:**
   ```bash
   # On server
   git clone <your-repo>
   cd agentswarm/automation
   npm install
   nano .env  # Configure
   pm2 start keeper.js
   pm2 startup
   pm2 save
   ```

### Option 2: Serverless (Advanced)

Use AWS Lambda / Google Cloud Functions with scheduled triggers.

### Option 3: Chainlink Automation (Production)

For decentralized keeper network:
- Requires LINK tokens
- More reliable (multiple keepers)
- Higher cost but battle-tested

### Option 4: Gelato Network (Production)

Professional keeper service:
- Easiest production solution
- Deposit funds, they handle execution
- ~0.1-0.3% fee per execution

## Security Notes

⚠️ **Important:**

1. **Keeper wallet security:**
   - Only fund with gas money (0.01-0.1 ETH max)
   - Don't use your main wallet
   - Rotate keys periodically

2. **RPC security:**
   - Use private RPC for production (Infura, Alchemy)
   - Rate limits on public RPCs can cause issues

3. **Monitoring:**
   - Set up alerts for low balance
   - Monitor failed executions
   - Check logs regularly

## How This Demonstrates ERC-7715

This keeper service showcases the power of ERC-7715:

✅ **User delegates once** → Never needs to approve again
✅ **Keeper executes** → User pays $0 in gas
✅ **No MetaMask popups** → Truly automated DCA
✅ **User stays in control** → Can cancel delegation anytime

The user gets a **completely hands-off DCA experience** while maintaining full custody of their funds!

## Support

Questions? Check the main repo README or open an issue.

---

**Built for AgentSwarm** 🐝
