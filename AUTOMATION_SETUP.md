# 🤖 Automation Setup Guide

## Quick Start (5 minutes)

### 1. Generate Keeper Wallet

```bash
cd automation
node -e "import('viem').then(v => { const key = v.generatePrivateKey(); const account = v.privateKeyToAccount(key); console.log('Keeper Private Key:', key); console.log('Keeper Address:', account.address); })"
```

**Copy the private key** - you'll need it in step 3.

### 2. Fund the Keeper Wallet

Get the keeper address from step 1, then:

1. Go to Sepolia faucet: https://www.alchemy.com/faucets/ethereum-sepolia
2. Paste keeper address
3. Request 0.05 ETH (enough for hundreds of executions)

### 3. Configure Environment

```bash
cd automation
nano .env
```

Paste your keeper private key:
```env
KEEPER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_STEP_1
```

Save and exit (Ctrl+X, Y, Enter)

### 4. Run the Keeper

```bash
npm start
```

You should see:
```
🤖 AgentSwarm Keeper Service Starting...
📋 Configuration:
   Keeper Address: 0x...
   DCA Agent: 0xA86e7b31fA6a77186F09F36C06b2E7c5D3132795
💰 Keeper Balance: 0.05 ETH
✅ Keeper service started successfully!
```

### 5. Create a DCA Schedule (in frontend)

1. Open http://localhost:3000/dashboard
2. Go to "DCA" tab
3. Create a schedule (e.g., 10 USDC every 1 minute for testing)
4. **Enable "Auto-Execute" toggle** ✓
5. Delegate permissions

### 6. Watch the Magic! ✨

The keeper will automatically execute your schedule when ready:

```
⏰ 12/24/2024, 10:30:00 AM - Checking schedules...
💰 Keeper Balance: 0.049 ETH
   Monitoring 1 user(s)
   🔔 Schedule #0 for 0xYourAddress is ready!
   ⚙️  Executing schedule #0 for 0xYourAddress...
   📤 Transaction sent: 0x...
   🔗 https://sepolia.etherscan.io/tx/0x...
   ✅ Execution successful!
   💸 Spent: 10 USDC
   🎯 Received: 0.003 WETH
   📊 Checked 1 schedule(s), executed 1
```

**No MetaMask popup! No manual intervention!** 🎉

## How This Shows ERC-7715 Power

### Traditional DCA (without ERC-7715):
```
User creates schedule
  ↓
Every interval: MetaMask pops up "Approve USDC transfer"
  ↓
User clicks "Confirm"
  ↓
MetaMask pops up again "Confirm transaction"
  ↓
User clicks "Confirm" again
  ↓
Finally executes
```
❌ **Not automated at all!**

### AgentSwarm DCA (with ERC-7715):
```
User creates schedule + delegates once
  ↓
Keeper automatically executes when ready
  ↓
User receives WETH
```
✅ **Truly hands-free!**

## Production Deployment

### Run 24/7 on Server

**Using PM2 (recommended):**
```bash
npm install -g pm2
pm2 start keeper.js --name agentswarm-keeper
pm2 logs agentswarm-keeper  # View logs
pm2 restart agentswarm-keeper  # Restart
pm2 stop agentswarm-keeper  # Stop
```

**Auto-start on reboot:**
```bash
pm2 startup
pm2 save
```

### Run in Background

```bash
nohup npm start > keeper.log 2>&1 &
tail -f keeper.log  # View logs
```

## Monitoring

Check keeper status:
```bash
pm2 status
pm2 logs --lines 50
```

Check keeper balance:
```bash
cast balance 0xKEEPER_ADDRESS --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

## Troubleshooting

### "No users to monitor yet"
- Create a DCA schedule in the frontend first
- Make sure "Auto-Execute" toggle is ON

### "Insufficient delegation"
- User needs to delegate permissions to DCA Agent
- Check delegation in frontend Delegate tab

### "Low keeper balance"
- Fund keeper wallet with more Sepolia ETH
- Each execution costs ~0.0001-0.0005 ETH

### "Gas price too high"
- Increase MAX_GAS_PRICE in .env
- Or wait for lower gas prices

## Cost Analysis

**Sepolia Testnet:** Free (test ETH has no value)

**Ethereum Mainnet (if deployed):**
- Per execution: ~$0.10-0.50 in gas
- Daily (10 executions): ~$1-5
- Monthly (300 executions): ~$30-150

**Production alternatives:**
- Gelato Network: 0.1-0.3% fee per execution
- Chainlink Automation: LINK token fees
- Run your own keeper: Only gas costs

## Next Steps

1. ✅ Test automation with short interval (1-5 minutes)
2. ✅ Verify executions on Sepolia Etherscan
3. ✅ Monitor keeper logs
4. ✅ Try canceling schedule and see keeper skip it
5. ✅ Deploy to VPS for 24/7 operation

---

**Questions?** See [automation/README.md](automation/README.md) for detailed docs.
