// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";

contract RegisterAgentsScript is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address masterAgentAddress = vm.envAddress("MASTER_AGENT_ADDRESS");
        address dcaAgentAddress = vm.envAddress("DCA_AGENT_ADDRESS");
        address yieldAgentAddress = vm.envAddress("YIELD_AGENT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        MasterAgent masterAgent = MasterAgent(masterAgentAddress);

        // Check if agents are already registered
        bool dcaRegistered = masterAgent.registeredAgents(dcaAgentAddress);
        bool yieldRegistered = masterAgent.registeredAgents(yieldAgentAddress);

        console.log("DCA Agent registered:", dcaRegistered);
        console.log("Yield Agent registered:", yieldRegistered);

        // Register DCA Agent if not registered
        if (!dcaRegistered) {
            console.log("Registering DCA Agent...");
            masterAgent.registerAgent(dcaAgentAddress, "DCA");
            console.log("DCA Agent registered successfully!");
        } else {
            console.log("DCA Agent already registered");
        }

        // Register Yield Agent if not registered
        if (!yieldRegistered) {
            console.log("Registering Yield Agent...");
            masterAgent.registerAgent(yieldAgentAddress, "Yield");
            console.log("Yield Agent registered successfully!");
        } else {
            console.log("Yield Agent already registered");
        }

        vm.stopBroadcast();

        console.log("Agent registration complete!");
    }
}
