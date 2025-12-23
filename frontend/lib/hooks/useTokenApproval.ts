'use client';

import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { erc20Abi } from '@/lib/abis/erc20';

/**
 * Hook for managing ERC20 token approvals
 */
export function useTokenApproval(tokenAddress: `0x${string}`) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Check current allowance for a spender
   */
  const useAllowance = (spenderAddress: `0x${string}`) => {
    return useReadContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: address && spenderAddress ? [address, spenderAddress] : undefined,
      chainId: 11155111,
    });
  };

  /**
   * Check token balance
   */
  const useBalance = () => {
    return useReadContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      chainId: 11155111,
    });
  };

  /**
   * Approve tokens for a spender
   */
  const approve = useCallback(
    async (spenderAddress: `0x${string}`, amount: bigint) => {
      if (!address) {
        setError('Wallet not connected');
        return false;
      }

      setError(null);

      try {
        writeContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spenderAddress, amount],
          chainId: 11155111,
        });

        return true;
      } catch (err: any) {
        console.error('Error approving tokens:', err);
        setError(err.message || 'Failed to approve tokens');
        return false;
      }
    },
    [address, tokenAddress, writeContract]
  );

  /**
   * Check if approval is needed for a specific amount
   */
  const needsApproval = useCallback(
    (currentAllowance: bigint | undefined, requiredAmount: bigint): boolean => {
      if (!currentAllowance) return true;
      return currentAllowance < requiredAmount;
    },
    []
  );

  return {
    approve,
    needsApproval,
    useAllowance,
    useBalance,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
