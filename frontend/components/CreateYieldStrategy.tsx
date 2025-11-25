'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { yieldAgentABI } from '@/lib/abis/yieldAgent';
import { TrendingUp, Loader2, CheckCircle } from 'lucide-react';

export default function CreateYieldStrategy() {
  const [amount, setAmount] = useState('');
  const [strategyType, setStrategyType] = useState('0'); // 0 = AAVE_SUPPLY

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreateStrategy = () => {
    if (!amount) return;

    const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
    const mockUSDC = process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}`;

    writeContract({
      address: yieldAgentAddress,
      abi: yieldAgentABI,
      functionName: 'createYieldStrategy',
      args: [mockUSDC, parseInt(strategyType), parseUnits(amount, 6)],
    });
  };

  const strategies = [
    { value: '0', name: 'Aave Supply', apy: '4.50%', risk: 'Low' },
    { value: '1', name: 'Compound Supply', apy: '3.80%', risk: 'Low' },
    { value: '2', name: 'Liquidity Pool', apy: '6.20%', risk: 'Medium' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-green-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Create Yield Strategy</h2>
      </div>
      <p className="text-gray-600 mb-6">
        Automatically deposit your funds into yield-generating protocols.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Allocation (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy Type
          </label>
          <div className="space-y-2">
            {strategies.map((strategy) => (
              <label
                key={strategy.value}
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition ${
                  strategyType === strategy.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={strategyType === strategy.value}
                    onChange={(e) => setStrategyType(e.target.value)}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{strategy.name}</div>
                    <div className="text-xs text-gray-500">Risk: {strategy.risk}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{strategy.apy}</div>
                  <div className="text-xs text-gray-500">APY</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreateStrategy}
          disabled={isPending || isConfirming || !amount}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating...
            </>
          ) : (
            'Create Strategy'
          )}
        </button>

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span>Yield strategy created successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}