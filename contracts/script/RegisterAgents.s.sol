// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";

contract RegisterAgents is Script {
    function run() external {
        // Load addresses from environment
        address masterAgentAddress = vm.envAddress("MASTER_AGENT");
        address dcaAgentAddress = vm.envAddress("DCA_AGENT");
        address yieldAgentAddress = vm.envAddress("YIELD_AGENT");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MasterAgent masterAgent = MasterAgent(masterAgentAddress);

        // Register DCA Agent
        console.log("Registering DCA Agent...");
        masterAgent.registerAgent(dcaAgentAddress, "DCA");
        console.log("DCA Agent registered:", dcaAgentAddress);

        // Register Yield Agent
        console.log("Registering Yield Agent...");
        masterAgent.registerAgent(yieldAgentAddress, "YIELD");
        console.log("Yield Agent registered:", yieldAgentAddress);

        vm.stopBroadcast();

        console.log("\n=== Registration Complete ===");
        console.log("MasterAgent:", masterAgentAddress);
        console.log("DCA Agent:", dcaAgentAddress);
        console.log("Yield Agent:", yieldAgentAddress);
    }
}
