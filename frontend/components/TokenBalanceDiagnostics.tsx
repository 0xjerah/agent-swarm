'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { erc20Abi } from '@/lib/abis/erc20';
import { AlertCircle, Wallet, FileText } from 'lucide-react';

export default function TokenBalanceDiagnostics() {
  const { address } = useAccount();

  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
  const aUsdcAddress = '0x16dA4541aD1807f4443d92D26044C1147406EB80' as `0x${string}`; // Aave V3 Sepolia aUSDC
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;
  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;

  // Get USDC balance in wallet
  const { data: walletUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 11155111,
  });

  // Get aUSDC balance in wallet
  const { data: walletAUsdcBalance } = useReadContract({
    address: aUsdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 11155111,
  });

  // Get USDC balance in DCA Agent
  const { data: dcaAgentUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [dcaAgentAddress],
    chainId: 11155111,
  });

  // Get USDC balance in Yield Agent
  const { data: yieldAgentUsdcBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [yieldAgentAddress],
    chainId: 11155111,
  });

  // Get USDC symbol
  const { data: usdcSymbol } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId: 11155111,
  });

  // Get aUSDC symbol
  const { data: aUsdcSymbol } = useReadContract({
    address: aUsdcAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    chainId: 11155111,
  });

  // Get USDC allowance for MasterAgent
  const { data: masterAgentAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, masterAgentAddress] : undefined,
    chainId: 11155111,
  });

  const formatBalance = (balance: bigint | undefined) => {
    if (balance === undefined) return '...';
    return formatUnits(balance, 6);
  };

  const hasUsdcIssue = walletUsdcBalance === BigInt(0) && walletAUsdcBalance && walletAUsdcBalance > BigInt(0);
  const hasNoAllowance = masterAgentAllowance === BigInt(0);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Wallet size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Token Balance Diagnostics</h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Complete overview of your token balances across wallet and smart contracts
        </p>
      </div>

      {/* Issue Warning */}
      {hasUsdcIssue && (
        <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-semibold mb-1">Wrong Token Detected</p>
              <p className="text-orange-200 text-sm">
                You have aUSDC (Aave wrapped USDC) instead of regular USDC. DCA and Yield strategies require regular USDC to function.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Your Wallet Balances */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-purple-400" />
          Your Wallet
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Regular USDC */}
          <div className={`bg-white/5 border rounded-xl p-5 ${
            walletUsdcBalance === BigInt(0) ? 'border-red-500/30' : 'border-green-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Regular USDC</span>
              {walletUsdcBalance === BigInt(0) ? (
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">Empty</span>
              ) : (
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Has Balance</span>
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBalance(walletUsdcBalance)}
            </div>
            <div className="text-xs text-gray-400 font-mono">{usdcSymbol || 'USDC'}</div>
            <div className="text-xs text-gray-500 mt-2 break-all">
              {usdcAddress}
            </div>
          </div>

          {/* aUSDC */}
          <div className={`bg-white/5 border rounded-xl p-5 ${
            walletAUsdcBalance && walletAUsdcBalance > BigInt(0) ? 'border-orange-500/30' : 'border-white/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Aave aUSDC</span>
              {walletAUsdcBalance && walletAUsdcBalance > BigInt(0) ? (
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">Wrong Token</span>
              ) : (
                <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded">Empty</span>
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBalance(walletAUsdcBalance)}
            </div>
            <div className="text-xs text-gray-400 font-mono">{aUsdcSymbol || 'aUSDC'}</div>
            <div className="text-xs text-gray-500 mt-2 break-all">
              {aUsdcAddress}
            </div>
          </div>
        </div>
      </div>

      {/* USDC Allowance Check */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-yellow-400" />
          USDC Allowance for MasterAgent
        </h3>
        <div className={`bg-white/5 border rounded-xl p-5 ${
          hasNoAllowance ? 'border-red-500/30' : 'border-green-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">MasterAgent Allowance</span>
            {hasNoAllowance ? (
              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">NO APPROVAL - Execution will fail!</span>
            ) : (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Approved</span>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatBalance(masterAgentAllowance)}
          </div>
          <div className="text-xs text-gray-400">USDC approved for spending</div>
          <div className="text-xs text-gray-500 mt-2 break-all">
            MasterAgent: {masterAgentAddress}
          </div>
          {hasNoAllowance && (
            <div className="mt-3 bg-red-500/20 rounded-lg p-3 text-xs text-red-200">
              <p className="font-semibold mb-1">⚠️ Action Required:</p>
              <p>You must approve USDC for the MasterAgent before executing DCA/Yield strategies. Go to the <strong>Delegate</strong> tab and complete the delegation flow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Contract Balances */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          Smart Contract Balances
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DCA Agent */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">DCA Agent Contract</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBalance(dcaAgentUsdcBalance)}
            </div>
            <div className="text-xs text-gray-400 font-mono">USDC</div>
            <div className="text-xs text-gray-500 mt-2 break-all">
              {dcaAgentAddress}
            </div>
          </div>

          {/* Yield Agent */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Yield Agent Contract</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatBalance(yieldAgentUsdcBalance)}
            </div>
            <div className="text-xs text-gray-400 font-mono">USDC</div>
            <div className="text-xs text-gray-500 mt-2 break-all">
              {yieldAgentAddress}
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      {hasUsdcIssue && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-semibold mb-2">How to Get Regular USDC</p>
              <ul className="text-blue-200 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">1.</span>
                  <div>
                    <strong>Withdraw from Aave:</strong> Go to{' '}
                    <a
                      href="https://app.aave.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-100"
                    >
                      app.aave.com
                    </a>
                    {' '}and withdraw your aUSDC to convert it back to regular USDC
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">2.</span>
                  <div>
                    <strong>Get from Faucet:</strong> Use a Sepolia testnet faucet to get fresh USDC (not from Aave faucet)
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
