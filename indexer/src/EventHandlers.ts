/*
 * AgentSwarm Event Handlers
 * Indexes events from MasterAgent, DCAAgent, and YieldAgent contracts
 */
import { MasterAgent, DCAAgent, YieldAgent } from "generated";

// ===== Helper Functions =====

async function ensureGlobalStats(context: any) {
  let stats = await context.GlobalStats.get("global");
  if (!stats) {
    stats = {
      id: "global",
      totalUsers: 0n,
      activeUsers: 0n,
      totalDelegations: 0n,
      activeDelegations: 0n,
      totalDCASchedules: 0n,
      activeDCASchedules: 0n,
      totalDCAExecutions: 0n,
      totalUSDCVolume: 0n,
      totalWETHVolume: 0n,
      totalYieldStrategies: 0n,
      activeYieldStrategies: 0n,
      totalYieldDeposited: 0n,
      totalYieldWithdrawn: 0n,
      totalRewardsClaimed: 0n,
      totalAgents: 0n,
    };
    context.GlobalStats.set(stats);
  }
  return stats;
}

async function ensureUser(context: any, userAddress: string, timestamp: bigint) {
  const userId = userAddress.toLowerCase();
  let user = await context.User.get(userId);

  if (!user) {
    user = {
      id: userId,
      address: userId,
      activeDelegations: 0n,
      totalDelegationsCreated: 0n,
      activeDCASchedules: 0n,
      totalDCASchedules: 0n,
      totalDCAExecutions: 0n,
      totalUSDCSpent: 0n,
      totalWETHReceived: 0n,
      activeYieldStrategies: 0n,
      totalYieldStrategies: 0n,
      totalYieldDeposited: 0n,
      totalYieldWithdrawn: 0n,
      totalRewardsClaimed: 0n,
      automationEnabled: true,
      firstInteraction: timestamp,
      lastInteraction: timestamp,
    };
    context.User.set(user);

    // Update global stats
    const stats = await ensureGlobalStats(context);
    context.GlobalStats.set({
      ...stats,
      totalUsers: stats.totalUsers + 1n,
      activeUsers: stats.activeUsers + 1n,
    });
  } else {
    // Update last interaction
    context.User.set({
      ...user,
      lastInteraction: timestamp,
    });
  }

  return user;
}

// ===== MasterAgent Event Handlers =====

// 1. Permission Delegated Handler
MasterAgent.PermissionDelegated.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();

  // Store raw event
  const txHash = event.block.hash;
  context.MasterAgent_PermissionDelegated.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    agent: agentAddress,
    dailyLimit: event.params.dailyLimit,
    expiry: event.params.expiry,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Ensure user exists
  const user = await ensureUser(context, userAddress, timestamp);

  // Get agent info
  let agent = await context.Agent.get(agentAddress);
  const agentName = agent?.name || "Unknown Agent";

  // Create or update Delegation entity
  const delegationId = `${userAddress}-${agentAddress}`;
  const existingDelegation = await context.Delegation.get(delegationId);

  context.Delegation.set({
    id: delegationId,
    user: userAddress,
    agent: agentAddress,
    agentName,
    dailyLimit: event.params.dailyLimit,
    expiry: event.params.expiry,
    isActive: true,
    totalSpent: existingDelegation?.totalSpent || 0n,
    lastUsed: existingDelegation?.lastUsed,
    createdAt: existingDelegation?.createdAt || timestamp,
    revokedAt: undefined,
  });

  // Update user stats (only if new delegation)
  if (!existingDelegation) {
    context.User.set({
      ...user,
      activeDelegations: user.activeDelegations + 1n,
      totalDelegationsCreated: user.totalDelegationsCreated + 1n,
    });

    // Update global stats
    const stats = await ensureGlobalStats(context);
    context.GlobalStats.set({
      ...stats,
      totalDelegations: stats.totalDelegations + 1n,
      activeDelegations: stats.activeDelegations + 1n,
    });

    // Update agent stats
    if (agent) {
      context.Agent.set({
        ...agent,
        totalDelegations: agent.totalDelegations + 1n,
        activeDelegations: agent.activeDelegations + 1n,
        totalUsers: agent.totalUsers + 1n,
      });
    }
  }
});

