'use client';

import { useAccount, useReadContract } from 'wagmi';
import { masterAgentABI } from '@/lib/abis/masterAgent';
import { formatUnits } from 'viem';

export default function PermissionTree() {
  const { address } = useAccount();
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address && dcaAgentAddress ? [address, dcaAgentAddress] : undefined,
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Permission Tree
      </h2>

      {/* User Node */}
      <div className="flex flex-col items-center">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="text-sm opacity-80">User</div>
          <div className="font-mono text-xs">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>

        {/* Arrow */}
        <div className="h-12 w-1 bg-gray-300 my-2"></div>

        {/* Master Agent */}
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="text-sm opacity-80">Master Agent</div>
          <div className="text-xs">Orchestrates sub-agents</div>
        </div>

        {/* Arrow */}
        <div className="h-12 w-1 bg-gray-300 my-2"></div>

        {/* DCA Agent */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg w-80">
          <div className="text-sm opacity-80 mb-2">🤖 DCA Agent</div>
          
          {delegation && delegation[4] ? ( // delegation[4] is 'active' field
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Daily Limit:</span>
                <span className="font-mono">
                  {formatUnits(delegation[1], 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span>Spent Today:</span>
                <span className="font-mono">
                  {formatUnits(delegation[2], 6)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-mono font-bold">
                  {formatUnits(delegation[1] - delegation[2], 6)} USDC
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-80">
              No permission delegated yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}