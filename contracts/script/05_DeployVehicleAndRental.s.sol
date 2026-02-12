// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VehicleNFT} from "../src/vehicle/VehicleNFT.sol";
import {RentalBooking} from "../src/rental/RentalBooking.sol";
import {RentalOperations} from "../src/rental/RentalOperations.sol";

/**
 * @title DeployVehicleAndRental
 * @notice Deploy Vehicle NFT and Rental management contracts
 * @dev These contracts handle vehicle tokenization and rental lifecycle
 */
contract DeployVehicleAndRental is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get addresses from previous deployments
        address renterCompliance = vm.envOr("RENTER_COMPLIANCE", address(0));

        console.log("=== Deploying Vehicle and Rental System ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VehicleNFT
        console.log("\n1. Deploying VehicleNFT...");
        VehicleNFT vehicleNFT = new VehicleNFT();
        console.log("VehicleNFT deployed at:", address(vehicleNFT));

        // 2. Deploy RentalBooking (payment protocol will be set later)
        console.log("\n2. Deploying RentalBooking...");
        RentalBooking rentalBooking = new RentalBooking(
            address(vehicleNFT),
            renterCompliance,
            address(0)  // Payment protocol will be set after it's deployed
        );
        console.log("RentalBooking deployed at:", address(rentalBooking));

        // 3. Deploy RentalOperations
        console.log("\n3. Deploying RentalOperations...");
        RentalOperations rentalOperations = new RentalOperations(
            address(rentalBooking),
            address(vehicleNFT)
        );
        console.log("RentalOperations deployed at:", address(rentalOperations));

        // Configure VehicleNFT with RentalBooking contract
        console.log("\nConfiguring VehicleNFT...");
        vehicleNFT.setRentalBookingContract(address(rentalBooking));
        console.log("RentalBooking contract set on VehicleNFT");

        // Add RentalOperations as operator on VehicleNFT
        vehicleNFT.setOperator(address(rentalOperations), true);
        console.log("RentalOperations added as operator on VehicleNFT");

        // Configure RentalBooking with RentalOperations
        rentalBooking.setRentalOperations(address(rentalOperations));
        console.log("RentalOperations set on RentalBooking");

        vm.stopBroadcast();

        console.log("\n=== Vehicle and Rental System Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("VEHICLE_NFT=", address(vehicleNFT));
        console.log("RENTAL_BOOKING=", address(rentalBooking));
        console.log("RENTAL_OPERATIONS=", address(rentalOperations));
    }
}
