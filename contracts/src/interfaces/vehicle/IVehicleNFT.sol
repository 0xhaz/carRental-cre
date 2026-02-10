// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IVehicleNFT
 * @notice Interface for Vehicle NFT registry - represents individual vehicles on the platform
 * @dev Each vehicle is a unique NFT linked to AssetToken and RevenueToken contracts
 */
interface IVehicleNFT is IERC721 {
    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/

    enum VehicleStatus {
        Available, // Vehicle is available for rental
        Rented, // Vehicle is currently rented
        Maintenance, // Vehicle is under maintenance
        Retired // Vehicle has been retired from the fleet
    }

    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct VehicleMetadata {
        string vin; // Vehicle Identification Number
        string make; // Manufacturer (e.g., Tesla, Toyota)
        string model; // Model name (e.g., Model 3, Camry)
        uint256 year; // Manufacturing year
        string color; // Vehicle color
        uint256 mileage; // Current mileage
        uint256 registrationExpiry; // Registration expiration timestamp
        uint256 insuranceExpiry; // Insurance expiration timestamp
    }

    struct MaintenanceRecord {
        uint256 timestamp; // When maintenance occurred
        string description; // Description of maintenance
        uint256 cost; // Cost of maintenance
        address performer; // Who performed the maintenance
    }

    struct IncidentRecord {
        uint256 timestamp; // When incident occurred
        string description; // Description of incident
        uint256 estimatedCost; // Estimated repair cost
        uint256 bookingId; // Associated booking (0 if not during rental)
        address reporter; // Who reported the incident
        bool resolved; // Whether incident is resolved
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event VehicleMinted(
        uint256 indexed tokenId,
        string indexed vin,
        address indexed owner,
        address assetToken,
        address revenueToken
    );

    event VehicleStatusUpdated(uint256 indexed tokenId, VehicleStatus oldStatus, VehicleStatus newStatus);

    event TokensLinked(uint256 indexed tokenId, address assetToken, address revenueToken);

    event MileageUpdated(uint256 indexed tokenId, uint256 oldMileage, uint256 newMileage, address updater);

    event MaintenanceRecorded(
        uint256 indexed tokenId, uint256 indexed maintenanceId, string description, uint256 cost
    );

    event IncidentRecorded(
        uint256 indexed tokenId,
        uint256 indexed incidentId,
        string description,
        uint256 estimatedCost,
        uint256 bookingId
    );

    event IncidentResolved(uint256 indexed tokenId, uint256 indexed incidentId, uint256 actualCost);

    event BookingUpdated(uint256 indexed tokenId, uint256 indexed bookingId);

    event MetadataUpdated(uint256 indexed tokenId, string field, string newValue);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error VehicleNFT__VINAlreadyExists();
    error VehicleNFT__InvalidVIN();
    error VehicleNFT__VehicleNotFound();
    error VehicleNFT__TokensAlreadyLinked();
    error VehicleNFT__InvalidTokenAddress();
    error VehicleNFT__Unauthorized();
    error VehicleNFT__VehicleNotAvailable();
    error VehicleNFT__InvalidStatus();
    error VehicleNFT__IncidentNotFound();
    error VehicleNFT__IncidentAlreadyResolved();
    error VehicleNFT__InvalidMileage();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint a new vehicle NFT
     * @param to Address to mint the NFT to (rentor)
     * @param metadata Vehicle metadata
     * @param assetToken Address of the AssetToken contract
     * @param revenueToken Address of the RevenueToken contract
     * @return tokenId The ID of the newly minted vehicle NFT
     */
    function mintVehicle(
        address to,
        VehicleMetadata memory metadata,
        address assetToken,
        address revenueToken
    ) external returns (uint256 tokenId);

    /**
     * @notice Update vehicle status
     * @param tokenId Vehicle NFT token ID
     * @param newStatus New status
     */
    function updateStatus(uint256 tokenId, VehicleStatus newStatus) external;

    /**
     * @notice Link AssetToken and RevenueToken to vehicle (if not done at mint)
     * @param tokenId Vehicle NFT token ID
     * @param assetToken Address of AssetToken
     * @param revenueToken Address of RevenueToken
     */
    function linkTokens(uint256 tokenId, address assetToken, address revenueToken) external;

    /**
     * @notice Update vehicle mileage
     * @param tokenId Vehicle NFT token ID
     * @param newMileage New mileage value
     */
    function updateMileage(uint256 tokenId, uint256 newMileage) external;

