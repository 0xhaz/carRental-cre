// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Test, console, Vm} from "forge-std/Test.sol";
import {OperationalCompliance} from "../../src/compliance/OperationalCompliance.sol";
import {IOperationalCompliance} from "../../src/interfaces/compliance/IOperationalCompliance.sol";

contract OperationalComplianceTest is Test {
    OperationalCompliance public compliance;

    address public owner = address(this);
    address public operator = makeAddr("operator");
    address public vehicleOwner1 = makeAddr("vehicleOwner1");
    address public vehicleOwner2 = makeAddr("vehicleOwner2");
    address public unauthorized = makeAddr("unauthorized");

    uint256 public constant VEHICLE_ID_1 = 1;
    uint256 public constant VEHICLE_ID_2 = 2;
    uint256 public constant UNREGISTERED_VEHICLE = 999;

    uint16 public constant REGION_US = 1;
    uint16 public constant REGION_EU = 2;
    uint16 public constant REGION_ASIA = 3;

    // Test timestamps
    uint256 public futureRegistration;
    uint256 public futureInsurance;
    uint256 public maintenanceInterval = 30 days;

    // Events
    event VehicleRegistered(
        uint256 indexed vehicleId,
        address indexed owner,
        uint256 registrationExpiry,
        uint256 insuranceExpiry
    );
    event VehicleOperationalDataUpdated(
        uint256 indexed vehicleId,
        IOperationalCompliance.VehicleStatus status,
        uint256 timestamp
    );
    event MaintenanceRecorded(
        uint256 indexed vehicleId,
        string maintenanceType,
        uint256 maintenanceDate,
        uint256 nextMaintenanceDate
    );
    event RegistrationRenewed(uint256 indexed vehicleId, uint256 newExpiryDate);
    event InsuranceRenewed(uint256 indexed vehicleId, uint256 newExpiryDate);
    event RegionalPermitAdded(uint256 indexed vehicleId, uint16 regionCode, uint256 expiryDate);
    event RegionalPermitRevoked(uint256 indexed vehicleId, uint16 regionCode);
    event VehicleSuspended(uint256 indexed vehicleId, string reason, uint256 timestamp);
    event VehicleSuspensionLifted(uint256 indexed vehicleId, uint256 timestamp);
    event VehicleDecommissioned(uint256 indexed vehicleId, string reason, uint256 timestamp);

    function setUp() public {
        compliance = new OperationalCompliance(owner);
        compliance.setAuthorizedOperator(operator, true);

        futureRegistration = block.timestamp + 365 days;
        futureInsurance = block.timestamp + 180 days;
    }

    /*//////////////////////////////////////////////////////////////
                         CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_Success() public {
        OperationalCompliance newCompliance = new OperationalCompliance(owner);
        assertTrue(newCompliance.isAuthorizedOperator(owner));
    }

    function test_Constructor_SetsOwnerAsOperator() public view {
        assertTrue(compliance.isAuthorizedOperator(owner));
    }

    /*//////////////////////////////////////////////////////////////
                    REGISTERVEHICLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RegisterVehicle_Success() public {
        vm.expectEmit(true, true, false, true);
        emit VehicleRegistered(VEHICLE_ID_1, vehicleOwner1, futureRegistration, futureInsurance);

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );

        assertTrue(compliance.isVehicleRegistered(VEHICLE_ID_1));
        assertEq(compliance.getVehicleOwner(VEHICLE_ID_1), vehicleOwner1);
    }

    function test_RegisterVehicle_RevertsOnDuplicate() public {
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );

        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidVehicleId.selector);
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
    }

    function test_RegisterVehicle_RevertsOnZeroOwner() public {
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.registerVehicle(
            VEHICLE_ID_1,
            address(0),
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
    }

    function test_RegisterVehicle_RevertsOnNonOperator() public {
        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
    }

    function test_RegisterVehicle_SetsCorrectData() public {
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertEq(data.vehicleId, VEHICLE_ID_1);
        assertEq(uint(data.status), uint(IOperationalCompliance.VehicleStatus.OPERATIONAL));
        assertEq(data.registrationExpiry, futureRegistration);
        assertEq(data.insuranceExpiry, futureInsurance);
        assertEq(data.maintenanceInterval, maintenanceInterval);
        assertEq(data.nextMaintenanceDate, block.timestamp + maintenanceInterval);
        assertFalse(data.isSuspended);
    }

    /*//////////////////////////////////////////////////////////////
                    VALIDATEVEHICLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ValidateVehicle_ValidVehicle() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertTrue(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.VALID));
    }

    function test_ValidateVehicle_UnregisteredVehicle() public view {
        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(UNREGISTERED_VEHICLE);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.VEHICLE_NOT_REGISTERED));
    }

    function test_ValidateVehicle_SuspendedVehicle() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);
        compliance.suspendVehicle(VEHICLE_ID_1, "Safety concerns");

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.VEHICLE_SUSPENDED));
    }

    function test_ValidateVehicle_DecommissionedVehicle() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);
        compliance.decommissionVehicle(VEHICLE_ID_1, "End of life");

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.VEHICLE_DECOMMISSIONED));
    }

    function test_ValidateVehicle_ExpiredRegistration() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            expiredTime,
            futureInsurance,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.REGISTRATION_EXPIRED));
    }

    function test_ValidateVehicle_ExpiredInsurance() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            expiredTime,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.INSURANCE_EXPIRED));
    }

    function test_ValidateVehicle_MaintenanceOverdue() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        // Warp past maintenance date
        vm.warp(block.timestamp + maintenanceInterval + 1 days);

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertFalse(result.isValid);
        assertEq(uint(result.reason), uint(IOperationalCompliance.OperationalValidationReason.MAINTENANCE_OVERDUE));
    }

    /*//////////////////////////////////////////////////////////////
                    VALIDATION FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ValidateRegistration_Valid() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        (bool isValid, uint256 expiryDate) = compliance.validateRegistration(VEHICLE_ID_1);

        assertTrue(isValid);
        assertEq(expiryDate, futureRegistration);
    }

    function test_ValidateRegistration_Expired() public {
        uint256 expiredTime = 100 days; // Past timestamp

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            expiredTime,
            futureInsurance,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days); // Move past expiry

        (bool isValid, uint256 expiryDate) = compliance.validateRegistration(VEHICLE_ID_1);

        assertFalse(isValid);
        assertEq(expiryDate, expiredTime);
    }

    function test_ValidateRegistration_RevertsOnUnregistered() public {
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__VehicleNotRegistered.selector);
        compliance.validateRegistration(UNREGISTERED_VEHICLE);
    }

    function test_ValidateInsurance_Valid() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        (bool isValid, uint256 expiryDate) = compliance.validateInsurance(VEHICLE_ID_1);

        assertTrue(isValid);
        assertEq(expiryDate, futureInsurance);
    }

    function test_ValidateInsurance_Expired() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            expiredTime,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        (bool isValid, uint256 expiryDate) = compliance.validateInsurance(VEHICLE_ID_1);

        assertFalse(isValid);
        assertEq(expiryDate, expiredTime);
    }

    function test_ValidateMaintenance_Valid() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        (bool isValid, uint256 nextDate) = compliance.validateMaintenance(VEHICLE_ID_1);

        assertTrue(isValid);
        assertEq(nextDate, block.timestamp + maintenanceInterval);
    }

    function test_ValidateMaintenance_Overdue() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.warp(block.timestamp + maintenanceInterval + 1 days);

        (bool isValid,) = compliance.validateMaintenance(VEHICLE_ID_1);

        assertFalse(isValid);
    }

    /*//////////////////////////////////////////////////////////////
                    RECORDMAINTENANCE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RecordMaintenance_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.expectEmit(true, false, false, false);
        emit MaintenanceRecorded(VEHICLE_ID_1, "Oil change", 0, 0);

        vm.prank(vehicleOwner1);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");

        IOperationalCompliance.MaintenanceRecord[] memory records =
            compliance.getMaintenanceHistory(VEHICLE_ID_1);

        assertEq(records.length, 1);
        assertEq(records[0].maintenanceType, "Oil change");
        assertEq(records[0].performedBy, vehicleOwner1);
    }

    function test_RecordMaintenance_UpdatesDates() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 timeBefore = block.timestamp;

        vm.prank(vehicleOwner1);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertEq(data.lastMaintenanceDate, timeBefore);
        assertEq(data.nextMaintenanceDate, timeBefore + maintenanceInterval);
    }

    function test_RecordMaintenance_UpdatesStatus() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        // Manually set status to MAINTENANCE_DUE
        compliance.updateVehicleStatus(VEHICLE_ID_1, IOperationalCompliance.VehicleStatus.MAINTENANCE_DUE);

        vm.prank(vehicleOwner1);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.OPERATIONAL)
        );
    }

    function test_RecordMaintenance_RevertsOnUnregistered() public {
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__VehicleNotRegistered.selector);
        compliance.recordMaintenance(UNREGISTERED_VEHICLE, "Oil change", "Regular service");
    }

    function test_RecordMaintenance_RevertsOnUnauthorized() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");
    }

    function test_RecordMaintenance_AllowsOperator() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(operator);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");

        IOperationalCompliance.MaintenanceRecord[] memory records =
            compliance.getMaintenanceHistory(VEHICLE_ID_1);

        assertEq(records.length, 1);
    }

    /*//////////////////////////////////////////////////////////////
                    RENEWREGISTRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RenewRegistration_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 newExpiry = block.timestamp + 730 days;

        vm.expectEmit(true, false, false, true);
        emit RegistrationRenewed(VEHICLE_ID_1, newExpiry);

        vm.prank(vehicleOwner1);
        compliance.renewRegistration(VEHICLE_ID_1, newExpiry);

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertEq(data.registrationExpiry, newExpiry);
    }

    function test_RenewRegistration_UpdatesStatus() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            expiredTime,
            futureInsurance,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        compliance.updateVehicleStatus(VEHICLE_ID_1, IOperationalCompliance.VehicleStatus.REGISTRATION_EXPIRED);

        vm.prank(vehicleOwner1);
        compliance.renewRegistration(VEHICLE_ID_1, futureRegistration);

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.OPERATIONAL)
        );
    }

    function test_RenewRegistration_RevertsOnUnauthorized() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.renewRegistration(VEHICLE_ID_1, futureRegistration);
    }

    /*//////////////////////////////////////////////////////////////
                    RENEWINSURANCE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RenewInsurance_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 newExpiry = block.timestamp + 365 days;

        vm.expectEmit(true, false, false, true);
        emit InsuranceRenewed(VEHICLE_ID_1, newExpiry);

        vm.prank(vehicleOwner1);
        compliance.renewInsurance(VEHICLE_ID_1, newExpiry);

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertEq(data.insuranceExpiry, newExpiry);
    }

    function test_RenewInsurance_UpdatesStatus() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            expiredTime,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        compliance.updateVehicleStatus(VEHICLE_ID_1, IOperationalCompliance.VehicleStatus.INSURANCE_EXPIRED);

        vm.prank(vehicleOwner1);
        compliance.renewInsurance(VEHICLE_ID_1, futureInsurance);

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.OPERATIONAL)
        );
    }

    /*//////////////////////////////////////////////////////////////
                    REGIONAL PERMIT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AddRegionalPermit_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 permitExpiry = block.timestamp + 365 days;

        vm.expectEmit(true, false, false, true);
        emit RegionalPermitAdded(VEHICLE_ID_1, REGION_US, permitExpiry);

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, permitExpiry);

        (bool hasPermit, uint256 expiryDate) = compliance.hasRegionalPermit(VEHICLE_ID_1, REGION_US);

        assertTrue(hasPermit);
        assertEq(expiryDate, permitExpiry);
    }

    function test_AddRegionalPermit_AllowsMultipleRegions() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 permitExpiry = block.timestamp + 365 days;

        vm.startPrank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, permitExpiry);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_EU, permitExpiry);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_ASIA, permitExpiry);
        vm.stopPrank();

        assertTrue(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
        assertTrue(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_EU));
        assertTrue(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_ASIA));
    }

    function test_AddRegionalPermit_RevertsOnUnauthorized() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 365 days);
    }

    function test_ValidateRegionalPermit_ValidPermit() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 365 days);

        assertTrue(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
    }

    function test_ValidateRegionalPermit_ExpiredPermit() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 1 days);

        vm.warp(block.timestamp + 2 days);

        assertFalse(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
    }

    function test_ValidateRegionalPermit_NoPermit() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        assertFalse(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
    }

    function test_RevokeRegionalPermit_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 365 days);

        vm.expectEmit(true, false, false, true);
        emit RegionalPermitRevoked(VEHICLE_ID_1, REGION_US);

        compliance.revokeRegionalPermit(VEHICLE_ID_1, REGION_US);

        assertFalse(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
    }

    function test_RevokeRegionalPermit_RevertsOnNonOperator() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 365 days);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.revokeRegionalPermit(VEHICLE_ID_1, REGION_US);
    }

    /*//////////////////////////////////////////////////////////////
                    SUSPEND/LIFT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SuspendVehicle_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.expectEmit(true, false, false, false);
        emit VehicleSuspended(VEHICLE_ID_1, "Safety concerns", block.timestamp);

        compliance.suspendVehicle(VEHICLE_ID_1, "Safety concerns");

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertTrue(data.isSuspended);
        assertEq(uint(data.status), uint(IOperationalCompliance.VehicleStatus.SUSPENDED));
    }

    function test_SuspendVehicle_RevertsOnNonOperator() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.suspendVehicle(VEHICLE_ID_1, "Safety concerns");
    }

    function test_LiftSuspension_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);
        compliance.suspendVehicle(VEHICLE_ID_1, "Safety concerns");

        vm.expectEmit(true, false, false, true);
        emit VehicleSuspensionLifted(VEHICLE_ID_1, block.timestamp);

        compliance.liftSuspension(VEHICLE_ID_1);

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertFalse(data.isSuspended);
        assertEq(uint(data.status), uint(IOperationalCompliance.VehicleStatus.OPERATIONAL));
    }

    /*//////////////////////////////////////////////////////////////
                    DECOMMISSION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DecommissionVehicle_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.expectEmit(true, false, false, false);
        emit VehicleDecommissioned(VEHICLE_ID_1, "End of life", block.timestamp);

        compliance.decommissionVehicle(VEHICLE_ID_1, "End of life");

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.DECOMMISSIONED)
        );
    }

    function test_DecommissionVehicle_RevertsOnNonOperator() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.decommissionVehicle(VEHICLE_ID_1, "End of life");
    }

    /*//////////////////////////////////////////////////////////////
                    OPERATOR MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetAuthorizedOperator_Success() public {
        address newOperator = makeAddr("newOperator");

        compliance.setAuthorizedOperator(newOperator, true);

        assertTrue(compliance.isAuthorizedOperator(newOperator));
    }

    function test_SetAuthorizedOperator_CanRevoke() public {
        compliance.setAuthorizedOperator(operator, false);

        assertFalse(compliance.isAuthorizedOperator(operator));
    }

    function test_SetAuthorizedOperator_RevertsOnZeroAddress() public {
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.setAuthorizedOperator(address(0), true);
    }

    function test_SetAuthorizedOperator_RevertsOnNonOwner() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        compliance.setAuthorizedOperator(unauthorized, true);
    }

    /*//////////////////////////////////////////////////////////////
                    UPDATEVEHICLESTATUS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpdateVehicleStatus_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.expectEmit(true, false, false, true);
        emit VehicleOperationalDataUpdated(
            VEHICLE_ID_1,
            IOperationalCompliance.VehicleStatus.MAINTENANCE_DUE,
            block.timestamp
        );

        compliance.updateVehicleStatus(VEHICLE_ID_1, IOperationalCompliance.VehicleStatus.MAINTENANCE_DUE);

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.MAINTENANCE_DUE)
        );
    }

    function test_UpdateVehicleStatus_RevertsOnNonOperator() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.prank(unauthorized);
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__InvalidAddress.selector);
        compliance.updateVehicleStatus(VEHICLE_ID_1, IOperationalCompliance.VehicleStatus.MAINTENANCE_DUE);
    }

    /*//////////////////////////////////////////////////////////////
                    GETTER FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetVehicleOperationalData_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        IOperationalCompliance.VehicleOperationalData memory data =
            compliance.getVehicleOperationalData(VEHICLE_ID_1);

        assertEq(data.vehicleId, VEHICLE_ID_1);
        assertEq(uint(data.status), uint(IOperationalCompliance.VehicleStatus.OPERATIONAL));
    }

    function test_GetVehicleOperationalData_RevertsOnUnregistered() public {
        vm.expectRevert(IOperationalCompliance.OperationalCompliance__VehicleNotRegistered.selector);
        compliance.getVehicleOperationalData(UNREGISTERED_VEHICLE);
    }

    function test_GetVehicleStatus_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        assertEq(
            uint(compliance.getVehicleStatus(VEHICLE_ID_1)),
            uint(IOperationalCompliance.VehicleStatus.OPERATIONAL)
        );
    }

    function test_GetMaintenanceHistory_Empty() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        IOperationalCompliance.MaintenanceRecord[] memory records =
            compliance.getMaintenanceHistory(VEHICLE_ID_1);

        assertEq(records.length, 0);
    }

    function test_GetMaintenanceHistory_MultipleRecords() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.startPrank(vehicleOwner1);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");
        compliance.recordMaintenance(VEHICLE_ID_1, "Tire rotation", "Maintenance");
        compliance.recordMaintenance(VEHICLE_ID_1, "Brake inspection", "Safety check");
        vm.stopPrank();

        IOperationalCompliance.MaintenanceRecord[] memory records =
            compliance.getMaintenanceHistory(VEHICLE_ID_1);

        assertEq(records.length, 3);
        assertEq(records[0].maintenanceType, "Oil change");
        assertEq(records[1].maintenanceType, "Tire rotation");
        assertEq(records[2].maintenanceType, "Brake inspection");
    }

    function test_HasRegionalPermit_WithPermit() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 permitExpiry = block.timestamp + 365 days;

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, permitExpiry);

        (bool hasPermit, uint256 expiryDate) = compliance.hasRegionalPermit(VEHICLE_ID_1, REGION_US);

        assertTrue(hasPermit);
        assertEq(expiryDate, permitExpiry);
    }

    function test_HasRegionalPermit_WithoutPermit() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        (bool hasPermit, uint256 expiryDate) = compliance.hasRegionalPermit(VEHICLE_ID_1, REGION_US);

        assertFalse(hasPermit);
        assertEq(expiryDate, 0);
    }

    function test_IsVehicleOperational_Operational() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_IsVehicleOperational_Unregistered() public view {
        assertFalse(compliance.isVehicleOperational(UNREGISTERED_VEHICLE));
    }

    function test_IsVehicleOperational_Suspended() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);
        compliance.suspendVehicle(VEHICLE_ID_1, "Safety concerns");

        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_IsVehicleOperational_Decommissioned() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);
        compliance.decommissionVehicle(VEHICLE_ID_1, "End of life");

        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_IsVehicleOperational_ExpiredRegistration() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            expiredTime,
            futureInsurance,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_IsVehicleOperational_ExpiredInsurance() public {
        uint256 expiredTime = 100 days;

        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            expiredTime,
            maintenanceInterval
        );

        vm.warp(expiredTime + 1 days);

        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_IsVehicleOperational_MaintenanceOverdue() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.warp(block.timestamp + maintenanceInterval + 1 days);

        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_GetVehicleOwner_Success() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        assertEq(compliance.getVehicleOwner(VEHICLE_ID_1), vehicleOwner1);
    }

    function test_IsAuthorizedOperator_True() public view {
        assertTrue(compliance.isAuthorizedOperator(operator));
    }

    function test_IsAuthorizedOperator_False() public view {
        assertFalse(compliance.isAuthorizedOperator(unauthorized));
    }

    function test_IsVehicleRegistered_True() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        assertTrue(compliance.isVehicleRegistered(VEHICLE_ID_1));
    }

    function test_IsVehicleRegistered_False() public view {
        assertFalse(compliance.isVehicleRegistered(UNREGISTERED_VEHICLE));
    }

    /*//////////////////////////////////////////////////////////////
                      INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Integration_FullVehicleLifecycle() public {
        // Register vehicle
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_1));

        // Add regional permits
        vm.startPrank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, block.timestamp + 365 days);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_EU, block.timestamp + 365 days);
        vm.stopPrank();

        // Record maintenance
        vm.prank(vehicleOwner1);
        compliance.recordMaintenance(VEHICLE_ID_1, "Oil change", "Regular service");

        // Renew insurance
        vm.prank(vehicleOwner1);
        compliance.renewInsurance(VEHICLE_ID_1, block.timestamp + 365 days);

        // Suspend temporarily
        compliance.suspendVehicle(VEHICLE_ID_1, "Inspection");
        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));

        // Lift suspension
        compliance.liftSuspension(VEHICLE_ID_1);
        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_1));

        // Finally decommission
        compliance.decommissionVehicle(VEHICLE_ID_1, "End of service");
        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
    }

    function test_Integration_MultipleVehicles() public {
        // Register two vehicles
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
        compliance.registerVehicle(
            VEHICLE_ID_2,
            vehicleOwner2,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );

        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_1));
        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_2));

        // Suspend one
        compliance.suspendVehicle(VEHICLE_ID_1, "Maintenance");
        assertFalse(compliance.isVehicleOperational(VEHICLE_ID_1));
        assertTrue(compliance.isVehicleOperational(VEHICLE_ID_2));
    }

    /*//////////////////////////////////////////////////////////////
                         EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_EdgeCase_RegistrationAtExactExpiry() public {
        compliance.registerVehicle(
            VEHICLE_ID_1,
            vehicleOwner1,
            block.timestamp,
            futureInsurance,
            maintenanceInterval
        );

        (bool isValid,) = compliance.validateRegistration(VEHICLE_ID_1);
        assertTrue(isValid); // Should be valid AT expiry time
    }

    function test_EdgeCase_MultipleMaintenanceRecords() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        vm.startPrank(vehicleOwner1);
        for (uint i = 0; i < 10; i++) {
            compliance.recordMaintenance(VEHICLE_ID_1, "Maintenance", "Record");
            vm.warp(block.timestamp + 1 days);
        }
        vm.stopPrank();

        IOperationalCompliance.MaintenanceRecord[] memory records =
            compliance.getMaintenanceHistory(VEHICLE_ID_1);

        assertEq(records.length, 10);
    }

    function test_EdgeCase_RegionalPermitAtExpiry() public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        uint256 permitExpiry = block.timestamp + 365 days;

        vm.prank(vehicleOwner1);
        compliance.addRegionalPermit(VEHICLE_ID_1, REGION_US, permitExpiry);

        vm.warp(permitExpiry);

        assertTrue(compliance.validateRegionalPermit(VEHICLE_ID_1, REGION_US));
    }

    /*//////////////////////////////////////////////////////////////
                         FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RegisterVehicle(
        uint256 vehicleId,
        address vehicleOwner,
        uint256 registrationExpiry,
        uint256 insuranceExpiry,
        uint256 _maintenanceInterval
    ) public {
        // Bound inputs
        vm.assume(vehicleOwner != address(0));
        vm.assume(!compliance.isVehicleRegistered(vehicleId));
        registrationExpiry = bound(registrationExpiry, block.timestamp, type(uint128).max);
        insuranceExpiry = bound(insuranceExpiry, block.timestamp, type(uint128).max);
        _maintenanceInterval = bound(_maintenanceInterval, 1 days, 365 days);

        compliance.registerVehicle(
            vehicleId,
            vehicleOwner,
            registrationExpiry,
            insuranceExpiry,
            _maintenanceInterval
        );

        assertTrue(compliance.isVehicleRegistered(vehicleId));
        assertEq(compliance.getVehicleOwner(vehicleId), vehicleOwner);
    }

    function testFuzz_ValidateVehicle(uint256 timeWarp) public {
        _registerVehicle(VEHICLE_ID_1, vehicleOwner1);

        timeWarp = bound(timeWarp, 0, maintenanceInterval - 1);
        vm.warp(block.timestamp + timeWarp);

        IOperationalCompliance.OperationalValidationResult memory result =
            compliance.validateVehicle(VEHICLE_ID_1);

        assertTrue(result.isValid);
    }

    /*//////////////////////////////////////////////////////////////
                         HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _registerVehicle(uint256 vehicleId, address vehicleOwner) internal {
        compliance.registerVehicle(
            vehicleId,
            vehicleOwner,
            futureRegistration,
            futureInsurance,
            maintenanceInterval
        );
    }
}
