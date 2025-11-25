'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { dcaAgentABI } from '@/lib/abis/dcaAgent';

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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Create DCA Schedule
      </h2>
      <p className="text-gray-600 mb-6">
        Set up automated recurring purchases of ETH using your delegated USDC.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount Per Purchase (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="3600">Every Hour</option>
            <option value="86400">Every Day</option>
            <option value="604800">Every Week</option>
          </select>
        </div>

        <button
          onClick={handleCreateSchedule}
          disabled={isPending || isConfirming || !amount}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
        >
          {isPending || isConfirming ? 'Creating...' : 'Create Schedule'}
        </button>

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ DCA Schedule created successfully!
          </div>
        )}
      </div>
    </div>
  );
}