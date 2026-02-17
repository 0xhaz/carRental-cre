// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PaymentEscrow} from "../src/payment/PaymentEscrow.sol";
import {RefundManager} from "../src/payment/RefundManager.sol";
import {RegShieldPaymentProtocol} from "../src/payment/RegShieldPaymentProtocol.sol";
import {DisputeResolver} from "../src/payment/DisputeResolver.sol";
import {InvestorRequestManager} from "../src/investor/InvestorRequestManager.sol";

/**
 * @title RedeployInvestmentPayment
 * @notice Redeploy investment payment system with vehicle-level milestones + updated limits
 * @dev Redeploys: RegShieldPaymentProtocol, PaymentEscrow, RefundManager, DisputeResolver, InvestorRequestManager
 *      Then wires: ParticipantTypeRegistry, VehicleNFT
 */
contract RedeployInvestmentPayment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Existing addresses from .env
        address complianceRules = vm.envAddress("COMPLIANCE_RULES");
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");
        address participantTypeRegistry = vm.envAddress("PARTICIPANT_TYPE_REGISTRY");
        address investorTypeRegistry = vm.envAddress("INVESTOR_TYPE_REGISTRY");
        address vehicleNFT = vm.envAddress("VEHICLE_NFT");
        address bankAddress = vm.envAddress("BANK_ADDRESS");

        console.log("=== Redeploying Investment Payment System ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("ComplianceRules:", complianceRules);
        console.log("IdentityRegistry:", identityRegistry);
        console.log("VehicleNFT:", vehicleNFT);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new RegShieldPaymentProtocol (with vehicle-level milestones)
        console.log("\n1. Deploying RegShieldPaymentProtocol...");
        RegShieldPaymentProtocol protocol = new RegShieldPaymentProtocol(
            complianceRules,
            identityRegistry
        );
        console.log("RegShieldPaymentProtocol:", address(protocol));

        // 2. Deploy new PaymentEscrow (with fixed onlyEmergencyAuthority)
        console.log("2. Deploying PaymentEscrow...");
        PaymentEscrow escrow = new PaymentEscrow(address(protocol));
        console.log("PaymentEscrow:", address(escrow));

        // 3. Deploy new RefundManager
        console.log("3. Deploying RefundManager...");
        RefundManager refundMgr = new RefundManager(address(protocol), address(escrow));
        console.log("RefundManager:", address(refundMgr));

        // 4. Deploy new DisputeResolver
        console.log("4. Deploying DisputeResolver...");
        DisputeResolver dispute = new DisputeResolver(address(protocol));
        console.log("DisputeResolver:", address(dispute));

        // 5. Deploy new InvestorRequestManager (with retail max 10 ETH)
        console.log("5. Deploying InvestorRequestManager...");
        InvestorRequestManager irm = new InvestorRequestManager(
            bankAddress,
            investorTypeRegistry,
            identityRegistry
        );
        console.log("InvestorRequestManager:", address(irm));

        // 6. Configure protocol
        console.log("\n6. Configuring protocol...");
        protocol.setPaymentEscrow(address(escrow));
        protocol.setRefundManager(address(refundMgr));
        protocol.setDisputeResolver(address(dispute));
        protocol.setParticipantTypeRegistry(participantTypeRegistry);
        protocol.setInvestorRequestManager(address(irm));
        protocol.setVehicleNFT(vehicleNFT);
        console.log("Protocol configured with all dependencies");

        // 7. Configure InvestorRequestManager
        console.log("\n7. Configuring InvestorRequestManager...");
        irm.setParticipantRegistry(participantTypeRegistry);
        irm.setPaymentProtocol(address(protocol));
        console.log("InvestorRequestManager configured");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("\nUpdate .env and frontend with these addresses:");
        console.log("INVESTMENT_PAYMENT_PROTOCOL=", address(protocol));
        console.log("INVESTMENT_ESCROW=", address(escrow));
        console.log("INVESTMENT_REFUND_MANAGER=", address(refundMgr));
        console.log("DISPUTE_RESOLVER=", address(dispute));
        console.log("INVESTOR_REQUEST_MANAGER=", address(irm));
    }
}
