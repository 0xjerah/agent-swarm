// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/YieldAgentCompound.sol";
import "../src/MasterAgent.sol";

contract DeployYieldAgentCompound is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address masterAgent = vm.envAddress("MASTER_AGENT");

        // Compound V3 Sepolia addresses
        address comet = 0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e; // cUSDCv3 on Sepolia

        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldAgentCompound
        YieldAgentCompound yieldAgent = new YieldAgentCompound(
            masterAgent,
            comet
        );

        console.log("YieldAgentCompound deployed to:", address(yieldAgent));
        console.log("Comet (cUSDCv3):", comet);
        console.log("MasterAgent:", masterAgent);

        vm.stopBroadcast();
    }
}
