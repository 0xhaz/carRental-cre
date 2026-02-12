// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RevenueDistributor} from "../src/revenue/RevenueDistributor.sol";
import {InvestorRequestManager} from "../src/investor/InvestorRequestManager.sol";
import {MultiSigWallet} from "../src/investor/MultiSigWallet.sol";

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
        address identityRegistry = vm.envOr("IDENTITY_REGISTRY", address(0));
        address vehicleNFT = vm.envOr("VEHICLE_NFT", address(0));

        console.log("=== Deploying Revenue and Investor Management ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RevenueDistributor
        console.log("\n1. Deploying RevenueDistributor...");
        RevenueDistributor revenueDistributor = new RevenueDistributor(vehicleNFT);
        console.log("RevenueDistributor deployed at:", address(revenueDistributor));

        // 2. Deploy InvestorRequestManager
        console.log("\n2. Deploying InvestorRequestManager...");
        InvestorRequestManager investorRequestManager = new InvestorRequestManager(
            identityRegistry
        );
        console.log("InvestorRequestManager deployed at:", address(investorRequestManager));

        // 3. Deploy MultiSigWallet (for platform governance)
        console.log("\n3. Deploying MultiSigWallet...");

        // Setup initial owners (deployer and configured owner)
        address[] memory owners = new address[](2);
        owners[0] = vm.addr(deployerPrivateKey);
        owners[1] = owner;

        uint256 requiredConfirmations = 2; // Both must approve

        MultiSigWallet multiSigWallet = new MultiSigWallet(owners, requiredConfirmations);
        console.log("MultiSigWallet deployed at:", address(multiSigWallet));
        console.log("Owners:", owners[0], owners[1]);
        console.log("Required confirmations:", requiredConfirmations);

        vm.stopBroadcast();

        console.log("\n=== Revenue and Investor Management Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("REVENUE_DISTRIBUTOR=", address(revenueDistributor));
        console.log("INVESTOR_REQUEST_MANAGER=", address(investorRequestManager));
        console.log("MULTISIG_WALLET=", address(multiSigWallet));
    }
}
