// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PaymentEscrow} from "../src/payment/PaymentEscrow.sol";
import {RefundManager} from "../src/payment/RefundManager.sol";
import {RegShieldPaymentProtocol} from "../src/payment/RegShieldPaymentProtocol.sol";
import {RentalPaymentProtocol} from "../src/payment/RentalPaymentProtocol.sol";

/**
 * @title DeployPayment
 * @notice Deploy payment processing and escrow contracts
 * @dev These contracts handle investment payments and rental payments
 */
contract DeployPayment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get addresses from previous deployments
        address identityRegistry = vm.envOr("IDENTITY_REGISTRY", address(0));
        address vehicleNFT = vm.envOr("VEHICLE_NFT", address(0));
        address rentalBooking = vm.envOr("RENTAL_BOOKING", address(0));

        console.log("=== Deploying Payment System ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PaymentEscrow
        console.log("\n1. Deploying PaymentEscrow...");
        PaymentEscrow paymentEscrow = new PaymentEscrow();
        console.log("PaymentEscrow deployed at:", address(paymentEscrow));

        // 2. Deploy RefundManager
        console.log("\n2. Deploying RefundManager...");
        RefundManager refundManager = new RefundManager(address(paymentEscrow));
        console.log("RefundManager deployed at:", address(refundManager));

        // 3. Deploy RegShieldPaymentProtocol (for investments)
        console.log("\n3. Deploying RegShieldPaymentProtocol...");
        RegShieldPaymentProtocol investmentPayment = new RegShieldPaymentProtocol(
            identityRegistry,
            address(paymentEscrow),
            address(refundManager)
        );
        console.log("RegShieldPaymentProtocol deployed at:", address(investmentPayment));

        // 4. Deploy RentalPaymentProtocol (for rentals)
        console.log("\n4. Deploying RentalPaymentProtocol...");
        RentalPaymentProtocol rentalPayment = new RentalPaymentProtocol(
            rentalBooking,
            vehicleNFT,
            address(paymentEscrow)
        );
        console.log("RentalPaymentProtocol deployed at:", address(rentalPayment));

        // Configure PaymentEscrow
        console.log("\nConfiguring PaymentEscrow...");
        paymentEscrow.addAuthorizedProtocol(address(investmentPayment));
        paymentEscrow.addAuthorizedProtocol(address(rentalPayment));
        console.log("Payment protocols authorized on PaymentEscrow");

        // Configure RefundManager
        console.log("\nConfiguring RefundManager...");
        refundManager.addAuthorizedProtocol(address(investmentPayment));
        console.log("RegShieldPaymentProtocol authorized on RefundManager");

        vm.stopBroadcast();

        console.log("\n=== Payment System Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("PAYMENT_ESCROW=", address(paymentEscrow));
        console.log("REFUND_MANAGER=", address(refundManager));
        console.log("INVESTMENT_PAYMENT_PROTOCOL=", address(investmentPayment));
        console.log("RENTAL_PAYMENT_PROTOCOL=", address(rentalPayment));
    }
}
