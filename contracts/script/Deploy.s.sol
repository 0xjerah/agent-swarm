// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";
import "../src/DCAAgent.sol";
import "../src/MockUSDC.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock USDC (for testing)
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy MasterAgent
        MasterAgent masterAgent = new MasterAgent();
        console.log("MasterAgent deployed at:", address(masterAgent));

        // Deploy DCAAgent
        address mockDex = address(0); // Placeholder for demo
        DCAAgent dcaAgent = new DCAAgent(address(masterAgent), mockDex);
        console.log("DCAAgent deployed at:", address(dcaAgent));

        // Register DCAAgent with MasterAgent
        masterAgent.registerAgent(address(dcaAgent), "DCA");
        console.log("DCAAgent registered");

        vm.stopBroadcast();

        // Output addresses for frontend
        console.log("\n=== Copy these addresses to your .env ===");
        console.log("NEXT_PUBLIC_MASTER_AGENT=", address(masterAgent));
        console.log("NEXT_PUBLIC_DCA_AGENT=", address(dcaAgent));
        console.log("NEXT_PUBLIC_MOCK_USDC=", address(usdc));
    }
}