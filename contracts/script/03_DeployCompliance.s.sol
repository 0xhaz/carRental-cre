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

        console.log("=== Deploying Compliance Modules ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceRules (base module)
        console.log("\n1. Deploying ComplianceRules...");
        ComplianceRules complianceRules = new ComplianceRules();
        console.log("ComplianceRules deployed at:", address(complianceRules));

        // 2. Deploy InvestorTypeCompliance
        console.log("\n2. Deploying InvestorTypeCompliance...");
        InvestorTypeCompliance investorTypeCompliance = new InvestorTypeCompliance();
        console.log("InvestorTypeCompliance deployed at:", address(investorTypeCompliance));

        // 3. Deploy RenterCompliance
        console.log("\n3. Deploying RenterCompliance...");
        RenterCompliance renterCompliance = new RenterCompliance();
        console.log("RenterCompliance deployed at:", address(renterCompliance));

        // 4. Deploy OperationalCompliance
        console.log("\n4. Deploying OperationalCompliance...");
        OperationalCompliance operationalCompliance = new OperationalCompliance();
        console.log("OperationalCompliance deployed at:", address(operationalCompliance));

        // 5. Deploy TransferRestrictions
        console.log("\n5. Deploying TransferRestrictions...");
        TransferRestrictions transferRestrictions = new TransferRestrictions();
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