// 2. Permission Revoked Handler
MasterAgent.PermissionRevoked.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();

  // Store raw event
  const txHash = event.block.hash;
  context.MasterAgent_PermissionRevoked.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    agent: agentAddress,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update Delegation entity
  const delegationId = `${userAddress}-${agentAddress}`;
  const delegation = await context.Delegation.get(delegationId);

  if (delegation) {
    context.Delegation.set({
      ...delegation,
      isActive: false,
      revokedAt: timestamp,
    });

    // Update user stats
    const user = await context.User.get(userAddress);
    if (user) {
      context.User.set({
        ...user,
        activeDelegations: user.activeDelegations > 0n ? user.activeDelegations - 1n : 0n,
      });
    }

    // Update global stats
    const stats = await ensureGlobalStats(context);
    context.GlobalStats.set({
      ...stats,
      activeDelegations: stats.activeDelegations > 0n ? stats.activeDelegations - 1n : 0n,
    });

    // Update agent stats
    const agent = await context.Agent.get(agentAddress);
    if (agent) {
      context.Agent.set({
        ...agent,
        activeDelegations: agent.activeDelegations > 0n ? agent.activeDelegations - 1n : 0n,
      });
    }
  }
});

// 3. Agent Registered Handler
MasterAgent.AgentRegistered.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const agentAddress = event.params.agent.toLowerCase();

  // Store raw event
  context.MasterAgent_AgentRegistered.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    agent: agentAddress,
    name: event.params.name,
    timestamp,
    blockNumber: BigInt(event.block.number),
  });

  // Create Agent entity
  context.Agent.set({
    id: agentAddress,
    address: agentAddress,
    name: event.params.name,
    totalUsers: 0n,
    totalDelegations: 0n,
    activeDelegations: 0n,
    registeredAt: timestamp,
  });

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalAgents: stats.totalAgents + 1n,
  });
});

// 4. Transfer Executed Handler
MasterAgent.TransferExecuted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const agentAddress = event.params.agent.toLowerCase();

  // Store raw event
  context.MasterAgent_TransferExecuted.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    agent: agentAddress,
    token: event.params.token.toLowerCase(),
    amount: event.params.amount,
    recipient: event.params.recipient.toLowerCase(),
    timestamp,
    blockNumber: BigInt(event.block.number),
  });

  // Update delegation usage
  const delegationId = `${userAddress}-${agentAddress}`;
  const delegation = await context.Delegation.get(delegationId);

  if (delegation) {
    context.Delegation.set({
      ...delegation,
      totalSpent: delegation.totalSpent + event.params.amount,
      lastUsed: timestamp,
    });
  }
});

// ===== DCAAgent Event Handlers =====

// 5. DCA Schedule Created Handler
DCAAgent.DCAScheduleCreated.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();

  // Store raw event
  const txHash = event.block.hash;
  context.DCAAgent_DCAScheduleCreated.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    scheduleId: event.params.scheduleId,
    amountPerPurchase: event.params.amountPerPurchase,
    intervalSeconds: event.params.intervalSeconds,
    poolFee: BigInt(event.params.poolFee),
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Ensure user exists
  const user = await ensureUser(context, userAddress, timestamp);

  // Create DCASchedule entity
  const scheduleId = `${userAddress}-${event.params.scheduleId}`;
  context.DCASchedule.set({
    id: scheduleId,
    user: userAddress,
    scheduleId: event.params.scheduleId,
    amountPerPurchase: event.params.amountPerPurchase,
    intervalSeconds: event.params.intervalSeconds,
    poolFee: BigInt(event.params.poolFee),
    isActive: true,
    totalExecutions: 0n,
    totalUSDCSpent: 0n,
    totalWETHReceived: 0n,
    averagePrice: "0",
    createdAt: timestamp,
    lastExecutedAt: undefined,
    cancelledAt: undefined,
  });

  // Update user stats
  context.User.set({
    ...user,
    activeDCASchedules: user.activeDCASchedules + 1n,
    totalDCASchedules: user.totalDCASchedules + 1n,
  });

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalDCASchedules: stats.totalDCASchedules + 1n,
    activeDCASchedules: stats.activeDCASchedules + 1n,
  });
});

