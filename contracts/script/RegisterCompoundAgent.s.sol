// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";

/**
 * @title RegisterCompoundAgent
 * @notice Script to register the Compound V3 Yield Agent in MasterAgent
 *
 * Usage:
 *   forge script script/RegisterCompoundAgent.s.sol:RegisterCompoundAgent --rpc-url sepolia --broadcast --verify
 */
contract RegisterCompoundAgent is Script {
    // Contract addresses on Sepolia
    address constant MASTER_AGENT = 0x1fd734c9c78e9c34238c2b5f4E936368727326f6;
    address constant YIELD_AGENT_COMPOUND = 0x7cbD25A489917C3fAc92EFF1e37C3AE2afccbcf2;

    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MasterAgent masterAgent = MasterAgent(MASTER_AGENT);

        // Check if already registered
        bool isRegistered = masterAgent.registeredAgents(YIELD_AGENT_COMPOUND);

        if (isRegistered) {
            console.log("Agent is already registered!");
            console.log("Compound V3 Yield Agent:", YIELD_AGENT_COMPOUND);
        } else {
            console.log("Registering Compound V3 Yield Agent...");
            console.log("Agent address:", YIELD_AGENT_COMPOUND);
            console.log("MasterAgent:", MASTER_AGENT);

            // Register the agent
            masterAgent.registerAgent(YIELD_AGENT_COMPOUND, "YieldAgentCompound");

            console.log("Successfully registered Compound V3 Yield Agent!");
        }

        vm.stopBroadcast();
    }
}
