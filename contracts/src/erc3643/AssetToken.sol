// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Token} from "./Token.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {ICompliance} from "../interfaces/compliance/ICompliance.sol";

/**
 * @title AssetToken
 * @notice ERC-3643 compliant token representing fractional or full ownership of a specific vehicle
 * @dev Extends base Token with vehicle-specific ownership functionality
 *
 * Key Features:
 * - Represents ownership rights in a specific vehicle
 * - Tradeable among qualified investors (secondary market)
 * - Linked to physical vehicle via VIN
 * - Can be transferred with compliance checks
 * - Supports fractional ownership
 */
contract AssetToken is Token {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Vehicle Identification Number (VIN) this token represents
    string public vehicleVIN;

    /// @notice Vehicle NFT token ID this asset token is linked to
    uint256 public vehicleTokenId;

    /// @notice Address of the VehicleNFT contract
    address public vehicleNFTContract;

    /// @notice Total supply cap (represents full vehicle value)
    uint256 public immutable supplyCap;

    /// @notice Vehicle metadata URI (IPFS link to vehicle details)
    string public vehicleMetadataURI;

    /// @notice Whether this token represents fractional ownership
    bool public isFractional;

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when vehicle information is updated
    event VehicleInfoUpdated(
        string indexed vin,
        uint256 indexed tokenId,
        address vehicleNFTContract
    );

    /// @notice Emitted when vehicle metadata URI is updated
    event VehicleMetadataUpdated(string newMetadataURI);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error AssetToken__SupplyCapExceeded();
    error AssetToken__InvalidVIN();
    error AssetToken__InvalidMetadataURI();
    error AssetToken__VehicleAlreadyLinked();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor for AssetToken
     * @param _name Token name (e.g., "Tesla Model 3 2024 Asset Token")
     * @param _symbol Token symbol (e.g., "TSLA-M3-2024-A")
     * @param _identityRegistryAddress Identity registry contract address
     * @param _complianceAddress Compliance contract address
     * @param _supplyCap Maximum token supply (represents full vehicle value in smallest units)
     * @param _vehicleVIN Vehicle Identification Number
     * @param _isFractional Whether this represents fractional ownership
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _identityRegistryAddress,
        address _complianceAddress,
        uint256 _supplyCap,
        string memory _vehicleVIN,
        bool _isFractional
    ) Token(_name, _symbol, _identityRegistryAddress, _complianceAddress) {
        if (bytes(_vehicleVIN).length == 0) {
            revert AssetToken__InvalidVIN();
        }
        if (_supplyCap == 0) {
            revert AssetToken__SupplyCapExceeded();
        }

        supplyCap = _supplyCap;
        vehicleVIN = _vehicleVIN;
        isFractional = _isFractional;
    }

    /*//////////////////////////////////////////////////////////////
                     VEHICLE-SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Link this asset token to a vehicle NFT
     * @param _vehicleTokenId Token ID of the vehicle NFT
     * @param _vehicleNFTContract Address of the VehicleNFT contract
     * @dev Can only be called once by owner
     */
    function linkToVehicleNFT(uint256 _vehicleTokenId, address _vehicleNFTContract)
        external
        onlyOwner
    {
        if (vehicleNFTContract != address(0)) {
            revert AssetToken__VehicleAlreadyLinked();
        }
        if (_vehicleNFTContract == address(0)) {
            revert AssetToken__InvalidVIN();
        }

        vehicleTokenId = _vehicleTokenId;
        vehicleNFTContract = _vehicleNFTContract;

        emit VehicleInfoUpdated(vehicleVIN, _vehicleTokenId, _vehicleNFTContract);
    }

    /**
     * @notice Update vehicle metadata URI
     * @param _metadataURI New IPFS URI for vehicle metadata
     * @dev Metadata includes: photos, inspection reports, maintenance history
     */
    function updateVehicleMetadata(string memory _metadataURI) external onlyOwner {
        if (bytes(_metadataURI).length == 0) {
            revert AssetToken__InvalidMetadataURI();
        }

        vehicleMetadataURI = _metadataURI;

        emit VehicleMetadataUpdated(_metadataURI);
    }

    /**
     * @notice Get ownership percentage for an address
     * @param owner Address to check
     * @return percentage Ownership percentage in basis points (10000 = 100%)
     */
    function ownershipPercentage(address owner) external view returns (uint256 percentage) {
        if (totalSupply() == 0) return 0;
        return (balanceOf(owner) * 10000) / totalSupply();
    }

    /*//////////////////////////////////////////////////////////////
                     OVERRIDDEN MINT FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint asset tokens with supply cap check
     * @param to Recipient address
     * @param amount Amount to mint
     * @dev Overrides base Token mint to enforce supply cap
     */
    function mint(address to, uint256 amount) external override onlyAgent whenNotPaused {
        if (totalSupply() + amount > supplyCap) {
            revert AssetToken__SupplyCapExceeded();
        }

        // Perform identity and compliance checks (from parent)
        if (!_identityRegistry.isVerified(to)) {
            revert ERC3643__IdentityNotVerified();
        }
        if (!_compliance.canTransfer(address(0), to, amount)) {
            revert ERC3643__ComplianceCheckFailed();
        }

        _mint(to, amount);
        _compliance.created(to, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get complete vehicle information
     * @return vin Vehicle Identification Number
     * @return tokenId Vehicle NFT token ID
     * @return nftContract Address of VehicleNFT contract
     * @return metadataURI IPFS URI for vehicle metadata
     * @return fractional Whether ownership is fractional
     * @return cap Maximum token supply
     */
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
        )
    {
        return (
            vehicleVIN,
            vehicleTokenId,
            vehicleNFTContract,
            vehicleMetadataURI,
            isFractional,
            supplyCap
        );
    }

    /**
     * @notice Check if supply cap has been reached
     * @return True if fully minted
     */
    function isFullyMinted() external view returns (bool) {
        return totalSupply() == supplyCap;
    }

    /**
     * @notice Get remaining tokens that can be minted
     * @return Remaining mintable tokens
     */
    function remainingSupply() external view returns (uint256) {
        return supplyCap - totalSupply();
    }
}
