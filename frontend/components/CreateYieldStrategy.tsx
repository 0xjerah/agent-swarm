'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { yieldAgentABI } from '@/lib/abis/generated/yieldAgent';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { TrendingUp, Loader2, CheckCircle, AlertCircle, Settings } from 'lucide-react';

export default function CreateYieldStrategy() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [strategyType, setStrategyType] = useState('0'); // 0 = AAVE_SUPPLY
  const [autoExecute, setAutoExecute] = useState(false); // Future: automation toggle

  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
  // Aave V3 Sepolia aUSDC address
  const aUsdcAddress = '0x16dA4541aD1807f4443d92D26044C1147406EB80' as `0x${string}`;

  // Read delegation data from MasterAgent
  const { data: delegation } = useReadContract({
    address: masterAgentAddress,
    abi: masterAgentABI,
    functionName: 'getDelegation',
    args: address ? [address, yieldAgentAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Create strategy transaction
  const { data: createHash, writeContract: createStrategy, isPending: isCreating } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  const handleCreateStrategy = () => {
    if (!amount) return;

    createStrategy({
      address: yieldAgentAddress,
      abi: yieldAgentABI,
      functionName: 'createYieldStrategy',
      args: [
        usdcAddress,
        aUsdcAddress,
        parseInt(strategyType),
        parseUnits(amount, 6),
      ],
      chainId: 11155111,
    });
  };

  // Calculate remaining delegation allowance
  const requiredAmount = amount ? parseUnits(amount, 6) : BigInt(0);

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

  const strategies = [
    { value: '0', name: 'Aave Supply', apy: '4.50%', risk: 'Low', description: 'Earn stable yield on Aave V3' },
    { value: '1', name: 'Aave E-Mode', apy: '5.20%', risk: 'Low', description: 'Enhanced efficiency mode for higher yields' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Yield Strategy
          </h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Automatically deposit your funds into yield-generating protocols. Earn passive income while maintaining full control.
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
              {formatUnits(remainingAllowance, 6)} USDC
              {!isActive && ' (inactive)'}
              {isExpired && ' (expired)'}
              {isActive && !isExpired && !hasAllowance && ' (insufficient)'}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Target Allocation (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white/[0.15] transition-all duration-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDC</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-teal-400 rounded-full"></span>
            Amount to automatically invest for yield generation
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white mb-3">
            Strategy Type
          </label>
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <label
                key={strategy.value}
                className={`flex items-center justify-between p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  strategyType === strategy.value
                    ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-white/10 bg-white/5 hover:border-green-500/30 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={strategyType === strategy.value}
                    onChange={(e) => setStrategyType(e.target.value)}
                    className="w-5 h-5 text-green-500 focus:ring-green-500 focus:ring-offset-0"
                  />
                  <div>
                    <div className="font-bold text-white text-base">{strategy.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {strategy.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Risk: <span className={strategy.risk === 'Low' ? 'text-green-400' : 'text-yellow-400'}>{strategy.risk}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{strategy.apy}</div>
                  <div className="text-xs text-gray-400">APY</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Automation Toggle (Future Feature) */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Settings size={20} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white">
                  Auto-Execute (Coming Soon)
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoExecute}
                    onChange={(e) => setAutoExecute(e.target.checked)}
                    disabled={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-600 peer-disabled:opacity-50 transition-colors"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Enable automated deposits via keeper network. Your strategy will deposit funds automatically when conditions are met.
              </p>
            </div>
          </div>
        </div>

        {/* Create Strategy Button */}
        <button
          onClick={handleCreateStrategy}
          disabled={isCreating || isCreateConfirming || !amount || !canCreate}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-green-700 hover:to-teal-700 hover:shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isCreating || isCreateConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Creating Strategy...</span>
            </>
          ) : (
            <>
              <span>Create Yield Strategy</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </>
          )}
        </button>


        {/* Success Messages */}
        {isCreateSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">Strategy Created!</p>
              <p className="text-sm leading-relaxed">
                Your yield strategy is now active. You can execute deposits manually or enable automation when available.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
