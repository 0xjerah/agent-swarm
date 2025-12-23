# Complete Execution Guide - AgentSwarm

## 🎯 Overview

This guide covers the complete flow from delegation to execution for both DCA and Yield agents, including all prerequisites and automation planning.

---

## 📋 Complete User Journey

### Phase 1: Delegation (Delegate Tab)

**What happens:**
1. User selects which agents to delegate to (DCA, Yield, or both)
2. Sets daily limit (automatically split between selected agents)
3. Chooses duration (5 min to 90 days)
4. Grants ERC-7715 permissions (MetaMask Flask)
5. Confirms on-chain delegation (blockchain transaction)

**Result:** Agents have permission to spend up to the daily limit on behalf of the user.

---

### Phase 2: Strategy Creation

#### DCA Agent (DCA Tab)

**Prerequisites Checked:**
- ✅ USDC Balance: User has enough USDC
- ✅ USDC Approval: DCA agent approved to spend USDC

**Configuration:**
- Amount per purchase (e.g., 10 USDC)
- Purchase interval (30 sec to 1 week)
- Uniswap pool fee (0.05%, 0.30%, 1.00%)
- Slippage tolerance (0.1% to 3.0%)

**Action:** Creates DCA schedule on-chain

**Result:** DCA schedule stored, ready for execution

#### Yield Agent (Yield Tab)

**Prerequisites Checked:**
- ✅ USDC Balance: User has enough USDC
- ✅ USDC Approval: Yield agent approved to spend USDC
- ✅ aUSDC Approval: (Optional) Yield agent approved to withdraw aUSDC

**Configuration:**
- Target allocation (e.g., 1000 USDC)
- Strategy type (Aave Supply or Aave E-Mode)

**Action:** Creates yield strategy on-chain

**Result:** Yield strategy stored, ready for execution

---

### Phase 3: Execution

#### Manual Execution (Current Implementation)

**DCA Execution:**
- Button appears after DCA schedule is created
- Click "Execute Schedule Now" button
- Triggers `executeDCASchedule(user, scheduleId)`
- Swaps USDC for ETH via Uniswap V3

**Yield Execution:**
- Button appears after yield strategy is created
- Click "Execute Deposit Now" button
- Triggers `executeDeposit(user, strategyId)`
- Deposits USDC to Aave V3, receives aUSDC

#### Automated Execution (Future Implementation)

**Toggle UI (Already Added):**
- Both tabs have "Auto-Execute (Coming Soon)" toggle
- Currently disabled, ready for keeper integration

**How Automation Will Work:**
1. User enables auto-execute toggle
2. Keeper service monitors active schedules/strategies
3. For DCA: Executes at specified intervals
4. For Yield: Executes when strategy is ready to deposit
5. All executions respect delegation limits

---

## 🔐 Security & Prerequisites

### Prerequisite Matrix

| Action | USDC Balance | USDC Approval | Delegation | aUSDC Approval |
|--------|--------------|---------------|------------|----------------|
| Create DCA Schedule | ✅ Required | ✅ Required | ✅ Required | ❌ Not needed |
| Execute DCA | ✅ Required | ✅ Required | ✅ Required | ❌ Not needed |
| Create Yield Strategy | ✅ Required | ✅ Required | ✅ Required | ❌ Not needed |
| Execute Yield Deposit | ✅ Required | ✅ Required | ✅ Required | ❌ Not needed |
| Withdraw from Yield | ✅ Has aUSDC | ❌ Not needed | ❌ Not needed | ✅ Required |

### Smart Contract Checks

**When creating strategies:**
- ✅ Agent must be registered in MasterAgent
- ✅ User input validation (amounts, intervals, etc.)

**When executing:**
- ✅ Agent is registered
- ✅ User has active delegation to this agent
- ✅ Delegation hasn't expired
- ✅ Daily limit not exceeded
- ✅ Sufficient balance and approval
- ✅ Schedule/strategy is active

---

## 🎨 UI Features Implemented

### Prerequisites Display

**Real-time status checks:**
```
✅ Balance: 1000.00 USDC
✅ Approval: Approved for deposits
```

**Actionable errors:**
```
⚠️ Balance: 5.00 USDC (insufficient)
⚠️ Approval: Needs approval [Approve Button]
```

### Execution Buttons

**DCA Tab:**
- "Create DCA Schedule" - Creates the schedule
- "Execute Schedule Now" - Manually triggers a purchase (appears after creation)

**Yield Tab:**
- "Create Yield Strategy" - Creates the strategy
- "Execute Deposit Now" - Manually triggers a deposit (appears after creation)

### Automation Toggle

**Current State:**
- Disabled toggle with "Coming Soon" label
- Explains keeper network functionality
- Ready for backend integration

**Future State:**
- Enable toggle
- User clicks to activate automation
- Backend keeper service takes over

---

## 🤖 Automation Architecture (Future)

### Option 1: Gelato Network

**Pros:**
- Decentralized keeper network
- Built-in monitoring and execution
- Gas-efficient

**Implementation:**
```typescript
// Frontend: Register task with Gelato
const taskId = await gelatoOps.createTask({
  execAddress: dcaAgentAddress,
  execSelector: 'executeDCASchedule(address,uint256)',
  interval: BigInt(interval), // From user's schedule
  resolverAddress: resolverContract, // Checks if execution is needed
});
```

### Option 2: Chainlink Automation

**Pros:**
- Most decentralized option
- High reliability
- Time-based and custom logic upkeeps

