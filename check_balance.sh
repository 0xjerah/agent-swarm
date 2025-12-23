#!/bin/bash

# Check Sepolia ETH Balance
# Usage: ./check_balance.sh <YOUR_WALLET_ADDRESS>

if [ -z "$1" ]; then
  echo "Usage: ./check_balance.sh <YOUR_WALLET_ADDRESS>"
  exit 1
fi

WALLET_ADDRESS=$1
RPC_URL="https://sepolia.infura.io/v3/7409a848634e47a0bdd5264df68c2576"

echo "========================================="
echo "Sepolia Balance Check"
echo "========================================="
echo "Wallet: $WALLET_ADDRESS"
echo ""

# Get ETH balance
echo "🔍 Checking ETH balance..."
ETH_BALANCE_WEI=$(cast balance $WALLET_ADDRESS --rpc-url $RPC_URL)
ETH_BALANCE_ETH=$(cast --to-unit $ETH_BALANCE_WEI ether)

echo "ETH Balance: $ETH_BALANCE_ETH ETH"
echo ""

# Check if balance is sufficient
if [ $(echo "$ETH_BALANCE_ETH < 0.01" | bc) -eq 1 ]; then
  echo "⚠️  WARNING: Low ETH balance!"
  echo "   You need at least 0.01-0.02 ETH for gas fees."
  echo ""
  echo "   Get more from: https://www.alchemy.com/faucets/ethereum-sepolia"
  echo ""
else
  echo "✅ ETH balance looks good!"
  echo ""
fi

# Get USDC balance
echo "🔍 Checking USDC balance..."
USDC_ADDRESS="0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"
USDC_BALANCE=$(cast call $USDC_ADDRESS "balanceOf(address)(uint256)" $WALLET_ADDRESS --rpc-url $RPC_URL)
USDC_BALANCE_FORMATTED=$(echo "scale=2; $USDC_BALANCE / 1000000" | bc)

echo "USDC Balance: $USDC_BALANCE_FORMATTED USDC"
echo ""

if [ "$USDC_BALANCE" -eq "0" ]; then
  echo "⚠️  No USDC found!"
  echo "   Get test USDC from: https://app.aave.com/faucet/"
  echo ""
fi

# Check contract states
echo "========================================="
echo "Contract State Checks"
echo "========================================="
echo ""

MASTER_AGENT="0xe5273E84634D9A81C09BEf46aA8980F1270b606A"
DCA_AGENT="0x0D32685A3b5F3618B8bd6B8f22e748E50144b7EE"

echo "🔍 Checking if DCA Agent is registered..."
DCA_REGISTERED=$(cast call $MASTER_AGENT "registeredAgents(address)(bool)" $DCA_AGENT --rpc-url $RPC_URL)
if [ "$DCA_REGISTERED" = "true" ]; then
  echo "✅ DCA Agent is registered"
else
  echo "❌ DCA Agent is NOT registered"
fi
echo ""

echo "🔍 Checking if MasterAgent is paused..."
IS_PAUSED=$(cast call $MASTER_AGENT "paused()(bool)" --rpc-url $RPC_URL)
if [ "$IS_PAUSED" = "false" ]; then
  echo "✅ MasterAgent is NOT paused (good)"
else
  echo "❌ MasterAgent IS paused"
fi
echo ""

# Check if user has existing delegation
echo "🔍 Checking existing delegation..."
DELEGATION=$(cast call $MASTER_AGENT "delegations(address,address)" $WALLET_ADDRESS $DCA_AGENT --rpc-url $RPC_URL)
echo "Current delegation data: $DELEGATION"
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo ""

if [ $(echo "$ETH_BALANCE_ETH < 0.01" | bc) -eq 1 ]; then
  echo "❌ ISSUE: Insufficient ETH for gas"
  echo "   → Get more from Alchemy faucet"
elif [ "$DCA_REGISTERED" != "true" ]; then
  echo "❌ ISSUE: DCA Agent not registered"
  echo "   → Run: forge script contracts/scripts/RegisterAgents.s.sol:RegisterAgentsScript --rpc-url sepolia --broadcast"
elif [ "$IS_PAUSED" = "true" ]; then
  echo "❌ ISSUE: MasterAgent is paused"
  echo "   → Unpause the contract"
else
  echo "✅ All checks passed! Transaction should work."
fi

echo ""
