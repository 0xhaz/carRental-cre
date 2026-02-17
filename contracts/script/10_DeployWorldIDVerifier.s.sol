// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {WorldIDVerifier, IWorldID} from "../src/worldid/WorldIDVerifier.sol";

/**
 * @title DeployWorldIDVerifier
 * @notice Deploy the World ID proof verifier for RegShield
 * @dev Requires:
 *   - WORLD_ID_ROUTER: World ID Router contract address
 *     Sepolia: 0x469449f251692e0779667583026b5a1e99512157
 *   - WORLD_APP_ID: Application ID from World ID Developer Portal (e.g. "app_staging_xxx")
 *   - WORLD_ACTION_ID: Action identifier (e.g. "verify-regshield")
 */
contract DeployWorldIDVerifier is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address worldIdRouter = vm.envAddress("WORLD_ID_ROUTER");
        string memory appId = vm.envString("WORLD_APP_ID");
        string memory actionId = vm.envString("WORLD_ACTION_ID");

        console.log("=== Deploying WorldIDVerifier ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("World ID Router:", worldIdRouter);

        vm.startBroadcast(deployerPrivateKey);

        WorldIDVerifier verifier = new WorldIDVerifier(
            IWorldID(worldIdRouter),
            appId,
            actionId
        );

        console.log("WorldIDVerifier deployed at:", address(verifier));

        vm.stopBroadcast();

        console.log("\n=== WorldIDVerifier Deployment Complete ===");
        console.log("Save this address:");
        console.log("WORLD_ID_VERIFIER=", address(verifier));
    }
}
