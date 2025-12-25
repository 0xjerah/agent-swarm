import { gql } from '@apollo/client';

// Get user's DCA schedules
export const GET_USER_SCHEDULES = gql`
  query GetUserSchedules($userAddress: String!) {
    DCASchedule(
      where: { user: { _eq: $userAddress } }
      order_by: { createdAt: desc }
    ) {
      id
      user
      scheduleId
      amountPerPurchase
      intervalSeconds
      totalExecutions
      totalUSDCSpent
      totalWETHReceived
      averagePrice
      active
      createdAt
      lastExecutionTime
    }
  }
`;

// Get user's DCA execution history
export const GET_USER_EXECUTIONS = gql`
  query GetUserExecutions($userAddress: String!) {
    DCAExecution(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      user
      scheduleId
      amountSpent
      amountReceived
      price
      timestamp
      txHash
    }
  }
`;

// Get user's delegations
export const GET_USER_DELEGATIONS = gql`
  query GetUserDelegations($userAddress: String!) {
    Delegation(
      where: { user: { _eq: $userAddress }, active: { _eq: true } }
    ) {
      id
      user
      agent
      dailyLimit
      spentToday
      lastResetTimestamp
      expiry
      active
    }
  }
`;

// Get user stats
export const GET_USER_STATS = gql`
  query GetUserStats($userAddress: String!) {
    User(where: { id: { _eq: $userAddress } }) {
      id
      address
      activeDelegations
      totalDelegationsCreated
      activeDCASchedules
      totalDCASchedules
      totalDCAExecutions
      totalUSDCSpent
      totalWETHReceived
      activeYieldStrategies
      totalYieldStrategies
      totalYieldDeposited
      totalYieldWithdrawn
      totalRewardsClaimed
      firstInteraction
      lastInteraction
    }
  }
`;

// Get global protocol stats
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    GlobalStats(where: { id: { _eq: "global" } }) {
      id
      totalUsers
      activeUsers
      totalDelegations
      activeDelegations
      totalDCASchedules
      activeDCASchedules
      totalDCAExecutions
      totalUSDCVolume
      totalWETHVolume
      totalYieldStrategies
      activeYieldStrategies
      totalYieldDeposited
      totalYieldWithdrawn
      totalRewardsClaimed
      totalAgents
    }
  }
`;

// Get user's yield strategies
export const GET_USER_YIELD_STRATEGIES = gql`
  query GetUserYieldStrategies($userAddress: String!) {
    YieldStrategy(
      where: { user: { _eq: $userAddress } }
      order_by: { createdAt: desc }
    ) {
      id
      user
      strategyId
      totalDeposited
      totalWithdrawn
      totalRewardsClaimed
      currentShares
      isActive
      isPaused
      createdAt
      lastDepositAt
      lastWithdrawalAt
      lastRewardsClaimAt
    }
  }
`;

// Get recent transaction history
export const GET_RECENT_TRANSACTIONS = gql`
  query GetRecentTransactions($userAddress: String!, $limit: Int = 20) {
    MasterAgent_TransferExecuted(
      where: { user: { _eq: $userAddress } }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      user
      agent
      token
      amount
      recipient
      timestamp
      blockNumber
    }
  }
`;
