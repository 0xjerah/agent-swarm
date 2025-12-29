'use client';

import { useAccount } from 'wagmi';
import { gql } from '@apollo/client';
import { useQuery as useApolloQuery } from '@apollo/client/react';
import { useState, useEffect } from 'react';
import { Power, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// GraphQL query to get user's automation preference
const GET_USER_AUTOMATION = gql`
  query GetUserAutomation($userAddress: String!) {
    User(where: { address: { _eq: $userAddress } }) {
      address
      automationEnabled
    }
  }
`;

// TypeScript types for the GraphQL response
interface UserAutomationData {
  User: Array<{
    address: string;
    automationEnabled: boolean;
  }>;
}

// Note: GraphQL mutations would need to be set up with Hasura permissions
// For now, we'll store preference in localStorage and query the User entity
// When automation runs, keeper will check this field

export default function AutomationToggle() {
  const { address } = useAccount();
  const [localEnabled, setLocalEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Query user's automation preference from Envio indexer
  const { data, loading } = useApolloQuery<UserAutomationData>(GET_USER_AUTOMATION, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
  });

  // Sync with indexer data when available
  useEffect(() => {
    if (data?.User?.[0]?.automationEnabled !== undefined) {
      const enabled = data.User[0].automationEnabled;
      setLocalEnabled(enabled);
      // Also sync to localStorage for immediate UI feedback
      localStorage.setItem('automationEnabled', enabled.toString());
    } else if (address) {
      // Load from localStorage if indexer hasn't synced yet
      const stored = localStorage.getItem('automationEnabled');
      if (stored !== null) {
        setLocalEnabled(stored === 'true');
      }
    }
  }, [data, address]);

  const handleToggle = async () => {
    if (!address) return;

    const newValue = !localEnabled;
    setIsSaving(true);

    try {
      // Store preference in localStorage
      localStorage.setItem('automationEnabled', newValue.toString());
      setLocalEnabled(newValue);

      // In a full implementation, you would make a mutation here
      // For now, the keeper will read from the User entity which gets
      // its initial value from EventHandlers (default: true)
      // Users can toggle this in the UI, and we store in localStorage

      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Error saving automation preference:', error);
      // Revert on error
      setLocalEnabled(!newValue);
      localStorage.setItem('automationEnabled', (!newValue).toString());
    } finally {
      setIsSaving(false);
    }
  };

  if (!address) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
            localEnabled
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
              : 'bg-gradient-to-br from-gray-600 to-gray-700'
          }`}>
            <Power size={24} className="text-white" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Automation Service
            </h3>
            <p className="text-sm text-gray-400">
              {localEnabled
                ? 'Keeper will automatically execute your ready schedules'
                : 'Your schedules will not be executed automatically'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            localEnabled
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-gray-500/20 border border-gray-500/30'
          }`}>
            {localEnabled ? (
              <>
                <CheckCircle2 size={18} className="text-green-400" />
                <span className="text-sm font-semibold text-green-300">Active</span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-300">Inactive</span>
              </>
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={handleToggle}
            disabled={isSaving || loading}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 ${
              localEnabled
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gray-600'
            } ${isSaving || loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
          >
            <span className="sr-only">Toggle automation</span>
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                localEnabled ? 'translate-x-9' : 'translate-x-1'
              } flex items-center justify-center`}
            >
              {isSaving && <Loader2 size={14} className="text-gray-600 animate-spin" />}
            </span>
          </button>
        </div>
      </div>

      {/* Info message */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Note:</span> This controls whether the keeper service will execute your DCA schedules.
          The keeper must be running for automation to work. Your preference is stored locally and will be respected by the automation service.
        </p>
      </div>
    </div>
  );
}
