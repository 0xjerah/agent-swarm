# Fix Applied: connector.getProvider is not a function

## The Problem

You were seeing:
```
connector.getProvider is not a function
```

This happened because **Wagmi v3 connectors don't have a `getProvider()` method**.

## The Solution

Changed from trying to use the connector:
```typescript
// ❌ BROKEN - doesn't work in Wagmi v3
const provider = await connector.getProvider();
```

To using `window.ethereum` directly:
```typescript
// ✅ FIXED - works correctly
const walletClient = createWalletClient({
  transport: custom(window.ethereum),
}).extend(erc7715ProviderActions());
```

## What Changed

**File**: [frontend/lib/hooks/useAdvancedPermissions.ts](frontend/lib/hooks/useAdvancedPermissions.ts:28-37)

```typescript
const getWalletClient = useCallback(() => {
  // Use window.ethereum directly for MetaMask
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask Flask.');
  }

  return createWalletClient({
    transport: custom(window.ethereum),
  }).extend(erc7715ProviderActions());
}, []);
```

## Why This Works

1. **MetaMask injects `window.ethereum`** - This is the standard way to access MetaMask
2. **Viem's `custom()` transport** - Wraps the provider correctly
3. **Gator SDK extension** - `.extend(erc7715ProviderActions())` adds ERC-7715 methods

## Now You Should See

When you click "Grant Advanced Permissions":

1. ✅ No more "connector.getProvider is not a function" error
2. ✅ Should show Snap installation prompts (first time)
3. ✅ Should show permission request UI from Gator

## Requirements Reminder

Make sure you have:
- ✅ MetaMask Flask installed (not regular MetaMask)
- ✅ Connected to Sepolia network
- ✅ Have test USDC and ETH

## Testing Now

1. Refresh your browser (clear cache if needed)
2. Connect MetaMask Flask
3. Make sure you're on Sepolia
4. Click "Grant Advanced Permissions"
5. **First time**: Approve both Snap installations when prompted
6. Approve the permission request
7. Success! 🎉

## If You Still See Errors

Check browser console (F12) for the specific error message and let me know what it says.
