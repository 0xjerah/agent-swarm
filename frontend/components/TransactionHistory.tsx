'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { gql } from '@apollo/client';
import { useQuery as useApolloQuery } from '@apollo/client/react';
import { formatUnits } from 'viem';
import { History, ExternalLink, TrendingUp, Repeat, Shield, Loader2 } from 'lucide-react';

interface Transaction {
  hash: string;
  blockNumber: string;
  timestamp: Date;
  type: 'permission' | 'dca' | 'yield' | 'execute';
  event: string;
  details: any;
}

// GraphQL query to fetch all recent transactions
const GET_RECENT_TRANSACTIONS = gql`
  query GetRecentTransactions($userAddress: String!) {
    # Permission events
    permissionDelegated: MasterAgent_PermissionDelegated(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      agent
      dailyLimit
      expiry
      timestamp
      blockNumber
      txHash
    }

    permissionRevoked: MasterAgent_PermissionRevoked(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      agent
      timestamp
      blockNumber
      txHash
    }

    # DCA events
    dcaScheduleCreated: DCAAgent_DCAScheduleCreated(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      scheduleId
      amountPerPurchase
      intervalSeconds
      timestamp
      blockNumber
      txHash
    }

    dcaExecuted: DCAAgent_DCAExecuted(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      scheduleId
      amountSpent
      amountReceived
      timestamp
      blockNumber
      txHash
    }

    dcaCancelled: DCAAgent_DCAScheduleCancelled(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      scheduleId
      timestamp
      blockNumber
      txHash
    }

    # Yield events
    yieldStrategyCreated: YieldAgent_YieldStrategyCreated(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      strategyId
      amount
      timestamp
      blockNumber
      txHash
    }

    yieldDeposited: YieldAgent_DepositExecuted(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      strategyId
      amount
      timestamp
      blockNumber
      txHash
    }

    yieldWithdrawn: YieldAgent_WithdrawalExecuted(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      strategyId
      shares
      amountReceived
      timestamp
      blockNumber
      txHash
    }
  }
`;

