// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

// OnchainID
import {OnchainIDFactory} from "../src/onchainId/OnchainIDFactory.sol";
import {ClaimIssuer} from "../src/onchainId/ClaimIssuer.sol";
import {KeyManager} from "../src/onchainId/KeyManager.sol";

// Registries
import {TrustedIssuersRegistry} from "../src/erc3643/TrustedIssuersRegistry.sol";
import {ClaimTopicsRegistry} from "../src/erc3643/ClaimTopicsRegistry.sol";
import {InvestorTypeRegistry} from "../src/erc3643/InvestorTypeRegistry.sol";
import {ParticipantTypeRegistry} from "../src/erc3643/ParticipantTypeRegistry.sol";

// Compliance
import {ComplianceRules} from "../src/compliance/ComplianceRules.sol";
import {InvestorTypeCompliance} from "../src/compliance/InvestorTypeCompliance.sol";
import {RenterCompliance} from "../src/compliance/RenterCompliance.sol";
import {OperationalCompliance} from "../src/compliance/OperationalCompliance.sol";
import {TransferRestrictions} from "../src/compliance/TransferRestrictions.sol";
import {ComplianceRegistry} from "../src/erc3643/ComplianceRegistry.sol";

// Identity
import {IdentityRegistry} from "../src/erc3643/IdentityRegistry.sol";

// Vehicle & Rental
import {VehicleNFT} from "../src/vehicle/VehicleNFT.sol";
import {RentalBooking} from "../src/rental/RentalBooking.sol";
import {RentalOperations} from "../src/rental/RentalOperations.sol";

// Payment
import {PaymentEscrow} from "../src/payment/PaymentEscrow.sol";
import {RefundManager} from "../src/payment/RefundManager.sol";
import {RegShieldPaymentProtocol} from "../src/payment/RegShieldPaymentProtocol.sol";
import {RentalPaymentProtocol} from "../src/payment/RentalPaymentProtocol.sol";

// Revenue & Investor
import {RevenueDistributor} from "../src/revenue/RevenueDistributor.sol";
import {InvestorRequestManager} from "../src/investor/InvestorRequestManager.sol";
import {MultiSigWallet} from "../src/investor/MultiSigWallet.sol";

/**
 * @title DeployAll
 * @notice Master deployment script that deploys all RegShield contracts
 * @dev Run this to deploy the complete platform in one transaction
 */
