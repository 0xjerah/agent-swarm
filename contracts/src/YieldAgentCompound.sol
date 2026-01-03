// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MasterAgent.sol";

// Compound V3 (Comet) interface
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function borrowBalanceOf(address account) external view returns (uint256);

    // Get the principal amount supplied by an account
    function userBasic(address account) external view returns (
        int104 principal,
        uint64 baseTrackingIndex,
        uint64 baseTrackingAccrued,
        uint16 assetsIn,
        uint8 _reserved
    );
}

/**
 * @title YieldAgentCompound
 * @notice Automated yield farming agent with Compound V3 integration
 * Manages deposits, withdrawals, and yield optimization using delegated permissions
 */
contract YieldAgentCompound {
    using SafeERC20 for IERC20;

    MasterAgent public masterAgent;
    IComet public immutable comet;

    // Strategy types
    enum StrategyType {
        COMPOUND_SUPPLY,
        COMPOUND_COLLATERAL
    }

    struct YieldStrategy {
        address user;
        address token;              // Token being supplied (e.g., USDC)
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
        address _comet
    ) {
        require(_masterAgent != address(0), "Invalid master agent");
        require(_comet != address(0), "Invalid comet");

        masterAgent = MasterAgent(_masterAgent);
        comet = IComet(_comet);
    }

    /**
     * @notice Create a new yield strategy
     * @param token Token to deposit (e.g., USDC)
     * @param strategyType Type of yield strategy
     * @param targetAllocation Amount to allocate to this strategy
     */
    function createYieldStrategy(
        address token,
        StrategyType strategyType,
        uint256 targetAllocation
    ) external returns (uint256) {
        require(token != address(0), "Invalid token");
        require(targetAllocation > 0, "Target must be positive");

        uint256 strategyId = userStrategyCount[msg.sender];

        strategies[msg.sender][strategyId] = YieldStrategy({
            user: msg.sender,
            token: token,
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
            strategyType,
            targetAllocation
        );

        return strategyId;
    }

    /**
     * @notice Deposit funds into Compound V3 (called by automation/keeper)
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

        // Execute through master agent using ERC-7715 permission
        // This transfers tokens from user to this contract WITHOUT requiring ERC20 approval
        masterAgent.executeViaAgent(
            user,
            amountToDeposit,
            strategy.token,
            address(this)  // Transfer tokens to this Yield agent contract
        );

        // Deposit tokens to Compound V3
        _depositToCompound(strategy.token, amountToDeposit);

        strategy.currentDeposited += amountToDeposit;

        emit FundsDeposited(user, strategyId, amountToDeposit);
    }

    /**
     * @notice Internal helper to deposit tokens to Compound V3
     * @dev Tokens are already in this contract via ERC-7715 transfer from MasterAgent
     */
    function _depositToCompound(
        address token,
        uint256 amount
    ) internal {
        // Approve Comet to spend tokens
        IERC20(token).approve(address(comet), amount);

        // Supply to Compound V3
        // Note: Unlike Aave, Compound V3 credits the supplier directly with cTokens
        comet.supply(token, amount);
    }

    /**
     * @notice Harvest yield from Compound V3
     * @dev Yield in Compound V3 accrues automatically as the balance of cTokens increases
     * This function calculates the earned yield by comparing current balance to deposited amount
     * @param strategyId Strategy to harvest from
     */
    function harvestYield(uint256 strategyId) external {
        YieldStrategy storage strategy = strategies[msg.sender][strategyId];

        require(strategy.active, "Strategy not active");
        require(
            block.timestamp >= strategy.lastHarvestTime + 1 days,
            "Too soon to harvest"
        );

        // Get current balance in Compound (includes principal + accrued interest)
        uint256 currentBalance = comet.balanceOf(address(this));

        // Calculate yield as the difference between current balance and deposited amount
        if (currentBalance > strategy.currentDeposited) {
            uint256 yieldEarned = currentBalance - strategy.currentDeposited;

            strategy.totalYieldEarned += yieldEarned;
            strategy.lastHarvestTime = block.timestamp;

            emit YieldHarvested(msg.sender, strategyId, yieldEarned);
        }
    }

    /**
     * @notice Withdraw funds from Compound V3
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

        // Withdraw from Compound V3 to msg.sender
        comet.withdraw(strategy.token, amount);

        // Transfer withdrawn tokens to user
        IERC20(strategy.token).safeTransfer(msg.sender, amount);

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
     * @notice Check if strategy can be deposited to
     */
    function canDeposit(
        address user,
        uint256 strategyId
    ) external view returns (bool) {
        YieldStrategy memory strategy = strategies[user][strategyId];

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

    /**
     * @notice Get current balance in Compound V3
     */
    function getCompoundBalance(address user) external view returns (uint256) {
        return comet.balanceOf(user);
    }
}
