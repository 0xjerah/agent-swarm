'use client';

import { useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { gql, useQuery as useApolloQuery } from '@apollo/client';
import { formatUnits, decodeEventLog } from 'viem';
import { dcaAgentABI } from '@/lib/abis/generated/dcaAgent';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { erc20Abi } from '@/lib/abis/erc20';
import { Loader2, PlayCircle, XCircle, Clock, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';

// GraphQL query to fetch user's DCA schedules with execution history
const GET_USER_SCHEDULES = gql`
  query GetUserSchedules($userAddress: String!) {
    DCASchedule(
      where: { user: { _eq: $userAddress } }
      order_by: { createdAt: desc }
    ) {
      id
      user
      scheduleId
      amountPerPurchase
      intervalSeconds
      totalExecutions
      totalUSDCSpent
      totalWETHReceived
      averagePrice
      active
      createdAt
      lastExecutionTime
    }
  }
`;

// Token configuration - matches CreateDCASchedule
const TOKEN_INFO: Record<string, { symbol: string; decimals: number }> = {
  '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8': { symbol: 'USDC', decimals: 6 },  // USDC
  '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c': { symbol: 'WETH', decimals: 18 }, // WETH
  '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357': { symbol: 'DAI', decimals: 18 },  // DAI
};

const getTokenInfo = (address: string) => {
  const lowerAddress = address.toLowerCase();
  const found = Object.entries(TOKEN_INFO).find(([addr]) => addr.toLowerCase() === lowerAddress);
  return found ? found[1] : { symbol: 'TOKEN', decimals: 18 };
};

export default function DCAScheduleList() {
  const { address } = useAccount();
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Fetch schedules from Envio GraphQL
  const { data, loading, error, refetch } = useApolloQuery(GET_USER_SCHEDULES, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
    pollInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Check delegation status (still using RPC for now)
  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, dcaAgentAddress] : undefined,
    chainId: 11155111,
  });

  const schedules = data?.DCASchedule || [];

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

  // Calculate aggregate stats
  const totalExecutions = schedules.reduce((sum: number, s: any) => sum + Number(s.totalExecutions), 0);
  const totalUSDCSpent = schedules.reduce((sum: number, s: any) => sum + Number(s.totalUSDCSpent), 0);
  const totalWETHReceived = schedules.reduce((sum: number, s: any) => sum + Number(s.totalWETHReceived), 0);
  const activeSchedulesCount = schedules.filter((s: any) => s.active).length;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Your DCA Schedules</h3>
        <p className="text-gray-300 text-sm">
          Manage and execute your active DCA schedules - updates in real-time!
        </p>
      </div>

      {/* Stats Summary */}
      {schedules.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-blue-400" />
              <div className="text-xs text-gray-400">Total Executions</div>
            </div>
            <div className="text-2xl font-bold text-white">{totalExecutions}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Active Schedules</div>
            <div className="text-2xl font-bold text-white">{activeSchedulesCount}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Total USDC Spent</div>
            <div className="text-2xl font-bold text-white">{(totalUSDCSpent / 1e6).toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Total WETH Received</div>
            <div className="text-2xl font-bold text-white">{(totalWETHReceived / 1e18).toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Delegation Status Warning */}
      {!delegationStatus.isActive && schedules.length > 0 && (
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
                    {delegationStatus.expiredAt?.toLocaleTimeString()}. You cannot execute schedules until you create a new delegation.
                  </>
                ) : (
                  <>
                    You need to delegate permissions to the DCA Agent before you can execute schedules.
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

      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading schedules from Envio...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-400">Error loading schedules</p>
          <p className="text-sm text-gray-500 mt-2">Make sure Envio indexer is running</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p>No DCA schedules created yet</p>
          <p className="text-sm mt-2">Create your first schedule above to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule: any) => (
            <ScheduleCard
              key={schedule.scheduleId.toString()}
              scheduleData={schedule}
              userAddress={address!}
              dcaAgentAddress={dcaAgentAddress}
              onExecute={() => refetch()}
              delegationActive={delegationStatus.isActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  scheduleData,
  userAddress,
  dcaAgentAddress,
  onExecute,
  delegationActive,
}: {
  scheduleData: any;
  userAddress: `0x${string}`;
  dcaAgentAddress: `0x${string}`;
  onExecute: () => void;
  delegationActive: boolean;
}) {
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
  const aUsdcAddress = '0x16dA4541aD1807f4443d92D26044C1147406EB80' as `0x${string}`; // Aave V3 Sepolia aUSDC
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  const scheduleId = Number(scheduleData.scheduleId);

  // Get schedule details from contract (for active status and real-time data)
  const { data: schedule, refetch: refetchSchedule } = useReadContract({
    address: dcaAgentAddress,
    abi: dcaAgentABI,
    functionName: 'getSchedule',
    args: [userAddress, BigInt(scheduleId)],
    chainId: 11155111,
  });

  // Get user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId: 11155111,
  });

  // Get user's aUSDC balance (to detect if they have the wrong token)
  const { data: aUsdcBalance } = useReadContract({
    address: aUsdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
    chainId: 11155111,
  });

  // Check USDC allowance to MasterAgent
  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, masterAgentAddress],
    chainId: 11155111,
  });

  // Execute transaction
  const { data: executeHash, writeContract: executeSchedule, isPending: isExecuting, error: executeError } = useWriteContract();
  const { isLoading: isExecuteConfirming, isSuccess: isExecuteSuccess, isError: isExecuteError, data: executeReceipt } = useWaitForTransactionReceipt({
    hash: executeHash,
  });

  // Cancel transaction
  const { data: cancelHash, writeContract: cancelSchedule, isPending: isCanceling } = useWriteContract();
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({
    hash: cancelHash,
  });

  const handleExecute = () => {
    executeSchedule({
      address: dcaAgentAddress,
      abi: dcaAgentABI,
      functionName: 'executeDCA',
      args: [userAddress, BigInt(scheduleId)],
      chainId: 11155111,
      gas: BigInt(500000),
    });
  };

  const handleCancel = () => {
    cancelSchedule({
      address: dcaAgentAddress,
      abi: dcaAgentABI,
      functionName: 'cancelSchedule',
      args: [BigInt(scheduleId)],
      chainId: 11155111,
    });
  };

  // Parse execution results from transaction receipt
  const getExecutionResults = () => {
    if (!executeReceipt?.logs) return null;

    try {
      // Find and decode DCAExecuted event
      for (const log of executeReceipt.logs) {
        if (log.address.toLowerCase() !== dcaAgentAddress.toLowerCase()) continue;

        try {
          const decoded = decodeEventLog({
            abi: dcaAgentABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'DCAExecuted') {
            return {
              amountSpent: decoded.args.amountSpent as bigint,
              amountReceived: decoded.args.amountReceived as bigint,
            };
          }
        } catch {
          // Try next log if this one doesn't decode
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const executionResults = isExecuteSuccess ? getExecutionResults() : null;

  // Refetch schedule data when transaction completes (success or failure)
  useEffect(() => {
    if (isExecuteSuccess || isExecuteError || isCancelSuccess) {
      refetchSchedule();
      onExecute(); // Also refetch the count in parent
    }
  }, [isExecuteSuccess, isExecuteError, isCancelSuccess, refetchSchedule, onExecute]);

  if (!schedule) return null;

  // Destructure the schedule struct
  const {
    inputToken,
    outputToken,
    amountPerPurchase,
    intervalSeconds,
    lastExecutionTime,
    poolFee: fee,
    slippageBps,
    active: isActive,
  } = schedule as any;

  // Get token info
  const inputTokenInfo = getTokenInfo(inputToken);
  const outputTokenInfo = getTokenInfo(outputToken);

  // Format interval
  const formatInterval = (seconds: bigint) => {
    const s = Number(seconds);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  // Calculate next execution
  const nextExecution = Number(lastExecutionTime) + Number(intervalSeconds);
  const now = Math.floor(Date.now() / 1000);
  const isReady = now >= nextExecution;
  const timeUntil = nextExecution - now;

  // Check if user has sufficient USDC balance
  const hasEnoughBalance = usdcBalance ? usdcBalance >= amountPerPurchase : false;

  // Check if user has approved enough USDC to MasterAgent
  const hasEnoughAllowance = usdcAllowance ? usdcAllowance >= amountPerPurchase : false;

  // Detect if user has aUSDC instead of USDC
  const hasAUsdcInstead = !hasEnoughBalance && aUsdcBalance && aUsdcBalance >= amountPerPurchase;

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
        ? 'border-blue-500/30 hover:bg-white/[0.07]'
        : isActive && !delegationActive
        ? 'border-orange-500/30 opacity-75'
        : 'border-white/10 opacity-60'
    } transition-all duration-300`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Schedule Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-bold text-white">
              Schedule #{scheduleId}
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
            {isActive && delegationActive && (
              <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <span>🤖</span>
                <span>Auto-Ready</span>
              </div>
            )}
          </div>

          {/* Schedule Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Swap</div>
              <div className="text-sm font-semibold text-white">
                {formatUnits(amountPerPurchase, inputTokenInfo.decimals)} {inputTokenInfo.symbol} → {outputTokenInfo.symbol}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Interval</div>
              <div className="text-sm font-semibold text-white">
                Every {formatInterval(intervalSeconds)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Pool Fee</div>
              <div className="text-sm font-semibold text-white">
                {Number(fee) / 10000}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Slippage</div>
              <div className="text-sm font-semibold text-white">
                {Number(slippageBps) / 100}%
              </div>
            </div>
          </div>

          {/* Execution History from GraphQL */}
          {scheduleData.totalExecutions > 0 && (
            <div className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-lg p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-gray-400 mb-0.5">Executions</div>
                  <div className="text-cyan-300 font-bold">{scheduleData.totalExecutions}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">Total Spent</div>
                  <div className="text-cyan-300 font-bold">{(Number(scheduleData.totalUSDCSpent) / 1e6).toFixed(2)} USDC</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">Total Received</div>
                  <div className="text-cyan-300 font-bold">{(Number(scheduleData.totalWETHReceived) / 1e18).toFixed(4)} WETH</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">Avg Price</div>
                  <div className="text-cyan-300 font-bold">${Number(scheduleData.averagePrice).toFixed(2)}/WETH</div>
                </div>
              </div>
            </div>
          )}

          {/* Execution Status */}
          {isActive && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className={isReady ? 'text-green-400' : 'text-gray-400'} />
                <span className={isReady ? 'text-green-300' : 'text-gray-300'}>
                  Next execution: {formatTimeUntil(timeUntil)}
                </span>
              </div>
              {Number(lastExecutionTime) > 1 && (
                <div className="text-xs text-gray-400">
                  Last executed: {new Date(Number(lastExecutionTime) * 1000).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Balance Warning */}
          {isActive && !hasEnoughBalance && (
            <div className="flex flex-col gap-2 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span className="text-red-300">
                  Insufficient USDC balance. You have {usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC but need {formatUnits(amountPerPurchase, 6)} USDC.
                </span>
              </div>
              {hasAUsdcInstead && (
                <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 -mx-3 -mb-2 mt-1">
                  <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-orange-200 text-xs">
                    <p className="font-semibold mb-1">You have aUSDC (Aave wrapped USDC), not regular USDC</p>
                    <p>You have {formatUnits(aUsdcBalance, 6)} aUSDC. To execute this schedule, you need to:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      <li>Withdraw your aUSDC from Aave to get regular USDC, or</li>
                      <li>Get fresh USDC from a Sepolia testnet faucet</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Allowance Warning */}
          {isActive && hasEnoughBalance && !hasEnoughAllowance && (
            <div className="flex items-start gap-2 text-sm bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-orange-200">
                <p className="font-semibold mb-1">Insufficient USDC Approval</p>
                <p className="text-xs">
                  You have approved {usdcAllowance ? formatUnits(usdcAllowance, 6) : '0'} USDC to the MasterAgent, but need {formatUnits(amountPerPurchase, 6)} USDC.
                  Go to the <strong>Delegate</strong> tab and approve more USDC.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isActive && (
            <>
              <button
                onClick={handleExecute}
                disabled={!isReady || !delegationActive || !hasEnoughBalance || !hasEnoughAllowance || isExecuting || isExecuteConfirming}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={!isReady ? 'Not ready - check execution timer above' : !delegationActive ? 'Delegation required to execute' : !hasEnoughBalance ? 'Insufficient USDC balance' : !hasEnoughAllowance ? 'Insufficient USDC approval' : ''}
              >
                {isExecuting || isExecuteConfirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} />
                    <span>Execute</span>
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

      {/* Success and Error Messages */}
      {isExecuteSuccess && (
        <div className="mt-3 bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <div className="flex-1">
              <p className="font-semibold text-green-200 mb-1">Schedule executed successfully!</p>
              {executionResults && (
                <div className="text-xs text-green-300/80 space-y-0.5">
                  <p>• Spent: {formatUnits(executionResults.amountSpent, inputTokenInfo.decimals)} {inputTokenInfo.symbol}</p>
                  <p>• Received: {formatUnits(executionResults.amountReceived, outputTokenInfo.decimals)} {outputTokenInfo.symbol}</p>
                  <p className="text-green-400 mt-1">
                    Price: {(Number(formatUnits(executionResults.amountSpent, inputTokenInfo.decimals)) / Number(formatUnits(executionResults.amountReceived, outputTokenInfo.decimals))).toFixed(6)} {inputTokenInfo.symbol} per {outputTokenInfo.symbol}
                  </p>
                </div>
              )}
              {executeHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${executeHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 underline mt-2 inline-block"
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {isExecuteError && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
          ✗ Execution failed: {executeError?.message || 'Transaction reverted. Check if you have enough USDC balance.'}
        </div>
      )}
      {isCancelSuccess && (
        <div className="mt-3 bg-gray-500/10 border border-gray-500/30 text-gray-300 px-4 py-2 rounded-lg text-sm">
          Schedule cancelled
        </div>
      )}
    </div>
  );
}
