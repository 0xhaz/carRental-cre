// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceRules} from "../src/compliance/ComplianceRules.sol";
import {InvestorTypeCompliance} from "../src/compliance/InvestorTypeCompliance.sol";
import {RenterCompliance} from "../src/compliance/RenterCompliance.sol";
import {OperationalCompliance} from "../src/compliance/OperationalCompliance.sol";
import {TransferRestrictions} from "../src/compliance/TransferRestrictions.sol";
import {ComplianceRegistry} from "../src/erc3643/ComplianceRegistry.sol";

/**
 * @title DeployCompliance
 * @notice Deploy compliance module contracts
 * @dev These contracts enforce regulatory and operational compliance rules
 */
contract DeployCompliance is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // NOTE: This script requires addresses from previous deployments
        address investorTypeRegistry = vm.envAddress("INVESTOR_TYPE_REGISTRY"); // From script 02
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");           // From script 04 (deploy that first!)

        console.log("=== Deploying Compliance Modules ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);
        console.log("InvestorTypeRegistry:", investorTypeRegistry);
        console.log("IdentityRegistry:", identityRegistry);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceRules (base module)
        console.log("\n1. Deploying ComplianceRules...");

        // Setup default allowed countries (US, UK, EU major countries)
        uint256[] memory allowedCountries = new uint256[](5);
        allowedCountries[0] = 1;   // US
        allowedCountries[1] = 44;  // UK
        allowedCountries[2] = 49;  // Germany
        allowedCountries[3] = 33;  // France
        allowedCountries[4] = 39;  // Italy

        // Setup default blocked countries (sanctioned countries)
        uint256[] memory blockedCountries = new uint256[](0);  // Empty initially

        ComplianceRules complianceRules = new ComplianceRules(
            owner,
            allowedCountries,
            blockedCountries
        );
        console.log("ComplianceRules deployed at:", address(complianceRules));

        // 2. Deploy InvestorTypeCompliance
        console.log("\n2. Deploying InvestorTypeCompliance...");
        InvestorTypeCompliance investorTypeCompliance = new InvestorTypeCompliance(
            investorTypeRegistry
        );
        console.log("InvestorTypeCompliance deployed at:", address(investorTypeCompliance));

        // 3. Deploy RenterCompliance (requires IdentityRegistry from script 04)
        console.log("\n3. Deploying RenterCompliance...");
        RenterCompliance renterCompliance = new RenterCompliance(
            identityRegistry,
            owner
        );
        console.log("RenterCompliance deployed at:", address(renterCompliance));

        // 4. Deploy OperationalCompliance
        console.log("\n4. Deploying OperationalCompliance...");
        OperationalCompliance operationalCompliance = new OperationalCompliance(owner);
        console.log("OperationalCompliance deployed at:", address(operationalCompliance));

        // 5. Deploy TransferRestrictions
        console.log("\n5. Deploying TransferRestrictions...");
        TransferRestrictions transferRestrictions = new TransferRestrictions(owner);
        console.log("TransferRestrictions deployed at:", address(transferRestrictions));

        // 6. Deploy ComplianceRegistry
        console.log("\n6. Deploying ComplianceRegistry...");
        ComplianceRegistry complianceRegistry = new ComplianceRegistry();
        console.log("ComplianceRegistry deployed at:", address(complianceRegistry));

        vm.stopBroadcast();

        console.log("\n=== Compliance Modules Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("COMPLIANCE_RULES=", address(complianceRules));
        console.log("INVESTOR_TYPE_COMPLIANCE=", address(investorTypeCompliance));
        console.log("RENTER_COMPLIANCE=", address(renterCompliance));
        console.log("OPERATIONAL_COMPLIANCE=", address(operationalCompliance));
        console.log("TRANSFER_RESTRICTIONS=", address(transferRestrictions));
        console.log("COMPLIANCE_REGISTRY=", address(complianceRegistry));
    }
}
