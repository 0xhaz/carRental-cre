// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TrustedIssuersRegistry} from "../src/erc3643/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/erc3643/ClaimTopicsRegistry.sol";
import {InvestorTypeRegistry} from "../src/erc3643/InvestorTypeRegistry.sol";
import {ParticipantTypeRegistry} from "../src/erc3643/ParticipantTypeRegistry.sol";

/**
 * @title DeployRegistries
 * @notice Deploy registry contracts for ERC-3643 ecosystem
 * @dev These registries manage trusted issuers, claim topics, and participant types
 */
contract DeployRegistries is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get ClaimIssuer address from previous deployment
        // You'll need to set this manually or read from a deployment file
        address claimIssuerAddress = vm.envOr("CLAIM_ISSUER", address(0));

        console.log("=== Deploying ERC-3643 Registries ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy TrustedIssuersRegistry
        console.log("\n1. Deploying TrustedIssuersRegistry...");
        TrustedIssuersRegistry trustedIssuersRegistry = new TrustedIssuersRegistry();
        console.log("TrustedIssuersRegistry deployed at:", address(trustedIssuersRegistry));

        // Add ClaimIssuer as trusted issuer if available
        if (claimIssuerAddress != address(0)) {
            console.log("Adding ClaimIssuer as trusted issuer...");
            uint256[] memory claimTopics = new uint256[](8);
            claimTopics[0] = 1; // KYC
            claimTopics[1] = 2; // Accredited Investor
            claimTopics[2] = 3; // Regional Eligibility
            claimTopics[3] = 4; // Driver License
            claimTopics[4] = 5; // Insurance
            claimTopics[5] = 6; // Credit Score
            claimTopics[6] = 7; // Business Registration
            claimTopics[7] = 8; // Vehicle Ownership

            trustedIssuersRegistry.addTrustedIssuer(claimIssuerAddress, claimTopics);
            console.log("ClaimIssuer added with all claim topics");
        }

        // 2. Deploy ClaimTopicsRegistry
        console.log("\n2. Deploying ClaimTopicsRegistry...");
        ClaimTopicsRegistry claimTopicsRegistry = new ClaimTopicsRegistry();
        console.log("ClaimTopicsRegistry deployed at:", address(claimTopicsRegistry));

        // Register standard claim topics
        console.log("Registering standard claim topics...");
        claimTopicsRegistry.addClaimTopic(1);  // KYC Verified
        claimTopicsRegistry.addClaimTopic(2);  // Accredited Investor
        claimTopicsRegistry.addClaimTopic(3);  // Regional Eligibility
        claimTopicsRegistry.addClaimTopic(4);  // Driver License Valid
        claimTopicsRegistry.addClaimTopic(5);  // Insurance Verified
        claimTopicsRegistry.addClaimTopic(6);  // Credit Score Range
        claimTopicsRegistry.addClaimTopic(7);  // Business Registered
        claimTopicsRegistry.addClaimTopic(8);  // Vehicle Ownership Proof
        console.log("Claim topics registered");

        // 3. Deploy InvestorTypeRegistry
        console.log("\n3. Deploying InvestorTypeRegistry...");
        InvestorTypeRegistry investorTypeRegistry = new InvestorTypeRegistry();
        console.log("InvestorTypeRegistry deployed at:", address(investorTypeRegistry));

        // 4. Deploy ParticipantTypeRegistry
        console.log("\n4. Deploying ParticipantTypeRegistry...");
        ParticipantTypeRegistry participantTypeRegistry = new ParticipantTypeRegistry();
        console.log("ParticipantTypeRegistry deployed at:", address(participantTypeRegistry));

        vm.stopBroadcast();

        console.log("\n=== Registries Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("TRUSTED_ISSUERS_REGISTRY=", address(trustedIssuersRegistry));
        console.log("CLAIM_TOPICS_REGISTRY=", address(claimTopicsRegistry));
        console.log("INVESTOR_TYPE_REGISTRY=", address(investorTypeRegistry));
        console.log("PARTICIPANT_TYPE_REGISTRY=", address(participantTypeRegistry));
    }
}