// 6. DCA Executed Handler
DCAAgent.DCAExecuted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const scheduleId = `${userAddress}-${event.params.scheduleId}`;

  // Calculate price (USDC per WETH)
  const usdcSpent = Number(event.params.amountSpent) / 1e6; // USDC has 6 decimals
  const wethReceived = Number(event.params.amountReceived) / 1e18; // WETH has 18 decimals
  const price = wethReceived > 0 ? (usdcSpent / wethReceived).toFixed(6) : "0";

  // Store raw event
  const txHash = event.block.hash;
  context.DCAAgent_DCAExecuted.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    scheduleId: event.params.scheduleId,
    amountSpent: event.params.amountSpent,
    amountReceived: event.params.amountReceived,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Create DCAExecution entity
  context.DCAExecution.set({
    id: `${event.block.hash}-${event.logIndex}`,
    user: userAddress,
    scheduleId: event.params.scheduleId,
    amountSpent: event.params.amountSpent,
    amountReceived: event.params.amountReceived,
    price,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update DCASchedule entity
  const schedule = await context.DCASchedule.get(scheduleId);
  if (schedule) {
    const newTotalUSDC = schedule.totalUSDCSpent + event.params.amountSpent;
    const newTotalWETH = schedule.totalWETHReceived + event.params.amountReceived;
    const newExecutions = schedule.totalExecutions + 1n;

    // Calculate new average price
    const totalUSDC = Number(newTotalUSDC) / 1e6;
    const totalWETH = Number(newTotalWETH) / 1e18;
    const avgPrice = totalWETH > 0 ? (totalUSDC / totalWETH).toFixed(6) : "0";

    context.DCASchedule.set({
      ...schedule,
      totalExecutions: newExecutions,
      totalUSDCSpent: newTotalUSDC,
      totalWETHReceived: newTotalWETH,
      averagePrice: avgPrice,
      lastExecutedAt: timestamp,
    });
  }

  // Update user stats
  const user = await context.User.get(userAddress);
  if (user) {
    context.User.set({
      ...user,
      totalDCAExecutions: user.totalDCAExecutions + 1n,
      totalUSDCSpent: user.totalUSDCSpent + event.params.amountSpent,
      totalWETHReceived: user.totalWETHReceived + event.params.amountReceived,
    });
  }

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalDCAExecutions: stats.totalDCAExecutions + 1n,
    totalUSDCVolume: stats.totalUSDCVolume + event.params.amountSpent,
    totalWETHVolume: stats.totalWETHVolume + event.params.amountReceived,
  });
});

// 7. DCA Schedule Cancelled Handler
DCAAgent.DCAScheduleCancelled.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const scheduleId = `${userAddress}-${event.params.scheduleId}`;

  // Store raw event
  const txHash = event.block.hash;
  context.DCAAgent_DCAScheduleCancelled.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    scheduleId: event.params.scheduleId,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update DCASchedule entity
  const schedule = await context.DCASchedule.get(scheduleId);
  if (schedule) {
    context.DCASchedule.set({
      ...schedule,
      isActive: false,
      cancelledAt: timestamp,
    });

    // Update user stats
    const user = await context.User.get(userAddress);
    if (user) {
      context.User.set({
        ...user,
        activeDCASchedules: user.activeDCASchedules > 0n ? user.activeDCASchedules - 1n : 0n,
      });
    }

    // Update global stats
    const stats = await ensureGlobalStats(context);
    context.GlobalStats.set({
      ...stats,
      activeDCASchedules: stats.activeDCASchedules > 0n ? stats.activeDCASchedules - 1n : 0n,
    });
  }
});

// ===== YieldAgent Event Handlers =====

// 8. Yield Strategy Created Handler
YieldAgent.YieldStrategyCreated.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();

  // Store raw event
  const txHash = event.block.hash;
  context.YieldAgent_YieldStrategyCreated.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    strategyId: event.params.strategyId,
    amount: event.params.amount,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Ensure user exists
  const user = await ensureUser(context, userAddress, timestamp);

  // Create YieldStrategy entity
  const strategyId = `${userAddress}-${event.params.strategyId}`;
  context.YieldStrategy.set({
    id: strategyId,
    user: userAddress,
    strategyId: event.params.strategyId,
    totalDeposited: event.params.amount,
    totalWithdrawn: 0n,
    totalRewardsClaimed: 0n,
    currentShares: 0n,
    isActive: true,
    isPaused: false,
    createdAt: timestamp,
    lastDepositAt: timestamp,
    lastWithdrawalAt: undefined,
    lastRewardsClaimAt: undefined,
  });

  // Update user stats
  context.User.set({
    ...user,
    activeYieldStrategies: user.activeYieldStrategies + 1n,
    totalYieldStrategies: user.totalYieldStrategies + 1n,
    totalYieldDeposited: user.totalYieldDeposited + event.params.amount,
  });

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalYieldStrategies: stats.totalYieldStrategies + 1n,
    activeYieldStrategies: stats.activeYieldStrategies + 1n,
    totalYieldDeposited: stats.totalYieldDeposited + event.params.amount,
  });
});

