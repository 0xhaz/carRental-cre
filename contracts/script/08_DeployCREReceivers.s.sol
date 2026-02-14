// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceReceiver} from "../src/cre/ComplianceReceiver.sol";
import {PaymentReceiver} from "../src/cre/PaymentReceiver.sol";
import {VehicleReceiver} from "../src/cre/VehicleReceiver.sol";
import {OnboardingReceiver} from "../src/cre/OnboardingReceiver.sol";
import {CampaignMonitorReceiver} from "../src/cre/CampaignMonitorReceiver.sol";

// Target contracts for authorization setup
import {RenterCompliance} from "../src/compliance/RenterCompliance.sol";
import {OperationalCompliance} from "../src/compliance/OperationalCompliance.sol";
import {VehicleNFT} from "../src/vehicle/VehicleNFT.sol";
import {RentalBooking} from "../src/rental/RentalBooking.sol";
import {RegShieldPaymentProtocol} from "../src/payment/RegShieldPaymentProtocol.sol";

/**
 * @title DeployCREReceivers
 * @notice Deploy Chainlink CRE receiver proxy contracts
 * @dev These contracts receive verified off-chain data from Chainlink CRE workflows
 *      and route it to the appropriate domain contracts.
 *
 * Prerequisites:
 *   - Phase 3 (Compliance), Phase 5 (Vehicle & Rental), Phase 6 (Payment),
 *     Phase 7 (Revenue & Investor) must be deployed first
 *   - CRE_FORWARDER address must be set (Chainlink Forwarder on target chain)
 *
 * Authorization setup:
 *   - ComplianceReceiver        → authorized operator on RenterCompliance & OperationalCompliance
 *   - VehicleReceiver           → operator on VehicleNFT
 *   - OnboardingReceiver        → approver on RentalBooking
 *   - PaymentReceiver           → authorized operator on RegShieldPaymentProtocol
 *   - CampaignMonitorReceiver   → authorized operator on RegShieldPaymentProtocol
 */
contract DeployCREReceivers is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Chainlink Forwarder address (required)
        address creForwarder = vm.envAddress("CRE_FORWARDER");

        // Addresses from previous deployments
        address renterCompliance = vm.envAddress("RENTER_COMPLIANCE");
        address operationalCompliance = vm.envAddress("OPERATIONAL_COMPLIANCE");
        address investmentPaymentProtocol = vm.envAddress("INVESTMENT_PAYMENT_PROTOCOL");
        address vehicleNFT = vm.envAddress("VEHICLE_NFT");
        address investorRequestManager = vm.envAddress("INVESTOR_REQUEST_MANAGER");
        address rentalBooking = vm.envAddress("RENTAL_BOOKING");

        console.log("=== Deploying CRE Receiver Proxies ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("CRE Forwarder:", creForwarder);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceReceiver
        console.log("\n1. Deploying ComplianceReceiver...");
        ComplianceReceiver complianceReceiver = new ComplianceReceiver(
            creForwarder,
            renterCompliance,
            operationalCompliance
        );
        console.log("ComplianceReceiver deployed at:", address(complianceReceiver));

        // 2. Deploy PaymentReceiver
        console.log("\n2. Deploying PaymentReceiver...");
        PaymentReceiver paymentReceiver = new PaymentReceiver(
            creForwarder,
            investmentPaymentProtocol
        );
        console.log("PaymentReceiver deployed at:", address(paymentReceiver));

        // 3. Deploy VehicleReceiver
        console.log("\n3. Deploying VehicleReceiver...");
        VehicleReceiver vehicleReceiver = new VehicleReceiver(
            creForwarder,
            vehicleNFT
        );
        console.log("VehicleReceiver deployed at:", address(vehicleReceiver));

        // 4. Deploy OnboardingReceiver
        console.log("\n4. Deploying OnboardingReceiver...");
        OnboardingReceiver onboardingReceiver = new OnboardingReceiver(
            creForwarder,
            investorRequestManager,
            rentalBooking
        );
        console.log("OnboardingReceiver deployed at:", address(onboardingReceiver));

        // 5. Deploy CampaignMonitorReceiver
        console.log("\n5. Deploying CampaignMonitorReceiver...");
        CampaignMonitorReceiver campaignMonitorReceiver = new CampaignMonitorReceiver(
            creForwarder,
            investmentPaymentProtocol
        );
        console.log("CampaignMonitorReceiver deployed at:", address(campaignMonitorReceiver));

        // =================================================================
        // Authorization Setup
        // =================================================================
        console.log("\n=== Configuring Authorization ===");

        // ComplianceReceiver needs to be authorized operator on compliance contracts
        console.log("Setting ComplianceReceiver as authorized operator...");
        RenterCompliance(renterCompliance).setAuthorizedOperator(
            address(complianceReceiver), true
        );
        console.log("  -> RenterCompliance: authorized");

        OperationalCompliance(operationalCompliance).setAuthorizedOperator(
            address(complianceReceiver), true
        );
        console.log("  -> OperationalCompliance: authorized");

        // VehicleReceiver needs to be operator on VehicleNFT
        console.log("Setting VehicleReceiver as operator on VehicleNFT...");
        VehicleNFT(vehicleNFT).setOperator(address(vehicleReceiver), true);
        console.log("  -> VehicleNFT: authorized");

        // OnboardingReceiver needs to be approver on RentalBooking
        console.log("Setting OnboardingReceiver as approver on RentalBooking...");
        RentalBooking(rentalBooking).setApprover(address(onboardingReceiver), true);
        console.log("  -> RentalBooking: authorized");

        // PaymentReceiver needs to be an authorized operator on RegShieldPaymentProtocol
        // so it can call completeMilestone()
        console.log("Setting PaymentReceiver as authorized operator on RegShieldPaymentProtocol...");
        RegShieldPaymentProtocol(investmentPaymentProtocol).setAuthorizedOperator(
            address(paymentReceiver), true
        );
        console.log("  -> RegShieldPaymentProtocol: authorized");

        // CampaignMonitorReceiver needs to be an authorized operator on RegShieldPaymentProtocol
        // so it can call batchCancelVehiclePayments()
        console.log("Setting CampaignMonitorReceiver as authorized operator on RegShieldPaymentProtocol...");
        RegShieldPaymentProtocol(investmentPaymentProtocol).setAuthorizedOperator(
            address(campaignMonitorReceiver), true
        );
        console.log("  -> RegShieldPaymentProtocol: authorized (campaign monitor)");

        vm.stopBroadcast();

        console.log("\n=== CRE Receiver Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("COMPLIANCE_RECEIVER=", address(complianceReceiver));
        console.log("PAYMENT_RECEIVER=", address(paymentReceiver));
        console.log("VEHICLE_RECEIVER=", address(vehicleReceiver));
        console.log("ONBOARDING_RECEIVER=", address(onboardingReceiver));
        console.log("CAMPAIGN_MONITOR_RECEIVER=", address(campaignMonitorReceiver));
    }
}