contract DeployAll is Script {
    // Deployment addresses struct
    struct Deployment {
        // OnchainID
        address onchainIDFactory;
        address claimIssuer;
        address keyManager;
        // Registries
        address trustedIssuersRegistry;
        address claimTopicsRegistry;
        address investorTypeRegistry;
        address participantTypeRegistry;
        // Compliance
        address complianceRules;
        address investorTypeCompliance;
        address renterCompliance;
        address operationalCompliance;
        address transferRestrictions;
        address complianceRegistry;
        // Identity
        address identityRegistry;
        // Vehicle & Rental
        address vehicleNFT;
        address rentalBooking;
        address rentalOperations;
        // Payment
        address paymentEscrow;
        address refundManager;
        address investmentPaymentProtocol;
        address rentalPaymentProtocol;
        // Revenue & Investor
        address revenueDistributor;
        address investorRequestManager;
        address multiSigWallet;
    }

    function run() external returns (Deployment memory) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        console.log("====================================================");
        console.log("    RegShield Platform - Complete Deployment");
        console.log("====================================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);
        console.log("Chain ID:", block.chainid);
        console.log("====================================================\n");

        vm.startBroadcast(deployerPrivateKey);

        Deployment memory deployment;

        // =================================================================
        // PHASE 1: OnchainID Infrastructure
        // =================================================================
        console.log("PHASE 1: OnchainID Infrastructure");
        console.log("--------------------------------------------------");

        deployment.onchainIDFactory = address(new OnchainIDFactory());
        console.log("OnchainIDFactory:", deployment.onchainIDFactory);

        deployment.claimIssuer = address(new ClaimIssuer());
        console.log("ClaimIssuer:", deployment.claimIssuer);

        deployment.keyManager = address(new KeyManager());
        console.log("KeyManager:", deployment.keyManager);

        // =================================================================
        // PHASE 2: Registries
        // =================================================================
        console.log("\nPHASE 2: Registries");
        console.log("--------------------------------------------------");

        deployment.trustedIssuersRegistry = address(new TrustedIssuersRegistry());
        console.log("TrustedIssuersRegistry:", deployment.trustedIssuersRegistry);

        // Add ClaimIssuer as trusted issuer
        uint256[] memory claimTopics = new uint256[](8);
        for (uint256 i = 0; i < 8; i++) {
            claimTopics[i] = i + 1;
        }
        TrustedIssuersRegistry(deployment.trustedIssuersRegistry).addTrustedIssuer(
            deployment.claimIssuer,
            claimTopics
        );

        deployment.claimTopicsRegistry = address(new ClaimTopicsRegistry());
        console.log("ClaimTopicsRegistry:", deployment.claimTopicsRegistry);

        // Register claim topics
        for (uint256 i = 1; i <= 8; i++) {
            ClaimTopicsRegistry(deployment.claimTopicsRegistry).addClaimTopic(i);
        }

        deployment.investorTypeRegistry = address(new InvestorTypeRegistry());
        console.log("InvestorTypeRegistry:", deployment.investorTypeRegistry);

        deployment.participantTypeRegistry = address(new ParticipantTypeRegistry());
        console.log("ParticipantTypeRegistry:", deployment.participantTypeRegistry);

        // =================================================================
        // PHASE 3: Compliance
        // =================================================================
        console.log("\nPHASE 3: Compliance Modules");
        console.log("--------------------------------------------------");

        deployment.complianceRules = address(new ComplianceRules());
        console.log("ComplianceRules:", deployment.complianceRules);

        deployment.investorTypeCompliance = address(new InvestorTypeCompliance());
        console.log("InvestorTypeCompliance:", deployment.investorTypeCompliance);

        deployment.renterCompliance = address(new RenterCompliance());
        console.log("RenterCompliance:", deployment.renterCompliance);

        deployment.operationalCompliance = address(new OperationalCompliance());
        console.log("OperationalCompliance:", deployment.operationalCompliance);

        deployment.transferRestrictions = address(new TransferRestrictions());
        console.log("TransferRestrictions:", deployment.transferRestrictions);

        deployment.complianceRegistry = address(new ComplianceRegistry());
        console.log("ComplianceRegistry:", deployment.complianceRegistry);

        // =================================================================
        // PHASE 4: Identity Registry
        // =================================================================
        console.log("\nPHASE 4: Identity Registry");
        console.log("--------------------------------------------------");

        deployment.identityRegistry = address(new IdentityRegistry());
        console.log("IdentityRegistry:", deployment.identityRegistry);

        // Configure IdentityRegistry
        IdentityRegistry identityRegistry = IdentityRegistry(deployment.identityRegistry);
        identityRegistry.setInvestorTypeRegistry(deployment.investorTypeRegistry);
        identityRegistry.setParticipantTypeRegistry(deployment.participantTypeRegistry);
        identityRegistry.setRenterCompliance(deployment.renterCompliance);
        identityRegistry.setComplianceRules(deployment.complianceRules);
        identityRegistry.addAgent(vm.addr(deployerPrivateKey));
        if (owner != vm.addr(deployerPrivateKey)) {
            identityRegistry.addAgent(owner);
        }

        // =================================================================
        // PHASE 5: Vehicle & Rental
        // =================================================================
        console.log("\nPHASE 5: Vehicle & Rental System");
        console.log("--------------------------------------------------");

        deployment.vehicleNFT = address(new VehicleNFT());
        console.log("VehicleNFT:", deployment.vehicleNFT);

        deployment.rentalBooking = address(
            new RentalBooking(
                deployment.vehicleNFT,
                deployment.renterCompliance,
                address(0)  // Payment protocol will be set after deployment
            )
        );
        console.log("RentalBooking:", deployment.rentalBooking);

        deployment.rentalOperations = address(
            new RentalOperations(deployment.rentalBooking, deployment.vehicleNFT)
        );
        console.log("RentalOperations:", deployment.rentalOperations);

        // Configure Vehicle & Rental
        VehicleNFT(deployment.vehicleNFT).setRentalBookingContract(deployment.rentalBooking);
        VehicleNFT(deployment.vehicleNFT).setOperator(deployment.rentalOperations, true);
        RentalBooking(deployment.rentalBooking).setRentalOperations(deployment.rentalOperations);

        // =================================================================
        // PHASE 6: Payment System
        // =================================================================
        console.log("\nPHASE 6: Payment System");
        console.log("--------------------------------------------------");

        deployment.paymentEscrow = address(new PaymentEscrow());
        console.log("PaymentEscrow:", deployment.paymentEscrow);

        deployment.refundManager = address(new RefundManager(deployment.paymentEscrow));
        console.log("RefundManager:", deployment.refundManager);

        deployment.investmentPaymentProtocol = address(
            new RegShieldPaymentProtocol(
                deployment.identityRegistry,
                deployment.paymentEscrow,
                deployment.refundManager
            )
        );
        console.log("InvestmentPaymentProtocol:", deployment.investmentPaymentProtocol);

        deployment.rentalPaymentProtocol = address(
            new RentalPaymentProtocol(
                deployment.rentalBooking,
                deployment.vehicleNFT,
                deployment.paymentEscrow
            )
        );
        console.log("RentalPaymentProtocol:", deployment.rentalPaymentProtocol);

        // Configure Payment System
        PaymentEscrow(deployment.paymentEscrow).addAuthorizedProtocol(
            deployment.investmentPaymentProtocol
        );
        PaymentEscrow(deployment.paymentEscrow).addAuthorizedProtocol(
            deployment.rentalPaymentProtocol
        );
        RefundManager(deployment.refundManager).addAuthorizedProtocol(
            deployment.investmentPaymentProtocol
        );

        // Set RentalPaymentProtocol on RentalBooking now that it's deployed
        RentalBooking(deployment.rentalBooking).setRentalPaymentProtocol(
            deployment.rentalPaymentProtocol
        );

        // =================================================================
        // PHASE 7: Revenue & Investor Management
        // =================================================================
        console.log("\nPHASE 7: Revenue & Investor Management");
        console.log("--------------------------------------------------");

        deployment.revenueDistributor = address(new RevenueDistributor(deployment.vehicleNFT));
        console.log("RevenueDistributor:", deployment.revenueDistributor);

        deployment.investorRequestManager = address(
            new InvestorRequestManager(deployment.identityRegistry)
        );
        console.log("InvestorRequestManager:", deployment.investorRequestManager);

        address[] memory owners = new address[](2);
        owners[0] = vm.addr(deployerPrivateKey);
        owners[1] = owner;
        deployment.multiSigWallet = address(new MultiSigWallet(owners, 2));
        console.log("MultiSigWallet:", deployment.multiSigWallet);

        vm.stopBroadcast();

        console.log("\n====================================================");
        console.log("    Deployment Complete!");
        console.log("====================================================");
        console.log("Total contracts deployed: 28");
        console.log("====================================================\n");

        // Print summary
        printDeploymentSummary(deployment);

        return deployment;
    }

    function printDeploymentSummary(Deployment memory d) internal pure {
        console.log("DEPLOYMENT SUMMARY");
        console.log("====================================================");
        console.log("\n# OnchainID Infrastructure");
        console.log("ONCHAINID_FACTORY=", d.onchainIDFactory);
        console.log("CLAIM_ISSUER=", d.claimIssuer);
        console.log("KEY_MANAGER=", d.keyManager);

        console.log("\n# Registries");
        console.log("TRUSTED_ISSUERS_REGISTRY=", d.trustedIssuersRegistry);
        console.log("CLAIM_TOPICS_REGISTRY=", d.claimTopicsRegistry);
        console.log("INVESTOR_TYPE_REGISTRY=", d.investorTypeRegistry);
        console.log("PARTICIPANT_TYPE_REGISTRY=", d.participantTypeRegistry);

        console.log("\n# Compliance");
        console.log("COMPLIANCE_RULES=", d.complianceRules);
        console.log("INVESTOR_TYPE_COMPLIANCE=", d.investorTypeCompliance);
        console.log("RENTER_COMPLIANCE=", d.renterCompliance);
        console.log("OPERATIONAL_COMPLIANCE=", d.operationalCompliance);
        console.log("TRANSFER_RESTRICTIONS=", d.transferRestrictions);
        console.log("COMPLIANCE_REGISTRY=", d.complianceRegistry);

        console.log("\n# Identity");
        console.log("IDENTITY_REGISTRY=", d.identityRegistry);

        console.log("\n# Vehicle & Rental");
        console.log("VEHICLE_NFT=", d.vehicleNFT);
        console.log("RENTAL_BOOKING=", d.rentalBooking);
        console.log("RENTAL_OPERATIONS=", d.rentalOperations);

        console.log("\n# Payment");
        console.log("PAYMENT_ESCROW=", d.paymentEscrow);
        console.log("REFUND_MANAGER=", d.refundManager);
        console.log("INVESTMENT_PAYMENT_PROTOCOL=", d.investmentPaymentProtocol);
        console.log("RENTAL_PAYMENT_PROTOCOL=", d.rentalPaymentProtocol);

        console.log("\n# Revenue & Investor");
        console.log("REVENUE_DISTRIBUTOR=", d.revenueDistributor);
        console.log("INVESTOR_REQUEST_MANAGER=", d.investorRequestManager);
        console.log("MULTISIG_WALLET=", d.multiSigWallet);

        console.log("\n====================================================");
    }
}
