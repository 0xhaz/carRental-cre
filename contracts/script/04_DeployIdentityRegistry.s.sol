// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/erc3643/IdentityRegistry.sol";

/**
 * @title DeployIdentityRegistry
 * @notice Deploy IdentityRegistry contract and configure it with compliance modules
 * @dev This contract links OnchainIDs to wallet addresses with compliance checks
 */
contract DeployIdentityRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get addresses from previous deployments
        address investorTypeRegistry = vm.envOr("INVESTOR_TYPE_REGISTRY", address(0));
        address participantTypeRegistry = vm.envOr("PARTICIPANT_TYPE_REGISTRY", address(0));
        address renterCompliance = vm.envOr("RENTER_COMPLIANCE", address(0));
        address complianceRules = vm.envOr("COMPLIANCE_RULES", address(0));

        console.log("=== Deploying IdentityRegistry ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy IdentityRegistry
        console.log("\nDeploying IdentityRegistry...");
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));

        // Configure IdentityRegistry with compliance modules
        if (investorTypeRegistry != address(0)) {
            console.log("Setting InvestorTypeRegistry...");
            identityRegistry.setInvestorTypeRegistry(investorTypeRegistry);
        }

        if (participantTypeRegistry != address(0)) {
            console.log("Setting ParticipantTypeRegistry...");
            identityRegistry.setParticipantTypeRegistry(participantTypeRegistry);
        }

        if (renterCompliance != address(0)) {
            console.log("Setting RenterCompliance...");
            identityRegistry.setRenterCompliance(renterCompliance);
        }

        if (complianceRules != address(0)) {
            console.log("Skipping ComplianceRules configuration (requires token address)...");
            // Note: setComplianceRules(address complianceRules, address token) requires a token
            // This should be configured after token deployment
            // identityRegistry.setComplianceRules(complianceRules, tokenAddress);
        }

        // Add deployer as agent (can register identities)
        console.log("\nAdding deployer as agent...");
        identityRegistry.addAgent(vm.addr(deployerPrivateKey));

        // Add owner as agent if different
        if (owner != vm.addr(deployerPrivateKey)) {
            console.log("Adding owner as agent...");
            identityRegistry.addAgent(owner);
        }

        vm.stopBroadcast();

        console.log("\n=== IdentityRegistry Deployment Complete ===");
        console.log("\nSave this address:");
        console.log("IDENTITY_REGISTRY=", address(identityRegistry));
    }
}
