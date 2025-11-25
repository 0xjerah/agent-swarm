// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";
import "../src/DCAAgent.sol";
import "../src/YieldAgent.sol";
import "../src/MockUSDC.sol";
import "../src/MockAavePool.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock USDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy Mock Aave Pool
        MockAavePool aavePool = new MockAavePool();
        console.log("MockAavePool deployed at:", address(aavePool));

        // Deploy MasterAgent
        MasterAgent masterAgent = new MasterAgent();
        console.log("MasterAgent deployed at:", address(masterAgent));

        // Deploy DCAAgent
        address mockDex = address(0);
        DCAAgent dcaAgent = new DCAAgent(address(masterAgent), mockDex);
        console.log("DCAAgent deployed at:", address(dcaAgent));

        // Deploy YieldAgent
        YieldAgent yieldAgent = new YieldAgent(
            address(masterAgent),
            address(aavePool),
            address(0) // Mock Compound pool (not implemented)
        );
        console.log("YieldAgent deployed at:", address(yieldAgent));

        // Register agents with MasterAgent
        masterAgent.registerAgent(address(dcaAgent), "DCA");
        console.log("DCAAgent registered");

        masterAgent.registerAgent(address(yieldAgent), "YIELD");
        console.log("YieldAgent registered");

        vm.stopBroadcast();

        // Output addresses for frontend
        console.log("\n=== Copy these to frontend/.env.local ===");
        console.log("NEXT_PUBLIC_MASTER_AGENT=", address(masterAgent));
        console.log("NEXT_PUBLIC_DCA_AGENT=", address(dcaAgent));
        console.log("NEXT_PUBLIC_YIELD_AGENT=", address(yieldAgent));
        console.log("NEXT_PUBLIC_MOCK_USDC=", address(usdc));
        console.log("NEXT_PUBLIC_MOCK_AAVE=", address(aavePool));
    }
}