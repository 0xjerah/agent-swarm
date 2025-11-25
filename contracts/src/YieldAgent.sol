// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MasterAgent.sol";

// Aave V3 interfaces
interface IPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

interface IRewardsController {
    function claimAllRewards(
        address[] calldata assets,
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);

    function getAllUserRewards(
        address[] calldata assets,
        address user
    ) external view returns (address[] memory rewardsList, uint256[] memory unclaimedAmounts);
}

/**
 * @title YieldAgent
 * @notice Automated yield farming agent with real Aave V3 integration
 * Manages deposits, withdrawals, and yield optimization using delegated permissions
 */
contract YieldAgent {
    using SafeERC20 for IERC20;

    MasterAgent public masterAgent;
    IPool public immutable aavePool;
    IRewardsController public immutable rewardsController;

    // Strategy types
    enum StrategyType {
        AAVE_SUPPLY,
        AAVE_EMODE
    }

    struct YieldStrategy {
        address user;
        address token;              // Token being supplied to Aave
        address aToken;             // Aave interest-bearing token received
        StrategyType strategyType;
        uint256 targetAllocation;   // Amount to allocate
        uint256 currentDeposited;   // Amount currently deposited
        uint256 totalYieldEarned;   // Total yield harvested
        uint256 lastHarvestTime;    // Last time rewards were claimed
        bool active;
    }

    // User -> Strategy ID -> Strategy
    mapping(address => mapping(uint256 => YieldStrategy)) public strategies;
    mapping(address => uint256) public userStrategyCount;

    // Events
    event StrategyCreated(
        address indexed user,
        uint256 indexed strategyId,
        address token,
        address aToken,
        StrategyType strategyType,
        uint256 targetAllocation
    );
    event FundsDeposited(
        address indexed user,
        uint256 indexed strategyId,
        uint256 amount
    );
    event YieldHarvested(
        address indexed user,
        uint256 indexed strategyId,
        uint256 yieldAmount
    );
    event FundsWithdrawn(
        address indexed user,
        uint256 indexed strategyId,
        uint256 amount
    );
    event StrategyRebalanced(
        address indexed user,
        uint256 indexed strategyId,
        uint256 newAllocation
    );
    event StrategyDeactivated(
        address indexed user,
        uint256 indexed strategyId
    );

    constructor(
        address _masterAgent,
        address _aavePool,
        address _rewardsController
    ) {
        require(_masterAgent != address(0), "Invalid master agent");
        require(_aavePool != address(0), "Invalid Aave pool");
        require(_rewardsController != address(0), "Invalid rewards controller");

        masterAgent = MasterAgent(_masterAgent);
        aavePool = IPool(_aavePool);
        rewardsController = IRewardsController(_rewardsController);
    }

    /**
     * @notice Create a new yield strategy
     * @param token Token to deposit (e.g., USDC)
     * @param aToken Corresponding Aave aToken address
     * @param strategyType Type of yield strategy
     * @param targetAllocation Amount to allocate to this strategy
     */
    function createYieldStrategy(
        address token,
        address aToken,
        StrategyType strategyType,
        uint256 targetAllocation
    ) external returns (uint256) {
        require(token != address(0), "Invalid token");
        require(aToken != address(0), "Invalid aToken");
        require(targetAllocation > 0, "Target must be positive");

        uint256 strategyId = userStrategyCount[msg.sender];

        strategies[msg.sender][strategyId] = YieldStrategy({
            user: msg.sender,
            token: token,
            aToken: aToken,
            strategyType: strategyType,
            targetAllocation: targetAllocation,
            currentDeposited: 0,
            totalYieldEarned: 0,
            lastHarvestTime: block.timestamp,
            active: true
        });

        userStrategyCount[msg.sender]++;

        emit StrategyCreated(
            msg.sender,
            strategyId,
            token,
            aToken,
            strategyType,
            targetAllocation
        );

        return strategyId;
    }

    /**
     * @notice Deposit funds into Aave V3 (called by automation/keeper)
     * @param user User whose funds to deposit
     * @param strategyId Strategy ID to execute
     */
    function executeDeposit(address user, uint256 strategyId) external {
        YieldStrategy storage strategy = strategies[user][strategyId];

        require(strategy.active, "Strategy not active");
        require(
            strategy.currentDeposited < strategy.targetAllocation,
            "Target allocation reached"
        );

        uint256 amountToDeposit = strategy.targetAllocation - strategy.currentDeposited;

        // Check master agent permission
        require(
            masterAgent.canAgentSpend(user, address(this), amountToDeposit),
            "Insufficient permission"
        );

        // Execute through master agent
        masterAgent.executeViaAgent(
            user,
            amountToDeposit,
            strategy.token,
            ""
        );

        // Transfer tokens from user to this contract
        IERC20(strategy.token).safeTransferFrom(
            user,
            address(this),
            amountToDeposit
        );

        // Approve Aave pool to spend tokens
        IERC20(strategy.token).approve(address(aavePool), amountToDeposit);

        // Supply to Aave V3 on behalf of user
        aavePool.supply(strategy.token, amountToDeposit, user, 0);

        strategy.currentDeposited += amountToDeposit;

        emit FundsDeposited(user, strategyId, amountToDeposit);
    }

    /**
     * @notice Harvest Aave rewards (incentive tokens)
     * @param strategyId Strategy to harvest from
     */
    function harvestYield(uint256 strategyId) external {
        YieldStrategy storage strategy = strategies[msg.sender][strategyId];

        require(strategy.active, "Strategy not active");
        require(
            block.timestamp >= strategy.lastHarvestTime + 1 days,
            "Too soon to harvest"
        );

        // Create array of aTokens to claim rewards for
        address[] memory assets = new address[](1);
        assets[0] = strategy.aToken;

        // Claim all rewards from Aave
        (, uint256[] memory claimedAmounts) =
            rewardsController.claimAllRewards(assets, msg.sender);

        // Sum up all claimed rewards
        uint256 totalClaimed = 0;
        for (uint256 i = 0; i < claimedAmounts.length; i++) {
            totalClaimed += claimedAmounts[i];
        }

        if (totalClaimed > 0) {
            strategy.totalYieldEarned += totalClaimed;
            strategy.lastHarvestTime = block.timestamp;

            emit YieldHarvested(msg.sender, strategyId, totalClaimed);
        }
    }

    /**
     * @notice Withdraw funds from Aave V3
     * @param strategyId Strategy to withdraw from
     * @param amount Amount to withdraw
     */
    function withdrawFromStrategy(
        uint256 strategyId,
        uint256 amount
    ) external {
        YieldStrategy storage strategy = strategies[msg.sender][strategyId];

        require(strategy.active, "Strategy not active");
        require(amount <= strategy.currentDeposited, "Insufficient balance");

        // Withdraw from Aave V3 - aTokens are burned and underlying is returned
        aavePool.withdraw(strategy.token, amount, msg.sender);

        strategy.currentDeposited -= amount;

        emit FundsWithdrawn(msg.sender, strategyId, amount);
    }

    /**
     * @notice Rebalance strategy allocation
     * @param strategyId Strategy to rebalance
     * @param newTargetAllocation New target allocation
     */
    function rebalanceStrategy(
        uint256 strategyId,
        uint256 newTargetAllocation
    ) external {
        YieldStrategy storage strategy = strategies[msg.sender][strategyId];
        
        require(strategy.active, "Strategy not active");

        strategy.targetAllocation = newTargetAllocation;

        emit StrategyRebalanced(msg.sender, strategyId, newTargetAllocation);
    }

    /**
     * @notice Deactivate a strategy
     * @param strategyId Strategy to deactivate
     */
    function deactivateStrategy(uint256 strategyId) external {
        YieldStrategy storage strategy = strategies[msg.sender][strategyId];

        require(strategy.active, "Strategy already inactive");
        require(strategy.currentDeposited == 0, "Must withdraw all funds first");

        strategy.active = false;
        emit StrategyDeactivated(msg.sender, strategyId);
    }

    /**
     * @notice Get strategy details
     */
    function getStrategy(
        address user,
        uint256 strategyId
    ) external view returns (YieldStrategy memory) {
        return strategies[user][strategyId];
    }

    /**
     * @notice Get user account data from Aave
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return aavePool.getUserAccountData(user);
    }

    /**
     * @notice Get pending rewards for a strategy
     */
    function getPendingRewards(
        address user,
        uint256 strategyId
    ) external view returns (address[] memory, uint256[] memory) {
        YieldStrategy storage strategy = strategies[user][strategyId];

        address[] memory assets = new address[](1);
        assets[0] = strategy.aToken;

        return rewardsController.getAllUserRewards(assets, user);
    }

    /**
     * @notice Check if strategy can be deposited to
     */
    function canDeposit(
        address user,
        uint256 strategyId
    ) external view returns (bool) {
        YieldStrategy storage strategy = strategies[user][strategyId];

        if (!strategy.active) return false;
        if (strategy.currentDeposited >= strategy.targetAllocation) return false;

        uint256 amountNeeded = strategy.targetAllocation - strategy.currentDeposited;
        return masterAgent.canAgentSpend(user, address(this), amountNeeded);
    }

    /**
     * @notice Get user's total strategy count
     */
    function getUserStrategyCount(address user) external view returns (uint256) {
        return userStrategyCount[user];
    }
}