// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IERC3643} from "./IERC3643.sol";

/**
 * @title IRevenueToken
 * @notice Interface for RevenueToken - represents rental income rights
 */
interface IRevenueToken is IERC3643 {
    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event RevenueDistributed(
        address indexed holder,
        uint256 amount,
        uint256 totalDistributed,
        uint256 timestamp
    );

    event TransferLockUpdated(bool locked, uint256 unlockTime);

    event RevenueDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    event VehicleLinked(
        string indexed vin,
        uint256 indexed tokenId,
        address vehicleNFTContract,
        address assetToken
    );

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error RevenueToken__TransfersLocked();
    error RevenueToken__HoldingPeriodNotMet();
    error RevenueToken__SupplyCapExceeded();
    error RevenueToken__InvalidVIN();
    error RevenueToken__VehicleAlreadyLinked();
    error RevenueToken__OnlyRevenueDistributor();
    error RevenueToken__InvalidDistributor();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set the revenue distributor contract address
     * @param revenueDistributor Address of revenue distributor contract
     */
    function setRevenueDistributor(address revenueDistributor) external;

    /**
     * @notice Record revenue distribution to a holder
     * @param holder Address receiving revenue
     * @param amount Amount of revenue distributed
     */
    function recordRevenueDistribution(address holder, uint256 amount) external;

    /**
     * @notice Link this revenue token to vehicle and asset token
     * @param vehicleTokenId Token ID of the vehicle NFT
     * @param vehicleNFTContract Address of the VehicleNFT contract
     * @param assetToken Address of the corresponding AssetToken
     */
    function linkToVehicle(
        uint256 vehicleTokenId,
        address vehicleNFTContract,
        address assetToken
    ) external;

    /**
     * @notice Update transfer lock status
     * @param locked Whether transfers should be locked
     * @param unlockTime Timestamp when transfers can be unlocked
     */
    function updateTransferLock(bool locked, uint256 unlockTime) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function vehicleVIN() external view returns (string memory);
    function vehicleTokenId() external view returns (uint256);
    function vehicleNFTContract() external view returns (address);
    function assetToken() external view returns (address);
    function supplyCap() external view returns (uint256);
    function transfersLocked() external view returns (bool);
    function minimumHoldingPeriod() external view returns (uint256);
    function transferUnlockTime() external view returns (uint256);
    function totalRevenueDistributed() external view returns (uint256);
    function revenueDistributor() external view returns (address);

    function lastTokenReceiptTime(address holder) external view returns (uint256);
    function accumulatedRevenue(address holder) external view returns (uint256);

    function getRevenueInfo(address holder)
        external
        view
        returns (
            uint256 balance,
            uint256 accumulated,
            uint256 receiptTime,
            bool canTransfer
        );

    function getVehicleInfo()
        external
        view
        returns (
            string memory vin,
            uint256 tokenId,
            address nftContract,
            address asset,
            uint256 cap,
            uint256 distributed
        );

    function isFullyMinted() external view returns (bool);
    function remainingSupply() external view returns (uint256);
    function revenueSharePercentage(address holder) external view returns (uint256 percentage);
}
