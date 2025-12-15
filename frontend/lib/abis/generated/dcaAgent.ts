export const dcaAgentABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_masterAgent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_swapRouter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "POOL_FEE_HIGH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "POOL_FEE_LOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "POOL_FEE_MEDIUM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "canExecute",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelSchedule",
    "inputs": [
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createDCASchedule",
    "inputs": [
      {
        "name": "inputToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "outputToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amountPerPurchase",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "intervalSeconds",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "poolFee",
        "type": "uint24",
        "internalType": "uint24"
      },
      {
        "name": "slippageBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeDCA",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getSchedule",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DCAAgent.DCASchedule",
        "components": [
          {
            "name": "user",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "inputToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "outputToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountPerPurchase",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "intervalSeconds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastExecutionTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "poolFee",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "slippageBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserScheduleCount",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "masterAgent",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract MasterAgent"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "schedules",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "inputToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "outputToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amountPerPurchase",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "intervalSeconds",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "lastExecutionTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "poolFee",
        "type": "uint24",
        "internalType": "uint24"
      },
      {
        "name": "slippageBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "swapRouter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ISwapRouter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "userScheduleCount",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "DCAExecuted",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amountSpent",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountReceived",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DCAScheduleCancelled",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DCAScheduleCreated",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "scheduleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amountPerPurchase",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "intervalSeconds",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "poolFee",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;
