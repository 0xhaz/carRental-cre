// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PaymentEscrow} from "../src/payment/PaymentEscrow.sol";
import {RefundManager} from "../src/payment/RefundManager.sol";
import {RegShieldPaymentProtocol} from "../src/payment/RegShieldPaymentProtocol.sol";
import {RentalPaymentProtocol} from "../src/payment/RentalPaymentProtocol.sol";
import {DisputeResolver} from "../src/payment/DisputeResolver.sol";

/**
 * @title DeployPayment
 * @notice Deploy payment processing and escrow contracts
 * @dev These contracts handle investment payments and rental payments
 *
 * IMPORTANT: Each PaymentEscrow is tied to ONE protocol, so we deploy TWO:
 * 1. InvestmentEscrow + RegShieldPaymentProtocol (for investments)
 * 2. RentalEscrow + RentalPaymentProtocol (for rentals)
 */
contract DeployPayment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get addresses from previous deployments
        address complianceRules = vm.envOr("COMPLIANCE_RULES", address(0));
        address identityRegistry = vm.envOr("IDENTITY_REGISTRY", address(0));
        address participantTypeRegistry = vm.envOr("PARTICIPANT_TYPE_REGISTRY", address(0));
        address renterCompliance = vm.envOr("RENTER_COMPLIANCE", address(0));
        address rentalBooking = vm.envOr("RENTAL_BOOKING", address(0));

        console.log("=== Deploying Payment System ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // ===================================================================
        // INVESTMENT PAYMENT SYSTEM (RegShield Protocol — Native ETH)
        // ===================================================================
        console.log("\n=== Investment Payment System (Native ETH) ===");

        // 1. Deploy RegShieldPaymentProtocol (for investments)
        console.log("1. Deploying RegShieldPaymentProtocol...");
        RegShieldPaymentProtocol investmentProtocol = new RegShieldPaymentProtocol(
            complianceRules,
            identityRegistry
        );
        console.log("RegShieldPaymentProtocol deployed at:", address(investmentProtocol));

        // 2. Deploy InvestmentEscrow (tied to investment protocol)
        console.log("2. Deploying InvestmentEscrow...");
        PaymentEscrow investmentEscrow = new PaymentEscrow(
            address(investmentProtocol)
        );
        console.log("InvestmentEscrow deployed at:", address(investmentEscrow));

        // 3. Deploy RefundManager for investments
        console.log("3. Deploying RefundManager (for investments)...");
        RefundManager investmentRefundManager = new RefundManager(
            address(investmentProtocol),
            address(investmentEscrow)
        );
        console.log("InvestmentRefundManager deployed at:", address(investmentRefundManager));

        // Configure investment protocol with escrow
        console.log("\nConfiguring investment protocol...");
        investmentProtocol.setPaymentEscrow(address(investmentEscrow));
        investmentProtocol.setRefundManager(address(investmentRefundManager));
        console.log("Investment protocol configured");

        // ===================================================================
        // RENTAL PAYMENT SYSTEM (Rental Protocol — Native ETH)
        // ===================================================================
        console.log("\n=== Rental Payment System (Native ETH) ===");

        // 4. Deploy RentalPaymentProtocol (for rentals)
        console.log("4. Deploying RentalPaymentProtocol...");
        // Note: Use owner as temporary placeholder for escrow to avoid address(0) revert
        RentalPaymentProtocol rentalProtocol = new RentalPaymentProtocol(
            owner,  // Temporary placeholder, will be updated after escrow deployment
            identityRegistry,
            participantTypeRegistry,
            renterCompliance
        );
        console.log("RentalPaymentProtocol deployed at:", address(rentalProtocol));

        // 5. Deploy RentalEscrow (tied to rental protocol)
        console.log("5. Deploying RentalEscrow...");
        PaymentEscrow rentalEscrow = new PaymentEscrow(
            address(rentalProtocol)
        );
        console.log("RentalEscrow deployed at:", address(rentalEscrow));

        // 6. Deploy RefundManager for rentals
        console.log("6. Deploying RefundManager (for rentals)...");
        RefundManager rentalRefundManager = new RefundManager(
            address(rentalProtocol),
            address(rentalEscrow)
        );
        console.log("RentalRefundManager deployed at:", address(rentalRefundManager));

        // Configure rental protocol with actual escrow address
        console.log("\nConfiguring rental protocol...");
        rentalProtocol.setPaymentEscrow(address(rentalEscrow));
        console.log("RentalPaymentProtocol escrow updated");

        // ===================================================================
        // DISPUTE RESOLUTION
        // ===================================================================
        console.log("\n=== Dispute Resolution ===");

        // 7. Deploy DisputeResolver (tied to investment protocol)
        console.log("7. Deploying DisputeResolver...");
        DisputeResolver disputeResolver = new DisputeResolver(address(investmentProtocol));
        console.log("DisputeResolver deployed at:", address(disputeResolver));

        // Wire DisputeResolver ↔ RegShieldPaymentProtocol
        investmentProtocol.setDisputeResolver(address(disputeResolver));
        console.log("DisputeResolver wired to InvestmentPaymentProtocol");

        // Configure RentalBooking with payment protocol (if deployed)
        if (rentalBooking != address(0)) {
            console.log("\nSetting RentalPaymentProtocol on RentalBooking...");
            // Note: This requires RentalBooking to have setRentalPaymentProtocol method
            // If the method doesn't exist, this will need to be done manually
            // RentalBooking(rentalBooking).setRentalPaymentProtocol(address(rentalProtocol));
            console.log("Note: RentalBooking address found, but configuration may need to be done manually");
        }

        vm.stopBroadcast();

        console.log("\n=== Payment System Deployment Complete (Native ETH) ===");
        console.log("\nSave these addresses:");
        console.log("\n# Investment Payment System");
        console.log("INVESTMENT_PAYMENT_PROTOCOL=", address(investmentProtocol));
        console.log("INVESTMENT_ESCROW=", address(investmentEscrow));
        console.log("INVESTMENT_REFUND_MANAGER=", address(investmentRefundManager));
        console.log("\n# Rental Payment System");
        console.log("RENTAL_PAYMENT_PROTOCOL=", address(rentalProtocol));
        console.log("RENTAL_ESCROW=", address(rentalEscrow));
        console.log("RENTAL_REFUND_MANAGER=", address(rentalRefundManager));
        console.log("\n# Dispute Resolution");
        console.log("DISPUTE_RESOLVER=", address(disputeResolver));
    }
}
