# AgentSwarm - ERC-7715 Advanced Permissions DeFi Automation

![AgentSwarm](https://img.shields.io/badge/ERC--7715-Advanced%20Permissions-blue)
![Sepolia](https://img.shields.io/badge/Network-Sepolia-green)
![MetaMask](https://img.shields.io/badge/Wallet-MetaMask-orange)

## 🎯 Hackathon Submission

**Project**: AgentSwarm - Autonomous DeFi Agents with ERC-7715 Advanced Permissions
**Network**: Sepolia Testnet
**Category**: DeFi Automation & Advanced Permissions

## 📝 Project Description

AgentSwarm is a DeFi automation platform that leverages **ERC-7715 Advanced Permissions** to enable users to delegate fine-grained permissions to autonomous agents. Users can set up Dollar-Cost Averaging (DCA) strategies and yield farming operations that execute automatically without requiring manual approval for each transaction.

### Key Features

✅ **ERC-7715 Advanced Permissions Integration**
- Token-specific allowances (USDC only)
- Rate limiting (daily spending limits)
- Time-bounded permissions (7, 30, or 90 days)
- Granular policy enforcement

✅ **Autonomous DeFi Agents**
- **DCA Agent**: Automated dollar-cost averaging for any token pair
- **Yield Agent**: Automated yield farming strategies with Aave

✅ **Gasless User Experience**
- Users approve permissions once via ERC-7715
- Agents execute trades without repeated wallet prompts
- Smart contract enforces spending limits and rate limits

✅ **Real-Time Analytics Dashboard**
- Track USDC balance and agent spending
- Monitor daily limits and usage
- View active schedules and strategies
- Transaction history for all automated operations

## 🏗️ Architecture

### Smart Contracts (Solidity)
```
contracts/
├── src/
│   ├── MasterAgent.sol      # Central delegation & permission management
│   ├── DCAAgent.sol          # Dollar-cost averaging automation
│   └── YieldAgent.sol        # Yield farming automation
```

**Deployed on Sepolia:**
- MasterAgent: `0xe5273E84634D9A81C09BEf46aA8980F1270b606A`
- DCAAgent: `0x0D32685A3b5F3618B8bd6B8f22e748E50144b7EE`
- YieldAgent: `0x111115259a41bd174c7C1f6B7eE36ec1Ab3CD5c1`

### Frontend (Next.js 16 + React 19)
```
frontend/
├── app/
│   └── dashboard/           # Main dashboard
├── components/
│   ├── DelegatePermission.tsx      # ERC-7715 permission UI
│   ├── AnalyticsDashboard.tsx      # Real-time analytics
│   ├── CreateDCASchedule.tsx       # DCA strategy setup
│   ├── CreateYieldStrategy.tsx     # Yield strategy setup
│   └── ERC7715Diagnostics.tsx      # Debug tool
└── lib/
    └── hooks/
        └── useAdvancedPermissions.ts  # ERC-7715 integration
```

## 🚀 ERC-7715 Implementation

### Permission Request Flow

1. **User Sets Limits** (UI)
   - Daily spending limit (e.g., 100 USDC)
   - Duration (7, 30, or 90 days)

2. **ERC-7715 Request** (Off-Chain)
   ```typescript
   const permission: Permission = {
     type: 'erc20-token-transfer',
     data: { token: USDC_ADDRESS },
     policies: [
       {
         type: 'token-allowance',
         data: { allowance: '100000000' } // 100 USDC
       },
       {
         type: 'rate-limit',
         data: { count: 1, interval: 86400 } // Daily
       }
     ]
   };

   const result = await provider.request({
     method: 'wallet_grantPermissions',
     params: [permissionRequest]
   });
   ```

3. **On-Chain Delegation** (Smart Contract)
   ```solidity
   function delegateToAgent(
     address agent,
     uint256 dailyLimit,
     uint256 duration
   ) external {
     delegations[msg.sender][agent] = Delegation({
       active: true,
       dailyLimit: dailyLimit,
       spentToday: 0,
       lastReset: block.timestamp,
       expiresAt: block.timestamp + duration
     });
   }
   ```

4. **Autonomous Execution**
   - Agents execute trades on behalf of users
   - Smart contract enforces limits
   - No wallet prompts required

### Key Files

**ERC-7715 Hook**: [`frontend/lib/hooks/useAdvancedPermissions.ts`](frontend/lib/hooks/useAdvancedPermissions.ts)
- `requestMasterAgentPermissions()` - Main permission request
- `requestERC20Permissions()` - Token-specific permissions
- `checkSupport()` - Verify ERC-7715 availability

**Delegation UI**: [`frontend/components/DelegatePermission.tsx`](frontend/components/DelegatePermission.tsx)
- 3-step permission flow
- Visual progress tracking
- Error handling with fallback

**Smart Contract**: [`contracts/src/MasterAgent.sol`](contracts/src/MasterAgent.sol)
- `delegateToAgent()` - Create delegation
- `executeDelegatedAction()` - Enforce limits
- Rate limiting & expiry logic

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- MetaMask (latest version or Flask)
- Sepolia ETH for gas
- Test USDC on Sepolia

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd agentswarm
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Getting Test Tokens

1. **Sepolia ETH**
   - Alchemy Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
   - Request 0.5 ETH

2. **USDC on Sepolia**
   - Aave Faucet: https://staging.aave.com/faucet/
   - Select USDC and claim test tokens

### Testing ERC-7715

1. **Connect MetaMask** to http://localhost:3000
2. Navigate to **Diagnostics** tab
3. Click **"Run ERC-7715 Check"**
4. Verify ERC-7715 support is detected
5. Navigate to **Delegate** tab
6. Set daily limit and duration
7. Click **"Grant Advanced Permissions"**
8. Approve in MetaMask popup
9. Complete on-chain delegation

## 📊 Demo Flow

### 1. Connect Wallet
- Open AgentSwarm dashboard
- Connect MetaMask wallet
- Verify connected on Sepolia

### 2. Grant Permissions (ERC-7715)
- Navigate to "Delegate" tab
- Set daily limit: **100 USDC**
- Set duration: **30 days**
- Click "Grant Advanced Permissions"
- **MetaMask shows ERC-7715 permission request**
- Approve permissions
- Complete on-chain delegation

### 3. Create DCA Schedule
- Navigate to "DCA" tab
- Configure strategy:
  - Buy token: DAI
  - Amount per purchase: 10 USDC
  - Frequency: Every 1 hour
- Create schedule
- Agent will execute automatically

### 4. Create Yield Strategy
- Navigate to "Yield" tab
- Configure strategy:
  - Deposit amount: 50 USDC
  - Protocol: Aave
- Create strategy
- Agent deposits to Aave automatically

### 5. Monitor Activity
- View "Analytics" dashboard
- See real-time spending limits
- Track agent activity
- View "History" for all transactions

## 🎥 Demo Video

[Link to demo video showing ERC-7715 permission flow]

**Key Highlights:**
- MetaMask ERC-7715 permission popup
- 3-step permission flow
- Autonomous agent execution
- Real-time analytics dashboard

## 🧪 Smart Contract Testing

```bash
cd contracts
forge test -vvv
```

**Test Coverage:**
- ✅ MasterAgent delegation logic
- ✅ Daily spending limit enforcement
- ✅ Rate limiting (reset after 24 hours)
- ✅ Expiry validation
- ✅ DCA schedule execution
- ✅ Yield strategy execution

## 🔐 Security Features

1. **Rate Limiting**: Maximum 1 transaction per 86400 seconds (daily)
2. **Spending Caps**: Configurable daily USDC limit
3. **Time-Bounded**: Permissions expire automatically
4. **Token-Specific**: Only USDC transfers allowed
5. **Revocable**: Users can revoke delegation anytime
6. **Non-Upgradeable**: Immutable smart contracts

## 📚 Technical Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- Wagmi 3.0 (Web3 hooks)
- Viem 2.0 (Ethereum interactions)
- TailwindCSS 4
- MetaMask Smart Accounts Kit

**Smart Contracts:**
- Solidity 0.8.28
- Foundry (testing & deployment)
- OpenZeppelin libraries

**ERC-7715 Integration:**
- `wallet_grantPermissions` RPC method
- Permission policies (allowance, rate-limit)
- Smart account compatibility

## 🌐 Links

- **Live Demo**: [Deployed URL]
- **GitHub Repo**: [Repository URL]
- **Contract Explorer**: https://sepolia.etherscan.io/address/0xe5273E84634D9A81C09BEf46aA8980F1270b606A
- **ERC-7715 Spec**: https://eips.ethereum.org/EIPS/eip-7715

## 📖 Documentation

- **Setup Guide**: [ERC7715_SETUP_GUIDE.md](ERC7715_SETUP_GUIDE.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **New Features**: [NEW_FEATURES.md](NEW_FEATURES.md)

## 👥 Team

[Your team information]

## 📄 License

MIT

---

**Built for the ERC-7715 Advanced Permissions Hackathon** 🚀

This project demonstrates the power of ERC-7715 to enable secure, user-friendly DeFi automation without sacrificing control or security. Users can confidently delegate permissions to autonomous agents while maintaining granular control over spending limits, token types, and time bounds.
