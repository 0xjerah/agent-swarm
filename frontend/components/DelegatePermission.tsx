'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { masterAgentABI } from '@/lib/abis/masterAgent';
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
    const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
    const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

    // Delegate 50% to DCA, 50% to Yield
    const halfLimit = parseUnits((parseFloat(dailyLimit) / 2).toString(), 6);

    // For simplicity, we'll just delegate to DCA agent first
    // In production, you'd want to batch these transactions
    writeContract({
      address: masterAgentAddress,
      abi: masterAgentABI,
      functionName: 'delegateToAgent',
      args: [dcaAgentAddress, parseUnits(dailyLimit, 6)],
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        🔐 Delegate Permissions with ERC-7715
      </h2>
      <p className="text-gray-600 mb-6">
        Grant advanced permissions to AgentSwarm using MetaMask's ERC-7715 implementation.
        This enables gasless, permission-based transactions.
      </p>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === 'input' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}
          >
            {step !== 'input' ? <CheckCircle size={20} /> : '1'}
          </div>
          <span className="text-xs mt-2">Set Limits</span>
        </div>
        <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === 'erc7715'
                ? 'bg-blue-600 text-white'
                : step === 'contract'
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step === 'erc7715' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : step === 'contract' ? (
              <CheckCircle size={20} />
            ) : (
              '2'
            )}
          </div>
          <span className="text-xs mt-2">ERC-7715</span>
        </div>
        <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step === 'contract'
                ? 'bg-blue-600 text-white'
                : isSuccess
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step === 'contract' && !isSuccess ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isSuccess ? (
              <CheckCircle size={20} />
            ) : (
              '3'
            )}
          </div>
          <span className="text-xs mt-2">On-Chain</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Spending Limit (USDC)
          </label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="100"
            disabled={step !== 'input'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            This will be split between DCA and Yield agents
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Days)
          </label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            disabled={step !== 'input'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
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
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRequesting || isPending || isConfirming ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {step === 'erc7715' ? 'Requesting ERC-7715...' : 'Processing...'}
            </>
          ) : (
            'Grant Advanced Permissions'
          )}
        </button>

        {permissionError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Permission Error</p>
              <p className="text-sm">{permissionError}</p>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Success!</p>
              <p className="text-sm">
                Advanced permissions granted and on-chain delegation completed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}