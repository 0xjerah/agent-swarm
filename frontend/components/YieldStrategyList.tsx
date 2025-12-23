'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { yieldAgentABI } from '@/lib/abis/generated/yieldAgent';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { Loader2, XCircle, TrendingUp, DollarSign, AlertCircle, Clock } from 'lucide-react';

export default function YieldStrategyList() {
  const { address } = useAccount();
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Get user's strategy count
  const { data: strategyCount, refetch: refetchCount } = useReadContract({
    address: yieldAgentAddress,
    abi: yieldAgentABI,
    functionName: 'getUserStrategyCount',
    args: address ? [address] : undefined,
    chainId: 11155111,
  });

  // Check delegation status
  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, yieldAgentAddress] : undefined,
    chainId: 11155111,
  });

  const strategyIds = strategyCount
    ? Array.from({ length: Number(strategyCount) }, (_, i) => i)
    : [];

  // Parse delegation
  const parseDelegation = () => {
    if (!delegation) return { isActive: false, isExpired: false, hasNeverDelegated: true };
    const { dailyLimit, active, expiry } = delegation as any;
    const now = Math.floor(Date.now() / 1000);
    const hasNeverDelegated = dailyLimit === BigInt(0);
    // Match contract logic: block.timestamp > permission.expiry
    const isExpired = now > Number(expiry) && !hasNeverDelegated;
    const isActive = active && !isExpired;
    return { isActive, isExpired, hasNeverDelegated, expiredAt: new Date(Number(expiry) * 1000) };
  };

  const delegationStatus = parseDelegation();

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Your Yield Strategies</h3>
        <p className="text-gray-300 text-sm">
          Manage and execute your active yield strategies
        </p>
      </div>

      {/* Delegation Status Warning */}
      {!delegationStatus.isActive && strategyIds.length > 0 && (
        <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-semibold mb-1">
                {delegationStatus.isExpired ? 'Delegation Expired' : 'No Active Delegation'}
              </p>
              <p className="text-orange-200 text-sm">
                {delegationStatus.isExpired ? (
                  <>
                    Your delegation expired on {delegationStatus.expiredAt?.toLocaleDateString()} at{' '}
                    {delegationStatus.expiredAt?.toLocaleTimeString()}. You cannot execute deposits until you create a new delegation.
                  </>
                ) : (
                  <>
                    You need to delegate permissions to the Yield Agent before you can execute deposits.
                  </>
                )}
              </p>
              <p className="text-orange-200 text-sm mt-2">
                Go to the <strong>Delegate</strong> tab to {delegationStatus.isExpired ? 'renew' : 'create'} your delegation.
              </p>
            </div>
          </div>
        </div>
      )}

      {strategyIds.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p>No yield strategies created yet</p>
          <p className="text-sm mt-2">Create your first strategy above to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {strategyIds.map((strategyId) => (
            <StrategyCard
              key={strategyId}
              strategyId={strategyId}
              userAddress={address!}
              yieldAgentAddress={yieldAgentAddress}
              onExecute={() => refetchCount()}
              delegationActive={delegationStatus.isActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  strategyId,
  userAddress,
  yieldAgentAddress,
  onExecute,
  delegationActive,
}: {
  strategyId: number;
  userAddress: `0x${string}`;
  yieldAgentAddress: `0x${string}`;
  onExecute: () => void;
  delegationActive: boolean;
}) {
  // Get strategy details
  const { data: strategy } = useReadContract({
    address: yieldAgentAddress,
    abi: yieldAgentABI,
    functionName: 'getStrategy',
    args: [userAddress, BigInt(strategyId)],
    chainId: 11155111,
  });

  // Execute deposit transaction
  const { data: depositHash, writeContract: executeDeposit, isPending: isDepositing } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Cancel transaction
  const { data: cancelHash, writeContract: cancelStrategy, isPending: isCanceling } = useWriteContract();
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({
    hash: cancelHash,
  });

  const handleDeposit = () => {
    executeDeposit({
      address: yieldAgentAddress,
      abi: yieldAgentABI,
      functionName: 'executeDeposit',
      args: [userAddress, BigInt(strategyId)],
      chainId: 11155111,
      gas: BigInt(500000),
    });
  };

  const handleCancel = () => {
    cancelStrategy({
      address: yieldAgentAddress,
      abi: yieldAgentABI,
      functionName: 'deactivateStrategy',
      args: [BigInt(strategyId)],
      chainId: 11155111,
    });
  };

  if (!strategy) return null;

  // Destructure the strategy struct
  const {
    token,
    aToken,
    strategyType: stratType,
    targetAllocation,
    currentDeposited,
    totalYieldEarned,
    lastHarvestTime,
    active: isActive,
  } = strategy as any;

  const strategyTypes = ['Aave Supply', 'Aave E-Mode'];
  const strategyName = strategyTypes[Number(stratType)] || `Type ${stratType}`;

  // Calculate utilization percentage
  const utilizationPercent = targetAllocation > BigInt(0)
    ? (Number(currentDeposited) * 100 / Number(targetAllocation)).toFixed(1)
    : '0';

  // Calculate next harvest time (contract enforces 1 day = 86400 seconds between harvests)
  const nextHarvestTime = Number(lastHarvestTime) + 86400;
  const now = Math.floor(Date.now() / 1000);
  const canHarvest = now >= nextHarvestTime;
  const timeUntilHarvest = nextHarvestTime - now;

  const formatTimeUntil = (seconds: number) => {
    if (seconds <= 0) return 'Ready now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  return (
    <div className={`bg-white/5 border rounded-xl p-5 ${
      isActive && delegationActive
        ? 'border-green-500/30 hover:bg-white/[0.07]'
        : isActive && !delegationActive
        ? 'border-orange-500/30 opacity-75'
        : 'border-white/10 opacity-60'
    } transition-all duration-300`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Strategy Header */}
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-white">
              Strategy #{strategyId}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isActive && delegationActive
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : isActive && !delegationActive
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
            }`}>
              {isActive && delegationActive ? 'Active' : isActive && !delegationActive ? 'Inactive (No Delegation)' : 'Cancelled'}
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {strategyName}
            </div>
          </div>

          {/* Strategy Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Target Allocation</div>
              <div className="text-sm font-semibold text-white">
                {formatUnits(targetAllocation, 6)} USDC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Current Allocation</div>
              <div className="text-sm font-semibold text-white">
                {formatUnits(currentDeposited, 6)} USDC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Utilization</div>
              <div className="text-sm font-semibold text-white">
                {utilizationPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Yield Earned</div>
              <div className="text-sm font-semibold text-green-400">
                {formatUnits(totalYieldEarned, 6)} Tokens
              </div>
            </div>
          </div>

          {/* Next Harvest Time */}
          {isActive && currentDeposited > BigInt(0) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className={canHarvest ? 'text-green-400' : 'text-gray-400'} />
              <span className={canHarvest ? 'text-green-300' : 'text-gray-300'}>
                Next harvest: {formatTimeUntil(timeUntilHarvest)}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {isActive && (
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(parseFloat(utilizationPercent), 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isActive && (
            <>
              <button
                onClick={handleDeposit}
                disabled={!delegationActive || isDepositing || isDepositConfirming}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={!delegationActive ? 'Delegation required to execute' : ''}
              >
                {isDepositing || isDepositConfirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Depositing...</span>
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    <span>Deposit</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isCanceling || isCancelConfirming}
                className="px-4 py-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCanceling || isCancelConfirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Canceling...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Cancel</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Messages */}
      {isDepositSuccess && (
        <div className="mt-3 bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm">
          ✓ Deposit executed successfully! Funds deployed to Aave V3.
        </div>
      )}
      {isCancelSuccess && (
        <div className="mt-3 bg-gray-500/10 border border-gray-500/30 text-gray-300 px-4 py-2 rounded-lg text-sm">
          Strategy cancelled
        </div>
      )}
    </div>
  );
}
