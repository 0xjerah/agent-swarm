'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { dcaAgentABI } from '@/lib/abis/dcaAgent';
import { Loader2, CheckCircle, TrendingUp } from 'lucide-react';

export default function CreateDCASchedule() {
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('86400'); // 1 day in seconds

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreateSchedule = () => {
    if (!amount) return;

    const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
    const mockUSDC = process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}`;
    const mockETH = '0x0000000000000000000000000000000000000000'; // ETH

    writeContract({
      address: dcaAgentAddress,
      abi: dcaAgentABI,
      functionName: 'createDCASchedule',
      args: [
        mockUSDC,
        mockETH,
        parseUnits(amount, 6),
        BigInt(interval),
      ],
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            DCA Schedule
          </h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Set up automated recurring purchases of ETH using your delegated USDC. Your DCA agent will execute trades at optimal times.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Amount Per Purchase (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDC</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            This amount will be swapped for ETH at each interval
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Purchase Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
          >
            <option value="3600" className="bg-slate-800">Every Hour</option>
            <option value="86400" className="bg-slate-800">Every Day</option>
            <option value="604800" className="bg-slate-800">Every Week</option>
          </select>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            Automated purchases reduce timing risk
          </p>
        </div>

        <button
          onClick={handleCreateSchedule}
          disabled={isPending || isConfirming || !amount}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Creating Schedule...</span>
            </>
          ) : (
            <>
              <span>Create DCA Schedule</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </>
          )}
        </button>

        {isSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">Schedule Created!</p>
              <p className="text-sm leading-relaxed">
                Your DCA schedule is now active. The agent will automatically purchase ETH at your specified interval.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}