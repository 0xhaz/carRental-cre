// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ParticipantTypeRegistry} from "../src/erc3643/ParticipantTypeRegistry.sol";

interface ISetParticipantTypeRegistry {
    function setParticipantTypeRegistry(address _participantTypeRegistry) external;
}

interface ISetParticipantRegistry {
    function setParticipantRegistry(address _participantRegistry) external;
}

/**
 * @title RedeployParticipantRegistry
 * @notice Redeploy ParticipantTypeRegistry and update all on-chain references
 * @dev Run: forge script script/RedeployParticipantRegistry.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract RedeployParticipantRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        // Contracts that need their ParticipantTypeRegistry reference updated
        address regShieldPaymentProtocol = vm.envAddress("INVESTMENT_PAYMENT_PROTOCOL");
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");
        address investorRequestManager = vm.envAddress("INVESTOR_REQUEST_MANAGER");

        console.log("=== Redeploying ParticipantTypeRegistry ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy fresh ParticipantTypeRegistry
        console.log("\n1. Deploying ParticipantTypeRegistry...");
        ParticipantTypeRegistry participantTypeRegistry = new ParticipantTypeRegistry(owner);
        address newAddr = address(participantTypeRegistry);
        console.log("ParticipantTypeRegistry deployed at:", newAddr);

        // 2. Set deployer as authorized operator (owner is auto-set in constructor)
        console.log("\n2. Setting authorized operator...");
        // Owner is already authorized in constructor, no extra step needed

        // 3. Update RegShieldPaymentProtocol
        console.log("\n3. Updating RegShieldPaymentProtocol...");
        ISetParticipantTypeRegistry(regShieldPaymentProtocol).setParticipantTypeRegistry(newAddr);
        console.log("RegShieldPaymentProtocol updated");

        // 4. Update IdentityRegistry
        console.log("\n4. Updating IdentityRegistry...");
        ISetParticipantTypeRegistry(identityRegistry).setParticipantTypeRegistry(newAddr);
        console.log("IdentityRegistry updated");

        // 5. Update InvestorRequestManager
        console.log("\n5. Updating InvestorRequestManager...");
        ISetParticipantRegistry(investorRequestManager).setParticipantRegistry(newAddr);
        console.log("InvestorRequestManager updated");

        vm.stopBroadcast();

        console.log("\n=== Redeployment Complete ===");
        console.log("NEW PARTICIPANT_TYPE_REGISTRY=", newAddr);
        console.log("\nUpdate .env and frontend/src/constants/contracts.ts with the new address.");
        console.log("\nNote: RentalPaymentProtocol has the address in its constructor.");
        console.log("It will need a separate redeployment when testing rental flows.");
    }
}
