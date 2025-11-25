// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MasterAgent.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M tokens with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MasterAgentTest
 * @notice Comprehensive tests for MasterAgent contract
 * Tests delegation, permissions, daily limits, expiry, and pause functionality
 */
contract MasterAgentTest is Test {
    MasterAgent public masterAgent;
    MockERC20 public usdc;

    address public owner = address(1);
    address public user = address(2);
    address public dcaAgent = address(3);
    address public yieldAgent = address(4);
    address public unauthorizedAgent = address(5);

    uint256 constant DAILY_LIMIT = 1000 * 10**6; // 1000 USDC
    uint256 constant DURATION = 30 days;

    event AgentRegistered(address indexed agent, string agentType);
    event PermissionDelegated(
        address indexed user,
        address indexed agent,
        uint256 dailyLimit,
        uint256 expiry
    );
    event PermissionRevoked(address indexed user, address indexed agent);
    event AgentExecuted(
        address indexed user,
        address indexed agent,
        uint256 amount
    );
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy contracts
        masterAgent = new MasterAgent();
        usdc = new MockERC20();

        // Register agents
        masterAgent.registerAgent(dcaAgent, "DCA");
        masterAgent.registerAgent(yieldAgent, "YIELD");

        vm.stopPrank();

        // Fund user with USDC
        usdc.mint(user, 10000 * 10**6); // 10k USDC
    }

    /*//////////////////////////////////////////////////////////////
                        AGENT REGISTRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testRegisterAgent() public {
        vm.startPrank(owner);

        address newAgent = address(6);

        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(newAgent, "TEST");

        masterAgent.registerAgent(newAgent, "TEST");

        assertTrue(masterAgent.registeredAgents(newAgent));
        vm.stopPrank();
    }

    function testCannotRegisterAgentAsNonOwner() public {
        vm.startPrank(user);

        vm.expectRevert();
        masterAgent.registerAgent(address(6), "TEST");

        vm.stopPrank();
    }

    function testCannotRegisterAgentTwice() public {
        vm.startPrank(owner);

        vm.expectRevert("Agent already registered");
        masterAgent.registerAgent(dcaAgent, "DCA");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        DELEGATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testDelegateToAgent() public {
        vm.startPrank(user);

        uint256 expiry = block.timestamp + DURATION;

        vm.expectEmit(true, true, false, true);
        emit PermissionDelegated(user, dcaAgent, DAILY_LIMIT, expiry);

        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);

        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);

        assertEq(delegation.agent, dcaAgent);
        assertEq(delegation.dailyLimit, DAILY_LIMIT);
        assertEq(delegation.spentToday, 0);
        assertEq(delegation.lastResetTimestamp, block.timestamp);
        assertEq(delegation.expiry, expiry);
        assertTrue(delegation.active);

        vm.stopPrank();
    }

    function testCannotDelegateToUnregisteredAgent() public {
        vm.startPrank(user);

        vm.expectRevert("Agent not registered");
        masterAgent.delegateToAgent(unauthorizedAgent, DAILY_LIMIT, DURATION);

        vm.stopPrank();
    }

    function testCannotDelegateZeroDuration() public {
        vm.startPrank(user);

        vm.expectRevert("Duration must be positive");
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, 0);

        vm.stopPrank();
    }

    function testRevokeDelegation() public {
        vm.startPrank(user);

        // First delegate
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);

        // Then revoke
        vm.expectEmit(true, true, false, false);
        emit PermissionRevoked(user, dcaAgent);

        masterAgent.revokeAgentPermission(dcaAgent);

        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);
        assertFalse(delegation.active);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        EXECUTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testExecuteViaAgent() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // DCA agent executes transaction
        vm.startPrank(dcaAgent);

        uint256 amount = 100 * 10**6; // 100 USDC

        vm.expectEmit(true, true, false, true);
        emit AgentExecuted(user, dcaAgent, amount);

        masterAgent.executeViaAgent(user, amount, address(usdc), "");

        // Check spent amount
        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);
        assertEq(delegation.spentToday, amount);

        vm.stopPrank();
    }

    function testCannotExceedDailyLimit() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // Try to exceed daily limit
        vm.startPrank(dcaAgent);

        vm.expectRevert("Insufficient permission");
        masterAgent.executeViaAgent(user, DAILY_LIMIT + 1, address(usdc), "");

        vm.stopPrank();
    }

    function testDailyLimitResetsAfter24Hours() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // DCA agent spends entire daily limit
        vm.startPrank(dcaAgent);
        masterAgent.executeViaAgent(user, DAILY_LIMIT, address(usdc), "");
        vm.stopPrank();

        // Fast forward 24 hours
        vm.warp(block.timestamp + 1 days);

        // Should be able to spend again
        vm.startPrank(dcaAgent);
        masterAgent.executeViaAgent(user, 100 * 10**6, address(usdc), "");

        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);
        assertEq(delegation.spentToday, 100 * 10**6);

        vm.stopPrank();
    }

    function testCannotExecuteWithExpiredPermission() public {
        // User delegates to DCA agent with short duration
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, 1 days);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        // Try to execute - should fail
        vm.startPrank(dcaAgent);

        vm.expectRevert("Insufficient permission");
        masterAgent.executeViaAgent(user, 100 * 10**6, address(usdc), "");

        vm.stopPrank();
    }

    function testCannotExecuteWhenPaused() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // Owner pauses contract
        vm.prank(owner);
        masterAgent.pause();

        // Try to execute - should fail
        vm.startPrank(dcaAgent);

        vm.expectRevert();
        masterAgent.executeViaAgent(user, 100 * 10**6, address(usdc), "");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        PERMISSION CHECK TESTS
    //////////////////////////////////////////////////////////////*/

    function testCanAgentSpend() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        vm.stopPrank();

        // Check permission
        assertTrue(masterAgent.canAgentSpend(user, dcaAgent, DAILY_LIMIT));
        assertTrue(masterAgent.canAgentSpend(user, dcaAgent, DAILY_LIMIT / 2));
        assertFalse(masterAgent.canAgentSpend(user, dcaAgent, DAILY_LIMIT + 1));
    }

    function testCanAgentSpendWithExpiredPermission() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, 1 days);
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);

        // Should return false for expired permission
        assertFalse(masterAgent.canAgentSpend(user, dcaAgent, 100 * 10**6));
    }

    function testCanAgentSpendAfterPartialSpending() public {
        // User delegates to DCA agent
        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        usdc.approve(address(masterAgent), type(uint256).max);
        vm.stopPrank();

        // Spend half the limit
        vm.prank(dcaAgent);
        masterAgent.executeViaAgent(user, DAILY_LIMIT / 2, address(usdc), "");

        // Check remaining permission
        assertTrue(masterAgent.canAgentSpend(user, dcaAgent, DAILY_LIMIT / 2));
        assertFalse(masterAgent.canAgentSpend(user, dcaAgent, DAILY_LIMIT / 2 + 1));
    }

    /*//////////////////////////////////////////////////////////////
                        PAUSE FUNCTIONALITY TESTS
    //////////////////////////////////////////////////////////////*/

    function testPause() public {
        vm.startPrank(owner);

        vm.expectEmit(true, false, false, false);
        emit EmergencyPaused(owner);

        masterAgent.pause();
        assertTrue(masterAgent.paused());

        vm.stopPrank();
    }

    function testUnpause() public {
        vm.startPrank(owner);

        masterAgent.pause();

        vm.expectEmit(true, false, false, false);
        emit EmergencyUnpaused(owner);

        masterAgent.unpause();
        assertFalse(masterAgent.paused());

        vm.stopPrank();
    }

    function testCannotPauseAsNonOwner() public {
        vm.startPrank(user);

        vm.expectRevert();
        masterAgent.pause();

        vm.stopPrank();
    }

    function testCannotDelegateWhenPaused() public {
        vm.prank(owner);
        masterAgent.pause();

        vm.startPrank(user);

        vm.expectRevert();
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function testMultipleAgentDelegations() public {
        vm.startPrank(user);

        // Delegate to both agents
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);
        masterAgent.delegateToAgent(yieldAgent, DAILY_LIMIT * 2, DURATION);

        // Verify both delegations
        MasterAgent.DelegatedPermission memory dcaDelegation = masterAgent.getDelegation(user, dcaAgent);
        MasterAgent.DelegatedPermission memory yieldDelegation = masterAgent.getDelegation(user, yieldAgent);

        assertEq(dcaDelegation.dailyLimit, DAILY_LIMIT);
        assertEq(yieldDelegation.dailyLimit, DAILY_LIMIT * 2);
        assertTrue(dcaDelegation.active);
        assertTrue(yieldDelegation.active);

        vm.stopPrank();
    }

    function testUpdateExistingDelegation() public {
        vm.startPrank(user);

        // Initial delegation
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, DURATION);

        // Update with new limit
        uint256 newLimit = DAILY_LIMIT * 2;
        masterAgent.delegateToAgent(dcaAgent, newLimit, DURATION);

        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);
        assertEq(delegation.dailyLimit, newLimit);

        vm.stopPrank();
    }

    function testFuzzDailyLimit(uint256 limit) public {
        vm.assume(limit > 0 && limit < type(uint128).max);

        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, limit, DURATION);

        assertTrue(masterAgent.canAgentSpend(user, dcaAgent, limit));
        assertFalse(masterAgent.canAgentSpend(user, dcaAgent, limit + 1));

        vm.stopPrank();
    }

    function testFuzzDuration(uint256 duration) public {
        vm.assume(duration > 0 && duration < 365 days);

        vm.startPrank(user);
        masterAgent.delegateToAgent(dcaAgent, DAILY_LIMIT, duration);

        uint256 expectedExpiry = block.timestamp + duration;
        MasterAgent.DelegatedPermission memory delegation = masterAgent.getDelegation(user, dcaAgent);

        assertEq(delegation.expiry, expectedExpiry);

        vm.stopPrank();
    }
}
