// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MasterAgent.sol";

// Uniswap V3 interfaces
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/**
 * @title DCAAgent
 * @notice Automated Dollar Cost Averaging agent with real Uniswap V3 integration
 * Executes recurring buys of a target token using delegated permissions
 */
contract DCAAgent {
    using SafeERC20 for IERC20;

    MasterAgent public masterAgent;
    ISwapRouter public immutable swapRouter;

    // Uniswap V3 fee tiers
    uint24 public constant POOL_FEE_LOW = 500;      // 0.05%
    uint24 public constant POOL_FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant POOL_FEE_HIGH = 10000;   // 1%

    struct DCASchedule {
        address user;
        address inputToken;   // Token to spend (e.g., USDC)
        address outputToken;  // Token to buy (e.g., WETH)
        uint256 amountPerPurchase;
        uint256 intervalSeconds;
        uint256 lastExecutionTime;
        uint24 poolFee;       // Uniswap V3 pool fee tier
        uint256 slippageBps;  // Slippage tolerance in basis points (e.g., 50 = 0.5%)
        bool active;
    }

    // User -> Schedule ID -> Schedule
    mapping(address => mapping(uint256 => DCASchedule)) public schedules;
    mapping(address => uint256) public userScheduleCount;

    event DCAScheduleCreated(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountPerPurchase,
        uint256 intervalSeconds,
        uint24 poolFee
    );
    event DCAExecuted(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountSpent,
        uint256 amountReceived
    );
    event DCAScheduleCancelled(
        address indexed user,
        uint256 indexed scheduleId
    );

    constructor(address _masterAgent, address _swapRouter) {
        require(_masterAgent != address(0), "Invalid master agent");
        require(_swapRouter != address(0), "Invalid swap router");
        masterAgent = MasterAgent(_masterAgent);
        swapRouter = ISwapRouter(_swapRouter);
    }

    /**
     * @notice Create a new DCA schedule
     * @param inputToken Token to spend (e.g., USDC)
     * @param outputToken Token to buy (e.g., WETH)
     * @param amountPerPurchase Amount to spend per purchase
     * @param intervalSeconds Time between purchases
     * @param poolFee Uniswap V3 pool fee tier (500, 3000, or 10000)
     * @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
     */
    function createDCASchedule(
        address inputToken,
        address outputToken,
        uint256 amountPerPurchase,
        uint256 intervalSeconds,
        uint24 poolFee,
        uint256 slippageBps
    ) external returns (uint256) {
        require(inputToken != address(0), "Invalid input token");
        require(outputToken != address(0), "Invalid output token");
        require(amountPerPurchase > 0, "Amount must be positive");
        require(intervalSeconds > 0, "Interval must be positive");
        require(
            poolFee == POOL_FEE_LOW || poolFee == POOL_FEE_MEDIUM || poolFee == POOL_FEE_HIGH,
            "Invalid pool fee"
        );
        require(slippageBps <= 1000, "Slippage too high"); // Max 10%

        uint256 scheduleId = userScheduleCount[msg.sender];

        schedules[msg.sender][scheduleId] = DCASchedule({
            user: msg.sender,
            inputToken: inputToken,
            outputToken: outputToken,
            amountPerPurchase: amountPerPurchase,
            intervalSeconds: intervalSeconds,
            lastExecutionTime: block.timestamp,
            poolFee: poolFee,
            slippageBps: slippageBps,
            active: true
        });

        userScheduleCount[msg.sender]++;

        emit DCAScheduleCreated(
            msg.sender,
            scheduleId,
            amountPerPurchase,
            intervalSeconds,
            poolFee
        );

        return scheduleId;
    }

    /**
     * @notice Execute a DCA purchase (can be called by anyone/automation)
     * @param user User whose schedule to execute
     * @param scheduleId Schedule ID to execute
     */
    function executeDCA(address user, uint256 scheduleId) external {
        DCASchedule storage schedule = schedules[user][scheduleId];

        require(schedule.active, "Schedule not active");
        require(
            block.timestamp >= schedule.lastExecutionTime + schedule.intervalSeconds,
            "Too soon to execute"
        );

        // Check if master agent has permission
        require(
            masterAgent.canAgentSpend(user, address(this), schedule.amountPerPurchase),
            "Insufficient delegation"
        );

        // Execute through master agent
        masterAgent.executeViaAgent(
            user,
            schedule.amountPerPurchase,
            schedule.inputToken,
            ""
        );

        // Transfer tokens from user to this contract
        IERC20(schedule.inputToken).safeTransferFrom(
            user,
            address(this),
            schedule.amountPerPurchase
        );

        // Approve Uniswap router to spend tokens
        IERC20(schedule.inputToken).approve(
            address(swapRouter),
            schedule.amountPerPurchase
        );

        // Calculate minimum amount out with slippage
        // Note: In production, you'd want to get a price quote first
        uint256 minAmountOut = 0; // Set to 0 for now, or implement price oracle

        // Execute swap on Uniswap V3
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: schedule.inputToken,
                tokenOut: schedule.outputToken,
                fee: schedule.poolFee,
                recipient: user,
                deadline: block.timestamp + 15 minutes,
                amountIn: schedule.amountPerPurchase,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });

        uint256 amountOut = swapRouter.exactInputSingle(params);

        schedule.lastExecutionTime = block.timestamp;

        emit DCAExecuted(user, scheduleId, schedule.amountPerPurchase, amountOut);
    }

    /**
     * @notice Cancel a DCA schedule
     */
    function cancelSchedule(uint256 scheduleId) external {
        require(schedules[msg.sender][scheduleId].active, "Schedule not active");
        schedules[msg.sender][scheduleId].active = false;
        emit DCAScheduleCancelled(msg.sender, scheduleId);
    }

    /**
     * @notice Get schedule details
     */
    function getSchedule(
        address user,
        uint256 scheduleId
    ) external view returns (DCASchedule memory) {
        return schedules[user][scheduleId];
    }

    /**
     * @notice Check if schedule can be executed
     */
    function canExecute(
        address user,
        uint256 scheduleId
    ) external view returns (bool) {
        DCASchedule memory schedule = schedules[user][scheduleId];

        return schedule.active &&
               block.timestamp >= schedule.lastExecutionTime + schedule.intervalSeconds;
    }

    /**
     * @notice Get user's total schedule count
     */
    function getUserScheduleCount(address user) external view returns (uint256) {
        return userScheduleCount[user];
    }
}