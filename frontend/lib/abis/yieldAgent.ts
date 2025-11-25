export const yieldAgentABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint8', name: 'strategyType', type: 'uint8' },
      { internalType: 'uint256', name: 'targetAllocation', type: 'uint256' },
    ],
    name: 'createYieldStrategy',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'strategyId', type: 'uint256' },
    ],
    name: 'executeDeposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'strategyId', type: 'uint256' }],
    name: 'harvestYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'strategyId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdrawFromStrategy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'strategyId', type: 'uint256' },
    ],
    name: 'getStrategy',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint8', name: 'strategyType', type: 'uint8' },
          { internalType: 'address', name: 'protocol', type: 'address' },
          { internalType: 'uint256', name: 'targetAllocation', type: 'uint256' },
          { internalType: 'uint256', name: 'currentDeposited', type: 'uint256' },
          { internalType: 'uint256', name: 'totalYieldEarned', type: 'uint256' },
          { internalType: 'uint256', name: 'lastHarvestTime', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
        ],
        internalType: 'struct YieldAgent.YieldStrategy',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'strategyId', type: 'uint256' },
    ],
    name: 'getStrategyAPY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'strategyId', type: 'uint256' },
    ],
    name: 'canDeposit',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'strategyId', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'strategyType', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'targetAllocation', type: 'uint256' },
    ],
    name: 'StrategyCreated',
    type: 'event',
  },
] as const;