    /**
     * @notice Record maintenance event
     * @param tokenId Vehicle NFT token ID
     * @param description Maintenance description
     * @param cost Maintenance cost
     * @return maintenanceId ID of the maintenance record
     */
    function recordMaintenance(uint256 tokenId, string memory description, uint256 cost)
        external
        returns (uint256 maintenanceId);

    /**
     * @notice Record incident/damage
     * @param tokenId Vehicle NFT token ID
     * @param description Incident description
     * @param estimatedCost Estimated repair cost
     * @param bookingId Associated booking (0 if not during rental)
     * @return incidentId ID of the incident record
     */
    function recordIncident(uint256 tokenId, string memory description, uint256 estimatedCost, uint256 bookingId)
        external
        returns (uint256 incidentId);

    /**
     * @notice Resolve incident
     * @param tokenId Vehicle NFT token ID
     * @param incidentId Incident ID
     * @param actualCost Actual repair cost
     */
    function resolveIncident(uint256 tokenId, uint256 incidentId, uint256 actualCost) external;

    /**
     * @notice Set current booking for vehicle
     * @param tokenId Vehicle NFT token ID
     * @param bookingId Booking ID (0 to clear)
     */
    function setCurrentBooking(uint256 tokenId, uint256 bookingId) external;

    /**
     * @notice Update vehicle metadata field
     * @param tokenId Vehicle NFT token ID
     * @param field Field name to update
     * @param value New value
     */
    function updateMetadataField(uint256 tokenId, string memory field, string memory value) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get vehicle metadata
     * @param tokenId Vehicle NFT token ID
     * @return metadata Vehicle metadata
     */
    function getVehicleMetadata(uint256 tokenId) external view returns (VehicleMetadata memory metadata);

    /**
     * @notice Get vehicle status
     * @param tokenId Vehicle NFT token ID
     * @return status Current status
     */
    function getVehicleStatus(uint256 tokenId) external view returns (VehicleStatus status);

    /**
     * @notice Get linked tokens
     * @param tokenId Vehicle NFT token ID
     * @return assetToken AssetToken address
     * @return revenueToken RevenueToken address
     */
    function getLinkedTokens(uint256 tokenId) external view returns (address assetToken, address revenueToken);

    /**
     * @notice Get current booking ID
     * @param tokenId Vehicle NFT token ID
     * @return bookingId Current booking ID (0 if none)
     */
    function getCurrentBooking(uint256 tokenId) external view returns (uint256 bookingId);

    /**
     * @notice Get maintenance history
     * @param tokenId Vehicle NFT token ID
     * @return records Array of maintenance records
     */
    function getMaintenanceHistory(uint256 tokenId) external view returns (MaintenanceRecord[] memory records);

    /**
     * @notice Get incident history
     * @param tokenId Vehicle NFT token ID
     * @return records Array of incident records
     */
    function getIncidentHistory(uint256 tokenId) external view returns (IncidentRecord[] memory records);

    /**
     * @notice Check if vehicle exists
     * @param tokenId Vehicle NFT token ID
     * @return exists Whether vehicle exists
     */
    function vehicleExists(uint256 tokenId) external view returns (bool exists);

    /**
     * @notice Check if VIN is already registered
     * @param vin Vehicle Identification Number
     * @return registered Whether VIN is registered
     */
    function isVINRegistered(string memory vin) external view returns (bool registered);

    /**
     * @notice Get token ID by VIN
     * @param vin Vehicle Identification Number
     * @return tokenId Token ID (0 if not found)
     */
    function getTokenIdByVIN(string memory vin) external view returns (uint256 tokenId);

    /**
     * @notice Get complete vehicle information
     * @param tokenId Vehicle NFT token ID
     * @return metadata Vehicle metadata
     * @return status Current status
     * @return assetToken AssetToken address
     * @return revenueToken RevenueToken address
     * @return currentBooking Current booking ID
     * @return maintenanceCount Number of maintenance records
     * @return incidentCount Number of incident records
     */
    function getVehicleInfo(uint256 tokenId)
        external
        view
        returns (
            VehicleMetadata memory metadata,
            VehicleStatus status,
            address assetToken,
            address revenueToken,
            uint256 currentBooking,
            uint256 maintenanceCount,
            uint256 incidentCount
        );
}
