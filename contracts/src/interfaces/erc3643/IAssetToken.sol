// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IERC3643} from "./IERC3643.sol";

/**
 * @title IAssetToken
 * @notice Interface for AssetToken - represents vehicle ownership
 */
interface IAssetToken is IERC3643 {
    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event VehicleInfoUpdated(
        string indexed vin,
        uint256 indexed tokenId,
        address vehicleNFTContract
    );

    event VehicleMetadataUpdated(string newMetadataURI);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error AssetToken__SupplyCapExceeded();
    error AssetToken__InvalidVIN();
    error AssetToken__InvalidMetadataURI();
    error AssetToken__VehicleAlreadyLinked();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Link this asset token to a vehicle NFT
     * @param vehicleTokenId Token ID of the vehicle NFT
     * @param vehicleNFTContract Address of the VehicleNFT contract
     */
    function linkToVehicleNFT(uint256 vehicleTokenId, address vehicleNFTContract) external;

    /**
     * @notice Update vehicle metadata URI
     * @param metadataURI New IPFS URI for vehicle metadata
     */
    function updateVehicleMetadata(string memory metadataURI) external;

    /**
     * @notice Get ownership percentage for an address
     * @param owner Address to check
     * @return percentage Ownership percentage in basis points (10000 = 100%)
     */
    function ownershipPercentage(address owner) external view returns (uint256 percentage);

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function vehicleVIN() external view returns (string memory);
    function vehicleTokenId() external view returns (uint256);
    function vehicleNFTContract() external view returns (address);
    function supplyCap() external view returns (uint256);
    function vehicleMetadataURI() external view returns (string memory);
    function isFractional() external view returns (bool);

    function getVehicleInfo()
        external
        view
        returns (
            string memory vin,
            uint256 tokenId,
            address nftContract,
            string memory metadataURI,
            bool fractional,
            uint256 cap
        );

    function isFullyMinted() external view returns (bool);
    function remainingSupply() external view returns (uint256);
}