export default function TransactionHistory() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<'all' | 'permission' | 'dca' | 'yield'>('all');

  // Query all transactions from Envio
  const { data, loading, error, refetch } = useApolloQuery(GET_RECENT_TRANSACTIONS, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
    fetchPolicy: 'network-only', // Always fetch fresh data from network
    pollInterval: 5000, // Poll every 5s for near real-time transaction updates
  });

  // Combine and transform all events into unified transaction format
  const transactions = useMemo(() => {
    if (!data) return [];

    const allTxs: Transaction[] = [];
    const typedData = data as any;

    // Process permission delegated events
    typedData.permissionDelegated?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'permission',
        event: 'PermissionDelegated',
        details: {
          agent: event.agent,
          dailyLimit: BigInt(event.dailyLimit),
          expiry: BigInt(event.expiry),
        },
      });
    });

    // Process permission revoked events
    typedData.permissionRevoked?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'permission',
        event: 'PermissionRevoked',
        details: {
          agent: event.agent,
        },
      });
    });

    // Process DCA schedule created events
    typedData.dcaScheduleCreated?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'dca',
        event: 'DCAScheduleCreated',
        details: {
          scheduleId: event.scheduleId,
          amountPerPurchase: BigInt(event.amountPerPurchase),
          intervalSeconds: BigInt(event.intervalSeconds),
        },
      });
    });

    // Process DCA executed events
    typedData.dcaExecuted?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'dca',
        event: 'DCAExecuted',
        details: {
          scheduleId: event.scheduleId,
          amountSpent: BigInt(event.amountSpent),
          amountReceived: BigInt(event.amountReceived),
        },
      });
    });

    // Process DCA cancelled events
    typedData.dcaCancelled?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'dca',
        event: 'DCAScheduleCancelled',
        details: {
          scheduleId: event.scheduleId,
        },
      });
    });

    // Process yield strategy created events
    typedData.yieldStrategyCreated?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'yield',
        event: 'YieldStrategyCreated',
        details: {
          strategyId: event.strategyId,
          amount: BigInt(event.amount),
        },
      });
    });

    // Process yield deposit events
    typedData.yieldDeposited?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'yield',
        event: 'DepositExecuted',
        details: {
          strategyId: event.strategyId,
          amount: BigInt(event.amount),
        },
      });
    });

    // Process yield withdrawal events
    typedData.yieldWithdrawn?.forEach((event: any) => {
      allTxs.push({
        hash: event.txHash,
        blockNumber: event.blockNumber.toString(),
        timestamp: new Date(Number(event.timestamp) * 1000),
        type: 'yield',
        event: 'WithdrawalExecuted',
        details: {
          strategyId: event.strategyId,
          shares: BigInt(event.shares),
          amountReceived: BigInt(event.amountReceived),
        },
      });
    });

    // Sort by timestamp descending
    return allTxs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [data]);

  const filteredTxs = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'permission':
        return <Shield size={18} className="text-purple-400" />;
      case 'dca':
        return <Repeat size={18} className="text-blue-400" />;
      case 'yield':
        return <TrendingUp size={18} className="text-green-400" />;
      default:
        return <History size={18} className="text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'permission':
        return 'from-purple-500/20 to-pink-500/20 border-purple-400/30';
      case 'dca':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-400/30';
      case 'yield':
        return 'from-green-500/20 to-teal-500/20 border-green-400/30';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-400/30';
    }
  };

  // Format transaction details for display
  const formatDetails = (tx: Transaction) => {
    const details = tx.details;

    switch (tx.event) {
      case 'PermissionDelegated':
        return (
          <>
            <div>Daily Limit: {formatUnits(details.dailyLimit, 6)} USDC</div>
            <div className="text-xs text-gray-400">Expires: {new Date(Number(details.expiry) * 1000).toLocaleDateString()}</div>
          </>
        );
      case 'PermissionRevoked':
        return <div>Agent: {details.agent?.slice(0, 10)}...</div>;
      case 'DCAScheduleCreated':
        return (
          <>
            <div>Schedule #{details.scheduleId?.toString()}</div>
            <div>{formatUnits(details.amountPerPurchase, 6)} USDC per purchase</div>
          </>
        );
      case 'DCAExecuted':
        const price = Number(details.amountSpent) / 1e6 / (Number(details.amountReceived) / 1e18);
        return (
          <>
            <div>Schedule #{details.scheduleId?.toString()}</div>
            <div>{formatUnits(details.amountSpent, 6)} USDC → {formatUnits(details.amountReceived, 18)} WETH</div>
            <div className="text-xs text-gray-400">Price: ${price.toFixed(2)} per WETH</div>
          </>
        );
      case 'DCAScheduleCancelled':
        return <div>Schedule #{details.scheduleId?.toString()} cancelled</div>;
      case 'YieldStrategyCreated':
        return <div>Strategy #{details.strategyId?.toString()} created</div>;
      case 'DepositExecuted':
        return (
          <>
            <div>Strategy #{details.strategyId?.toString()}</div>
            <div>Deposited: {formatUnits(details.amount, 18)} tokens</div>
          </>
        );
      case 'WithdrawalExecuted':
        return (
          <>
            <div>Strategy #{details.strategyId?.toString()}</div>
            <div>Withdrew: {formatUnits(details.amountReceived, 18)} tokens</div>
            <div className="text-xs text-gray-400">Shares burned: {formatUnits(details.shares, 18)}</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <History size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Transaction History</h2>
            </div>
            <p className="text-gray-300 text-base leading-relaxed">
              View all your agent interactions and permission changes on-chain.
            </p>
          </div>

          {/* Filter and Refresh Buttons */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('permission')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'permission'
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Permissions
            </button>
            <button
              onClick={() => setFilter('dca')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'dca'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              DCA
            </button>
            <button
              onClick={() => setFilter('yield')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'yield'
                  ? 'bg-green-500/30 text-green-300'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Yield
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        {!address ? (
          <div className="flex flex-col items-center justify-center py-20">
            <History size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400">Connect wallet to view transaction history</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <History size={48} className="text-red-400 mb-4" />
            <p className="text-red-400">Error loading transactions</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure Envio indexer is running
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="text-purple-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading transaction history from Envio...</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <History size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-500 mt-2">
              Start by delegating permissions or creating a strategy
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTxs.map((tx, index) => (
              <div
                key={tx.hash + index}
                className={`bg-gradient-to-r ${getTypeColor(tx.type)} backdrop-blur-sm border rounded-xl p-5 hover:scale-[1.01] transition-all duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      {getIcon(tx.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-bold">{tx.event}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'permission' ? 'bg-purple-500/30 text-purple-200' :
                          tx.type === 'dca' ? 'bg-blue-500/30 text-blue-200' :
                          'bg-green-500/30 text-green-200'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-300 space-y-1">
                        {formatDetails(tx)}
                        <div className="text-xs text-gray-400 mt-2">
                          {tx.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>View</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
