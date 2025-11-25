// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MasterAgent.sol";
import "../src/DCAAgent.sol";
import "../src/MockUSDC.sol";

contract MasterAgentTest is Test {
    MasterAgent public masterAgent;
    DCAAgent public dcaAgent;
    MockUSDC public usdc;

    address public user = address(0x1);
    address public mockDex = address(0x2);

    function setUp() public {
        masterAgent = new MasterAgent();
        usdc = new MockUSDC();
        dcaAgent = new DCAAgent(address(masterAgent), mockDex);
        
        // Register DCA agent
        masterAgent.registerAgent(address(dcaAgent), "DCA");
        
        // Give user some USDC
        usdc.mint(user, 1000 * 10**6); // 1000 USDC
    }

    function testDelegatePermission() public {
        vm.prank(user);
        masterAgent.delegateToAgent(address(dcaAgent), 100 * 10**6); // 100 USDC/day
        
        (
            address agent,
            uint256 dailyLimit,
            uint256 spentToday,
            ,
            bool active
        ) = masterAgent.getDelegation(user, address(dcaAgent));
        
        assertEq(agent, address(dcaAgent));
        assertEq(dailyLimit, 100 * 10**6);
        assertEq(spentToday, 0);
        assertTrue(active);
    }

    function testCanAgentSpend() public {
        vm.prank(user);
        masterAgent.delegateToAgent(address(dcaAgent), 100 * 10**6);
        
        bool canSpend = masterAgent.canAgentSpend(user, address(dcaAgent), 50 * 10**6);
        assertTrue(canSpend);
        
        bool cannotSpend = masterAgent.canAgentSpend(user, address(dcaAgent), 150 * 10**6);
        assertFalse(cannotSpend);
    }
}