// ERC-7715 canonical permission types
export type PermissionType =
  | 'native-token-transfer'
  | 'erc20-token-transfer'
  | 'contract-call'
  | { custom: string };

export interface TokenAllowancePolicy {
  type: 'token-allowance';
  data: {
    allowance: string;
  };
}

export interface RateLimitPolicy {
  type: 'rate-limit';
  data: {
    count: number;
    interval: number; // in seconds
  };
}

export interface GasLimitPolicy {
  type: 'gas-limit';
  data: {
    limit: string;
  };
}

export type Policy = TokenAllowancePolicy | RateLimitPolicy | GasLimitPolicy;

export interface Permission {
  type: PermissionType;
  data?: {
    ticker?: string;
    token?: `0x${string}`;
    [key: string]: any;
  };
  policies?: Policy[];
}

export interface Signer {
  type: 'keys' | 'eoa' | 'account';
  data?: {
    keys?: Array<{
      type: 'secp256k1' | 'secp256r1';
      publicKey: `0x${string}`;
    }>;
    id?: `0x${string}`;
  };
}

export interface PermissionRequest {
  account?: `0x${string}`;
  chainId?: string;
  address?: `0x${string}`;
  expiry: number;
  signer?: Signer;
  permissions: Permission[];
}

// Response from wallet_grantPermissions
export interface GrantPermissionsResponse {
  context: string;
  accountMeta?: {
    factory: `0x${string}`;
    factoryData: `0x${string}`;
  };
  signerMeta?: {
    userOpBuilder?: `0x${string}`;
    delegationMode?: 'ON_CHAIN' | 'OFF_CHAIN';
  };
  permissionsContext?: string;
}