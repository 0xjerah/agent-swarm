'use client';

import { useAccount, useReadContract } from 'wagmi';
import { masterAgentABI } from '@/lib/abis/masterAgent';
import { formatUnits } from 'viem';
import { Bot, TrendingUp, Repeat } from 'lucide-react';

export default function PermissionTree() {
  const { address } = useAccount();
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  const { data: dcaDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address && dcaAgentAddress ? [address, dcaAgentAddress] : undefined,
  });

  const { data: yieldDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address && yieldAgentAddress ? [address, yieldAgentAddress] : undefined,
  });

  const AgentCard = ({
    icon: Icon,
    name,
    color,
    delegation,
  }: {
    icon: any;
    name: string;
    color: string;
    delegation: any;
  }) => (
    <div className={`bg-${color}-600 text-white px-6 py-4 rounded-lg shadow-lg w-80`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} />
        <div className="text-sm opacity-80">{name}</div>
      </div>

      {delegation && delegation[4] ? (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Daily Limit:</span>
            <span className="font-mono">{formatUnits(delegation[1], 6)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span>Spent Today:</span>
            <span className="font-mono">{formatUnits(delegation[2], 6)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining:</span>
            <span className="font-mono font-bold">
              {formatUnits(delegation[1] - delegation[2], 6)} USDC
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm opacity-80">No permission delegated yet</div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Permission Tree</h2>

      <div className="flex flex-col items-center">
        {/* User */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="text-sm opacity-80">User</div>
          <div className="font-mono text-xs">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>

        <div className="h-12 w-1 bg-gray-300 my-2"></div>

        {/* Master Agent */}
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <div>
              <div className="text-sm opacity-80">Master Agent</div>
              <div className="text-xs">Orchestrates sub-agents</div>
            </div>
          </div>
        </div>

        <div className="h-12 w-1 bg-gray-300 my-2"></div>

        {/* Split into two branches */}
        <div className="flex gap-8">
          {/* DCA Branch */}
          <div className="flex flex-col items-center">
            <div className="h-12 w-1 bg-gray-300 mb-2"></div>
            <AgentCard
              icon={Repeat}
              name="DCA Agent"
              color="green"
              delegation={dcaDelegation}
            />
          </div>

          {/* Yield Branch */}
          <div className="flex flex-col items-center">
            <div className="h-12 w-1 bg-gray-300 mb-2"></div>
            <AgentCard
              icon={TrendingUp}
              name="Yield Agent"
              color="purple"
              delegation={yieldDelegation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}