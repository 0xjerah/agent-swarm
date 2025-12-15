'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { useAdvancedPermissions } from '@/lib/hooks/useAdvancedPermissions';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function DelegatePermission() {
  const { address } = useAccount();
  const [dailyLimit, setDailyLimit] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [step, setStep] = useState<'input' | 'erc7715' | 'contract'>('input');

  const {
    requestMasterAgentPermissions,
    isRequesting,
    error: permissionError,
  } = useAdvancedPermissions();

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleRequestAdvancedPermissions = async () => {
    if (!dailyLimit) return;

    setStep('erc7715');

    const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
    const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}`;

    const result = await requestMasterAgentPermissions(
      masterAgentAddress,
      usdcAddress,
      dailyLimit,
      parseInt(durationDays)
    );

    if (result) {
      // ERC-7715 permissions granted, now grant on-chain permissions
      setStep('contract');
      handleDelegateOnChain();
    }
  };

  const handleDelegateOnChain = async () => {
    if (!dailyLimit) return;

    const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
    const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

    // Convert duration from days to seconds
    const durationInSeconds = BigInt(parseInt(durationDays) * 86400);

    // For simplicity, we'll just delegate to DCA agent first
    // In production, you'd want to batch these transactions
    writeContract({
      address: masterAgentAddress,
      abi: masterAgentABI,
      functionName: 'delegateToAgent',
      args: [
        dcaAgentAddress,
        parseUnits(dailyLimit, 6), // dailyLimit
        durationInSeconds, // duration in seconds
      ],
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/[0.07] transition-all duration-300">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-3 text-white">
          Delegate Permissions
        </h2>
        <p className="text-gray-300 text-base leading-relaxed">
          Grant advanced permissions to AgentSwarm using MetaMask's ERC-7715 implementation.
          This enables gasless, permission-based transactions with granular control.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
              step === 'input'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
            }`}
          >
            {step !== 'input' ? <CheckCircle size={22} /> : '1'}
          </div>
          <span className="text-sm mt-2 text-gray-300 font-medium">Set Limits</span>
        </div>
        <div className={`h-1 flex-1 mx-3 rounded-full transition-all duration-300 ${
          step !== 'input' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-white/20'
        }`}></div>
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
              step === 'erc7715'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                : step === 'contract'
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'bg-white/10 text-gray-400 border border-white/20'
            }`}
          >
            {step === 'erc7715' ? (
              <Loader2 size={22} className="animate-spin" />
            ) : step === 'contract' ? (
              <CheckCircle size={22} />
            ) : (
              '2'
            )}
          </div>
          <span className="text-sm mt-2 text-gray-300 font-medium">ERC-7715</span>
        </div>
        <div className={`h-1 flex-1 mx-3 rounded-full transition-all duration-300 ${
          step === 'contract' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-white/20'
        }`}></div>
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
              step === 'contract'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                : isSuccess
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'bg-white/10 text-gray-400 border border-white/20'
            }`}
          >
            {step === 'contract' && !isSuccess ? (
              <Loader2 size={22} className="animate-spin" />
            ) : isSuccess ? (
              <CheckCircle size={22} />
            ) : (
              '3'
            )}
          </div>
          <span className="text-sm mt-2 text-gray-300 font-medium">On-Chain</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Daily Spending Limit (USDC)
          </label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="100"
            disabled={step !== 'input'}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
            This will be split between DCA and Yield agents
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Duration (Days)
          </label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            disabled={step !== 'input'}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="7" className="bg-slate-800">7 days</option>
            <option value="30" className="bg-slate-800">30 days</option>
            <option value="90" className="bg-slate-800">90 days</option>
          </select>
        </div>

        <button
          onClick={handleRequestAdvancedPermissions}
          disabled={
            !dailyLimit ||
            step !== 'input' ||
            isRequesting ||
            isPending ||
            isConfirming
          }
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isRequesting || isPending || isConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>{step === 'erc7715' ? 'Requesting ERC-7715...' : 'Processing Transaction...'}</span>
            </>
          ) : (
            <>
              <span>Grant Advanced Permissions</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </>
          )}
        </button>

        {permissionError && (
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-red-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertCircle size={22} className="flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold text-red-200 mb-1">Permission Error</p>
              <p className="text-sm leading-relaxed">{permissionError}</p>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">Success!</p>
              <p className="text-sm leading-relaxed">
                Advanced permissions granted and on-chain delegation completed. Your agents are now active.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}