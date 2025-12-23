'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { erc20Abi } from '@/lib/abis/erc20';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function ERC7715Diagnostics() {
  const { address } = useAccount();
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

  // Check delegations for both agents
  const { data: dcaDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, dcaAgentAddress] : undefined,
    chainId: 11155111,
  });

  const { data: yieldDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, yieldAgentAddress] : undefined,
    chainId: 11155111,
  });

  // Get list of registered agents
  const { data: registeredAgents } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getRegisteredAgents',
    chainId: 11155111,
  });

  // Check if agents are in the registered list
  const isDCARegistered = registeredAgents?.some(
    (addr: string) => addr.toLowerCase() === dcaAgentAddress.toLowerCase()
  );

  const isYieldRegistered = registeredAgents?.some(
    (addr: string) => addr.toLowerCase() === yieldAgentAddress.toLowerCase()
  );

  // Check USDC approvals to both agents
  const { data: dcaAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, dcaAgentAddress] : undefined,
    chainId: 11155111,
  });

  const { data: yieldAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, yieldAgentAddress] : undefined,
    chainId: 11155111,
  });

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 11155111,
  });

  if (!address) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <p className="text-gray-400">Connect wallet to view diagnostics</p>
      </div>
    );
  }

  // Parse delegation data
  const parseDelegation = (delegation: any) => {
    if (!delegation) return null;
    const { amount, deadline, dailyLimit, lastResetTime } = delegation;
    const now = Math.floor(Date.now() / 1000);
    const hasNeverDelegated = amount === BigInt(0);
    const isExpired = Number(deadline) < now && !hasNeverDelegated;
    const isActive = amount > BigInt(0) && !isExpired;

    return {
      amount,
      deadline,
      dailyLimit,
      lastResetTime,
      isExpired,
      isActive,
      hasNeverDelegated,
      timeRemaining: Number(deadline) - now,
      expiredAt: new Date(Number(deadline) * 1000),
    };
  };

  const dcaInfo = parseDelegation(dcaDelegation);
  const yieldInfo = parseDelegation(yieldDelegation);

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${mins}m`;
    if (seconds < 86400) return `${hours}h`;
    return `${days}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Execution Diagnostics</h3>
        <p className="text-gray-300 text-sm">
          Check all prerequisites for successful execution
        </p>
      </div>

      <div className="space-y-6">
        {/* USDC Balance */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">USDC Balance</h4>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            usdcBalance && usdcBalance > BigInt(0)
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {usdcBalance && usdcBalance > BigInt(0) ? (
              <CheckCircle size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              <span className="font-semibold">
                {usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC
              </span>
            </div>
          </div>
        </div>

        {/* Agent Registration Status */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Agent Registration Status</h4>
          <div className="space-y-2">
            {/* DCA Agent Registration */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              isDCARegistered
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {isDCARegistered ? (
                <CheckCircle size={18} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold">DCA Agent</div>
                <div className="text-xs opacity-75">
                  {isDCARegistered ? 'Registered with MasterAgent' : 'NOT REGISTERED - Execution will fail!'}
                </div>
              </div>
            </div>
            {/* Yield Agent Registration */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              isYieldRegistered
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {isYieldRegistered ? (
                <CheckCircle size={18} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold">Yield Agent</div>
                <div className="text-xs opacity-75">
                  {isYieldRegistered ? 'Registered with MasterAgent' : 'NOT REGISTERED - Execution will fail!'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DCA Agent Checks */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">DCA Agent</h4>
          <div className="space-y-2">
            {/* Delegation */}
            <div className={`p-3 rounded-lg border ${
              dcaInfo?.isActive
                ? 'bg-green-500/10 border-green-500/30'
                : dcaInfo?.isExpired
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-gray-500/10 border-gray-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {dcaInfo?.isActive ? (
                  <CheckCircle size={18} className="flex-shrink-0 text-green-400" />
                ) : (
                  <AlertCircle size={18} className="flex-shrink-0 text-orange-400" />
                )}
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-white">Delegation: </span>
                  {dcaInfo?.isActive ? (
                    <span className="text-green-300">
                      {formatUnits(dcaInfo.dailyLimit, 6)} USDC/day
                      <span className="ml-2 text-xs">
                        <Clock size={12} className="inline mr-1" />
                        {formatTimeRemaining(dcaInfo.timeRemaining)} remaining
                      </span>
                    </span>
                  ) : dcaInfo?.isExpired ? (
                    <span className="text-orange-300">
                      Expired on {dcaInfo.expiredAt.toLocaleDateString()} at {dcaInfo.expiredAt.toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-gray-300">No delegation created yet</span>
                  )}
                </div>
              </div>
              {dcaInfo?.isExpired && (
                <div className="mt-2 pl-7 text-xs text-orange-200">
                  Your previous delegation has expired. Go to the Delegate tab to create a new one.
                </div>
              )}
              {dcaInfo?.hasNeverDelegated && (
                <div className="mt-2 pl-7 text-xs text-gray-300">
                  You haven't delegated permissions to this agent yet. Go to the Delegate tab to get started.
                </div>
              )}
            </div>

            {/* Approval */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              dcaAllowance && dcaAllowance > BigInt(0)
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {dcaAllowance && dcaAllowance > BigInt(0) ? (
                <CheckCircle size={18} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0" />
              )}
              <div className="flex-1 text-sm">
                <span className="font-semibold">USDC Approval: </span>
                {dcaAllowance && dcaAllowance > BigInt(0)
                  ? `${formatUnits(dcaAllowance, 6)} USDC approved`
                  : 'Not approved'}
              </div>
            </div>
          </div>
        </div>

        {/* Yield Agent Checks */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Yield Agent</h4>
          <div className="space-y-2">
            {/* Delegation */}
            <div className={`p-3 rounded-lg border ${
              yieldInfo?.isActive
                ? 'bg-green-500/10 border-green-500/30'
                : yieldInfo?.isExpired
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-gray-500/10 border-gray-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {yieldInfo?.isActive ? (
                  <CheckCircle size={18} className="flex-shrink-0 text-green-400" />
                ) : (
                  <AlertCircle size={18} className="flex-shrink-0 text-orange-400" />
                )}
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-white">Delegation: </span>
                  {yieldInfo?.isActive ? (
                    <span className="text-green-300">
                      {formatUnits(yieldInfo.dailyLimit, 6)} USDC/day
                      <span className="ml-2 text-xs">
                        <Clock size={12} className="inline mr-1" />
                        {formatTimeRemaining(yieldInfo.timeRemaining)} remaining
                      </span>
                    </span>
                  ) : yieldInfo?.isExpired ? (
                    <span className="text-orange-300">
                      Expired on {yieldInfo.expiredAt.toLocaleDateString()} at {yieldInfo.expiredAt.toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-gray-300">No delegation created yet</span>
                  )}
                </div>
              </div>
              {yieldInfo?.isExpired && (
                <div className="mt-2 pl-7 text-xs text-orange-200">
                  Your previous delegation has expired. Go to the Delegate tab to create a new one.
                </div>
              )}
              {yieldInfo?.hasNeverDelegated && (
                <div className="mt-2 pl-7 text-xs text-gray-300">
                  You haven't delegated permissions to this agent yet. Go to the Delegate tab to get started.
                </div>
              )}
            </div>

            {/* Approval */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              yieldAllowance && yieldAllowance > BigInt(0)
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {yieldAllowance && yieldAllowance > BigInt(0) ? (
                <CheckCircle size={18} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0" />
              )}
              <div className="flex-1 text-sm">
                <span className="font-semibold">USDC Approval: </span>
                {yieldAllowance && yieldAllowance > BigInt(0)
                  ? `${formatUnits(yieldAllowance, 6)} USDC approved`
                  : 'Not approved'}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <strong>Note:</strong> For successful execution, you need:
          </p>
          <ul className="text-blue-300 text-sm mt-2 space-y-1 ml-4">
            <li>• Active delegation to the agent</li>
            <li>• USDC approval to the agent contract</li>
            <li>• Sufficient USDC balance</li>
            <li>• For DCA: Enough time passed since last execution</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
