#!/bin/bash

# Script to generate TypeScript ABI files for frontend

set -e

echo "Generating ABIs for frontend..."

# Create output directory
mkdir -p ../frontend/lib/abis/generated

# Extract and format ABIs
echo "Extracting MasterAgent ABI..."
cat out/MasterAgent.sol/MasterAgent.json | jq -r '.abi' > /tmp/master_abi.json

echo "Extracting DCAAgent ABI..."
cat out/DCAAgent.sol/DCAAgent.json | jq -r '.abi' > /tmp/dca_abi.json

echo "Extracting YieldAgent ABI..."
cat out/YieldAgent.sol/YieldAgent.json | jq -r '.abi' > /tmp/yield_abi.json

# Generate TypeScript files
echo "Generating TypeScript ABI files..."

echo "export const masterAgentABI = $(cat /tmp/master_abi.json) as const;" > ../frontend/lib/abis/generated/masterAgent.ts
echo "export const dcaAgentABI = $(cat /tmp/dca_abi.json) as const;" > ../frontend/lib/abis/generated/dcaAgent.ts
echo "export const yieldAgentABI = $(cat /tmp/yield_abi.json) as const;" > ../frontend/lib/abis/generated/yieldAgent.ts

echo "✅ ABIs generated successfully in frontend/lib/abis/generated/"
echo ""
echo "Next steps:"
echo "1. Update frontend components to import from 'generated' folder"
echo "2. Run: cd ../frontend && npm run dev"
