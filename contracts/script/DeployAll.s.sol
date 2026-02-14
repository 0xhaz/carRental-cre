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
import {DisputeResolver} from "../src/payment/DisputeResolver.sol";

// Revenue & Investor
import {RevenueDistributor} from "../src/revenue/RevenueDistributor.sol";
import {InvestorRequestManager} from "../src/investor/InvestorRequestManager.sol";
import {MultiSigWallet} from "../src/investor/MultiSigWallet.sol";

// CRE Receivers
import {ComplianceReceiver} from "../src/cre/ComplianceReceiver.sol";
import {PaymentReceiver} from "../src/cre/PaymentReceiver.sol";
import {VehicleReceiver} from "../src/cre/VehicleReceiver.sol";
import {OnboardingReceiver} from "../src/cre/OnboardingReceiver.sol";
import {CampaignMonitorReceiver} from "../src/cre/CampaignMonitorReceiver.sol";

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
        address investmentEscrow;
        address investmentRefundManager;
        address investmentPaymentProtocol;
        address rentalEscrow;
        address rentalRefundManager;
        address rentalPaymentProtocol;
        address disputeResolver;
        // Revenue & Investor
        address revenueDistributor;
        address investorRequestManager;
        address multiSigWallet;
        // CRE Receivers
        address complianceReceiver;
        address paymentReceiver;
        address vehicleReceiver;
        address onboardingReceiver;
        address campaignMonitorReceiver;
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

        // CRE Forwarder address (use address(1) as placeholder if not set)
        address creForwarder = vm.envOr("CRE_FORWARDER", address(1));
        console.log("CRE Forwarder:", creForwarder);

        vm.startBroadcast(deployerPrivateKey);

        Deployment memory deployment;

        // =================================================================
        // PHASE 1: OnchainID Infrastructure
        // =================================================================
        console.log("PHASE 1: OnchainID Infrastructure");
        console.log("--------------------------------------------------");

        deployment.onchainIDFactory = address(new OnchainIDFactory(owner));
        console.log("OnchainIDFactory:", deployment.onchainIDFactory);

        deployment.claimIssuer = address(
            new ClaimIssuer(
                owner,
                "RegShield Claim Issuer",
                "Official claim issuer for RegShield rental car tokenization platform"
            )
        );
        console.log("ClaimIssuer:", deployment.claimIssuer);

        deployment.keyManager = address(new KeyManager(owner));
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

        deployment.claimTopicsRegistry = address(
            new ClaimTopicsRegistry(ClaimTopicsRegistry.ParticipantType.CUSTOM)
        );
        console.log("ClaimTopicsRegistry:", deployment.claimTopicsRegistry);

        // Register claim topics
        for (uint256 i = 1; i <= 8; i++) {
            ClaimTopicsRegistry(deployment.claimTopicsRegistry).addClaimTopic(i);
        }

        deployment.investorTypeRegistry = address(new InvestorTypeRegistry());
        console.log("InvestorTypeRegistry:", deployment.investorTypeRegistry);

        deployment.participantTypeRegistry = address(new ParticipantTypeRegistry(owner));
        console.log("ParticipantTypeRegistry:", deployment.participantTypeRegistry);

        // =================================================================
        // PHASE 3: Compliance
        // =================================================================
        console.log("\nPHASE 3: Compliance Modules");
        console.log("--------------------------------------------------");

        // Setup default allowed countries
        uint256[] memory allowedCountries = new uint256[](5);
        allowedCountries[0] = 1;   // US
        allowedCountries[1] = 44;  // UK
        allowedCountries[2] = 49;  // Germany
        allowedCountries[3] = 33;  // France
        allowedCountries[4] = 39;  // Italy

        uint256[] memory blockedCountries = new uint256[](0);

        deployment.complianceRules = address(
            new ComplianceRules(owner, allowedCountries, blockedCountries)
        );
        console.log("ComplianceRules:", deployment.complianceRules);

        deployment.investorTypeCompliance = address(
            new InvestorTypeCompliance(deployment.investorTypeRegistry)
        );
        console.log("InvestorTypeCompliance:", deployment.investorTypeCompliance);

        // NOTE: RenterCompliance needs IdentityRegistry, which we deploy in Phase 4
        // We'll deploy it after IdentityRegistry is created

        deployment.operationalCompliance = address(new OperationalCompliance(owner));
        console.log("OperationalCompliance:", deployment.operationalCompliance);

        deployment.transferRestrictions = address(new TransferRestrictions(owner));
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

        // Now deploy RenterCompliance (needed IdentityRegistry address)
        console.log("Deploying RenterCompliance...");
        deployment.renterCompliance = address(
            new RenterCompliance(deployment.identityRegistry, owner)
        );
        console.log("RenterCompliance:", deployment.renterCompliance);

        // Configure IdentityRegistry
        IdentityRegistry identityRegistry = IdentityRegistry(deployment.identityRegistry);
        identityRegistry.setInvestorTypeRegistry(deployment.investorTypeRegistry);
        identityRegistry.setParticipantTypeRegistry(deployment.participantTypeRegistry);
        identityRegistry.setRenterCompliance(deployment.renterCompliance);
        // Note: setComplianceRules requires token address - skipping for now
        // TODO: Deploy AssetToken/RevenueToken first, then call:
        // identityRegistry.setComplianceRules(deployment.complianceRules, tokenAddress);
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
        // PHASE 6: Payment System (Native ETH)
        // =================================================================
        console.log("\nPHASE 6: Payment System (Native ETH)");
        console.log("--------------------------------------------------");

        // === Investment Payment System ===
        deployment.investmentPaymentProtocol = address(
            new RegShieldPaymentProtocol(
                deployment.complianceRules,
                deployment.identityRegistry
            )
        );
        console.log("InvestmentPaymentProtocol:", deployment.investmentPaymentProtocol);

        deployment.investmentEscrow = address(
            new PaymentEscrow(deployment.investmentPaymentProtocol)
        );
        console.log("InvestmentEscrow:", deployment.investmentEscrow);

        deployment.investmentRefundManager = address(
            new RefundManager(deployment.investmentPaymentProtocol, deployment.investmentEscrow)
        );
        console.log("InvestmentRefundManager:", deployment.investmentRefundManager);

        // Configure investment protocol
        RegShieldPaymentProtocol(deployment.investmentPaymentProtocol).setPaymentEscrow(
            deployment.investmentEscrow
        );
        RegShieldPaymentProtocol(deployment.investmentPaymentProtocol).setRefundManager(
            deployment.investmentRefundManager
        );

        // === Rental Payment System ===
        // Note: Use owner as temporary placeholder for escrow to avoid address(0) revert
        deployment.rentalPaymentProtocol = address(
            new RentalPaymentProtocol(
                owner,  // Temporary placeholder, will be updated after escrow deployment
                deployment.identityRegistry,
                deployment.participantTypeRegistry,
                deployment.renterCompliance
            )
        );
        console.log("RentalPaymentProtocol:", deployment.rentalPaymentProtocol);

        deployment.rentalEscrow = address(
            new PaymentEscrow(deployment.rentalPaymentProtocol)
        );
        console.log("RentalEscrow:", deployment.rentalEscrow);

        deployment.rentalRefundManager = address(
            new RefundManager(deployment.rentalPaymentProtocol, deployment.rentalEscrow)
        );
        console.log("RentalRefundManager:", deployment.rentalRefundManager);

        // Configure rental protocol with actual escrow address
        RentalPaymentProtocol(deployment.rentalPaymentProtocol).setPaymentEscrow(
            deployment.rentalEscrow
        );
        console.log("RentalPaymentProtocol escrow updated");

        // Set RentalPaymentProtocol on RentalBooking
        RentalBooking(deployment.rentalBooking).setRentalPaymentProtocol(
            deployment.rentalPaymentProtocol
        );

        // === Dispute Resolution ===
        deployment.disputeResolver = address(
            new DisputeResolver(deployment.investmentPaymentProtocol)
        );
        console.log("DisputeResolver:", deployment.disputeResolver);

        // Wire DisputeResolver ↔ RegShieldPaymentProtocol
        RegShieldPaymentProtocol(deployment.investmentPaymentProtocol).setDisputeResolver(
            deployment.disputeResolver
        );
        console.log("DisputeResolver wired to InvestmentPaymentProtocol");

        // =================================================================
        // PHASE 7: Revenue & Investor Management
        // =================================================================
        console.log("\nPHASE 7: Revenue & Investor Management");
        console.log("--------------------------------------------------");

        deployment.revenueDistributor = address(new RevenueDistributor());
        console.log("RevenueDistributor:", deployment.revenueDistributor);

        // Wire RentalPaymentProtocol → RevenueDistributor
        RentalPaymentProtocol(deployment.rentalPaymentProtocol).setRevenueDistributor(
            deployment.revenueDistributor
        );
        RevenueDistributor(payable(deployment.revenueDistributor)).setAuthorizedSource(
            deployment.rentalPaymentProtocol, true
        );
        console.log("RentalPaymentProtocol -> RevenueDistributor wired");

        // NOTE: Per-vehicle token minting setup (done at campaign creation time, not here):
        // 1. Deploy AssetToken + RevenueToken for the vehicle
        // 2. Call regShieldPaymentProtocol.registerVehicleTokens(vehicleId, assetToken, revenueToken)
        // 3. Call assetToken.addAgent(address(regShieldPaymentProtocol))
        // 4. Call revenueToken.addAgent(address(regShieldPaymentProtocol))
        // After this, milestone completion will auto-mint tokens to investors.

        deployment.investorRequestManager = address(
            new InvestorRequestManager(
                owner,  // bank address
                deployment.investorTypeRegistry,
                deployment.identityRegistry
            )
        );
        console.log("InvestorRequestManager:", deployment.investorRequestManager);

        // Note: If owner == deployer, use identityRegistry as placeholder bank address
        address bankAddress = (owner != vm.addr(deployerPrivateKey)) ? owner : deployment.identityRegistry;

        deployment.multiSigWallet = address(
            new MultiSigWallet(
                owner,  // user
                bankAddress  // bank (different from user)
            )
        );
        console.log("MultiSigWallet:", deployment.multiSigWallet);

        // =================================================================
        // PHASE 8: CRE Receivers
        // =================================================================
        console.log("\nPHASE 8: CRE Receiver Proxies");
        console.log("--------------------------------------------------");

        deployment.complianceReceiver = address(
            new ComplianceReceiver(
                creForwarder,
                deployment.renterCompliance,
                deployment.operationalCompliance
            )
        );
        console.log("ComplianceReceiver:", deployment.complianceReceiver);

        deployment.paymentReceiver = address(
            new PaymentReceiver(creForwarder, deployment.investmentPaymentProtocol)
        );
        console.log("PaymentReceiver:", deployment.paymentReceiver);

        deployment.vehicleReceiver = address(
            new VehicleReceiver(creForwarder, deployment.vehicleNFT)
        );
        console.log("VehicleReceiver:", deployment.vehicleReceiver);

        deployment.onboardingReceiver = address(
            new OnboardingReceiver(
                creForwarder,
                deployment.investorRequestManager,
                deployment.rentalBooking
            )
        );
        console.log("OnboardingReceiver:", deployment.onboardingReceiver);

        deployment.campaignMonitorReceiver = address(
            new CampaignMonitorReceiver(
                creForwarder,
                deployment.investmentPaymentProtocol
            )
        );
        console.log("CampaignMonitorReceiver:", deployment.campaignMonitorReceiver);

        // Configure CRE authorization
        console.log("\nConfiguring CRE authorization...");
        RenterCompliance(deployment.renterCompliance).setAuthorizedOperator(
            deployment.complianceReceiver, true
        );
        OperationalCompliance(deployment.operationalCompliance).setAuthorizedOperator(
            deployment.complianceReceiver, true
        );
        VehicleNFT(deployment.vehicleNFT).setOperator(deployment.vehicleReceiver, true);
        RentalBooking(deployment.rentalBooking).setApprover(deployment.onboardingReceiver, true);
        RegShieldPaymentProtocol(deployment.investmentPaymentProtocol).setAuthorizedOperator(
            deployment.paymentReceiver, true
        );
        RegShieldPaymentProtocol(deployment.investmentPaymentProtocol).setAuthorizedOperator(
            deployment.campaignMonitorReceiver, true
        );
        console.log("CRE receivers authorized on target contracts");

        vm.stopBroadcast();

        console.log("\n====================================================");
        console.log("    Deployment Complete!");
        console.log("====================================================");
        console.log("Total contracts deployed: 33");
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

        console.log("\n# Payment (Native ETH)");
        console.log("INVESTMENT_PAYMENT_PROTOCOL=", d.investmentPaymentProtocol);
        console.log("INVESTMENT_ESCROW=", d.investmentEscrow);
        console.log("INVESTMENT_REFUND_MANAGER=", d.investmentRefundManager);
        console.log("RENTAL_PAYMENT_PROTOCOL=", d.rentalPaymentProtocol);
        console.log("RENTAL_ESCROW=", d.rentalEscrow);
        console.log("RENTAL_REFUND_MANAGER=", d.rentalRefundManager);
        console.log("DISPUTE_RESOLVER=", d.disputeResolver);

        console.log("\n# Revenue & Investor");
        console.log("REVENUE_DISTRIBUTOR=", d.revenueDistributor);
        console.log("INVESTOR_REQUEST_MANAGER=", d.investorRequestManager);
        console.log("MULTISIG_WALLET=", d.multiSigWallet);

        console.log("\n# CRE Receivers");
        console.log("COMPLIANCE_RECEIVER=", d.complianceReceiver);
        console.log("PAYMENT_RECEIVER=", d.paymentReceiver);
        console.log("VEHICLE_RECEIVER=", d.vehicleReceiver);
        console.log("ONBOARDING_RECEIVER=", d.onboardingReceiver);
        console.log("CAMPAIGN_MONITOR_RECEIVER=", d.campaignMonitorReceiver);

        console.log("\n====================================================");
    }
}
