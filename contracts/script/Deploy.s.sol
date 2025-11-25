// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MasterAgent.sol";
import "../src/DCAAgent.sol";
import "../src/YieldAgent.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Sepolia testnet with real protocol addresses
 */
contract DeployScript is Script {
    // Sepolia testnet addresses
    address constant UNISWAP_V3_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; // Uniswap V3 SwapRouter on Sepolia
    address constant AAVE_V3_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951; // Aave V3 Pool on Sepolia
    address constant AAVE_V3_REWARDS = 0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb; // Aave V3 Rewards Controller on Sepolia

    // Common test tokens on Sepolia
    address constant USDC_SEPOLIA = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // USDC on Sepolia (Aave faucet)
    address constant WETH_SEPOLIA = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c; // WETH on Sepolia
    address constant DAI_SEPOLIA = 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357; // DAI on Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying to Sepolia testnet...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));

        // Deploy MasterAgent
        MasterAgent masterAgent = new MasterAgent();
        console.log("MasterAgent deployed at:", address(masterAgent));

        // Deploy DCAAgent with real Uniswap V3 Router
        DCAAgent dcaAgent = new DCAAgent(
            address(masterAgent),
            UNISWAP_V3_ROUTER
        );
        console.log("DCAAgent deployed at:", address(dcaAgent));

        // Deploy YieldAgent with real Aave V3 addresses
        YieldAgent yieldAgent = new YieldAgent(
            address(masterAgent),
            AAVE_V3_POOL,
            AAVE_V3_REWARDS
        );
        console.log("YieldAgent deployed at:", address(yieldAgent));

        // Register agents with MasterAgent
        masterAgent.registerAgent(address(dcaAgent), "DCA");
        console.log("DCAAgent registered");

        masterAgent.registerAgent(address(yieldAgent), "YIELD");
        console.log("YieldAgent registered");

        vm.stopBroadcast();

        // Output all addresses for frontend
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Sepolia");
        console.log("\n=== Contract Addresses ===");
        console.log("MasterAgent:", address(masterAgent));
        console.log("DCAAgent:", address(dcaAgent));
        console.log("YieldAgent:", address(yieldAgent));

        console.log("\n=== Protocol Addresses ===");
        console.log("Uniswap V3 Router:", UNISWAP_V3_ROUTER);
        console.log("Aave V3 Pool:", AAVE_V3_POOL);
        console.log("Aave V3 Rewards:", AAVE_V3_REWARDS);

        console.log("\n=== Token Addresses (Sepolia) ===");
        console.log("USDC:", USDC_SEPOLIA);
        console.log("WETH:", WETH_SEPOLIA);
        console.log("DAI:", DAI_SEPOLIA);

        console.log("\n=== Copy these to frontend/.env.local ===");
        console.log("NEXT_PUBLIC_MASTER_AGENT=", address(masterAgent));
        console.log("NEXT_PUBLIC_DCA_AGENT=", address(dcaAgent));
        console.log("NEXT_PUBLIC_YIELD_AGENT=", address(yieldAgent));
        console.log("NEXT_PUBLIC_USDC_ADDRESS=", USDC_SEPOLIA);
        console.log("NEXT_PUBLIC_WETH_ADDRESS=", WETH_SEPOLIA);
        console.log("NEXT_PUBLIC_DAI_ADDRESS=", DAI_SEPOLIA);
        console.log("NEXT_PUBLIC_UNISWAP_ROUTER=", UNISWAP_V3_ROUTER);
        console.log("NEXT_PUBLIC_AAVE_POOL=", AAVE_V3_POOL);

        console.log("\n=== Important Notes ===");
        console.log("1. Get testnet tokens from Aave Sepolia faucet: https://staging.aave.com/faucet/");
        console.log("2. Approve tokens before using agents");
        console.log("3. MetaMask ERC-7715 testing requires special build or snap");
    }
}
