'use client';

import { useCallback, useState } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import type { PermissionRequest, Permission } from '../types/permissions';
import { parseUnits, type WalletClient } from 'viem';

export function useAdvancedPermissions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request ERC-7715 Advanced Permissions from MetaMask
   */
  const requestPermissions = useCallback(
    async (
      spender: `0x${string}`,
      token: `0x${string}`,
      dailyLimit: string,
      durationDays: number = 30
    ) => {
      if (!address) {
        setError('Wallet not connected');
        return null;
      }

      setIsRequesting(true);
      setError(null);

      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('MetaMask not installed');
        }

        // Calculate timestamps
        const now = Math.floor(Date.now() / 1000);
        const period = 86400; // 1 day in seconds
        const expiry = now + durationDays * period;

        // Build permission for ERC-20 recurring allowance
        const permission: Permission = {
          type: 'erc20-recurring-allowance',
          data: {
            token: token,
            allowance: parseUnits(dailyLimit, 6).toString(), // USDC has 6 decimals
            start: now,
            period: period,
            end: expiry,
          },
        };

        // Build the full permission request (ERC-7715 format)
        const permissionRequest: PermissionRequest = {
          chainId: `eip155:${chainId}`,
          address: spender,
          expiry: expiry,
          signer: {
            type: 'keys',
            data: {
              keys: [
                {
                  type: 'secp256k1',
                  publicKey: address,
                },
              ],
            },
          },
          permissions: [permission],
          policies: [
            {
              type: 'gas-limit',
              data: {
                limit: '1000000', // 1M gas limit
              },
            },
          ],
        };

        console.log('Requesting permissions:', permissionRequest);

        // Request permissions via wallet_grantPermissions (ERC-7715)
        const result = await ethereum.request({
          method: 'wallet_grantPermissions',
          params: [permissionRequest],
        });

        console.log('Permissions granted:', result);
        setIsRequesting(false);
        return result;
      } catch (err: any) {
        console.error('Error requesting permissions:', err);
        setError(err.message || 'Failed to request permissions');
        setIsRequesting(false);
        return null;
      }
    },
    [address, chainId]
  );

  /**
   * Request permissions for Master Agent with sub-agent delegation
   */
  const requestMasterAgentPermissions = useCallback(
    async (
      masterAgent: `0x${string}`,
      token: `0x${string}`,
      totalDailyLimit: string,
      durationDays: number = 30
    ) => {
      if (!address) {
        setError('Wallet not connected');
        return null;
      }

      setIsRequesting(true);
      setError(null);

      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('MetaMask not installed');
        }

        const now = Math.floor(Date.now() / 1000);
        const period = 86400;
        const expiry = now + durationDays * period;

        // Grant permission to Master Agent
        const permissionRequest: PermissionRequest = {
          chainId: `eip155:${chainId}`,
          address: masterAgent,
          expiry: expiry,
          signer: {
            type: 'keys',
            data: {
              keys: [
                {
                  type: 'secp256k1',
                  publicKey: address,
                },
              ],
            },
          },
          permissions: [
            {
              type: 'erc20-recurring-allowance',
              data: {
                token: token,
                allowance: parseUnits(totalDailyLimit, 6).toString(),
                start: now,
                period: period,
                end: expiry,
              },
            },
          ],
          policies: [
            {
              type: 'gas-limit',
              data: {
                limit: '2000000',
              },
            },
            {
              type: 'delegation',
              data: {
                delegates: [
                  process.env.NEXT_PUBLIC_DCA_AGENT,
                  process.env.NEXT_PUBLIC_YIELD_AGENT,
                ],
              },
            },
          ],
        };

        console.log('Requesting master agent permissions:', permissionRequest);

        const result = await ethereum.request({
          method: 'wallet_grantPermissions',
          params: [permissionRequest],
        });

        console.log('Master agent permissions granted:', result);
        setIsRequesting(false);
        return result;
      } catch (err: any) {
        console.error('Error requesting master agent permissions:', err);
        setError(err.message || 'Failed to request permissions');
        setIsRequesting(false);
        return null;
      }
    },
    [address, chainId]
  );

  /**
   * Revoke permissions
   */
  const revokePermissions = useCallback(
    async (spender: `0x${string}`) => {
      if (!address) {
        setError('Wallet not connected');
        return null;
      }

      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error('MetaMask not installed');
        }

        const result = await ethereum.request({
          method: 'wallet_revokePermissions',
          params: [
            {
              chainId: `eip155:${chainId}`,
              address: spender,
            },
          ],
        });

        console.log('Permissions revoked:', result);
        return result;
      } catch (err: any) {
        console.error('Error revoking permissions:', err);
        setError(err.message || 'Failed to revoke permissions');
        return null;
      }
    },
    [address, chainId]
  );

  return {
    requestPermissions,
    requestMasterAgentPermissions,
    revokePermissions,
    isRequesting,
    error,
  };
}