// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AssetTokenFactory, RevenueTokenFactory} from "../src/erc3643/TokenFactory.sol";

/**
 * @title DeployTokenFactories
 * @notice Deploys AssetTokenFactory + RevenueTokenFactory for per-vehicle token deployment
 * @dev Run: forge script script/09_DeployTokenFactory.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 */
contract DeployTokenFactories is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");
        address complianceRules = vm.envAddress("COMPLIANCE_RULES");
        address paymentProtocol = vm.envAddress("INVESTMENT_PAYMENT_PROTOCOL");

        console.log("=== Deploying Token Factories ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("IdentityRegistry:", identityRegistry);
        console.log("ComplianceRules:", complianceRules);
        console.log("PaymentProtocol:", paymentProtocol);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AssetTokenFactory
        console.log("\n1. Deploying AssetTokenFactory...");
        AssetTokenFactory assetFactory = new AssetTokenFactory(
            identityRegistry,
            complianceRules,
            paymentProtocol
        );
        console.log("AssetTokenFactory:", address(assetFactory));

        // 2. Deploy RevenueTokenFactory
        console.log("2. Deploying RevenueTokenFactory...");
        RevenueTokenFactory revenueFactory = new RevenueTokenFactory(
            identityRegistry,
            complianceRules,
            paymentProtocol
        );
        console.log("RevenueTokenFactory:", address(revenueFactory));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Update .env with:");
        console.log("ASSET_TOKEN_FACTORY=", address(assetFactory));
        console.log("REVENUE_TOKEN_FACTORY=", address(revenueFactory));
    }
}
