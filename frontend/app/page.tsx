'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';
import DelegatePermission from '@/components/DelegatePermission';
import CreateDCASchedule from '@/components/CreateDCASchedule';
import PermissionTree from '@/components/PermissionTree';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [activeTab, setActiveTab] = useState<'delegate' | 'schedule' | 'tree'>('delegate');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            🤖 AgentSwarm
          </h1>
          <p className="text-gray-600 text-center mb-6">
            AI-powered agent orchestration with advanced permissions
          </p>
          
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition"
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🤖 AgentSwarm</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button
              onClick={() => disconnect()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-2 flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('delegate')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              activeTab === 'delegate'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Delegate Permissions
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Create DCA Schedule
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              activeTab === 'tree'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Permission Tree
          </button>
        </div>

        {/* Content */}
        {activeTab === 'delegate' && <DelegatePermission />}
        {activeTab === 'schedule' && <CreateDCASchedule />}
        {activeTab === 'tree' && <PermissionTree />}
      </div>
    </div>
  );
}