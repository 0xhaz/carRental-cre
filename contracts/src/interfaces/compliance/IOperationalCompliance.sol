// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOperationalCompliance
 * @dev Interface for operational compliance validation in rental car platform
 * @notice Validates vehicle operational status including registration, maintenance, insurance, and permits
 */
interface IOperationalCompliance {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error OperationalCompliance__InvalidAddress();
    error OperationalCompliance__InvalidVehicleId();
    error OperationalCompliance__VehicleNotRegistered();
    error OperationalCompliance__RegistrationExpired();
    error OperationalCompliance__MaintenanceOverdue();
    error OperationalCompliance__InsuranceExpired();
    error OperationalCompliance__NoRegionalPermit();
    error OperationalCompliance__VehicleNotOperational();

    /*//////////////////////////////////////////////////////////////
                                  ENUM
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Vehicle operational status
     */
    enum VehicleStatus {
        UNREGISTERED,       // Not yet registered in the system
        OPERATIONAL,        // Fully operational and compliant
        MAINTENANCE_DUE,    // Maintenance is due soon
        MAINTENANCE_OVERDUE,// Maintenance is overdue
        INSURANCE_EXPIRED,  // Insurance has expired
        REGISTRATION_EXPIRED,// Registration has expired
        NO_PERMIT,          // Missing required regional permit
        SUSPENDED,          // Temporarily suspended
        DECOMMISSIONED      // Permanently removed from service
    }

    /**
     * @dev Validation result reasons for operational compliance
     */
    enum OperationalValidationReason {
        VALID,
        REGISTRATION_EXPIRED,
        MAINTENANCE_OVERDUE,
        INSURANCE_EXPIRED,
        NO_REGIONAL_PERMIT,
        VEHICLE_SUSPENDED,
        VEHICLE_DECOMMISSIONED,
        VEHICLE_NOT_REGISTERED
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Vehicle operational data
     * @param vehicleId Unique vehicle identifier
     * @param status Current operational status
     * @param registrationExpiry Vehicle registration expiration timestamp
     * @param insuranceExpiry Vehicle insurance expiration timestamp
     * @param lastMaintenanceDate Last maintenance completion timestamp
     * @param nextMaintenanceDate Next scheduled maintenance timestamp
     * @param maintenanceInterval Required maintenance interval in seconds
     * @param regionalPermits Mapping of region codes to permit status
     * @param isSuspended Whether the vehicle is temporarily suspended
     */
    struct VehicleOperationalData {
        uint256 vehicleId;
        VehicleStatus status;
        uint256 registrationExpiry;
        uint256 insuranceExpiry;
        uint256 lastMaintenanceDate;
        uint256 nextMaintenanceDate;
        uint256 maintenanceInterval;
        bool isSuspended;
    }

    /**
     * @dev Operational validation result
     * @param isValid Whether the vehicle passes all operational checks
     * @param reason Reason code for the validation result
     * @param operationalData Vehicle operational data
     */
    struct OperationalValidationResult {
        bool isValid;
        OperationalValidationReason reason;
        VehicleOperationalData operationalData;
    }

    /**
     * @dev Maintenance record
     * @param vehicleId Vehicle ID
     * @param maintenanceDate Date of maintenance
     * @param maintenanceType Type of maintenance performed
     * @param performedBy Address that recorded the maintenance
     * @param notes Additional notes
     */
    struct MaintenanceRecord {
        uint256 vehicleId;
        uint256 maintenanceDate;
        string maintenanceType;
        address performedBy;
        string notes;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a vehicle is registered
    event VehicleRegistered(
        uint256 indexed vehicleId,
        address indexed owner,
        uint256 registrationExpiry,
        uint256 insuranceExpiry
    );

    /// @notice Emitted when vehicle operational data is updated
    event VehicleOperationalDataUpdated(
        uint256 indexed vehicleId,
        VehicleStatus status,
        uint256 timestamp
    );

    /// @notice Emitted when maintenance is recorded
    event MaintenanceRecorded(
        uint256 indexed vehicleId,
        string maintenanceType,
        uint256 maintenanceDate,
        uint256 nextMaintenanceDate
    );

    /// @notice Emitted when vehicle registration is renewed
    event RegistrationRenewed(
        uint256 indexed vehicleId,
        uint256 newExpiryDate
    );

    /// @notice Emitted when vehicle insurance is renewed
    event InsuranceRenewed(
        uint256 indexed vehicleId,
        uint256 newExpiryDate
    );

    /// @notice Emitted when a regional permit is added
    event RegionalPermitAdded(
        uint256 indexed vehicleId,
        uint16 regionCode,
        uint256 expiryDate
    );

    /// @notice Emitted when a regional permit is revoked
    event RegionalPermitRevoked(
        uint256 indexed vehicleId,
        uint16 regionCode
    );