// 9. Deposit Executed Handler
YieldAgent.DepositExecuted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const strategyId = `${userAddress}-${event.params.strategyId}`;

  // Store raw event
  const txHash = event.block.hash;
  context.YieldAgent_DepositExecuted.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    strategyId: event.params.strategyId,
    amount: event.params.amount,
    sharesReceived: event.params.sharesReceived,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update YieldStrategy entity
  const strategy = await context.YieldStrategy.get(strategyId);
  if (strategy) {
    context.YieldStrategy.set({
      ...strategy,
      totalDeposited: strategy.totalDeposited + event.params.amount,
      currentShares: strategy.currentShares + event.params.sharesReceived,
      lastDepositAt: timestamp,
    });
  }

  // Update user stats
  const user = await context.User.get(userAddress);
  if (user) {
    context.User.set({
      ...user,
      totalYieldDeposited: user.totalYieldDeposited + event.params.amount,
    });
  }

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalYieldDeposited: stats.totalYieldDeposited + event.params.amount,
  });
});

// 10. Withdrawal Executed Handler
YieldAgent.WithdrawalExecuted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const strategyId = `${userAddress}-${event.params.strategyId}`;

  // Store raw event
  const txHash = event.block.hash;
  context.YieldAgent_WithdrawalExecuted.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    strategyId: event.params.strategyId,
    shares: event.params.shares,
    amountReceived: event.params.amountReceived,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update YieldStrategy entity
  const strategy = await context.YieldStrategy.get(strategyId);
  if (strategy) {
    context.YieldStrategy.set({
      ...strategy,
      totalWithdrawn: strategy.totalWithdrawn + event.params.amountReceived,
      currentShares: strategy.currentShares - event.params.shares,
      lastWithdrawalAt: timestamp,
    });
  }

  // Update user stats
  const user = await context.User.get(userAddress);
  if (user) {
    context.User.set({
      ...user,
      totalYieldWithdrawn: user.totalYieldWithdrawn + event.params.amountReceived,
    });
  }

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalYieldWithdrawn: stats.totalYieldWithdrawn + event.params.amountReceived,
  });
});

// 11. Rewards Claimed Handler
YieldAgent.RewardsClaimed.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const userAddress = event.params.user.toLowerCase();
  const strategyId = `${userAddress}-${event.params.strategyId}`;

  // Store raw event
  const txHash = event.block.hash;
  context.YieldAgent_RewardsClaimed.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: userAddress,
    strategyId: event.params.strategyId,
    rewardAmount: event.params.rewardAmount,
    timestamp,
    blockNumber: BigInt(event.block.number),
    txHash,
  });

  // Update YieldStrategy entity
  const strategy = await context.YieldStrategy.get(strategyId);
  if (strategy) {
    context.YieldStrategy.set({
      ...strategy,
      totalRewardsClaimed: strategy.totalRewardsClaimed + event.params.rewardAmount,
      lastRewardsClaimAt: timestamp,
    });
  }

  // Update user stats
  const user = await context.User.get(userAddress);
  if (user) {
    context.User.set({
      ...user,
      totalRewardsClaimed: user.totalRewardsClaimed + event.params.rewardAmount,
    });
  }

  // Update global stats
  const stats = await ensureGlobalStats(context);
  context.GlobalStats.set({
    ...stats,
    totalRewardsClaimed: stats.totalRewardsClaimed + event.params.rewardAmount,
  });
});

// 12. Strategy Paused Handler
// Note: StrategyPaused event only includes strategyId (global ID), not user address.
// Since our YieldStrategy entities use composite IDs (user-strategyId), we cannot
// directly look up which strategy to pause without the user context.
// This handler stores the raw event but does not update YieldStrategy entities.
// If you need pause/unpause functionality, consider emitting user address in these events.
YieldAgent.StrategyPaused.handler(async ({ event }) => {
  const timestamp = BigInt(event.block.timestamp);

  // For now, we just log this event without updating strategies
  // since we can't determine which user's strategy this refers to
  console.log(`Strategy ${event.params.strategyId} paused at ${timestamp}`);

  // TODO: If the contract is updated to include user address in pause events,
  // update this handler to modify the corresponding YieldStrategy entity
});

// 13. Strategy Unpaused Handler
// Note: Same limitation as StrategyPaused - no user context to match strategies
YieldAgent.StrategyUnpaused.handler(async ({ event }) => {
  const timestamp = BigInt(event.block.timestamp);

  // For now, we just log this event without updating strategies
  console.log(`Strategy ${event.params.strategyId} unpaused at ${timestamp}`);

  // TODO: If the contract is updated to include user address in unpause events,
  // update this handler to modify the corresponding YieldStrategy entity
});
