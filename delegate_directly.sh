#!/bin/bash

# Direct delegation using cast
# This bypasses MetaMask Flask entirely

echo "========================================="
echo "Direct On-Chain Delegation"
echo "========================================="
echo ""

# Set your private key
read -sp "Enter your private key: " PRIVATE_KEY
echo ""
echo ""

# Contract addresses
MASTER_AGENT="0xe5273E84634D9A81C09BEf46aA8980F1270b606A"
DCA_AGENT="0x0D32685A3b5F3618B8bd6B8f22e748E50144b7EE"
RPC_URL="https://sepolia.infura.io/v3/7409a848634e47a0bdd5264df68c2576"

# Parameters
DAILY_LIMIT="1000000000"  # 1000 USDC (6 decimals)
DURATION="604800"         # 7 days in seconds

echo "Delegating to DCA Agent..."
echo "- Master Agent: $MASTER_AGENT"
echo "- DCA Agent: $DCA_AGENT"
echo "- Daily Limit: $DAILY_LIMIT (1000 USDC)"
echo "- Duration: $DURATION seconds (7 days)"
echo ""

# Send the transaction
cast send $MASTER_AGENT \
  "delegateToAgent(address,uint256,uint256)" \
  $DCA_AGENT \
  $DAILY_LIMIT \
  $DURATION \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --gas-limit 200000

echo ""
echo "========================================="
echo "Done!"
echo "========================================="
echo ""
echo "Check the transaction on Etherscan:"
echo "https://sepolia.etherscan.io/address/$MASTER_AGENT"