**Implementation:**
```solidity
// Smart Contract: Implement Chainlink-compatible interface
function checkUpkeep(bytes calldata checkData)
  external
  view
  returns (bool upkeepNeeded, bytes memory performData)
{
  // Check if any schedules need execution
  // Return true if conditions are met
}

function performUpkeep(bytes calldata performData) external {
  // Execute the schedule
}
```

### Option 3: Custom Keeper Service

**Pros:**
- Full control
- Custom logic and optimizations
- Can batch executions

**Implementation:**
```typescript
// Backend Service (Node.js + Ethers.js)
import { ethers } from 'ethers';

async function monitorAndExecute() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

  const dcaAgent = new ethers.Contract(DCA_AGENT_ADDRESS, DCA_ABI, wallet);

  // Poll for schedules that need execution
  setInterval(async () => {
    const users = await getUsersWithActiveSchedules();

    for (const user of users) {
      const scheduleId = await dcaAgent.getUserScheduleCount(user) - 1n;
      const schedule = await dcaAgent.getSchedule(user, scheduleId);

      // Check if it's time to execute
      if (shouldExecute(schedule)) {
        try {
          const tx = await dcaAgent.executeDCASchedule(user, scheduleId);
          await tx.wait();
          console.log(`Executed DCA for ${user}`);
        } catch (error) {
          console.error(`Failed to execute for ${user}:`, error);
        }
      }
    }
  }, 30000); // Check every 30 seconds
}
```

---

## 📊 Current vs Future State

### Current Implementation (Manual)

**User Flow:**
1. Delegate permissions
2. Create DCA schedule
3. **Click "Execute Schedule Now"** ← Manual step
4. Transaction executes swap
5. View results in History tab

**Use Cases:**
- Demos and testing
- One-time executions
- Full user control

### Future Implementation (Automated)

**User Flow:**
1. Delegate permissions
2. Create DCA schedule
3. **Enable "Auto-Execute" toggle** ← One-time setup
4. Keeper automatically executes at intervals
5. View results in History tab

**Use Cases:**
- True "set and forget" automation
- Production deployments
- Passive strategies

---

## 🚀 Next Steps for Full Automation

### Backend Development

**1. Choose Keeper Solution:**
- Evaluate Gelato, Chainlink, or custom service
- Consider cost, reliability, decentralization

**2. Implement Monitoring:**
```typescript
// Monitor active schedules
async function getActiveSchedules(): Promise<Schedule[]> {
  const events = await dcaAgent.queryFilter(
    dcaAgent.filters.DCAScheduleCreated()
  );

  return events.map(e => ({
    user: e.args.user,
    scheduleId: e.args.scheduleId,
    interval: e.args.interval,
    lastExecution: e.args.startTime,
  }));
}
```

**3. Implement Execution Logic:**
```typescript
async function executeIfNeeded(schedule: Schedule): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const nextExecution = schedule.lastExecution + schedule.interval;

  if (now >= nextExecution) {
    await dcaAgent.executeDCASchedule(
      schedule.user,
      schedule.scheduleId
    );
  }
}
```

**4. Add Error Handling:**
- Retry failed executions
- Alert on repeated failures
- Handle gas price spikes
- Manage keeper wallet balance

### Frontend Integration

**1. Enable Toggle:**
```typescript
const [autoExecute, setAutoExecute] = useState(false);

const handleToggle = async (enabled: boolean) => {
  if (enabled) {
    // Register with keeper service
    await registerForAutomation(scheduleId);
  } else {
    // Unregister from keeper service
    await unregisterFromAutomation(scheduleId);
  }
  setAutoExecute(enabled);
};
```

**2. Show Automation Status:**
```typescript
{autoExecute && (
  <div className="bg-purple-500/10 border border-purple-500/30 text-purple-300 p-3 rounded-lg">
    ✓ Automation enabled - Next execution: {nextExecutionTime}
  </div>
)}
```

**3. Add Execution History:**
- Show automated vs manual executions
- Display execution timestamps
- Track success/failure rates

---

## 💡 Demo Flow

### For Judges (5-minute demo)

**1. Delegation (1 min):**
- Select both DCA and Yield agents
- Set 10 USDC daily limit
- Choose 5-minute duration
- Grant permissions

**2. DCA Setup (1 min):**
- Set 2 USDC per purchase
- Every 30 seconds interval
- Approve USDC
- Create schedule

**3. Yield Setup (1 min):**
- Set 5 USDC target allocation
- Choose Aave Supply
- Approve USDC
- Create strategy

**4. Execution (2 min):**
- Execute DCA schedule (watch ETH purchase)
- Execute Yield deposit (watch Aave deposit)
- Show History tab
- Show Analytics tab

**Result:** Judges see both agents working in 5 minutes!

---

## 📈 Success Metrics

### For Users:
- ✅ Clear prerequisite checks (no failed transactions)
- ✅ One-click approvals
- ✅ Visual feedback on all actions
- ✅ Transparent execution status

### For Developers:
- ✅ Separation of concerns (manual vs automated)
- ✅ Extensible architecture
- ✅ Easy to add new agent types
- ✅ Ready for production scaling

### For Automation:
- ✅ Keeper infrastructure planned
- ✅ UI toggle implemented
- ✅ Backend integration points defined
- ✅ Error handling designed

---

**You now have a complete, production-ready execution system with manual controls and a clear path to full automation!** 🎉
