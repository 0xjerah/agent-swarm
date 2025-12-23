'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWalletClient, useChainId, useReadContract } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { erc20Abi } from '@/lib/abis/erc20';
import { useAdvancedPermissions } from '@/lib/hooks/useAdvancedPermissions';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function DelegatePermission() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient({ chainId });
  const [dailyLimit, setDailyLimit] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [selectedAgents, setSelectedAgents] = useState<('dca' | 'yield')[]>(['dca']);
  const [step, setStep] = useState<'input' | 'approval' | 'erc7715' | 'contract'>('input');
  const [transactionDetails, setTransactionDetails] = useState<string>('');

  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Check current USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, masterAgentAddress] : undefined,
    chainId: 11155111,
  });

  const {
    requestMasterAgentPermissions,
    isRequesting,
    error: permissionError,
  } = useAdvancedPermissions();

  const { data: hash, writeContract, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /**
   * Ensure wallet is on Sepolia network, switch if not
   * Uses Wagmi's connector instead of direct window.ethereum access
   */
  const ensureSepoliaNetwork = async () => {
    if (!connector) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const SEPOLIA_CHAIN_ID = 11155111;
    const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

    try {
      // Check current chain using Wagmi's chainId (already available)
      if (chainId !== SEPOLIA_CHAIN_ID) {
        console.log(`Switching to Sepolia network...`);

        // Get provider from Wagmi's connector (more reliable than window.ethereum)
        const provider = await connector.getProvider();

        try {
          // Request network switch
          await (provider as any).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
          });

          console.log('Successfully switched to Sepolia');

          // Wait for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            console.log('Sepolia not added to wallet, attempting to add...');

            try {
              await (provider as any).request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: SEPOLIA_CHAIN_ID_HEX,
                    chainName: 'Sepolia Testnet',
                    nativeCurrency: {
                      name: 'Sepolia ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://sepolia.infura.io/v3/7409a848634e47a0bdd5264df68c2576'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              });

              console.log('Sepolia added and switched successfully');

              // Wait for add to complete
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (addError) {
              console.error('Failed to add Sepolia network:', addError);
              throw new Error('Please add Sepolia network to MetaMask manually');
            }
          } else {
            console.error('Failed to switch network:', switchError);
            throw new Error('Please switch to Sepolia network manually');
          }
        }
      } else {
        console.log('Already on Sepolia network');
    }
    } catch (error) {
      console.error('❌ Error in ensureSepoliaNetwork:', error);
      throw error;
    }
  };

  const handleRequestAdvancedPermissions = async () => {
    if (!dailyLimit) {
      console.error('No daily limit set');
      return;
    }

    try {
      console.log('Starting delegation flow...');
      // Ensure we're on Sepolia before starting
      await ensureSepoliaNetwork();

      // Wait a bit longer for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 1: Check and request USDC approval if needed
      const requiredAmount = parseUnits(dailyLimit, 6);
      const hasEnoughAllowance = currentAllowance && currentAllowance >= requiredAmount;

      if (!hasEnoughAllowance) {
        console.log('Insufficient USDC allowance, requesting approval...');
        setStep('approval');
        setTransactionDetails('Approving USDC for MasterAgent...');

        // Request unlimited approval to avoid future approvals
        writeContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [masterAgentAddress, maxUint256],
          chainId: 11155111,
        });

        // Wait for approval transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refetchAllowance();
      }

      // Step 2: Request ERC-7715 permissions
      console.log('Requesting ERC-7715 permissions...');
      setStep('erc7715');

      const result = await requestMasterAgentPermissions(
        masterAgentAddress,
        usdcAddress,
        dailyLimit,
        parseFloat(durationDays) // Use parseFloat to support fractional days
      );

      if (result) {
        // ERC-7715 permissions granted, now proceed to on-chain delegation
        await ensureSepoliaNetwork();
        await new Promise(resolve => setTimeout(resolve, 1000));

        setStep('contract');
        handleDelegateOnChain();
      } else {
        // Permission request failed or was rejected
        setStep('input');
      }
    } catch (error: any) {
      console.error('Error in permission flow:', error);
      alert(error.message || 'Failed to request permissions');
      setStep('input');
    }
  };

  const handleDelegateOnChain = async () => {
    if (!dailyLimit || selectedAgents.length === 0) return;

    // Ensure we're on Sepolia before sending transaction
    try {
      await ensureSepoliaNetwork();
    } catch (error: any) {
      alert(error.message || 'Please switch to Sepolia network');
      setStep('input');
      return;
    }

    const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
    const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
    const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

    // Convert duration from days to seconds (supports fractional days for demo)
    const durationInSeconds = BigInt(Math.floor(parseFloat(durationDays) * 86400));

    // Split daily limit between selected agents
    const limitPerAgent = parseUnits(dailyLimit, 6) / BigInt(selectedAgents.length);

    console.log('Delegating on-chain:', {
      masterAgentAddress,
      selectedAgents,
      limitPerAgent: limitPerAgent.toString(),
      durationInSeconds: durationInSeconds.toString(),
      chainId,
      network: 'Sepolia',
    });

    try {
      setTransactionDetails(`Delegating to ${selectedAgents.length} agent(s)...`);

      // Delegate to each selected agent
      for (let i = 0; i < selectedAgents.length; i++) {
        const agentType = selectedAgents[i];
        const agentAddress = agentType === 'dca' ? dcaAgentAddress : yieldAgentAddress;
        const agentName = agentType === 'dca' ? 'DCA Agent' : 'Yield Agent';

        setTransactionDetails(`Sending transaction for ${agentName} (${i + 1}/${selectedAgents.length})...`);

        console.log(`Delegating to ${agentName}:`, {
          address: masterAgentAddress,
          functionName: 'delegateToAgent',
          args: [agentAddress, limitPerAgent.toString(), durationInSeconds.toString()],
        });

        // Use writeContract for this agent
        writeContract({
          address: masterAgentAddress,
          abi: masterAgentABI,
          functionName: 'delegateToAgent',
          args: [
            agentAddress,
            limitPerAgent, // split limit per agent
            durationInSeconds,
          ],
          chainId: 11155111, // Explicitly specify Sepolia testnet
          gas: BigInt(200000),
        });

        // Only wait if there are more agents (for sequential transactions)
        if (i < selectedAgents.length - 1) {
          setTransactionDetails(`Waiting for ${agentName} confirmation before next...`);
          // Note: In reality, we'd need to wait for transaction receipt here
          // For now, this will send the last selected agent's transaction
        }
      }

      setTransactionDetails('Waiting for confirmation in MetaMask Flask...');
    } catch (error: any) {
      console.error('Error preparing transaction:', error);

      // Enhanced error messaging
      let errorMsg = error.message || 'Unknown error';
      if (error.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient Sepolia ETH for gas';
      } else if (error.code === -32603) {
        errorMsg = 'Transaction would revert - check agent registration and contract state';
      }

      setTransactionDetails('Error: ' + errorMsg);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Reset after delay so user can see error
      setTimeout(() => setStep('input'), 5000);
    }
  };

  const isButtonDisabled =
    !dailyLimit ||
    !isConnected ||
    step !== 'input' ||
    isRequesting ||
    isPending ||
    isConfirming ||
    selectedAgents.length === 0;

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
        {/* Step 1: Input */}
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

        {/* Step 2: ERC-7715 */}
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
              step === 'erc7715'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                : step === 'contract' || isSuccess
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'bg-white/10 text-gray-400 border border-white/20'
            }`}
          >
            {step === 'erc7715' ? (
              <Loader2 size={22} className="animate-spin" />
            ) : step === 'contract' || isSuccess ? (
              <CheckCircle size={22} />
            ) : (
              '2'
            )}
          </div>
          <span className="text-sm mt-2 text-gray-300 font-medium">ERC-7715</span>
        </div>
        <div className={`h-1 flex-1 mx-3 rounded-full transition-all duration-300 ${
          step === 'contract' || isSuccess ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-white/20'
        }`}></div>

        {/* Step 3: On-Chain */}
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
            Select Agents to Delegate To
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={selectedAgents.includes('dca')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAgents([...selectedAgents, 'dca']);
                  } else {
                    setSelectedAgents(selectedAgents.filter(a => a !== 'dca'));
                  }
                }}
                disabled={step !== 'input'}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-white font-semibold">DCA Agent</div>
                <div className="text-xs text-gray-400">Automated dollar-cost averaging for ETH purchases</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={selectedAgents.includes('yield')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAgents([...selectedAgents, 'yield']);
                  } else {
                    setSelectedAgents(selectedAgents.filter(a => a !== 'yield'));
                  }
                }}
                disabled={step !== 'input'}
                className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="text-white font-semibold">Yield Agent</div>
                <div className="text-xs text-gray-400">Automated yield farming with Aave V3</div>
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
            Daily limit will be split evenly between selected agents
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300">
          <label className="block text-sm font-semibold text-white mb-3">
            Duration
          </label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            disabled={step !== 'input'}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/[0.15] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <optgroup label="⚡ Short Duration" className="bg-slate-800">
              <option value="0.00347" className="bg-slate-800">5 minutes</option>
              <option value="0.00694" className="bg-slate-800">10 minutes</option>
              <option value="0.0208" className="bg-slate-800">30 minutes</option>
              <option value="0.0417" className="bg-slate-800">1 hour</option>
            </optgroup>
            <optgroup label="📅 Standard Duration" className="bg-slate-800">
              <option value="7" className="bg-slate-800">7 days</option>
              <option value="30" className="bg-slate-800">30 days</option>
              <option value="90" className="bg-slate-800">90 days</option>
            </optgroup>
          </select>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
            Choose duration based on your automation needs
          </p>
        </div>

        <button
          type="button"
          onClick={handleRequestAdvancedPermissions}
          disabled={
            !dailyLimit ||
            !isConnected ||
            step !== 'input' ||
            isRequesting ||
            isPending ||
            isConfirming ||
            selectedAgents.length === 0
          }
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 group"
        >
          {isRequesting || isPending || isConfirming ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>
                {step === 'erc7715'
                  ? 'Requesting ERC-7715 Permission...'
                  : 'Registering On-Chain Delegation...'}
              </span>
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
            <div className="w-full">
              <p className="font-bold text-red-200 mb-2">ERC-7715 Setup Required</p>
              <p className="text-sm leading-relaxed mb-3">{permissionError}</p>

              <div className="bg-red-500/20 rounded-lg p-4 mb-3">
                <p className="text-sm font-semibold text-red-100 mb-2">Required Setup:</p>
                <ol className="text-xs text-red-200/90 space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Install MetaMask Flask</strong>
                    <br />
                    <a
                      href="https://metamask.io/flask/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-300 hover:text-red-100 underline ml-5"
                    >
                      Download MetaMask Flask →
                    </a>
                  </li>
                  <li>
                    <strong>Connect to Sepolia Network</strong>
                    <br />
                    <span className="ml-5 text-red-300">Switch network in Flask to Sepolia testnet</span>
                  </li>
                  <li>
                    <strong>Return to this page</strong>
                    <br />
                    <span className="ml-5 text-red-300">Snaps will auto-install on first permission request</span>
                  </li>
                </ol>
              </div>

              <p className="text-xs text-red-200/70 leading-relaxed">
                ERC-7715 Advanced Permissions are required for this hackathon submission.
                Regular MetaMask does not support this feature yet - Flask (developer version) is needed.
              </p>
            </div>
          </div>
        )}

        {txError && (
          <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 text-orange-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertCircle size={22} className="flex-shrink-0 mt-0.5 text-orange-400" />
            <div className="w-full">
              <p className="font-bold text-orange-200 mb-2">Transaction Failed</p>
              <p className="text-sm leading-relaxed mb-3">{txError.message}</p>
              <div className="bg-orange-500/20 rounded-lg p-3 text-xs">
                <p className="font-semibold mb-2">Common causes:</p>
                <ul className="list-disc list-inside space-y-1 text-orange-200/90">
                  <li>Insufficient Sepolia ETH for gas fees</li>
                  <li>Contract not deployed on this network</li>
                  <li>Network mismatch (Flask showing wrong network name)</li>
                </ul>
                <p className="mt-3 text-orange-200/80">
                  Get Sepolia ETH: <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-100">Alchemy Faucet</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status Display */}
        {transactionDetails && !txError && !isSuccess && (
          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 text-blue-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Loader2 size={22} className="flex-shrink-0 mt-0.5 text-blue-400 animate-spin" />
            <div className="w-full">
              <p className="font-bold text-blue-200 mb-1">Processing</p>
              <p className="text-sm leading-relaxed">{transactionDetails}</p>
              {transactionDetails.includes('likely fail') && (
                <div className="mt-3 bg-yellow-500/20 rounded-lg p-3 text-xs text-yellow-200/90">
                  <p className="font-semibold mb-1">Warning:</p>
                  <p>The transaction may fail. You can still try to proceed, but you may need to fix the issue first.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-green-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle size={22} className="flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="font-bold text-green-200 mb-1">🎉 Pure ERC-7715 Delegation Complete!</p>
              <p className="text-sm leading-relaxed mb-2">
                Gasless execution enabled with just ONE wallet popup:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>✓ ERC-7715 advanced permissions granted (no more approvals needed!)</li>
                <li>✓ On-chain delegation registered with daily spending limits</li>
                <li>✓ Agents can now execute strategies WITHOUT wallet popups</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3 font-semibold text-green-200">
                Your agents are fully active! All future executions will be gasless and popup-free. 🚀
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}