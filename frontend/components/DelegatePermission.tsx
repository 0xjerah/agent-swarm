'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { masterAgentABI } from '@/lib/abis/masterAgent';

export default function DelegatePermission() {
  const { address } = useAccount();
  const [dailyLimit, setDailyLimit] = useState('');
  
  const { data: hash, writeContract, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleDelegate = async () => {
    if (!dailyLimit) return;

    const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
    const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
    
    writeContract({
      address: masterAgentAddress,
      abi: masterAgentABI,
      functionName: 'delegateToAgent',
      args: [dcaAgentAddress, parseUnits(dailyLimit, 6)], // USDC has 6 decimals
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Delegate Permission to DCA Agent
      </h2>
      <p className="text-gray-600 mb-6">
        Grant the DCA Agent permission to spend USDC on your behalf for automated purchases.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Spending Limit (USDC)
          </label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleDelegate}
          disabled={isPending || isConfirming || !dailyLimit}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Processing...' : 'Delegate Permission'}
        </button>

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ Permission delegated successfully!
          </div>
        )}
      </div>
    </div>
  );
}