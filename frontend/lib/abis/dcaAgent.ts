export const dcaAgentABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "inputToken", "type": "address" },
      { "internalType": "address", "name": "outputToken", "type": "address" },
      { "internalType": "uint256", "name": "amountPerPurchase", "type": "uint256" },
      { "internalType": "uint256", "name": "intervalSeconds", "type": "uint256" }
    ],
    "name": "createDCASchedule",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "scheduleId", "type": "uint256" }
    ],
    "name": "executeDCA",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "scheduleId", "type": "uint256" }
    ],
    "name": "cancelSchedule",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "scheduleId", "type": "uint256" }
    ],
    "name": "getSchedule",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "user", "type": "address" },
          { "internalType": "address", "name": "inputToken", "type": "address" },
          { "internalType": "address", "name": "outputToken", "type": "address" },
          { "internalType": "uint256", "name": "amountPerPurchase", "type": "uint256" },
          { "internalType": "uint256", "name": "intervalSeconds", "type": "uint256" },
          { "internalType": "uint256", "name": "lastExecutionTime", "type": "uint256" },
          { "internalType": "bool", "name": "active", "type": "bool" }
        ],
        "internalType": "struct DCAAgent.DCASchedule",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;