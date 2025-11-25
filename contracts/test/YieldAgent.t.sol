// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MasterAgent.sol";
import "../src/YieldAgent.sol";
import "../src/MockUSDC.sol";
import "../src/MockAavePool.sol";

contract YieldAgentTest is Test {
    MasterAgent public masterAgent;
    YieldAgent public yieldAgent;
    MockUSDC public usdc;
    MockAavePool public aavePool;

    address public user = address(0x1);

    function setUp() public {
        masterAgent = new MasterAgent();
        usdc = new MockUSDC();
        aavePool = new MockAavePool();
        yieldAgent = new YieldAgent(
            address(masterAgent),
            address(aavePool),
            address(0)
        );

        // Register yield agent
        masterAgent.registerAgent(address(yieldAgent), "YIELD");

        // Give user some USDC
        usdc.mint(user, 10000 * 10**6);
    }

    function testCreateYieldStrategy() public {
        vm.prank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            1000 * 10**6 // 1000 USDC
        );

        assertEq(strategyId, 0);

        (
            address strategyUser,
            address token,
            ,
            ,
            uint256 targetAllocation,
            ,
            ,
            ,
            bool active
        ) = yieldAgent.strategies(user, 0);

        assertEq(strategyUser, user);
        assertEq(token, address(usdc));
        assertEq(targetAllocation, 1000 * 10**6);
        assertTrue(active);
    }

    function testDelegateAndDeposit() public {
        // Create strategy
        vm.prank(user);
        yieldAgent.createYieldStrategy(
            address(usdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            1000 * 10**6
        );

        // Delegate permission
        vm.prank(user);
        masterAgent.delegateToAgent(address(yieldAgent), 1000 * 10**6);

        // Check if can deposit
        bool canDep = yieldAgent.canDeposit(user, 0);
        assertTrue(canDep);
    }

    function testGetStrategyAPY() public {
        vm.prank(user);
        yieldAgent.createYieldStrategy(
            address(usdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            1000 * 10**6
        );

        uint256 apy = yieldAgent.getStrategyAPY(user, 0);
        assertEq(apy, 450); // 4.50%
    }
}