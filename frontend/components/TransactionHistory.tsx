'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, decodeEventLog } from 'viem';
import { masterAgentABI } from '@/lib/abis/generated/masterAgent';
import { dcaAgentABI } from '@/lib/abis/generated/dcaAgent';
import { yieldAgentABI } from '@/lib/abis/generated/yieldAgent';
import { History, ExternalLink, TrendingUp, Repeat, Shield, Loader2 } from 'lucide-react';

interface Transaction {
  hash: string;
  blockNumber: bigint;
  timestamp: Date;
  type: 'permission' | 'dca' | 'yield' | 'execute';
  event: string;
  details: any;
}

export default function TransactionHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: 11155111 }); // Sepolia testnet
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'permission' | 'dca' | 'yield'>('all');

  const masterAgentAddress = process.env.NEXT_PUBLIC_MASTER_AGENT as `0x${string}`;
  const dcaAgentAddress = process.env.NEXT_PUBLIC_DCA_AGENT as `0x${string}`;
  const yieldAgentAddress = process.env.NEXT_PUBLIC_YIELD_AGENT as `0x${string}`;

  useEffect(() => {
    if (!address || !publicClient) return;

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(999); // Last 999 blocks (RPC limit is 1000)

        // Fetch events from all contracts
        const [permissionLogs, dcaLogs, yieldLogs] = await Promise.all([
          // Master Agent events
          publicClient.getLogs({
            address: masterAgentAddress,
            fromBlock,
            toBlock: 'latest',
            events: [
              {
                type: 'event',
                name: 'PermissionDelegated',
                inputs: [
                  { type: 'address', indexed: true, name: 'user' },
                  { type: 'address', indexed: true, name: 'agent' },
                  { type: 'uint256', indexed: false, name: 'dailyLimit' },
                  { type: 'uint256', indexed: false, name: 'expiry' },
                ],
              },
            ],
          }),
          // DCA Agent events
          publicClient.getLogs({
            address: dcaAgentAddress,
            fromBlock,
            toBlock: 'latest',
            events: [
              {
                type: 'event',
                name: 'DCAScheduleCreated',
                inputs: [
                  { type: 'address', indexed: true, name: 'user' },
                  { type: 'uint256', indexed: true, name: 'scheduleId' },
                  { type: 'uint256', indexed: false, name: 'amountPerPurchase' },
                  { type: 'uint256', indexed: false, name: 'intervalSeconds' },
                  { type: 'uint24', indexed: false, name: 'poolFee' },
                ],
              },
              {
                type: 'event',
                name: 'DCAExecuted',
                inputs: [
                  { type: 'address', indexed: true, name: 'user' },
                  { type: 'uint256', indexed: true, name: 'scheduleId' },
                  { type: 'uint256', indexed: false, name: 'amountSpent' },
                  { type: 'uint256', indexed: false, name: 'amountReceived' },
                ],
              },
            ],
          }),
          // Yield Agent events
          publicClient.getLogs({
            address: yieldAgentAddress,
            fromBlock,
            toBlock: 'latest',
            events: [
              {
                type: 'event',
                name: 'StrategyCreated',
                inputs: [
                  { type: 'address', indexed: true, name: 'user' },
                  { type: 'uint256', indexed: true, name: 'strategyId' },
                  { type: 'address', indexed: false, name: 'token' },
                  { type: 'address', indexed: false, name: 'aToken' },
                  { type: 'uint8', indexed: false, name: 'strategyType' },
                  { type: 'uint256', indexed: false, name: 'targetAllocation' },
                ],
              },
              {
                type: 'event',
                name: 'FundsDeposited',
                inputs: [
                  { type: 'address', indexed: true, name: 'user' },
                  { type: 'uint256', indexed: true, name: 'strategyId' },
                  { type: 'uint256', indexed: false, name: 'amount' },
                ],
              },
            ],
          }),
        ]);

        // Parse all logs
        const allTxs: Transaction[] = [];

        // Parse permission logs
        for (const log of permissionLogs) {
          if (log.topics[1]?.toLowerCase() === address.toLowerCase().replace('0x', '0x000000000000000000000000')) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            allTxs.push({
              hash: log.transactionHash!,
              blockNumber: log.blockNumber,
              timestamp: new Date(Number(block.timestamp) * 1000),
              type: 'permission',
              event: 'PermissionDelegated',
              details: {
                agent: `0x${log.topics[2]?.slice(26)}`,
                dailyLimit: log.data ? BigInt(log.data.slice(0, 66)) : BigInt(0),
              },
            });
          }
        }

        // Parse DCA logs
        for (const log of dcaLogs) {
          if (log.topics[1]?.toLowerCase() === address.toLowerCase().replace('0x', '0x000000000000000000000000')) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            const eventName = log.topics[0];

            allTxs.push({
              hash: log.transactionHash!,
              blockNumber: log.blockNumber,
              timestamp: new Date(Number(block.timestamp) * 1000),
              type: 'dca',
              event: log.eventName || 'DCAEvent',
              details: log,
            });
          }
        }

        // Parse Yield logs
        for (const log of yieldLogs) {
          if (log.topics[1]?.toLowerCase() === address.toLowerCase().replace('0x', '0x000000000000000000000000')) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

            allTxs.push({
              hash: log.transactionHash!,
              blockNumber: log.blockNumber,
              timestamp: new Date(Number(block.timestamp) * 1000),
              type: 'yield',
              event: log.eventName || 'YieldEvent',
              details: log,
            });
          }
        }

        // Sort by timestamp descending
        allTxs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setTransactions(allTxs);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address, publicClient]);

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

          {/* Filter Buttons */}
          <div className="flex gap-2">
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="text-purple-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading transaction history...</p>
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
                        {tx.type === 'permission' && tx.details.dailyLimit && (
                          <div>Daily Limit: {formatUnits(tx.details.dailyLimit, 6)} USDC</div>
                        )}
                        <div className="text-xs text-gray-400">
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
