// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVehicleNFT} from "../interfaces/vehicle/IVehicleNFT.sol";

/**
 * @title VehicleNFT
 * @notice ERC-721 NFT representing individual vehicles on the rental platform
 * @dev Each vehicle is tokenized with metadata, status tracking, and links to Asset/Revenue tokens
 *
 * Key Features:
 * - Unique NFT per vehicle with VIN validation
 * - Links to AssetToken (ownership) and RevenueToken (income rights)
 * - Status management (Available, Rented, Maintenance, Retired)
 * - Maintenance and incident tracking
 * - Current booking tracking
 * - Role-based access control for operators
 */
contract VehicleNFT is ERC721, Ownable, IVehicleNFT {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Counter for vehicle token IDs
    uint256 private _tokenIdCounter;

    /// @notice Mapping from token ID to vehicle metadata
    mapping(uint256 => VehicleMetadata) private _vehicleMetadata;

    /// @notice Mapping from token ID to vehicle status
    mapping(uint256 => VehicleStatus) private _vehicleStatus;

    /// @notice Mapping from token ID to linked AssetToken address
    mapping(uint256 => address) private _assetTokens;

    /// @notice Mapping from token ID to linked RevenueToken address
    mapping(uint256 => address) private _revenueTokens;

    /// @notice Mapping from token ID to current booking ID
    mapping(uint256 => uint256) private _currentBookings;

    /// @notice Mapping from token ID to maintenance records
    mapping(uint256 => MaintenanceRecord[]) private _maintenanceHistory;

    /// @notice Mapping from token ID to incident records
    mapping(uint256 => IncidentRecord[]) private _incidentHistory;

    /// @notice Mapping from VIN to token ID (for uniqueness check)
    mapping(string => uint256) private _vinToTokenId;

    /// @notice Mapping from VIN to registration status
    mapping(string => bool) private _vinRegistered;

    /// @notice Authorized operators who can update vehicle data
    mapping(address => bool) public operators;

    /// @notice Rental booking contract address (can update status and bookings)
    address public rentalBookingContract;

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert VehicleNFT__Unauthorized();
        }
        _;
    }

    modifier onlyRentalContract() {
        if (msg.sender != rentalBookingContract && msg.sender != owner()) {
            revert VehicleNFT__Unauthorized();
        }
        _;
    }

    modifier vehicleExist(uint256 tokenId) {
        if (!_exists(tokenId)) {
            revert VehicleNFT__VehicleNotFound();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor for VehicleNFT
     */
    constructor() ERC721("RegShield Vehicle", "RSVEH") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from token ID 1
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Add or remove operator
     * @param operator Address to update
     * @param status True to add, false to remove
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }

    /**
     * @notice Set rental booking contract address
     * @param _rentalBookingContract Address of rental booking contract
     */
    function setRentalBookingContract(address _rentalBookingContract) external onlyOwner {
        rentalBookingContract = _rentalBookingContract;
    }

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
    ) external override onlyOperator returns (uint256 tokenId) {
        // Validate VIN
        if (bytes(metadata.vin).length == 0) {
            revert VehicleNFT__InvalidVIN();
        }
        if (_vinRegistered[metadata.vin]) {
            revert VehicleNFT__VINAlreadyExists();
        }

        // Validate token addresses
        if (assetToken == address(0) || revenueToken == address(0)) {
            revert VehicleNFT__InvalidTokenAddress();
        }

        // Mint NFT
        tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);

        // Store metadata
        _vehicleMetadata[tokenId] = metadata;
        _vehicleStatus[tokenId] = VehicleStatus.Available;
        _assetTokens[tokenId] = assetToken;
        _revenueTokens[tokenId] = revenueToken;

        // Register VIN
        _vinToTokenId[metadata.vin] = tokenId;
        _vinRegistered[metadata.vin] = true;

        emit VehicleMinted(tokenId, metadata.vin, to, assetToken, revenueToken);
        emit TokensLinked(tokenId, assetToken, revenueToken);
    }

    /**
     * @notice Update vehicle status
     * @param tokenId Vehicle NFT token ID
     * @param newStatus New status
     */
    function updateStatus(uint256 tokenId, VehicleStatus newStatus)
        external
        override
        onlyRentalContract
        vehicleExist(tokenId)
    {
        VehicleStatus oldStatus = _vehicleStatus[tokenId];
        _vehicleStatus[tokenId] = newStatus;

        emit VehicleStatusUpdated(tokenId, oldStatus, newStatus);
    }

    /**
     * @notice Link AssetToken and RevenueToken to vehicle (if not done at mint)
     * @param tokenId Vehicle NFT token ID
     * @param assetToken Address of AssetToken
     * @param revenueToken Address of RevenueToken
     */
    function linkTokens(uint256 tokenId, address assetToken, address revenueToken)
        external
        override
        onlyOperator
        vehicleExist(tokenId)
    {
        if (_assetTokens[tokenId] != address(0) || _revenueTokens[tokenId] != address(0)) {
            revert VehicleNFT__TokensAlreadyLinked();
        }
        if (assetToken == address(0) || revenueToken == address(0)) {
            revert VehicleNFT__InvalidTokenAddress();
        }

        _assetTokens[tokenId] = assetToken;
        _revenueTokens[tokenId] = revenueToken;

        emit TokensLinked(tokenId, assetToken, revenueToken);
    }

    /**
     * @notice Update vehicle mileage
     * @param tokenId Vehicle NFT token ID
     * @param newMileage New mileage value
     */
    function updateMileage(uint256 tokenId, uint256 newMileage)
        external
        override
        onlyOperator
        vehicleExist(tokenId)
    {
        uint256 oldMileage = _vehicleMetadata[tokenId].mileage;

        // Mileage should only increase
        if (newMileage < oldMileage) {
            revert VehicleNFT__InvalidMileage();
        }

        _vehicleMetadata[tokenId].mileage = newMileage;

        emit MileageUpdated(tokenId, oldMileage, newMileage, msg.sender);
    }

    /**
     * @notice Record maintenance event
     * @param tokenId Vehicle NFT token ID
     * @param description Maintenance description
     * @param cost Maintenance cost
     * @return maintenanceId ID of the maintenance record
     */
    function recordMaintenance(uint256 tokenId, string memory description, uint256 cost)
        external
        override
        onlyOperator
        vehicleExist(tokenId)
        returns (uint256 maintenanceId)
    {
        MaintenanceRecord memory record = MaintenanceRecord({
            timestamp: block.timestamp,
            description: description,
            cost: cost,
            performer: msg.sender
        });

        _maintenanceHistory[tokenId].push(record);
        maintenanceId = _maintenanceHistory[tokenId].length - 1;

        emit MaintenanceRecorded(tokenId, maintenanceId, description, cost);
    }

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
        override
        onlyOperator
        vehicleExist(tokenId)
        returns (uint256 incidentId)
    {
        IncidentRecord memory record = IncidentRecord({
            timestamp: block.timestamp,
            description: description,
            estimatedCost: estimatedCost,
            bookingId: bookingId,
            reporter: msg.sender,
            resolved: false
        });

        _incidentHistory[tokenId].push(record);
        incidentId = _incidentHistory[tokenId].length - 1;

        emit IncidentRecorded(tokenId, incidentId, description, estimatedCost, bookingId);
    }

    /**
     * @notice Resolve incident
     * @param tokenId Vehicle NFT token ID
     * @param incidentId Incident ID
     * @param actualCost Actual repair cost
     */
    function resolveIncident(uint256 tokenId, uint256 incidentId, uint256 actualCost)
        external
        override
        onlyOperator
        vehicleExist(tokenId)
    {
        if (incidentId >= _incidentHistory[tokenId].length) {
            revert VehicleNFT__IncidentNotFound();
        }

        IncidentRecord storage incident = _incidentHistory[tokenId][incidentId];
        if (incident.resolved) {
            revert VehicleNFT__IncidentAlreadyResolved();
        }

        incident.resolved = true;
        incident.estimatedCost = actualCost; // Update to actual cost

        emit IncidentResolved(tokenId, incidentId, actualCost);
    }

    /**
     * @notice Set current booking for vehicle
     * @param tokenId Vehicle NFT token ID
     * @param bookingId Booking ID (0 to clear)
     */
    function setCurrentBooking(uint256 tokenId, uint256 bookingId)
        external
        override
        onlyRentalContract
        vehicleExist(tokenId)
    {
        _currentBookings[tokenId] = bookingId;

        emit BookingUpdated(tokenId, bookingId);
    }

    /**
     * @notice Update vehicle metadata field
     * @param tokenId Vehicle NFT token ID
     * @param field Field name to update
     * @param value New value
     */
    function updateMetadataField(uint256 tokenId, string memory field, string memory value)
        external
        override
        onlyOperator
        vehicleExist(tokenId)
    {
        // Update specific fields (extend as needed)
        bytes32 fieldHash = keccak256(bytes(field));

        if (fieldHash == keccak256(bytes("color"))) {
            _vehicleMetadata[tokenId].color = value;
        } else if (fieldHash == keccak256(bytes("make"))) {
            _vehicleMetadata[tokenId].make = value;
        } else if (fieldHash == keccak256(bytes("model"))) {
            _vehicleMetadata[tokenId].model = value;
        }
        // Note: VIN cannot be updated for security

        emit MetadataUpdated(tokenId, field, value);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get vehicle metadata
     * @param tokenId Vehicle NFT token ID
     * @return metadata Vehicle metadata
     */
    function getVehicleMetadata(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (VehicleMetadata memory metadata)
    {
        return _vehicleMetadata[tokenId];
    }

    /**
     * @notice Get vehicle status
     * @param tokenId Vehicle NFT token ID
     * @return status Current status
     */
    function getVehicleStatus(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (VehicleStatus status)
    {
        return _vehicleStatus[tokenId];
    }

    /**
     * @notice Get linked tokens
     * @param tokenId Vehicle NFT token ID
     * @return assetToken AssetToken address
     * @return revenueToken RevenueToken address
     */
    function getLinkedTokens(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (address assetToken, address revenueToken)
    {
        return (_assetTokens[tokenId], _revenueTokens[tokenId]);
    }

    /**
     * @notice Get current booking ID
     * @param tokenId Vehicle NFT token ID
     * @return bookingId Current booking ID (0 if none)
     */
    function getCurrentBooking(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (uint256 bookingId)
    {
        return _currentBookings[tokenId];
    }

    /**
     * @notice Get maintenance history
     * @param tokenId Vehicle NFT token ID
     * @return records Array of maintenance records
     */
    function getMaintenanceHistory(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (MaintenanceRecord[] memory records)
    {
        return _maintenanceHistory[tokenId];
    }

    /**
     * @notice Get incident history
     * @param tokenId Vehicle NFT token ID
     * @return records Array of incident records
     */
    function getIncidentHistory(uint256 tokenId)
        external
        view
        override
        vehicleExist(tokenId)
        returns (IncidentRecord[] memory records)
    {
        return _incidentHistory[tokenId];
    }

    /**
     * @notice Check if vehicle exists
     * @param tokenId Vehicle NFT token ID
     * @return exists Whether vehicle exists
     */
    function vehicleExists(uint256 tokenId) external view override returns (bool exists) {
        return _exists(tokenId);
    }

    /**
     * @notice Check if VIN is already registered
     * @param vin Vehicle Identification Number
     * @return registered Whether VIN is registered
     */
    function isVINRegistered(string memory vin) external view override returns (bool registered) {
        return _vinRegistered[vin];
    }

    /**
     * @notice Get token ID by VIN
     * @param vin Vehicle Identification Number
     * @return tokenId Token ID (0 if not found)
     */
    function getTokenIdByVIN(string memory vin) external view override returns (uint256 tokenId) {
        return _vinToTokenId[vin];
    }

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
        override
        vehicleExist(tokenId)
        returns (
            VehicleMetadata memory metadata,
            VehicleStatus status,
            address assetToken,
            address revenueToken,
            uint256 currentBooking,
            uint256 maintenanceCount,
            uint256 incidentCount
        )
    {
        return (
            _vehicleMetadata[tokenId],
            _vehicleStatus[tokenId],
            _assetTokens[tokenId],
            _revenueTokens[tokenId],
            _currentBookings[tokenId],
            _maintenanceHistory[tokenId].length,
            _incidentHistory[tokenId].length
        );
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if token exists
     * @param tokenId Token ID to check
     * @return Whether token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
