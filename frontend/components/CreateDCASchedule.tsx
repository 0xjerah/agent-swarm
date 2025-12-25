'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { dcaAgentABI } from '@/lib/abis/generated/dcaAgent';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { Loader2, CheckCircle, TrendingUp, AlertCircle, Settings } from 'lucide-react';

// Token configuration
const TOKENS = {
  USDC: {
    address: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
    symbol: 'USDC',
    decimals: 6,
  },
  WETH: {
    address: process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`,
    symbol: 'WETH',
    decimals: 18,
  },
  DAI: {
    address: process.env.NEXT_PUBLIC_DAI_ADDRESS as `0x${string}`,
    symbol: 'DAI',
    decimals: 18,
  },
};

export default function CreateDCASchedule() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('86400'); // 1 day in seconds
  const [poolFee, setPoolFee] = useState('3000'); // 0.3% default
  const [slippage, setSlippage] = useState('50'); // 0.5% default
  const [autoExecute, setAutoExecute] = useState(false); // Future: automation toggle
  const [outputToken, setOutputToken] = useState<keyof typeof TOKENS>('WETH');

  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Always use USDC as input token to avoid multiple approvals
  const selectedInputToken = TOKENS.USDC;
  const selectedOutputToken = TOKENS[outputToken];

  // Read delegation data from MasterAgent
  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, dcaAgentAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Create schedule transaction
  const { data: createHash, writeContract: createSchedule, isPending: isCreating } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });


  const handleCreateSchedule = () => {
    if (!amount) {
      console.log('CreateDCASchedule: No amount specified');
      return;
    }

    console.log('CreateDCASchedule: Creating schedule', {
      amount,
      interval,
      poolFee,
      slippage,
      autoExecute,
      canCreate
    });

    createSchedule({
      address: dcaAgentAddress,
      abi: dcaAgentABI,
      functionName: 'createDCASchedule',
      args: [
        selectedInputToken.address,
        selectedOutputToken.address,
        parseUnits(amount, selectedInputToken.decimals),
        BigInt(interval),
        parseInt(poolFee), // poolFee as uint24
        BigInt(slippage), // slippageBps
      ],
      chainId: 11155111,
    });
  };

  // Calculate remaining delegation allowance
  const requiredAmount = amount ? parseUnits(amount, selectedInputToken.decimals) : BigInt(0);

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

  // Extract delegation data
  const dailyLimit = delegation ? delegation.dailyLimit : BigInt(0);
  const spentToday = getActualSpentToday(delegation);
  const isActive = delegation ? delegation.active : false;
  // Match contract logic: block.timestamp > permission.expiry
  const isExpired = delegation ? BigInt(Math.floor(Date.now() / 1000)) > delegation.expiry : true;

  // Calculate remaining allowance
  const remainingAllowance = dailyLimit > spentToday ? dailyLimit - spentToday : BigInt(0);
  const hasAllowance = remainingAllowance >= requiredAmount && isActive && !isExpired;

  const canCreate = hasAllowance;

  // Only show status if user has entered an amount
  const shouldShowStatus = amount && parseFloat(amount) > 0;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            DCA Schedule
          </h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Set up automated recurring USDC swaps using delegated permissions. Your DCA agent will execute trades at your chosen intervals.
        </p>
      </div>

      {/* Delegation Allowance Check - Only show when user enters amount */}
      {address && shouldShowStatus && (
        <div className="mb-6">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            hasAllowance
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {hasAllowance ? (
              <CheckCircle size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              <span className="font-semibold">Remaining Delegation: </span>
              {formatUnits(remainingAllowance, selectedInputToken.decimals)} {selectedInputToken.symbol}
              {!isActive && ' (inactive)'}
              {isExpired && ' (expired)'}
              {isActive && !isExpired && !hasAllowance && ' (insufficient)'}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Token Pair - Fixed to USDC → WETH */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-5">
          <label className="block text-sm font-semibold text-white mb-3">
            Token Pair
          </label>
          <div className="flex items-center gap-3 text-lg font-bold text-white">
            <span className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">USDC</span>
            <span className="text-cyan-400">→</span>
            <span className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">WETH</span>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            Dollar-cost average from USDC into WETH
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Amount Per Purchase ({selectedInputToken.symbol})
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{selectedInputToken.symbol}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            This amount of {selectedInputToken.symbol} will be swapped for {selectedOutputToken.symbol} at each interval
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Purchase Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
          >
            <optgroup label="⚡ High Frequency" className="bg-slate-800">
              <option value="30" className="bg-slate-800">Every 30 seconds</option>
              <option value="60" className="bg-slate-800">Every 1 minute</option>
              <option value="300" className="bg-slate-800">Every 5 minutes</option>
              <option value="600" className="bg-slate-800">Every 10 minutes</option>
            </optgroup>
            <optgroup label="⏰ Standard Frequency" className="bg-slate-800">
              <option value="3600" className="bg-slate-800">Every Hour</option>
              <option value="86400" className="bg-slate-800">Every Day</option>
              <option value="604800" className="bg-slate-800">Every Week</option>
            </optgroup>
          </select>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            Higher frequency means more frequent purchases
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Uniswap Pool Fee
          </label>
          <select
            value={poolFee}
            onChange={(e) => setPoolFee(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
          >
            <option value="500" className="bg-slate-800">0.05% (Stable pairs)</option>
            <option value="3000" className="bg-slate-800">0.30% (Standard)</option>
            <option value="10000" className="bg-slate-800">1.00% (Exotic pairs)</option>
          </select>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            Lower fees for more liquid pairs
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Slippage Tolerance
          </label>
          <select
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300"
          >
            <option value="10" className="bg-slate-800">0.1%</option>
            <option value="50" className="bg-slate-800">0.5%</option>
            <option value="100" className="bg-slate-800">1.0%</option>
            <option value="300" className="bg-slate-800">3.0%</option>
          </select>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
            Higher slippage for volatile markets
          </p>
        </div>

        {/* Automation Toggle (Future Feature) */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Settings size={20} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="auto-execute-toggle" className="text-sm font-semibold text-white cursor-pointer">
                  Auto-Execute
                </label>
                <label htmlFor="auto-execute-toggle" className="relative cursor-pointer inline-block">
                  <input
                    id="auto-execute-toggle"
                    type="checkbox"
                    checked={autoExecute}
                    onChange={(e) => setAutoExecute(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-purple-600 transition-colors"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 pointer-events-none"></div>
                </label>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {autoExecute ? (
                  <>
                    <span className="text-purple-300 font-medium">✓ Automation enabled.</span> Run the keeper service (see <code className="bg-black/30 px-1 rounded">automation/README.md</code>) to execute schedules automatically without MetaMask popups.
                  </>
                ) : (
                  <>Manual execution only. Enable to use keeper service for hands-free automation via ERC-7715 delegation.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Create Schedule Button */}
        <button
          onClick={handleCreateSchedule}
          disabled={isCreating || isCreateConfirming || !amount || !canCreate}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isCreating || isCreateConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Creating Schedule...</span>
            </>
          ) : (
            <>
              <span>Create DCA Schedule</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </>
          )}
        </button>


        {/* Success Messages */}
        {isCreateSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">Schedule Created!</p>
              <p className="text-sm leading-relaxed">
                Your DCA schedule is now active. You can execute it manually or enable automation when available.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
