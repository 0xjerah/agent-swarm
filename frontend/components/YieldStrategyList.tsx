'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { gql } from '@apollo/client';
import { useQuery as useApolloQuery } from '@apollo/client/react';
import { formatUnits } from 'viem';
import { yieldAgentCompoundABI } from '@/lib/abis/generated/yieldAgentCompound';
import { yieldAgentABI } from '@/lib/abis/generated/yieldAgent';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { Loader2, XCircle, TrendingUp, DollarSign, Clock } from 'lucide-react';

// GraphQL query to fetch user's yield strategies
const GET_USER_YIELD_STRATEGIES = gql`
  query GetUserYieldStrategies($userAddress: String!) {
    YieldStrategy(
      where: { user: { _eq: $userAddress } }
      order_by: { createdAt: desc }
    ) {
      id
      user
      strategyId
      agentAddress
      protocol
      totalDeposited
      totalWithdrawn
      totalRewardsClaimed
      currentShares
      isActive
      isPaused
      createdAt
      lastDepositAt
      lastWithdrawalAt
      lastRewardsClaimAt
    }
  }
`;

export default function YieldStrategyList() {
  const { address } = useAccount();

  // Both YieldAgent contract addresses
  const yieldAgentCompoundAddress = '0x7cbD25A489917C3fAc92EFF1e37C3AE2afccbcf2' as `0x${string}`;
  const yieldAgentAaveAddress = '0xb95adacB74E981bcfB1e97B4d277E51A95753C8F' as `0x${string}`;

  // Fetch strategies from Envio GraphQL
  const { data, loading, error, refetch } = useApolloQuery(GET_USER_YIELD_STRATEGIES, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
    pollInterval: 5000, // Poll every 5s for real-time updates
    notifyOnNetworkStatusChange: false,
  });

  // Fallback: Get strategy counts from contracts via RPC if Envio has no data
  const { data: compoundCount } = useReadContract({
    address: yieldAgentCompoundAddress,
    abi: yieldAgentCompoundABI,
    functionName: 'getUserStrategyCount',
    args: address ? [address] : undefined,
    chainId: 11155111,
    query: { enabled: !!address }
  });

  const { data: aaveCount } = useReadContract({
    address: yieldAgentAaveAddress,
    abi: yieldAgentABI,
    functionName: 'getUserStrategyCount',
    args: address ? [address] : undefined,
    chainId: 11155111,
    query: { enabled: !!address }
  });

  const envioStrategies = (data as any)?.YieldStrategy || [];

  // Build fallback strategy list from RPC if Envio has no data
  const rpcStrategies = envioStrategies.length === 0 && (compoundCount || aaveCount)
    ? [
        ...(compoundCount ? Array.from({ length: Number(compoundCount) }, (_, i) => ({
          id: `fallback-compound-${i}`,
          strategyId: i.toString(),
          protocol: 'compound',
          agentAddress: yieldAgentCompoundAddress.toLowerCase(),
        })) : []),
        ...(aaveCount ? Array.from({ length: Number(aaveCount) }, (_, i) => ({
          id: `fallback-aave-${i}`,
          strategyId: i.toString(),
          protocol: 'aave',
          agentAddress: yieldAgentAaveAddress.toLowerCase(),
        })) : [])
      ]
    : [];

  const strategies = envioStrategies.length > 0 ? envioStrategies : rpcStrategies;

  if (loading && !data) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="text-center py-12 text-red-400">
          <p>Error loading strategies: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Your Yield Strategies</h3>
        <p className="text-gray-300 text-sm">
          Manage and execute your active yield strategies
        </p>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p>No yield strategies created yet</p>
          <p className="text-sm mt-2">Create your first strategy above to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy: any) => {
            const protocol = strategy.protocol as 'compound' | 'aave';
            const yieldAgentAddress = (protocol === 'compound' ? yieldAgentCompoundAddress : yieldAgentAaveAddress);

            return (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                protocol={protocol}
                userAddress={address!}
                yieldAgentAddress={yieldAgentAddress}
                onExecute={refetch}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  strategy,
  protocol,
  userAddress,
  yieldAgentAddress,
  onExecute,
}: {
  strategy: any;
  protocol: 'compound' | 'aave';
  userAddress: `0x${string}`;
  yieldAgentAddress: `0x${string}`;
  onExecute: () => void;
}) {
  const isCompound = protocol === 'compound';
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Check delegation status for this specific protocol
  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: [userAddress, yieldAgentAddress],
    chainId: 11155111,
    query: {
      refetchInterval: 5000,
    },
  });

  const parseDelegation = () => {
    if (!delegation) return { isActive: false };
    const { active, expiry } = delegation as any;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > Number(expiry);
    return { isActive: active && !isExpired };
  };

  const delegationStatus = parseDelegation();
  const delegationActive = delegationStatus.isActive;

  // Get detailed strategy data from contract (Envio only has aggregated data)
  const { data: contractStrategy } = useReadContract({
    address: yieldAgentAddress,
    abi: isCompound ? yieldAgentCompoundABI : yieldAgentABI,
    functionName: 'getStrategy',
    args: [userAddress, BigInt(strategy.strategyId)],
    chainId: 11155111,
    query: {
      refetchInterval: 5000,
    },
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
      abi: isCompound ? yieldAgentCompoundABI : yieldAgentABI,
      functionName: 'executeDeposit',
      args: [userAddress, BigInt(strategy.strategyId)],
      chainId: 11155111,
      gas: BigInt(500000),
    });
  };

  const handleCancel = () => {
    cancelStrategy({
      address: yieldAgentAddress,
      abi: isCompound ? yieldAgentCompoundABI : yieldAgentABI,
      functionName: 'deactivateStrategy',
      args: [BigInt(strategy.strategyId)],
      chainId: 11155111,
    });
  };

  if (!contractStrategy) return null;

  // Destructure the contract strategy struct
  const strategyData = contractStrategy as any;
  const {
    strategyType: stratType,
    targetAllocation,
    currentDeposited,
    totalYieldEarned,
    lastHarvestTime,
    active: isActive,
  } = strategyData;

  const compoundStrategyTypes = ['Compound Supply', 'Compound Collateral'];
  const aaveStrategyTypes = ['Aave Supply', 'Aave E-Mode'];
  const strategyTypes = isCompound ? compoundStrategyTypes : aaveStrategyTypes;
  const strategyName = strategyTypes[Number(stratType)] || `Type ${stratType}`;
  const protocolName = isCompound ? 'Compound V3' : 'Aave V3';

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
              Strategy #{strategy.strategyId}
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
          ✓ Deposit executed successfully! Funds deployed to {protocolName}.
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
