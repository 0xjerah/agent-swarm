'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DelegatePermission from '@/components/DelegatePermission';
import CreateDCASchedule from '@/components/CreateDCASchedule';
import PermissionTree from '@/components/PermissionTree';
import CreateYieldStrategy from '@/components/CreateYieldStrategy';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import TransactionHistory from '@/components/TransactionHistory';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'analytics' | 'delegate' | 'dca' | 'yield' | 'tree' | 'history'>('analytics');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">A</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              AgentSwarm
            </h1>
            <p className="text-gray-300">
              Connect your wallet to access the dashboard
            </p>
          </div>

          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Connect MetaMask
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-6 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-2xl font-bold text-white">AgentSwarm</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                <span className="text-sm text-gray-300">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-300"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2 flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('delegate')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'delegate'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            Delegate
          </button>
          <button
            onClick={() => setActiveTab('dca')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'dca'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            DCA
          </button>
          <button
            onClick={() => setActiveTab('yield')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'yield'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            Yield
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            Tree
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'delegate' && <DelegatePermission />}
          {activeTab === 'dca' && <CreateDCASchedule />}
          {activeTab === 'yield' && <CreateYieldStrategy />}
          {activeTab === 'tree' && <PermissionTree />}
          {activeTab === 'history' && <TransactionHistory />}
        </div>
      </div>
    </div>
  );
}
