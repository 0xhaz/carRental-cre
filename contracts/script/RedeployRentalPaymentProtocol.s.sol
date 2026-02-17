// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RentalPaymentProtocol} from "../src/payment/RentalPaymentProtocol.sol";

interface ISetPaymentProtocol {
    function setPaymentProtocol(address _paymentProtocol) external;
}

interface ISetRentalPaymentProtocol {
    function setRentalPaymentProtocol(address _rentalPaymentProtocol) external;
}

/**
 * @title RedeployRentalPaymentProtocol
 * @notice Redeploy RentalPaymentProtocol with updated ParticipantTypeRegistry and update all on-chain references
 * @dev Run: forge script script/RedeployRentalPaymentProtocol.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract RedeployRentalPaymentProtocol is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Constructor dependencies
        address rentalEscrow = vm.envAddress("RENTAL_ESCROW");
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");
        address participantTypeRegistry = vm.envAddress("PARTICIPANT_TYPE_REGISTRY");
        address renterCompliance = vm.envAddress("RENTER_COMPLIANCE");

        // Contracts that need their RentalPaymentProtocol reference updated
        address rentalBooking = vm.envAddress("RENTAL_BOOKING");

        console.log("=== Redeploying RentalPaymentProtocol ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("PaymentEscrow:", rentalEscrow);
        console.log("IdentityRegistry:", identityRegistry);
        console.log("ParticipantTypeRegistry:", participantTypeRegistry);
        console.log("RenterCompliance:", renterCompliance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy fresh RentalPaymentProtocol
        console.log("\n1. Deploying RentalPaymentProtocol...");
        RentalPaymentProtocol rentalPaymentProtocol = new RentalPaymentProtocol(
            rentalEscrow,
            identityRegistry,
            participantTypeRegistry,
            renterCompliance
        );
        address newAddr = address(rentalPaymentProtocol);
        console.log("RentalPaymentProtocol deployed at:", newAddr);

        // 2. Update PaymentEscrow (RentalEscrow) to point to new RentalPaymentProtocol
        console.log("\n2. Updating RentalEscrow.setPaymentProtocol...");
        ISetPaymentProtocol(rentalEscrow).setPaymentProtocol(newAddr);
        console.log("RentalEscrow updated");

        // 3. Update RentalBooking to point to new RentalPaymentProtocol
        console.log("\n3. Updating RentalBooking.setRentalPaymentProtocol...");
        ISetRentalPaymentProtocol(rentalBooking).setRentalPaymentProtocol(newAddr);
        console.log("RentalBooking updated");

        vm.stopBroadcast();

        console.log("\n=== Redeployment Complete ===");
        console.log("NEW RENTAL_PAYMENT_PROTOCOL=", newAddr);
        console.log("\nUpdate .env and frontend/src/constants/contracts.ts with the new address.");
    }
}