    /// @notice Emitted when a vehicle is suspended
    event VehicleSuspended(
        uint256 indexed vehicleId,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when a vehicle suspension is lifted
    event VehicleSuspensionLifted(
        uint256 indexed vehicleId,
        uint256 timestamp
    );

    /// @notice Emitted when a vehicle is decommissioned
    event VehicleDecommissioned(
        uint256 indexed vehicleId,
        string reason,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                        VALIDATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate if a vehicle meets all operational compliance requirements
     * @param vehicleId ID of the vehicle
     * @return result Complete validation result with operational data
     */
    function validateVehicle(uint256 vehicleId) external view returns (OperationalValidationResult memory result);

    /**
     * @dev Validate if a vehicle can operate in a specific region
     * @param vehicleId ID of the vehicle
     * @param regionCode Region code to check
     * @return isValid Whether the vehicle can operate in the region
     */
    function validateRegionalPermit(uint256 vehicleId, uint16 regionCode) external view returns (bool isValid);

    /**
     * @dev Check if vehicle registration is valid
     * @param vehicleId ID of the vehicle
     * @return isValid Whether registration is valid
     * @return expiryDate Registration expiration date
     */
    function validateRegistration(uint256 vehicleId) external view returns (bool isValid, uint256 expiryDate);

    /**
     * @dev Check if vehicle insurance is valid
     * @param vehicleId ID of the vehicle
     * @return isValid Whether insurance is valid
     * @return expiryDate Insurance expiration date
     */
    function validateInsurance(uint256 vehicleId) external view returns (bool isValid, uint256 expiryDate);

    /**
     * @dev Check if vehicle maintenance is up to date
     * @param vehicleId ID of the vehicle
     * @return isValid Whether maintenance is up to date
     * @return nextMaintenanceDate Next scheduled maintenance date
     */
    function validateMaintenance(uint256 vehicleId) external view returns (bool isValid, uint256 nextMaintenanceDate);

    /*//////////////////////////////////////////////////////////////
                        MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Register a new vehicle in the system
     * @param vehicleId Unique vehicle identifier
     * @param owner Owner address
     * @param registrationExpiry Registration expiration timestamp
     * @param insuranceExpiry Insurance expiration timestamp
     * @param maintenanceInterval Required maintenance interval in seconds
     */
    function registerVehicle(
        uint256 vehicleId,
        address owner,
        uint256 registrationExpiry,
        uint256 insuranceExpiry,
        uint256 maintenanceInterval
    ) external;

    /**
     * @dev Record maintenance for a vehicle
     * @param vehicleId Vehicle ID
     * @param maintenanceType Type of maintenance performed
     * @param notes Additional notes
     */
    function recordMaintenance(
        uint256 vehicleId,
        string calldata maintenanceType,
        string calldata notes
    ) external;

    /**
     * @dev Renew vehicle registration
     * @param vehicleId Vehicle ID
     * @param newExpiryDate New registration expiration date
     */
    function renewRegistration(uint256 vehicleId, uint256 newExpiryDate) external;

    /**
     * @dev Renew vehicle insurance
     * @param vehicleId Vehicle ID
     * @param newExpiryDate New insurance expiration date
     */
    function renewInsurance(uint256 vehicleId, uint256 newExpiryDate) external;

    /**
     * @dev Add regional operating permit for a vehicle
     * @param vehicleId Vehicle ID
     * @param regionCode Region code
     * @param expiryDate Permit expiration date
     */
    function addRegionalPermit(
        uint256 vehicleId,
        uint16 regionCode,
        uint256 expiryDate
    ) external;

    /**
     * @dev Revoke regional operating permit for a vehicle
     * @param vehicleId Vehicle ID
     * @param regionCode Region code
     */
    function revokeRegionalPermit(uint256 vehicleId, uint16 regionCode) external;

    /**
     * @dev Suspend a vehicle from operations
     * @param vehicleId Vehicle ID
     * @param reason Reason for suspension
     */
    function suspendVehicle(uint256 vehicleId, string calldata reason) external;

    /**
     * @dev Lift suspension from a vehicle
     * @param vehicleId Vehicle ID
     */
    function liftSuspension(uint256 vehicleId) external;

    /**
     * @dev Decommission a vehicle permanently
     * @param vehicleId Vehicle ID
     * @param reason Reason for decommissioning
     */
    function decommissionVehicle(uint256 vehicleId, string calldata reason) external;

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get vehicle operational data
     * @param vehicleId Vehicle ID
     * @return data Complete operational data for the vehicle
     */
    function getVehicleOperationalData(uint256 vehicleId)
        external
        view
        returns (VehicleOperationalData memory data);

    /**
     * @dev Get vehicle status
     * @param vehicleId Vehicle ID
     * @return status Current vehicle status
     */
    function getVehicleStatus(uint256 vehicleId) external view returns (VehicleStatus status);

    /**
     * @dev Get maintenance history for a vehicle
     * @param vehicleId Vehicle ID
     * @return records Array of maintenance records
     */
    function getMaintenanceHistory(uint256 vehicleId)
        external
        view
        returns (MaintenanceRecord[] memory records);

    /**
     * @dev Check if vehicle has regional permit
     * @param vehicleId Vehicle ID
     * @param regionCode Region code
     * @return hasPermit Whether the vehicle has a valid permit for the region
     * @return expiryDate Permit expiration date
     */
    function hasRegionalPermit(uint256 vehicleId, uint16 regionCode)
        external
        view
        returns (bool hasPermit, uint256 expiryDate);

    /**
     * @dev Check if vehicle is currently operational
     * @param vehicleId Vehicle ID
     * @return isOperational Whether the vehicle is operational
     */
    function isVehicleOperational(uint256 vehicleId) external view returns (bool isOperational);
}
