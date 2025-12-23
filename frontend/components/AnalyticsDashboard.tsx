'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { dcaAgentABI } from '@/lib/abis/generated/dcaAgent';
import { yieldAgentABI } from '@/lib/abis/generated/yieldAgent';
import { erc20Abi } from '@/lib/abis/erc20';
import { TrendingUp, DollarSign, Activity, Clock, BarChart3, Wallet } from 'lucide-react';

export default function AnalyticsDashboard() {
  const { address } = useAccount();

  // Read DCA schedule count
  const { data: dcaScheduleCount } = useReadContract({
    address: process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`,
    abi: dcaAgentABI,
    functionName: 'getUserScheduleCount',
    args: address ? [address] : undefined,
    chainId: 11155111, // Sepolia testnet
  });

  // Read Yield strategy count
  const { data: yieldStrategyCount } = useReadContract({
    address: process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`,
    abi: yieldAgentABI,
    functionName: 'getUserStrategyCount',
    args: address ? [address] : undefined,
    chainId: 11155111, // Sepolia testnet
  });

  // Read delegations for both agents
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

  const { data: dcaDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, dcaAgentAddress] : undefined,
    chainId: 11155111, // Sepolia testnet
  });

  const { data: yieldDelegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, yieldAgentAddress] : undefined,
    chainId: 11155111, // Sepolia testnet
  });

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 11155111, // Sepolia testnet
  });

  // Calculate stats
  const totalSchedules = Number(dcaScheduleCount || 0);
  const totalStrategies = Number(yieldStrategyCount || 0);

  // Helper to calculate actual spent today considering daily reset (matches contract logic at MasterAgent.sol:113-115)
  const getActualSpentToday = (delegation: any) => {
    if (!delegation) return BigInt(0);
    const now = Math.floor(Date.now() / 1000);
    const lastResetTimestamp = Number(delegation.lastResetTimestamp);
    // If 1 day (86400 seconds) has passed since last reset, spent amount is 0
    if (now >= lastResetTimestamp + 86400) {
      return BigInt(0);
    }
    return delegation.spentToday;
  };

  const dcaDailyLimit = dcaDelegation?.dailyLimit !== undefined ? formatUnits(dcaDelegation.dailyLimit, 6) : '0';
  const dcaSpentToday = formatUnits(getActualSpentToday(dcaDelegation), 6);
  const dcaActive = dcaDelegation?.active ?? false;

  const yieldDailyLimit = yieldDelegation?.dailyLimit !== undefined ? formatUnits(yieldDelegation.dailyLimit, 6) : '0';
  const yieldSpentToday = formatUnits(getActualSpentToday(yieldDelegation), 6);
  const yieldActive = yieldDelegation?.active ?? false;

  const totalDailyLimit = parseFloat(dcaDailyLimit) + parseFloat(yieldDailyLimit);
  const totalSpentToday = parseFloat(dcaSpentToday) + parseFloat(yieldSpentToday);
  const remainingToday = totalDailyLimit - totalSpentToday;

  const userBalance = usdcBalance !== undefined ? formatUnits(usdcBalance, 6) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <BarChart3 size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Analytics Dashboard</h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Monitor your autonomous agents, track spending limits, and view active strategies.
        </p>
      </div>

      {/* USDC Balance - Highlighted */}
      <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-md border-2 border-emerald-500/40 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Wallet size={32} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-300 font-medium mb-1">Your USDC Balance</p>
              <p className="text-5xl font-bold text-white">${parseFloat(userBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">Contract Address</p>
            <p className="text-xs text-emerald-400 font-mono">
              {usdcAddress.slice(0, 6)}...{usdcAddress.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Daily Limit */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-blue-400" />
            </div>
            <span className="text-xs text-blue-300 font-medium">USDC</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${totalDailyLimit.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Daily Limit</div>
        </div>

        {/* Spent Today */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-md border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-orange-400" />
            </div>
            <span className={`text-xs font-medium ${totalSpentToday > 0 ? 'text-orange-300' : 'text-gray-400'}`}>
              {totalDailyLimit > 0 ? `${((totalSpentToday / totalDailyLimit) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${totalSpentToday.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Spent Today</div>
        </div>

        {/* Remaining Today */}
        <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 backdrop-blur-md border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Activity size={20} className="text-green-400" />
            </div>
            <span className="text-xs text-green-300 font-medium">Available</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${remainingToday.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Remaining Today</div>
        </div>

        {/* Active Agents */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-purple-400" />
            </div>
            <span className={`text-xs font-medium ${(dcaActive || yieldActive) ? 'text-green-400' : 'text-gray-400'}`}>
              {(dcaActive || yieldActive) ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {(dcaActive ? 1 : 0) + (yieldActive ? 1 : 0)}/2
          </div>
          <div className="text-sm text-gray-400">Active Agents</div>
        </div>
      </div>

      {/* Agent Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DCA Agent */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">DCA Agent</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              dcaActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {dcaActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Daily Limit</span>
              <span className="text-white font-semibold">${dcaDailyLimit} USDC</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Spent Today</span>
              <span className="text-white font-semibold">${dcaSpentToday} USDC</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Active Schedules</span>
              <span className="text-white font-semibold">{totalSchedules}</span>
            </div>

            {/* Progress Bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Usage</span>
                <span>{parseFloat(dcaDailyLimit) > 0 ? `${((parseFloat(dcaSpentToday) / parseFloat(dcaDailyLimit)) * 100).toFixed(0)}%` : '0%'}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${parseFloat(dcaDailyLimit) > 0 ? Math.min((parseFloat(dcaSpentToday) / parseFloat(dcaDailyLimit)) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Yield Agent */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Yield Agent</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              yieldActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {yieldActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Daily Limit</span>
              <span className="text-white font-semibold">${yieldDailyLimit} USDC</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Spent Today</span>
              <span className="text-white font-semibold">${yieldSpentToday} USDC</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <span className="text-gray-400">Active Strategies</span>
              <span className="text-white font-semibold">{totalStrategies}</span>
            </div>

            {/* Progress Bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Usage</span>
                <span>{parseFloat(yieldDailyLimit) > 0 ? `${((parseFloat(yieldSpentToday) / parseFloat(yieldDailyLimit)) * 100).toFixed(0)}%` : '0%'}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${parseFloat(yieldDailyLimit) > 0 ? Math.min((parseFloat(yieldSpentToday) / parseFloat(yieldDailyLimit)) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">{totalSchedules}</div>
            <div className="text-sm text-gray-400">DCA Schedules</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">{totalStrategies}</div>
            <div className="text-sm text-gray-400">Yield Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {(dcaActive ? 1 : 0) + (yieldActive ? 1 : 0)}
            </div>
            <div className="text-sm text-gray-400">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              ${remainingToday.toFixed(0)}
            </div>
            <div className="text-sm text-gray-400">Available Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}
