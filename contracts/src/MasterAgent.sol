// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MasterAgent
 * @notice Central orchestration contract that receives permissions from users
 * and delegates sub-permissions to specialized agents
 */
contract MasterAgent is Ownable, Pausable {
    // Struct to track delegated permissions
    struct DelegatedPermission {
        address agent;
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastResetTimestamp;
        uint256 expiry;
        bool active;
    }

    // User -> Agent -> Permission
    mapping(address => mapping(address => DelegatedPermission)) public delegations;

    // Track registered sub-agents
    mapping(address => bool) public registeredAgents;
    address[] public agentList;

    // Events
    event PermissionDelegated(
        address indexed user,
        address indexed agent,
        uint256 dailyLimit,
        uint256 expiry
    );
    event PermissionRevoked(address indexed user, address indexed agent);
    event AgentRegistered(address indexed agent, string agentType);
    event AgentExecuted(
        address indexed user,
        address indexed agent,
        uint256 amount
    );
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new sub-agent
     */
    function registerAgent(address agent, string memory agentType) external onlyOwner {
        require(!registeredAgents[agent], "Agent already registered");
        registeredAgents[agent] = true;
        agentList.push(agent);
        emit AgentRegistered(agent, agentType);
    }

    /**
     * @notice Delegate permission to a sub-agent
     * @param agent Address of the sub-agent
     * @param dailyLimit Daily spending limit in wei
     * @param duration Duration in seconds for which permission is valid
     */
    function delegateToAgent(
        address agent,
        uint256 dailyLimit,
        uint256 duration
    ) external whenNotPaused {
        require(registeredAgents[agent], "Agent not registered");
        require(duration > 0, "Duration must be positive");

        uint256 expiry = block.timestamp + duration;

        delegations[msg.sender][agent] = DelegatedPermission({
            agent: agent,
            dailyLimit: dailyLimit,
            spentToday: 0,
            lastResetTimestamp: block.timestamp,
            expiry: expiry,
            active: true
        });

        emit PermissionDelegated(msg.sender, agent, dailyLimit, expiry);
    }

    /**
     * @notice Revoke permission from a sub-agent
     */
    function revokeAgentPermission(address agent) external {
        delegations[msg.sender][agent].active = false;
        emit PermissionRevoked(msg.sender, agent);
    }

    /**
     * @notice Check if agent can spend on behalf of user (view function)
     */
    function canAgentSpend(
        address user,
        address agent,
        uint256 amount
    ) public view returns (bool) {
        DelegatedPermission storage permission = delegations[user][agent];

        if (!permission.active) return false;

        // Check if permission has expired
        if (block.timestamp > permission.expiry) return false;

        // Calculate current spent amount considering daily reset
        uint256 currentSpent = permission.spentToday;
        if (block.timestamp >= permission.lastResetTimestamp + 1 days) {
            currentSpent = 0;
        }

        return (currentSpent + amount <= permission.dailyLimit);
    }

    /**
     * @notice Internal function to reset daily limit if needed
     */
    function _resetDailyLimitIfNeeded(address user, address agent) internal {
        DelegatedPermission storage permission = delegations[user][agent];

        if (block.timestamp >= permission.lastResetTimestamp + 1 days) {
            permission.spentToday = 0;
            permission.lastResetTimestamp = block.timestamp;
        }
    }

    /**
     * @notice Execute an action through an agent with ERC-7715 token transfer
     * @dev Called by sub-agents to execute on behalf of users
     * @dev Uses ERC-7715 permission context to transfer tokens without requiring approval
     * @param user User on whose behalf the transfer is being made
     * @param amount Amount of tokens to transfer
     * @param token Token address to transfer
     * @param recipient Address to receive the tokens (typically the calling agent)
     * @return bool Success status
     */
    function executeViaAgent(
        address user,
        uint256 amount,
        address token,
        address recipient
    ) external whenNotPaused returns (bool) {
        require(registeredAgents[msg.sender], "Caller not registered agent");
        require(canAgentSpend(user, msg.sender, amount), "Insufficient permission");

        // Reset daily limit if needed before updating
        _resetDailyLimitIfNeeded(user, msg.sender);

        // Update spent amount
        DelegatedPermission storage permission = delegations[user][msg.sender];
        permission.spentToday += amount;

        // Transfer tokens from user to recipient using ERC-7715 permission
        // The ERC-7715 permission grants this contract the ability to transfer
        // tokens on behalf of the user without requiring traditional ERC20 approval
        if (amount > 0 && token != address(0)) {
            IERC20(token).transferFrom(user, recipient, amount);
        }

        emit AgentExecuted(user, msg.sender, amount);

        return true;
    }

    /**
     * @notice Emergency pause - stops all agent executions
     */
    function pause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpause after emergency
     */
    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Check if a delegation has expired
     */
    function isDelegationExpired(
        address user,
        address agent
    ) external view returns (bool) {
        return block.timestamp > delegations[user][agent].expiry;
    }

    /**
     * @notice Get delegation info for a user and agent
     */
    function getDelegation(
        address user,
        address agent
    ) external view returns (DelegatedPermission memory) {
        return delegations[user][agent];
    }

    /**
     * @notice Get all registered agents
     */
    function getRegisteredAgents() external view returns (address[] memory) {
        return agentList;
    }
}