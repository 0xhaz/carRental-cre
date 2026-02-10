// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOperationalCompliance} from "../interfaces/compliance/IOperationalCompliance.sol";

/**
 * @title OperationalCompliance
 * @dev Implementation of operational compliance validation for rental car platform
 * @notice Manages vehicle registration, maintenance, insurance, and regional permits
 */
contract OperationalCompliance is IOperationalCompliance, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Grace period for maintenance (days before it's considered overdue)
    uint256 public constant MAINTENANCE_GRACE_PERIOD = 7 days;

    /// @notice Grace period for registration/insurance expiry
    uint256 public constant EXPIRY_GRACE_PERIOD = 3 days;

    /*//////////////////////////////////////////////////////////////
                                MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /// @notice Vehicle operational data
    mapping(uint256 => VehicleOperationalData) private _vehicleData;

    /// @notice Vehicle ownership tracking
    mapping(uint256 => address) private _vehicleOwners;

    /// @notice Regional permits per vehicle
    mapping(uint256 => mapping(uint16 => RegionalPermit)) private _regionalPermits;

    /// @notice Maintenance history per vehicle
    mapping(uint256 => MaintenanceRecord[]) private _maintenanceHistory;

    /// @notice Authorized operators (e.g., rental management contracts)
    mapping(address => bool) private _authorizedOperators;

    /// @notice Whether a vehicle has been registered
    mapping(uint256 => bool) private _isVehicleRegistered;

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Regional permit data
    struct RegionalPermit {
        bool isValid;
        uint256 expiryDate;
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedOperator() {
        if (!_authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert OperationalCompliance__InvalidAddress();
        }
        _;
    }

    modifier onlyVehicleOwnerOrOperator(uint256 vehicleId) {
        if (_vehicleOwners[vehicleId] != msg.sender && !_authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert OperationalCompliance__InvalidAddress();
        }
        _;
    }

    modifier vehicleExists(uint256 vehicleId) {
        if (!_isVehicleRegistered[vehicleId]) {
            revert OperationalCompliance__VehicleNotRegistered();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) Ownable(_owner) {
        _authorizedOperators[_owner] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        VALIDATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOperationalCompliance
    function validateVehicle(uint256 vehicleId)
        external
        view
        override
        returns (OperationalValidationResult memory result)
    {
        if (!_isVehicleRegistered[vehicleId]) {
            result.isValid = false;
            result.reason = OperationalValidationReason.VEHICLE_NOT_REGISTERED;
            return result;
        }

        VehicleOperationalData storage data = _vehicleData[vehicleId];
        result.operationalData = data;

        // Check if vehicle is suspended
        if (data.isSuspended) {
            result.isValid = false;
            result.reason = OperationalValidationReason.VEHICLE_SUSPENDED;
            return result;
        }

        // Check if vehicle is decommissioned
        if (data.status == VehicleStatus.DECOMMISSIONED) {
            result.isValid = false;
            result.reason = OperationalValidationReason.VEHICLE_DECOMMISSIONED;
            return result;
        }

        // Check registration expiry
        if (data.registrationExpiry < block.timestamp) {
            result.isValid = false;
            result.reason = OperationalValidationReason.REGISTRATION_EXPIRED;
            return result;
        }

        // Check insurance expiry
        if (data.insuranceExpiry < block.timestamp) {
            result.isValid = false;
            result.reason = OperationalValidationReason.INSURANCE_EXPIRED;
            return result;
        }

        // Check maintenance status
        if (data.nextMaintenanceDate < block.timestamp) {
            result.isValid = false;
            result.reason = OperationalValidationReason.MAINTENANCE_OVERDUE;
            return result;
        }

        // All checks passed
        result.isValid = true;
        result.reason = OperationalValidationReason.VALID;
        return result;
    }

    /// @inheritdoc IOperationalCompliance
    function validateRegionalPermit(uint256 vehicleId, uint16 regionCode)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (bool isValid)
    {
        RegionalPermit storage permit = _regionalPermits[vehicleId][regionCode];
        return permit.isValid && permit.expiryDate >= block.timestamp;
    }

    /// @inheritdoc IOperationalCompliance
    function validateRegistration(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (bool isValid, uint256 expiryDate)
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        expiryDate = data.registrationExpiry;
        isValid = data.registrationExpiry >= block.timestamp;
    }

    /// @inheritdoc IOperationalCompliance
    function validateInsurance(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (bool isValid, uint256 expiryDate)
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        expiryDate = data.insuranceExpiry;
        isValid = data.insuranceExpiry >= block.timestamp;
    }

    /// @inheritdoc IOperationalCompliance
    function validateMaintenance(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (bool isValid, uint256 nextMaintenanceDate)
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        nextMaintenanceDate = data.nextMaintenanceDate;
        isValid = data.nextMaintenanceDate >= block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                        MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOperationalCompliance
    function registerVehicle(
        uint256 vehicleId,
        address owner,
        uint256 registrationExpiry,
        uint256 insuranceExpiry,
        uint256 maintenanceInterval
    ) external override onlyAuthorizedOperator {
        if (_isVehicleRegistered[vehicleId]) {
            revert OperationalCompliance__InvalidVehicleId();
        }
        if (owner == address(0)) {
            revert OperationalCompliance__InvalidAddress();
        }

        _isVehicleRegistered[vehicleId] = true;
        _vehicleOwners[vehicleId] = owner;

        _vehicleData[vehicleId] = VehicleOperationalData({
            vehicleId: vehicleId,
            status: VehicleStatus.OPERATIONAL,
            registrationExpiry: registrationExpiry,
            insuranceExpiry: insuranceExpiry,
            lastMaintenanceDate: block.timestamp,
            nextMaintenanceDate: block.timestamp + maintenanceInterval,
            maintenanceInterval: maintenanceInterval,
            isSuspended: false
        });

        emit VehicleRegistered(vehicleId, owner, registrationExpiry, insuranceExpiry);
    }

    /// @inheritdoc IOperationalCompliance
    function recordMaintenance(
        uint256 vehicleId,
        string calldata maintenanceType,
        string calldata notes
    ) external override vehicleExists(vehicleId) onlyVehicleOwnerOrOperator(vehicleId) {
        VehicleOperationalData storage data = _vehicleData[vehicleId];

        // Update maintenance dates
        data.lastMaintenanceDate = block.timestamp;
        data.nextMaintenanceDate = block.timestamp + data.maintenanceInterval;

        // Update status if it was maintenance-related
        if (data.status == VehicleStatus.MAINTENANCE_DUE || data.status == VehicleStatus.MAINTENANCE_OVERDUE) {
            data.status = VehicleStatus.OPERATIONAL;
        }

        // Record in history
        _maintenanceHistory[vehicleId].push(MaintenanceRecord({
            vehicleId: vehicleId,
            maintenanceDate: block.timestamp,
            maintenanceType: maintenanceType,
            performedBy: msg.sender,
            notes: notes
        }));

        emit MaintenanceRecorded(vehicleId, maintenanceType, block.timestamp, data.nextMaintenanceDate);
        emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
    }

    /// @inheritdoc IOperationalCompliance
    function renewRegistration(uint256 vehicleId, uint256 newExpiryDate)
        external
        override
        vehicleExists(vehicleId)
        onlyVehicleOwnerOrOperator(vehicleId)
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        data.registrationExpiry = newExpiryDate;

        // Update status if it was registration-related
        if (data.status == VehicleStatus.REGISTRATION_EXPIRED) {
            data.status = VehicleStatus.OPERATIONAL;
            emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
        }

        emit RegistrationRenewed(vehicleId, newExpiryDate);
    }

    /// @inheritdoc IOperationalCompliance
    function renewInsurance(uint256 vehicleId, uint256 newExpiryDate)
        external
        override
        vehicleExists(vehicleId)
        onlyVehicleOwnerOrOperator(vehicleId)
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        data.insuranceExpiry = newExpiryDate;

        // Update status if it was insurance-related
        if (data.status == VehicleStatus.INSURANCE_EXPIRED) {
            data.status = VehicleStatus.OPERATIONAL;
            emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
        }

        emit InsuranceRenewed(vehicleId, newExpiryDate);
    }

    /// @inheritdoc IOperationalCompliance
    function addRegionalPermit(
        uint256 vehicleId,
        uint16 regionCode,
        uint256 expiryDate
    ) external override vehicleExists(vehicleId) onlyVehicleOwnerOrOperator(vehicleId) {
        _regionalPermits[vehicleId][regionCode] = RegionalPermit({
            isValid: true,
            expiryDate: expiryDate
        });

        emit RegionalPermitAdded(vehicleId, regionCode, expiryDate);
    }

    /// @inheritdoc IOperationalCompliance
    function revokeRegionalPermit(uint256 vehicleId, uint16 regionCode)
        external
        override
        vehicleExists(vehicleId)
        onlyAuthorizedOperator
    {
        _regionalPermits[vehicleId][regionCode].isValid = false;

        emit RegionalPermitRevoked(vehicleId, regionCode);
    }

    /// @inheritdoc IOperationalCompliance
    function suspendVehicle(uint256 vehicleId, string calldata reason)
        external
        override
        vehicleExists(vehicleId)
        onlyAuthorizedOperator
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        data.isSuspended = true;
        data.status = VehicleStatus.SUSPENDED;

        emit VehicleSuspended(vehicleId, reason, block.timestamp);
        emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
    }

    /// @inheritdoc IOperationalCompliance
    function liftSuspension(uint256 vehicleId)
        external
        override
        vehicleExists(vehicleId)
        onlyAuthorizedOperator
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        data.isSuspended = false;
        data.status = VehicleStatus.OPERATIONAL;

        emit VehicleSuspensionLifted(vehicleId, block.timestamp);
        emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
    }

    /// @inheritdoc IOperationalCompliance
    function decommissionVehicle(uint256 vehicleId, string calldata reason)
        external
        override
        vehicleExists(vehicleId)
        onlyAuthorizedOperator
    {
        VehicleOperationalData storage data = _vehicleData[vehicleId];
        data.status = VehicleStatus.DECOMMISSIONED;

        emit VehicleDecommissioned(vehicleId, reason, block.timestamp);
        emit VehicleOperationalDataUpdated(vehicleId, data.status, block.timestamp);
    }

    /**
     * @notice Set authorized operator status
     * @param operator Address of the operator
     * @param authorized Whether the operator is authorized
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert OperationalCompliance__InvalidAddress();
        _authorizedOperators[operator] = authorized;
    }

    /**
     * @notice Update vehicle status manually
     * @param vehicleId Vehicle ID
     * @param status New status
     */
    function updateVehicleStatus(uint256 vehicleId, VehicleStatus status)
        external
        vehicleExists(vehicleId)
        onlyAuthorizedOperator
    {
        _vehicleData[vehicleId].status = status;
        emit VehicleOperationalDataUpdated(vehicleId, status, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOperationalCompliance
    function getVehicleOperationalData(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (VehicleOperationalData memory data)
    {
        return _vehicleData[vehicleId];
    }

    /// @inheritdoc IOperationalCompliance
    function getVehicleStatus(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (VehicleStatus status)
    {
        return _vehicleData[vehicleId].status;
    }

    /// @inheritdoc IOperationalCompliance
    function getMaintenanceHistory(uint256 vehicleId)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (MaintenanceRecord[] memory records)
    {
        return _maintenanceHistory[vehicleId];
    }

    /// @inheritdoc IOperationalCompliance
    function hasRegionalPermit(uint256 vehicleId, uint16 regionCode)
        external
        view
        override
        vehicleExists(vehicleId)
        returns (bool hasPermit, uint256 expiryDate)
    {
        RegionalPermit storage permit = _regionalPermits[vehicleId][regionCode];
        hasPermit = permit.isValid && permit.expiryDate >= block.timestamp;
        expiryDate = permit.expiryDate;
    }

    /// @inheritdoc IOperationalCompliance
    function isVehicleOperational(uint256 vehicleId)
        external
        view
        override
        returns (bool isOperational)
    {
        if (!_isVehicleRegistered[vehicleId]) {
            return false;
        }

        VehicleOperationalData storage data = _vehicleData[vehicleId];

        // Check if suspended or decommissioned
        if (data.isSuspended || data.status == VehicleStatus.DECOMMISSIONED) {
            return false;
        }

        // Check critical compliance items
        if (data.registrationExpiry < block.timestamp) {
            return false;
        }

        if (data.insuranceExpiry < block.timestamp) {
            return false;
        }

        if (data.nextMaintenanceDate < block.timestamp) {
            return false;
        }

        return true;
    }

    /**
     * @notice Get vehicle owner
     * @param vehicleId Vehicle ID
     * @return owner Vehicle owner address
     */
    function getVehicleOwner(uint256 vehicleId)
        external
        view
        vehicleExists(vehicleId)
        returns (address owner)
    {
        return _vehicleOwners[vehicleId];
    }

    /**
     * @notice Check if address is authorized operator
     * @param operator Address to check
     * @return authorized Whether the address is authorized
     */
    function isAuthorizedOperator(address operator) external view returns (bool authorized) {
        return _authorizedOperators[operator];
    }

    /**
     * @notice Check if vehicle is registered
     * @param vehicleId Vehicle ID
     * @return registered Whether the vehicle is registered
     */
    function isVehicleRegistered(uint256 vehicleId) external view returns (bool registered) {
        return _isVehicleRegistered[vehicleId];
    }
}
