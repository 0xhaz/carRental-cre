// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AssetToken} from "./AssetToken.sol";
import {RevenueToken} from "./RevenueToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetTokenFactory
 * @notice Deploys AssetToken instances for vehicles.
 * @dev Separated from RevenueTokenFactory to stay under the 24576-byte contract size limit.
 */
contract AssetTokenFactory is Ownable {
    address public identityRegistry;
    address public compliance;
    address public paymentProtocol;

    event AssetTokenDeployed(
        string indexed vehicleVIN,
        address assetToken,
        address deployer
    );

    error TokenFactory__ZeroAddress();

    constructor(
        address _identityRegistry,
        address _compliance,
        address _paymentProtocol
    ) Ownable(msg.sender) {
        if (_identityRegistry == address(0) || _compliance == address(0) || _paymentProtocol == address(0)) {
            revert TokenFactory__ZeroAddress();
        }
        identityRegistry = _identityRegistry;
        compliance = _compliance;
        paymentProtocol = _paymentProtocol;
    }

    /**
     * @notice Deploy an AssetToken for a vehicle.
     * @param name Token name (e.g. "RegShield Tesla Model 3")
     * @param symbol Token symbol (e.g. "RST3")
     * @param supplyCap Maximum token supply in wei
     * @param vehicleVIN Vehicle identification number
     * @return assetToken Address of the deployed AssetToken
     */
    function deployAssetToken(
        string calldata name,
        string calldata symbol,
        uint256 supplyCap,
        string calldata vehicleVIN
    ) external returns (address assetToken) {
        AssetToken token = new AssetToken(
            name,
            symbol,
            identityRegistry,
            compliance,
            supplyCap,
            vehicleVIN,
            true // isFractional
        );

        token.addAgent(paymentProtocol);
        // Keep admin (factory owner) as token owner for compliance management
        // The rentor is tracked off-chain and set as operator via setVehicleOperator
        token.transferOwnership(owner());

        assetToken = address(token);
        emit AssetTokenDeployed(vehicleVIN, assetToken, msg.sender);
    }

    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) revert TokenFactory__ZeroAddress();
        paymentProtocol = _paymentProtocol;
    }

    function setCompliance(address _compliance) external onlyOwner {
        if (_compliance == address(0)) revert TokenFactory__ZeroAddress();
        compliance = _compliance;
    }
}

/**
 * @title RevenueTokenFactory
 * @notice Deploys RevenueToken instances for vehicles.
 */
contract RevenueTokenFactory is Ownable {
    address public identityRegistry;
    address public compliance;
    address public paymentProtocol;

    event RevenueTokenDeployed(
        string indexed vehicleVIN,
        address revenueToken,
        address deployer
    );

    error TokenFactory__ZeroAddress();

    constructor(
        address _identityRegistry,
        address _compliance,
        address _paymentProtocol
    ) Ownable(msg.sender) {
        if (_identityRegistry == address(0) || _compliance == address(0) || _paymentProtocol == address(0)) {
            revert TokenFactory__ZeroAddress();
        }
        identityRegistry = _identityRegistry;
        compliance = _compliance;
        paymentProtocol = _paymentProtocol;
    }

    /**
     * @notice Deploy a RevenueToken for a vehicle.
     * @param name Token name (e.g. "RegShield Tesla Model 3 Revenue")
     * @param symbol Token symbol (e.g. "RST3R")
     * @param supplyCap Maximum token supply in wei
     * @param vehicleVIN Vehicle identification number
     * @param minimumHoldingPeriod Minimum holding period in seconds
     * @return revenueToken Address of the deployed RevenueToken
     */
    function deployRevenueToken(
        string calldata name,
        string calldata symbol,
        uint256 supplyCap,
        string calldata vehicleVIN,
        uint256 minimumHoldingPeriod
    ) external returns (address revenueToken) {
        RevenueToken token = new RevenueToken(
            name,
            symbol,
            identityRegistry,
            compliance,
            supplyCap,
            vehicleVIN,
            minimumHoldingPeriod,
            false // transfersLocked
        );

        token.addAgent(paymentProtocol);
        // Keep admin (factory owner) as token owner for compliance management
        token.transferOwnership(owner());

        revenueToken = address(token);
        emit RevenueTokenDeployed(vehicleVIN, revenueToken, msg.sender);
    }

    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) revert TokenFactory__ZeroAddress();
        paymentProtocol = _paymentProtocol;
    }

    function setCompliance(address _compliance) external onlyOwner {
        if (_compliance == address(0)) revert TokenFactory__ZeroAddress();
        compliance = _compliance;
    }
}
