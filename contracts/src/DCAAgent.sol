// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MasterAgent.sol";

/**
 * @title DCAAgent
 * @notice Automated Dollar Cost Averaging agent
 * Executes recurring buys of a target token using delegated permissions
 */
contract DCAAgent {
    MasterAgent public masterAgent;

    struct DCASchedule {
        address user;
        address inputToken;   // Token to spend (e.g., USDC)
        address outputToken;  // Token to buy (e.g., ETH)
        uint256 amountPerPurchase;
        uint256 intervalSeconds;
        uint256 lastExecutionTime;
        bool active;
    }

    // User -> Schedule ID -> Schedule
    mapping(address => mapping(uint256 => DCASchedule)) public schedules;
    mapping(address => uint256) public userScheduleCount;

    // Mock DEX for demo purposes (in production, integrate with Uniswap/etc)
    address public mockDex;

    event DCAScheduleCreated(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountPerPurchase,
        uint256 intervalSeconds
    );
    event DCAExecuted(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountSpent,
        uint256 amountReceived
    );

    constructor(address _masterAgent, address _mockDex) {
        masterAgent = MasterAgent(_masterAgent);
        mockDex = _mockDex;
    }

    /**
     * @notice Create a new DCA schedule
     */
    function createDCASchedule(
        address inputToken,
        address outputToken,
        uint256 amountPerPurchase,
        uint256 intervalSeconds
    ) external returns (uint256) {
        uint256 scheduleId = userScheduleCount[msg.sender];
        
        schedules[msg.sender][scheduleId] = DCASchedule({
            user: msg.sender,
            inputToken: inputToken,
            outputToken: outputToken,
            amountPerPurchase: amountPerPurchase,
            intervalSeconds: intervalSeconds,
            lastExecutionTime: block.timestamp,
            active: true
        });

        userScheduleCount[msg.sender]++;

        emit DCAScheduleCreated(
            msg.sender,
            scheduleId,
            amountPerPurchase,
            intervalSeconds
        );

        return scheduleId;
    }

    /**
     * @notice Execute a DCA purchase (can be called by anyone/automation)
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

        // Perform the swap (simplified for demo)
        // In production: integrate with Uniswap Router
        uint256 amountReceived = _mockSwap(
            schedule.inputToken,
            schedule.outputToken,
            schedule.amountPerPurchase,
            user
        );

        schedule.lastExecutionTime = block.timestamp;

        emit DCAExecuted(user, scheduleId, schedule.amountPerPurchase, amountReceived);
    }

    /**
     * @notice Cancel a DCA schedule
     */
    function cancelSchedule(uint256 scheduleId) external {
        schedules[msg.sender][scheduleId].active = false;
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
     * @notice Mock swap function for demo
     * In production, replace with actual DEX integration
     */
    function _mockSwap(
        address inputToken,
        address outputToken,
        uint256 amountIn,
        address recipient
    ) internal returns (uint256) {
        // Simplified mock - just emit event
        // In production: call Uniswap Router
        return amountIn * 95 / 100; // Mock 5% slippage
    }

    /**
     * @notice Check if schedule can be executed
     */
    function canExecute(
        address user,
        uint256 scheduleId
    ) external view returns (bool) {
        DCASchedule storage schedule = schedules[user][scheduleId];
        
        return schedule.active && 
               block.timestamp >= schedule.lastExecutionTime + schedule.intervalSeconds;
    }
}