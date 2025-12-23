# ERC-7715 Advanced Permissions Setup Guide

## 🎯 Overview
This guide helps you test and demonstrate **ERC-7715 Advanced Permissions** in AgentSwarm for the hackathon submission.

## 📋 Prerequisites

### 1. MetaMask Requirements
- **MetaMask Version**: Latest version (11.0+)
- **Network**: Sepolia Testnet (already configured)
- **Smart Accounts**: Automatically available when using ERC-7715 compatible dApps

### 2. Test Tokens Required
- **Sepolia ETH**: For gas fees
- **USDC on Sepolia**: For testing agent operations

## 🚀 Quick Start

### Step 1: Get Test Tokens

#### Sepolia ETH Faucet
1. Visit: https://www.alchemy.com/faucets/ethereum-sepolia
2. Enter your wallet address
3. Request test ETH (you'll receive ~0.5 ETH)

#### USDC on Sepolia
1. Visit Aave Faucet: https://staging.aave.com/faucet/
2. Connect your MetaMask wallet
3. Select "USDC" from the token dropdown
4. Click "Faucet" to receive test USDC
5. Confirm the transaction

**Alternative USDC Faucets:**
- Circle USDC Faucet: https://faucet.circle.com/ (if available)
- Chainlink Faucet: https://faucets.chain.link/sepolia

### Step 2: Connect to AgentSwarm

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. Click "Connect Wallet" and select MetaMask

4. Approve the connection in MetaMask

### Step 3: Test ERC-7715 Advanced Permissions

#### Navigate to Delegate Permissions Tab
1. In the dashboard, click the **"Delegate"** tab
2. You'll see the 3-step permission flow:
   - **Step 1**: Set Limits (Daily spending limit and duration)
   - **Step 2**: ERC-7715 (Advanced Permissions request)
   - **Step 3**: On-Chain (Smart contract delegation)

#### Configure Permissions
1. **Daily Spending Limit**: Enter amount (e.g., `100` USDC)
2. **Duration**: Select duration (7, 30, or 90 days)

#### Grant Permissions
1. Click **"Grant Advanced Permissions"**
2. MetaMask will show an **ERC-7715 Permission Request**
3. Review the permission details:
   - Token: USDC
   - Allowance: Your daily limit
   - Rate Limit: 1 per day (86400 seconds)
   - Expiry: Based on your duration selection
4. Click **"Approve"** in MetaMask

#### Complete On-Chain Delegation
1. After ERC-7715 approval, the on-chain transaction will automatically start
2. Confirm the transaction in MetaMask
3. Wait for confirmation (usually 10-15 seconds on Sepolia)
4. Success! You'll see a green checkmark for all 3 steps

## 🔍 Verifying ERC-7715 is Working

### Check Browser Console
Open Developer Tools (F12) and look for these logs:

```javascript
// When requesting permissions:
Requesting master agent permissions: {
  account: "0x...",
  expiry: 1234567890,
  permissions: [{
    type: "erc20-token-transfer",
    data: { token: "0x..." },
    policies: [
      { type: "token-allowance", data: { allowance: "100000000" } },
      { type: "rate-limit", data: { count: 1, interval: 86400 } }
    ]
  }]
}

// On success:
Master agent permissions granted: {
  context: "0x...",
  // ... permission response
}
```

### Check Wallet Capabilities (Advanced)
Open browser console and run:

```javascript
// Check if ERC-7715 is supported
await window.ethereum.request({
  method: 'wallet_getCapabilities',
  params: [ethereum.selectedAddress]
})
```

If you see capabilities related to permissions, ERC-7715 is active!

## 🎥 Recording Your Demo Video

### Key Points to Show

1. **Initial State**
   - Show the Analytics Dashboard with $0 permissions
   - Show your USDC balance

2. **ERC-7715 Permission Request**
   - Navigate to Delegate tab
   - Set daily limit (e.g., 100 USDC)
   - Click "Grant Advanced Permissions"
   - **IMPORTANT**: Show the MetaMask popup with ERC-7715 permission details
   - Highlight the permission policies (allowance, rate limit, expiry)

3. **Permission Flow**
   - Show the 3-step progress indicator
   - Step 1 (Set Limits): ✓
   - Step 2 (ERC-7715): Loading → ✓
   - Step 3 (On-Chain): Loading → ✓

4. **After Delegation**
   - Return to Analytics Dashboard
   - Show updated stats:
     - Active Agents: 1/2 or 2/2
     - Daily Limit: Your configured amount
     - Remaining Today: Same as daily limit (since nothing spent yet)

5. **Create Automated Strategies**
   - Navigate to DCA tab
   - Create a DCA schedule (e.g., buy 10 USDC of DAI every hour)
   - Navigate to Yield tab
   - Create a yield strategy (e.g., deposit 50 USDC to Aave)

6. **Show Autonomous Operations**
   - Go to Transaction History tab
   - Show the automated transactions happening
   - Highlight that these are happening WITHOUT manual approval each time

## 🐛 Troubleshooting

### Error: "wallet_grantPermissions does not exist"

This means ERC-7715 is not yet available in your MetaMask version. Try:

1. **Update MetaMask**: Ensure you have the latest version
2. **Use MetaMask Flask**: Install the developer version from https://metamask.io/flask/
3. **Fallback Option**: Click "Skip ERC-7715 & Delegate On-Chain Only"

### Error: "User rejected the permission request"

- This is normal if you clicked "Reject" in MetaMask
- Simply try again and click "Approve"

### Error: "Wallet client not available"

- Disconnect and reconnect your wallet
- Refresh the page
- Check that MetaMask is unlocked

### Permissions Not Showing in MetaMask

If MetaMask doesn't show the ERC-7715 permission dialog:

1. Check browser console for errors
2. Verify you're on Sepolia network
3. Try with MetaMask Flask (developer version)
4. Ensure Smart Accounts Kit is properly loaded (check Network tab)

## 📊 Analytics Dashboard Features

After granting permissions, you can monitor:

- **USDC Balance**: Your current test USDC balance
- **Total Daily Limit**: Combined limit for both agents
- **Spent Today**: How much has been spent by agents today
- **Remaining Today**: Available spending capacity
- **Active Agents**: How many agents are currently delegated (DCA and Yield)
- **DCA Agent Details**: Daily limit, spent today, active schedules
- **Yield Agent Details**: Daily limit, spent today, active strategies

## 🎯 Hackathon Checklist

- [ ] MetaMask connected to Sepolia
- [ ] Test USDC obtained from faucet
- [ ] ERC-7715 permissions granted successfully
- [ ] On-chain delegation completed
- [ ] DCA schedule created
- [ ] Yield strategy created
- [ ] Transaction history showing automated operations
- [ ] Demo video recorded showing full flow
- [ ] GitHub repo updated with latest code
- [ ] README includes setup instructions

## 📝 Key ERC-7715 Features Demonstrated

1. **Granular Permissions**: Token-specific allowances (USDC only)
2. **Rate Limiting**: Daily spending limits (1 transaction per 86400 seconds)
3. **Time-Bounded**: Permissions expire after configured duration
4. **Gasless UX**: Users approve once, agents execute without repeated prompts
5. **Revocable**: Users can revoke permissions anytime (future feature)

## 🔗 Important Links

- **Hackathon Info**: [ERC-7715 Advanced Permissions Hackathon]
- **MetaMask Docs**: https://docs.metamask.io/wallet/concepts/smart-accounts/
- **ERC-7715 Spec**: https://eips.ethereum.org/EIPS/eip-7715
- **Sepolia Faucets**:
  - ETH: https://www.alchemy.com/faucets/ethereum-sepolia
  - USDC: https://staging.aave.com/faucet/
- **Contract Explorer**: https://sepolia.etherscan.io/

## 🎬 Demo Script

**Opening (10 seconds)**
"Hi! I'm demonstrating AgentSwarm, a DeFi automation platform using ERC-7715 Advanced Permissions."

**Connect Wallet (15 seconds)**
"First, I'll connect my MetaMask wallet to the dApp on Sepolia testnet."

**Grant Permissions (30 seconds)**
"Now I'll delegate permissions to the agents. I'm setting a 100 USDC daily limit for 30 days. Watch as MetaMask shows the ERC-7715 permission request with granular policies - token allowance and rate limiting. I'll approve this..."

**Show Flow (20 seconds)**
"You can see the 3-step flow: Set Limits ✓, ERC-7715 Permission ✓, and On-Chain Delegation ✓. All done!"

**Analytics (15 seconds)**
"The analytics dashboard now shows my active agents, daily limits, and spending tracking."

**Create Strategy (20 seconds)**
"Let me create a DCA schedule to automatically buy DAI every hour, and a yield strategy to deposit to Aave."

**Show Automation (20 seconds)**
"Back to the transaction history - you can see the agents executing trades autonomously without requiring my approval each time. This is the power of ERC-7715 Advanced Permissions!"

**Closing (10 seconds)**
"Thanks for watching! AgentSwarm makes DeFi automation secure and user-friendly with ERC-7715."

---

**Total Time**: ~2 minutes 20 seconds

## 💡 Tips for Success

1. **Test Everything First**: Run through the entire flow before recording
2. **Clear Console**: Open DevTools to show the ERC-7715 request logs
3. **Smooth Navigation**: Practice clicking through tabs smoothly
4. **Highlight Key Features**: Pause briefly when showing the MetaMask permission dialog
5. **Show Real Data**: Use actual test USDC amounts to make it convincing
6. **Professional Audio**: Record in a quiet environment with clear narration

## 🎓 Understanding the Code

### Permission Request Structure
```typescript
// From useAdvancedPermissions.ts
const permission: Permission = {
  type: 'erc20-token-transfer',
  data: {
    token: token, // USDC address
  },
  policies: [
    {
      type: 'token-allowance',
      data: {
        allowance: parseUnits(dailyLimit, 6).toString(),
      },
    },
    {
      type: 'rate-limit',
      data: {
        count: 1,
        interval: 86400, // 24 hours
      },
    },
  ],
};
```

### Key Files
- **Permission Hook**: `frontend/lib/hooks/useAdvancedPermissions.ts`
- **Delegate UI**: `frontend/components/DelegatePermission.tsx`
- **Analytics**: `frontend/components/AnalyticsDashboard.tsx`
- **Smart Contracts**: `contracts/src/MasterAgent.sol`

---

Good luck with your hackathon submission! 🚀
