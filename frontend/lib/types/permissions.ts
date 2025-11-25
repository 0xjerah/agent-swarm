export interface Permission {
  type: 'native-token-recurring-allowance' | 'erc20-recurring-allowance';
  data: {
    ticker?: string;
    token?: `0x${string}`;
    allowance: string;
    start: number;
    period: number;
    end?: number;
  };
}

export interface PermissionRequest {
  chainId: string;
  address: `0x${string}`;
  expiry: number;
  signer: {
    type: 'keys';
    data: {
      keys: Array<{
        type: 'secp256k1';
        publicKey: `0x${string}`;
      }>;
    };
  };
  permissions: Permission[];
  policies: Array<{
    type: string;
    data: any;
  }>;
}