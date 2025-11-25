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
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Yield Strategy
          </h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Automatically deposit your funds into yield-generating protocols. Earn passive income while maintaining full control.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Target Allocation (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white/[0.15] transition-all duration-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDC</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-teal-400 rounded-full"></span>
            Amount to automatically invest for yield generation
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white mb-3">
            Strategy Type
          </label>
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <label
                key={strategy.value}
                className={`flex items-center justify-between p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  strategyType === strategy.value
                    ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-white/10 bg-white/5 hover:border-green-500/30 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={strategyType === strategy.value}
                    onChange={(e) => setStrategyType(e.target.value)}
                    className="w-5 h-5 text-green-500 focus:ring-green-500 focus:ring-offset-0"
                  />
                  <div>
                    <div className="font-bold text-white text-base">{strategy.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Risk Level: <span className={strategy.risk === 'Low' ? 'text-green-400' : 'text-yellow-400'}>{strategy.risk}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{strategy.apy}</div>
                  <div className="text-xs text-gray-400">APY</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreateStrategy}
          disabled={isPending || isConfirming || !amount}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-700 hover:to-teal-700 hover:shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Creating Strategy...</span>
            </>
          ) : (
            <>
              <span>Create Yield Strategy</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </>
          )}
        </button>

        {isSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">Strategy Created!</p>
              <p className="text-sm leading-relaxed">
                Your yield strategy is now active. The agent will automatically manage your deposits and harvest rewards.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}