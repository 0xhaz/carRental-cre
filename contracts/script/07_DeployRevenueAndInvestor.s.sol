// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RevenueDistributor} from "../src/revenue/RevenueDistributor.sol";
import {InvestorRequestManager} from "../src/investor/InvestorRequestManager.sol";
import {MultiSigWallet} from "../src/investor/MultiSigWallet.sol";
import {RentalPaymentProtocol} from "../src/payment/RentalPaymentProtocol.sol";

/**
 * @title DeployRevenueAndInvestor
 * @notice Deploy revenue distribution and investor management contracts
 * @dev These contracts handle automated revenue distribution and investment requests
 */
contract DeployRevenueAndInvestor is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Get addresses from previous deployments
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");
        address investorTypeRegistry = vm.envAddress("INVESTOR_TYPE_REGISTRY");
        // Bank address (could be treasury/multisig/escrow)
        address deployerAddress = vm.addr(deployerPrivateKey);
        address bankAddress = vm.envOr("BANK_ADDRESS", owner);

        // If bank address equals owner/deployer, use identityRegistry as placeholder to avoid same-address error
        if (bankAddress == owner || bankAddress == deployerAddress) {
            bankAddress = identityRegistry;
        }

        console.log("=== Deploying Revenue and Investor Management ===");
        console.log("Deployer:", deployerAddress);
        console.log("Owner:", owner);
        console.log("Bank Address:", bankAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RevenueDistributor (no constructor params)
        console.log("\n1. Deploying RevenueDistributor...");
        RevenueDistributor revenueDistributor = new RevenueDistributor();
        console.log("RevenueDistributor deployed at:", address(revenueDistributor));

        // 2. Deploy InvestorRequestManager
        console.log("\n2. Deploying InvestorRequestManager...");
        InvestorRequestManager investorRequestManager = new InvestorRequestManager(
            bankAddress,
            investorTypeRegistry,
            identityRegistry
        );
        console.log("InvestorRequestManager deployed at:", address(investorRequestManager));

        // 3. Deploy MultiSigWallet (for platform governance)
        console.log("\n3. Deploying MultiSigWallet...");
        MultiSigWallet multiSigWallet = new MultiSigWallet(
            owner,
            bankAddress
        );
        console.log("MultiSigWallet deployed at:", address(multiSigWallet));

        // 4. Wire RentalPaymentProtocol → RevenueDistributor
        address rentalPaymentProtocol = vm.envOr("RENTAL_PAYMENT_PROTOCOL", address(0));
        if (rentalPaymentProtocol != address(0)) {
            console.log("\n4. Wiring RentalPaymentProtocol -> RevenueDistributor...");
            RentalPaymentProtocol(rentalPaymentProtocol).setRevenueDistributor(
                address(revenueDistributor)
            );
            revenueDistributor.setAuthorizedSource(rentalPaymentProtocol, true);
            console.log("Revenue pipeline connected");
        } else {
            console.log("\nNote: RENTAL_PAYMENT_PROTOCOL not set, skipping revenue wiring");
        }

        vm.stopBroadcast();

        console.log("\n=== Revenue and Investor Management Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("REVENUE_DISTRIBUTOR=", address(revenueDistributor));
        console.log("INVESTOR_REQUEST_MANAGER=", address(investorRequestManager));
        console.log("MULTISIG_WALLET=", address(multiSigWallet));
    }
}
