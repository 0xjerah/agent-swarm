export const masterAgentABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" },
      { "internalType": "uint256", "name": "dailyLimit", "type": "uint256" }
    ],
    "name": "delegateToAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "revokeAgentPermission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "getDelegation",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "agent", "type": "address" },
          { "internalType": "uint256", "name": "dailyLimit", "type": "uint256" },
          { "internalType": "uint256", "name": "spentToday", "type": "uint256" },
          { "internalType": "uint256", "name": "lastResetTimestamp", "type": "uint256" },
          { "internalType": "bool", "name": "active", "type": "bool" }
        ],
        "internalType": "struct MasterAgent.DelegatedPermission",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRegisteredAgents",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "dailyLimit", "type": "uint256" }
    ],
    "name": "PermissionDelegated",
    "type": "event"
  }
] as const;