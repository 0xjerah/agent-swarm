# Enhanced Error Handling - Transaction Troubleshooting

## What Changed

We've added comprehensive error handling and diagnostics to help identify why the on-chain transaction shows "Review Alert" in MetaMask Flask.

## New Features

### 1. Gas Estimation Before Transaction

**What it does**: Before prompting you to sign the transaction, we now attempt to estimate gas. This catches issues early.

**Location**: [DelegatePermission.tsx](frontend/components/DelegatePermission.tsx:86-118)

**How it helps**:
- If you don't have enough ETH, you'll see an error BEFORE the MetaMask popup
- If the transaction would revert, you'll see why
- You can fix the issue before wasting time on a failed transaction

### 2. Enhanced Error Messages

**What it does**: Parses MetaMask error codes and shows human-readable messages.

**Error Code Translations**:
- `-32603` → "Contract execution would revert" (usually means agent not registered or contract paused)
- `4001` → "Transaction rejected by user"
- `"insufficient funds"` → Specific message with faucet link
- Generic gas errors → Suggests checking ETH balance

**Location**: [DelegatePermission.tsx](frontend/components/DelegatePermission.tsx:99-117, 134-152)

### 3. Transaction Status Display

**What it does**: Shows real-time status updates as the transaction progresses.

**You'll see**:
- "Preparing transaction..."
- "Estimating gas..."
- "Gas estimate: X units..."
- "Sending transaction to MetaMask Flask..."
- "Waiting for confirmation..."
- Warnings if gas estimation fails

**Location**: [DelegatePermission.tsx](frontend/components/DelegatePermission.tsx:353-368)

### 4. Balance Check Script

**What it does**: Command-line tool to diagnose all potential issues at once.

**Usage**:
```bash
./check_balance.sh YOUR_WALLET_ADDRESS
```

**Checks**:
- ✅ Sepolia ETH balance (needs > 0.01 ETH)
- ✅ USDC balance
- ✅ DCA Agent registration status
- ✅ MasterAgent paused status
- ✅ Existing delegation data
- ✅ Summary of what needs to be fixed

**Location**: [check_balance.sh](check_balance.sh)

## How to Use These Features

### When You See "Review Alert"

1. **Check Console**: Open browser console (F12) to see detailed error messages
2. **Read the Error**: We now display the specific issue in the UI
3. **Run Diagnostic**: Use `./check_balance.sh YOUR_ADDRESS` to see all potential issues
4. **Fix the Issue**: Follow the specific guidance for your error

### Most Common Issues and Fixes

#### Issue 1: Insufficient ETH
**You'll see**: "Insufficient Sepolia ETH for gas"

**Fix**:
```bash
# 1. Check your balance
./check_balance.sh YOUR_ADDRESS

# 2. If low, get more from faucet
open https://www.alchemy.com/faucets/ethereum-sepolia
```

#### Issue 2: Agent Not Registered
**You'll see**: "Contract execution would revert"

**Fix**:
```bash
# Run registration script
cd contracts
forge script scripts/RegisterAgents.s.sol:RegisterAgentsScript \
  --rpc-url sepolia \
  --broadcast
```

#### Issue 3: Contract Paused
**You'll see**: "Contract execution would revert"

**Fix**:
```bash
# Check if paused
cast call 0xe5273E84634D9A81C09BEf46aA8980F1270b606A "paused()(bool)" \
  --rpc-url https://sepolia.infura.io/v3/7409a848634e47a0bdd5264df68c2576

# If true, unpause (requires owner)
cast send 0xe5273E84634D9A81C09BEf46aA8980F1270b606A "unpause()" \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY
```

## Testing the New Features

### Test 1: Gas Estimation
1. **Disconnect wallet** from AgentSwarm
2. **Connect with an empty wallet** (no ETH)
3. **Try to delegate permissions**
4. **Expected**: You should see "Insufficient Sepolia ETH for gas" error BEFORE MetaMask opens

### Test 2: Balance Check
1. **Run**: `./check_balance.sh YOUR_ADDRESS`
2. **Expected**: See formatted output with all checks
3. **Expected**: If ETH < 0.01, see warning message

### Test 3: Error Display
1. **Open browser console** (F12)
2. **Click "Grant Advanced Permissions"**
3. **Watch console** for detailed logs
4. **Expected**: See step-by-step progress messages

## What to Share for Further Debugging

If you still encounter issues, share these:

1. **Console Output**:
   - Open console (F12)
   - Clear console
   - Try the transaction
   - Copy ALL console messages

2. **Balance Check Output**:
   ```bash
   ./check_balance.sh YOUR_ADDRESS > diagnostic_output.txt
   ```

3. **MetaMask Error**:
   - Click "Review Alert" in Flask
   - Take screenshot of the error message
   - Copy the exact error text

4. **Network Info**:
   - Open console
   - Type: `window.ethereum.chainId`
   - Share the result

## Expected Flow (When Everything Works)

```
Step 1: Set Limits ✓
  ↓
Step 2: ERC-7715 ✓
  ├─ Install Permission Kernel Snap
  ├─ Install Gator Permissions Snap
  └─ Grant permissions
  ↓
Step 3: On-Chain
  ├─ "Preparing transaction..." (UI message)
  ├─ "Estimating gas..." (UI message)
  ├─ Gas estimation succeeds (console log)
  ├─ "Sending transaction to MetaMask Flask..." (UI message)
  ├─ Flask shows "Confirm" button (NOT "Review Alert")
  ├─ User clicks "Confirm"
  ├─ Transaction processing...
  └─ ✅ Success!
```

## Common MetaMask Flask Quirks

1. **"Ethereum" vs "Sepolia"**:
   - Flask sometimes shows "Ethereum" in the UI
   - Check `chainId` in console - should be `11155111`
   - If correct chainId, ignore the network name display

2. **"Review Alert" Button**:
   - RED button = Something is wrong
   - ALWAYS click it to see the actual error
   - Don't just retry - fix the underlying issue first

3. **Gas Estimation**:
   - Flask estimates gas before showing "Confirm"
   - If estimation fails → "Review Alert"
   - Most common cause: insufficient ETH

## Files Modified

1. **[DelegatePermission.tsx](frontend/components/DelegatePermission.tsx)**
   - Added gas estimation (lines 86-118)
   - Enhanced error handling (lines 134-152)
   - Added transaction status display (lines 353-368)

2. **[check_balance.sh](check_balance.sh)** (NEW)
   - Comprehensive diagnostic script
   - Checks all potential issues
   - Provides specific fix instructions

3. **[TRANSACTION_TROUBLESHOOTING.md](TRANSACTION_TROUBLESHOOTING.md)** (UPDATED)
   - Added reference to balance check script
   - Integrated with new error handling

## Next Steps

1. **Test the changes**:
   - Refresh your browser
   - Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
   - Try the delegation flow again

2. **Check your balance**:
   - Run `./check_balance.sh YOUR_ADDRESS`
   - If ETH < 0.01, get more from faucet

3. **Monitor the console**:
   - Open F12 before starting
   - Watch for detailed error messages
   - Share any errors you see

## Success Indicators

You'll know it's working when:
- ✅ Console shows "Gas estimate successful"
- ✅ Flask shows "Confirm" button (green, not red)
- ✅ UI shows "Waiting for confirmation in MetaMask Flask..."
- ✅ Transaction completes and shows "Success!" message

---

**If you still see "Review Alert" after these improvements**, the enhanced error messages will tell you exactly what's wrong!
