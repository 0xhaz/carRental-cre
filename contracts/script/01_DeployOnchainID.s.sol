// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {OnchainIDFactory} from "../src/onchainId/OnchainIDFactory.sol";
import {ClaimIssuer} from "../src/onchainId/ClaimIssuer.sol";
import {KeyManager} from "../src/onchainId/KeyManager.sol";

/**
 * @title DeployOnchainID
 * @notice Deploy OnchainID infrastructure contracts
 * @dev These contracts provide the identity foundation for the platform
 */
contract DeployOnchainID is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");

        console.log("=== Deploying OnchainID Infrastructure ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Owner:", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy OnchainIDFactory
        console.log("\n1. Deploying OnchainIDFactory...");
        OnchainIDFactory onchainIDFactory = new OnchainIDFactory(owner);
        console.log("OnchainIDFactory deployed at:", address(onchainIDFactory));

        // 2. Deploy ClaimIssuer (platform will use this to issue claims)
        console.log("\n2. Deploying ClaimIssuer...");
        ClaimIssuer claimIssuer = new ClaimIssuer(
            owner,
            "RegShield Claim Issuer",
            "Official claim issuer for RegShield rental car tokenization platform"
        );
        console.log("ClaimIssuer deployed at:", address(claimIssuer));

        // 3. Deploy KeyManager (manages keys for OnchainID)
        console.log("\n3. Deploying KeyManager...");
        KeyManager keyManager = new KeyManager(owner);
        console.log("KeyManager deployed at:", address(keyManager));

        vm.stopBroadcast();

        console.log("\n=== OnchainID Infrastructure Deployment Complete ===");
        console.log("\nSave these addresses:");
        console.log("ONCHAINID_FACTORY=", address(onchainIDFactory));
        console.log("CLAIM_ISSUER=", address(claimIssuer));
        console.log("KEY_MANAGER=", address(keyManager));
    }
}
