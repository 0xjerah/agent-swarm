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
  }) => {
    const isActive = delegation && delegation[4];
    const gradient = color === 'green'
      ? 'from-green-500 to-emerald-600'
      : 'from-purple-500 to-pink-600';

    return (
      <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl w-80 hover:bg-white/[0.15] transition-all duration-300 ${isActive ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="text-base font-bold text-white">{name}</div>
        </div>

        {isActive ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Daily Limit:</span>
              <span className="font-mono text-white font-semibold">{formatUnits(delegation[1], 6)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Spent Today:</span>
              <span className="font-mono text-gray-300">{formatUnits(delegation[2], 6)} USDC</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Remaining:</span>
              <span className={`font-mono font-bold text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                {formatUnits(delegation[1] - delegation[2], 6)} USDC
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            No permission delegated yet
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Permission Tree</h2>
        <p className="text-gray-300 text-sm">
          Visualize your hierarchical permission delegation structure
        </p>
      </div>

      <div className="flex flex-col items-center">
        {/* User */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-8 py-5 rounded-xl shadow-2xl shadow-blue-500/30 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="text-xs font-semibold opacity-90 uppercase tracking-wider">User Wallet</div>
          <div className="font-mono text-base font-bold mt-1">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>

        {/* Connecting line with pulse animation */}
        <div className="relative h-16 w-0.5 my-3">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
        </div>

        {/* Master Agent */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-8 py-5 rounded-xl shadow-2xl shadow-purple-500/30 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <div className="text-xs font-semibold opacity-90 uppercase tracking-wider">Master Agent</div>
              <div className="text-sm font-medium mt-0.5">Orchestrates Sub-Agents</div>
            </div>
          </div>
        </div>

        {/* Branching lines */}
        <div className="relative h-16 w-64 my-3">
          {/* Central vertical line */}
          <div className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 bg-gradient-to-b from-purple-500 to-transparent rounded-full"></div>

          {/* Horizontal connecting line */}
          <div className="absolute left-0 right-0 top-8 h-0.5 bg-gradient-to-r from-green-500 via-purple-500 to-pink-500 rounded-full"></div>

          {/* Left branch */}
          <div className="absolute left-16 top-8 h-8 w-0.5 bg-gradient-to-b from-green-500 to-transparent rounded-full"></div>

          {/* Right branch */}
          <div className="absolute right-16 top-8 h-8 w-0.5 bg-gradient-to-b from-pink-500 to-transparent rounded-full"></div>
        </div>

        {/* Split into two branches */}
        <div className="flex gap-12">
          {/* DCA Branch */}
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-1000">
            <AgentCard
              icon={Repeat}
              name="DCA Agent"
              color="green"
              delegation={dcaDelegation}
            />
          </div>

          {/* Yield Branch */}
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-1000">
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