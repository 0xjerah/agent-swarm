'use client';

import { useAccount } from 'wagmi';
import { useQuery as useApolloQuery } from '@apollo/client/react';
import { GET_DELEGATION_HISTORY, GET_AGENTS } from '@/lib/graphql/queries';
import { formatUnits } from 'viem';
import { History, CheckCircle, XCircle, Send, ExternalLink, Clock } from 'lucide-react';
import { useMemo } from 'react';

type DelegationEvent = {
  type: 'delegated' | 'revoked' | 'executed';
  id: string;
  agent: string;
  timestamp: string;
  blockNumber: string;
  txHash?: string;
  dailyLimit?: string;
  expiry?: string;
  amount?: string;
  token?: string;
};

export default function DelegationHistory() {
  const { address } = useAccount();

  const { data: historyData, loading: historyLoading } = useApolloQuery(GET_DELEGATION_HISTORY, {
    variables: { userAddress: address?.toLowerCase(), limit: 100 },
    skip: !address,
    pollInterval: 10000, // Poll every 10 seconds
    fetchPolicy: 'cache-and-network',
  });

  const { data: agentsData } = useApolloQuery(GET_AGENTS, {
    pollInterval: 30000,
    fetchPolicy: 'cache-and-network',
  });

  // Create agent lookup map
  const agentMap = useMemo(() => {
    if (!agentsData?.Agent) return {};
    return agentsData.Agent.reduce((map: any, agent: any) => {
      map[agent.address.toLowerCase()] = agent.name;
      return map;
    }, {});
  }, [agentsData]);

  // Combine and sort all events chronologically
  const allEvents = useMemo(() => {
    if (!historyData) return [];

    const events: DelegationEvent[] = [];

    // Add delegated events
    historyData.delegatedEvents?.forEach((event: any) => {
      events.push({
        type: 'delegated',
        id: event.id,
        agent: event.agent,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        txHash: event.txHash,
        dailyLimit: event.dailyLimit,
        expiry: event.expiry,
      });
    });

    // Add revoked events
    historyData.revokedEvents?.forEach((event: any) => {
      events.push({
        type: 'revoked',
        id: event.id,
        agent: event.agent,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        txHash: event.txHash,
      });
    });

    // Add executed events
    historyData.executedEvents?.forEach((event: any) => {
      events.push({
        type: 'executed',
        id: event.id,
        agent: event.agent,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        amount: event.amount,
        token: event.token,
      });
    });

    // Sort by timestamp descending (newest first)
    return events.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [historyData]);

  const getAgentName = (agentAddress: string) => {
    const name = agentMap[agentAddress.toLowerCase()];
    if (name) return name;

    // Fallback to hardcoded names for known agents
    const lowerAddress = agentAddress.toLowerCase();
    if (lowerAddress === '0xa86e7b31fa6a77186f09f36c06b2e7c5d3132795') return 'DCA Agent';
    if (lowerAddress === '0x7cbd25a489917c3fac92eff1e37c3ae2afccbcf2') return 'Yield Agent (Compound V3)';
    if (lowerAddress === '0xb95adacb74e981bcfb1e97b4d277e51a95753c8f') return 'Yield Agent (Aave V3)';

    return `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const EventIcon = ({ type }: { type: DelegationEvent['type'] }) => {
    switch (type) {
      case 'delegated':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'revoked':
        return <XCircle size={20} className="text-red-400" />;
      case 'executed':
        return <Send size={20} className="text-blue-400" />;
    }
  };

  const EventCard = ({ event }: { event: DelegationEvent }) => {
    const getEventColor = () => {
      switch (event.type) {
        case 'delegated':
          return 'border-green-500/30 bg-green-500/5';
        case 'revoked':
          return 'border-red-500/30 bg-red-500/5';
        case 'executed':
          return 'border-blue-500/30 bg-blue-500/5';
      }
    };

    const getEventTitle = () => {
      switch (event.type) {
        case 'delegated':
          return 'Permission Delegated';
        case 'revoked':
          return 'Permission Revoked';
        case 'executed':
          return 'Transfer Executed';
      }
    };

    return (
      <div className={`border rounded-xl p-4 ${getEventColor()} transition-all duration-300 hover:bg-white/[0.05]`}>
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <EventIcon type={event.type} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="font-semibold text-white">{getEventTitle()}</div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={14} />
                {formatTimestamp(event.timestamp)}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Agent:</span>
                <span className="text-white font-mono">{getAgentName(event.agent)}</span>
              </div>

              {event.type === 'delegated' && event.dailyLimit && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Daily Limit:</span>
                    <span className="text-white font-mono">{formatUnits(BigInt(event.dailyLimit), 6)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Expires:</span>
                    <span className="text-white font-mono">
                      {new Date(Number(event.expiry) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}

              {event.type === 'executed' && event.amount && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-mono">{formatUnits(BigInt(event.amount), 6)} USDC</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Block:</span>
                <span className="text-gray-300 font-mono">#{event.blockNumber}</span>
              </div>

              {event.txHash && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                  >
                    <ExternalLink size={14} />
                    View on Etherscan
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <History size={24} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Delegation History</h2>
        </div>
        <p className="text-gray-300 text-base leading-relaxed">
          Complete timeline of your delegation events and agent executions
        </p>
      </div>

      {!address ? (
        <div className="text-center py-12 text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-50" />
          <p>Connect your wallet to view delegation history</p>
        </div>
      ) : historyLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading delegation history...</p>
        </div>
      ) : allEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History size={48} className="mx-auto mb-4 opacity-50" />
          <p>No delegation events yet</p>
          <p className="text-sm mt-2">Delegate permissions to agents to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
