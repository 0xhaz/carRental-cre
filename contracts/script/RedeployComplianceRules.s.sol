// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceRules} from "../src/compliance/ComplianceRules.sol";

interface ISetCompliance {
    function setCompliance(address compliance_) external;
}

/**
 * @title RedeployComplianceRules
 * @notice Redeploy ComplianceRules with ICompliance interface support
 * @dev Run: source .env && forge script script/RedeployComplianceRules.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 *
 * After deployment, update already-deployed tokens + factories via cast send:
 *   cast send <ASSET_TOKEN> "setCompliance(address)" <NEW_COMPLIANCE> --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
 *   cast send <REVENUE_TOKEN> "setCompliance(address)" <NEW_COMPLIANCE> --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
 */
contract RedeployComplianceRules is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        console.log("=== Redeploying ComplianceRules ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy fresh ComplianceRules (same constructor args as original)
        console.log("\n1. Deploying ComplianceRules...");

        uint256[] memory allowedCountries = new uint256[](5);
        allowedCountries[0] = 1;   // US
        allowedCountries[1] = 44;  // UK
        allowedCountries[2] = 49;  // Germany
        allowedCountries[3] = 33;  // France
        allowedCountries[4] = 39;  // Italy

        uint256[] memory blockedCountries = new uint256[](0);

        ComplianceRules complianceRules = new ComplianceRules(
            owner,
            allowedCountries,
            blockedCountries
        );
        address newAddr = address(complianceRules);
        console.log("ComplianceRules deployed at:", newAddr);

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("NEW COMPLIANCE_RULES=", newAddr);
        console.log("\nUpdate .env with the new COMPLIANCE_RULES address.");
        console.log("\nThen update already-deployed tokens:");
        console.log("  cast send <ASSET_TOKEN> 'setCompliance(address)' <NEW_ADDR> --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY");
        console.log("  cast send <REVENUE_TOKEN> 'setCompliance(address)' <NEW_ADDR> --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY");
    }
}
