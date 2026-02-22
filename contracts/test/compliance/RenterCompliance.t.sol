// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console, Vm} from "forge-std/Test.sol";
import {RenterCompliance} from "../../src/compliance/RenterCompliance.sol";
import {IRenterCompliance} from "../../src/interfaces/compliance/IRenterCompliance.sol";
import {IIdentityRegistry} from "../../src/interfaces/erc3643/IIdentityRegistry.sol";
import {IOnchainID} from "../../src/interfaces/erc3643/IOnchainID.sol";
import {IInvestorTypeRegistry} from "../../src/interfaces/erc3643/IInvestorTypeRegistry.sol";
import {ClaimTopics} from "../../src/compliance/ClaimTopics.sol";

/**
 * @title RenterComplianceTest
 * @dev Comprehensive test suite for RenterCompliance contract
 * @notice Tests cover constructor, validation, management, getters, integration, edge cases, and fuzz
 */
contract RenterComplianceTest is Test {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    RenterCompliance public compliance;
    MockIdentityRegistry public identityRegistry;

    // Test accounts
    address public owner;
    address public operator;
    address public renter1;
    address public renter2;
    address public renter3;

    // Test data
    uint256 constant VEHICLE_ID_1 = 1;
    uint256 constant VEHICLE_ID_2 = 2;
    uint256 constant BASE_TIMESTAMP = 1000 days; // Use fixed base to avoid underflow

    /*//////////////////////////////////////////////////////////////
                              SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public {
        owner = address(this);
        operator = makeAddr("operator");
        renter1 = makeAddr("renter1");
        renter2 = makeAddr("renter2");
        renter3 = makeAddr("renter3");

        // Set initial timestamp to avoid underflow
        vm.warp(BASE_TIMESTAMP);

        // Deploy mock identity registry
        identityRegistry = new MockIdentityRegistry();

        // Deploy RenterCompliance
        compliance = new RenterCompliance(address(identityRegistry), owner);
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_SetsIdentityRegistry() public view {
        assertEq(address(compliance.identityRegistry()), address(identityRegistry));
    }

    function test_Constructor_SetsDefaultRequirements() public view {
        IRenterCompliance.RenterRequirements memory requirements = compliance.getRenterRequirements();

        assertEq(requirements.minimumAge, 21);
        assertEq(uint8(requirements.minimumCreditScoreTier), uint8(IRenterCompliance.CreditScoreTier.FAIR));
        assertEq(requirements.maxIncidentCount, 3);
        assertTrue(requirements.requireInsurance);
        assertTrue(requirements.requireDriverLicense);
    }

    function test_Constructor_SetsOwnerAsAuthorizedOperator() public view {
        assertTrue(compliance.isAuthorizedOperator(owner));
    }

    function test_Constructor_RevertsOnZeroAddressRegistry() public {
        vm.expectRevert(IRenterCompliance.RenterCompliance__InvalidIdentityRegistry.selector);
        new RenterCompliance(address(0), owner);
    }

    /*//////////////////////////////////////////////////////////////
                    VALIDATE RENTER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ValidateRenter_ValidRenter() public {
        _setupValidRenter(renter1);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertTrue(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.VALID));
        assertTrue(result.renterProfile.hasValidIdentity);
        assertEq(result.renterProfile.age, 25);
        assertTrue(result.renterProfile.hasDriverLicense);
        assertTrue(result.renterProfile.hasInsurance);
        assertEq(uint8(result.renterProfile.creditScoreTier), uint8(IRenterCompliance.CreditScoreTier.GOOD));
        assertEq(result.renterProfile.incidentCount, 0);
        assertFalse(result.renterProfile.isBlacklisted);
    }

    function test_ValidateRenter_FailsWhenBlacklisted() public {
        _setupValidRenter(renter1);
        compliance.blacklistRenter(renter1, "Bad behavior");

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.BLACKLISTED));
        assertTrue(result.renterProfile.isBlacklisted);
    }

    function test_ValidateRenter_FailsWhenIdentityNotVerified() public {
        address onchainId = address(new MockOnchainID());
        identityRegistry.registerIdentity(renter1, onchainId, 840);
        // Don't set as verified

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.IDENTITY_NOT_VERIFIED));
        assertFalse(result.renterProfile.hasValidIdentity);
    }

    function test_ValidateRenter_FailsWhenAgeTooLow() public {
        _setupValidRenter(renter1);

        // Update requirements to require age 30
        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.minimumAge = 30;
        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.AGE_TOO_LOW));
        assertEq(result.renterProfile.age, 25); // Hardcoded in contract
    }

    function test_ValidateRenter_FailsWhenNoDriverLicense() public {
        address onchainId = address(new MockOnchainID());
        identityRegistry.registerIdentity(renter1, onchainId, 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.NO_DRIVER_LICENSE));
        assertFalse(result.renterProfile.hasDriverLicense);
    }

    function test_ValidateRenter_SkipsDriverLicenseWhenNotRequired() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.INSURANCE_VERIFIED);
        onchainId.addClaimTopic(ClaimTopics.CREDIT_SCORE_RANGE); // Need credit score

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.requireDriverLicense = false;
        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertTrue(result.isValid);
    }

    function test_ValidateRenter_FailsWhenNoInsurance() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.INSURANCE_NOT_VERIFIED));
        assertFalse(result.renterProfile.hasInsurance);
    }

    function test_ValidateRenter_SkipsInsuranceWhenNotRequired() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);
        onchainId.addClaimTopic(ClaimTopics.CREDIT_SCORE_RANGE); // Need credit score

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.requireInsurance = false;
        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertTrue(result.isValid);
    }

    function test_ValidateRenter_FailsWhenCreditScoreTooLow() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);
        onchainId.addClaimTopic(ClaimTopics.INSURANCE_VERIFIED);
        // No credit score claim = NONE tier

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.CREDIT_SCORE_INSUFFICIENT));
        assertEq(uint8(result.renterProfile.creditScoreTier), uint8(IRenterCompliance.CreditScoreTier.NONE));
    }

    function test_ValidateRenter_FailsWhenTooManyIncidents() public {
        _setupValidRenter(renter1);

        compliance.setAuthorizedOperator(operator, true);
        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Damage");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Late return");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Speeding");
        vm.stopPrank();

        IRenterCompliance.RenterValidationResult memory result = compliance.validateRenter(renter1);

        assertFalse(result.isValid);
        assertEq(uint8(result.reason), uint8(IRenterCompliance.RenterValidationReason.TOO_MANY_RECENT_INCIDENTS));
        assertEq(result.renterProfile.incidentCount, 4);
    }

    /*//////////////////////////////////////////////////////////////
                    INDIVIDUAL VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ValidateAge_ValidAge() public {
        _setupValidRenter(renter1);

        (bool isValid, uint8 age) = compliance.validateAge(renter1);

        assertTrue(isValid);
        assertEq(age, 25);
    }

    function test_ValidateAge_AgeTooLow() public {
        _setupValidRenter(renter1);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.minimumAge = 30;
        compliance.setRenterRequirements(newReqs);

        (bool isValid, uint8 age) = compliance.validateAge(renter1);

        assertFalse(isValid);
        assertEq(age, 25);
    }

    function test_ValidateDriverLicense_Valid() public {
        _setupValidRenter(renter1);

        (bool isValid, uint256 expiryTime) = compliance.validateDriverLicense(renter1);

        assertTrue(isValid);
        assertGt(expiryTime, block.timestamp);
    }

    function test_ValidateDriverLicense_NoLicense() public {
        MockOnchainID onchainId = new MockOnchainID();
        identityRegistry.registerIdentity(renter1, address(onchainId), 840);

        (bool isValid, uint256 expiryTime) = compliance.validateDriverLicense(renter1);

        assertFalse(isValid);
        assertEq(expiryTime, 0);
    }

    function test_ValidateInsurance_Valid() public {
        _setupValidRenter(renter1);

        (bool isValid, uint256 expiryTime) = compliance.validateInsurance(renter1);

        assertTrue(isValid);
        assertGt(expiryTime, block.timestamp);
    }

    function test_ValidateInsurance_NoInsurance() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);

        (bool isValid, uint256 expiryTime) = compliance.validateInsurance(renter1);

        assertFalse(isValid);
        assertEq(expiryTime, 0);
    }

    function test_ValidateCreditScore_Valid() public {
        _setupValidRenter(renter1);

        (bool isValid, IRenterCompliance.CreditScoreTier creditTier) = compliance.validateCreditScore(renter1);

        assertTrue(isValid);
        assertEq(uint8(creditTier), uint8(IRenterCompliance.CreditScoreTier.GOOD));
    }

    function test_ValidateCreditScore_InsufficientScore() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);
        onchainId.addClaimTopic(ClaimTopics.INSURANCE_VERIFIED);

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        (bool isValid, IRenterCompliance.CreditScoreTier creditTier) = compliance.validateCreditScore(renter1);

        assertFalse(isValid);
        assertEq(uint8(creditTier), uint8(IRenterCompliance.CreditScoreTier.NONE));
    }

    function test_ValidateIncidentHistory_Valid() public {
        _setupValidRenter(renter1);

        compliance.setAuthorizedOperator(operator, true);
        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Damage");
        vm.stopPrank();

        (bool isValid, uint256 incidentCount) = compliance.validateIncidentHistory(renter1);

        assertTrue(isValid);
        assertEq(incidentCount, 2);
    }

    function test_ValidateIncidentHistory_TooMany() public {
        _setupValidRenter(renter1);

        compliance.setAuthorizedOperator(operator, true);
        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Damage");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Late return");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Speeding");
        vm.stopPrank();

        (bool isValid, uint256 incidentCount) = compliance.validateIncidentHistory(renter1);

        assertFalse(isValid);
        assertEq(incidentCount, 4);
    }

    /*//////////////////////////////////////////////////////////////
                    REQUIREMENTS MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetRenterRequirements_UpdatesRequirements() public {
        IRenterCompliance.RenterRequirements memory newReqs = IRenterCompliance.RenterRequirements({
            minimumAge: 25,
            minimumCreditScoreTier: IRenterCompliance.CreditScoreTier.GOOD,
            maxIncidentCount: 2,
            requireInsurance: false,
            requireDriverLicense: true
        });

        vm.expectEmit(true, true, true, true);
        emit IRenterCompliance.RenterRequirementsUpdated(25, IRenterCompliance.CreditScoreTier.GOOD, 2);

        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterRequirements memory updated = compliance.getRenterRequirements();
        assertEq(updated.minimumAge, 25);
        assertEq(uint8(updated.minimumCreditScoreTier), uint8(IRenterCompliance.CreditScoreTier.GOOD));
        assertEq(updated.maxIncidentCount, 2);
        assertFalse(updated.requireInsurance);
        assertTrue(updated.requireDriverLicense);
    }

    function test_SetRenterRequirements_RevertsWhenNotOwner() public {
        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();

        vm.prank(renter1);
        vm.expectRevert();
        compliance.setRenterRequirements(newReqs);
    }

    /*//////////////////////////////////////////////////////////////
                    INCIDENT MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RecordIncident_AddsIncident() public {
        compliance.setAuthorizedOperator(operator, true);

        vm.expectEmit(true, true, true, true);
        emit IRenterCompliance.IncidentRecorded(renter1, VEHICLE_ID_1, "Accident", block.timestamp);

        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");

        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 1);
    }

    function test_RecordIncident_MultipleIncidents() public {
        compliance.setAuthorizedOperator(operator, true);

        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
        compliance.recordIncident(renter1, VEHICLE_ID_2, "Damage");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Late return");
        vm.stopPrank();

        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 3);
    }

    function test_RecordIncident_RevertsWhenNotAuthorized() public {
        vm.prank(renter1);
        vm.expectRevert(IRenterCompliance.RenterCompliance__InvalidAddress.selector);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
    }

    function test_RecordIncident_OwnerCanRecord() public {
        vm.expectEmit(true, true, true, true);
        emit IRenterCompliance.IncidentRecorded(renter1, VEHICLE_ID_1, "Accident", block.timestamp);

        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");

        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 1);
    }

    /*//////////////////////////////////////////////////////////////
                    BLACKLIST MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_BlacklistRenter_AddsToBlacklist() public {
        vm.expectEmit(true, true, true, true);
        emit IRenterCompliance.RenterBlacklisted(renter1, "Bad behavior", block.timestamp);

        compliance.blacklistRenter(renter1, "Bad behavior");

        assertTrue(compliance.isRenterBlacklisted(renter1));
        assertEq(compliance.getBlacklistReason(renter1), "Bad behavior");
    }

    function test_BlacklistRenter_RevertsOnZeroAddress() public {
        vm.expectRevert(IRenterCompliance.RenterCompliance__InvalidAddress.selector);
        compliance.blacklistRenter(address(0), "Invalid");
    }

    function test_BlacklistRenter_RevertsWhenNotOwner() public {
        vm.prank(renter1);
        vm.expectRevert();
        compliance.blacklistRenter(renter2, "Bad behavior");
    }

    function test_RemoveRenterFromBlacklist_RemovesFromBlacklist() public {
        compliance.blacklistRenter(renter1, "Bad behavior");

        vm.expectEmit(true, true, true, true);
        emit IRenterCompliance.RenterRemovedFromBlacklist(renter1, block.timestamp);

        compliance.removeRenterFromBlacklist(renter1);

        assertFalse(compliance.isRenterBlacklisted(renter1));
        assertEq(compliance.getBlacklistReason(renter1), "");
    }

    function test_RemoveRenterFromBlacklist_RevertsWhenNotOwner() public {
        compliance.blacklistRenter(renter1, "Bad behavior");

        vm.prank(renter1);
        vm.expectRevert();
        compliance.removeRenterFromBlacklist(renter1);
    }

    /*//////////////////////////////////////////////////////////////
                    OPERATOR MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetAuthorizedOperator_AddsOperator() public {
        assertFalse(compliance.isAuthorizedOperator(operator));

        compliance.setAuthorizedOperator(operator, true);

        assertTrue(compliance.isAuthorizedOperator(operator));
    }

    function test_SetAuthorizedOperator_RemovesOperator() public {
        compliance.setAuthorizedOperator(operator, true);

        compliance.setAuthorizedOperator(operator, false);

        assertFalse(compliance.isAuthorizedOperator(operator));
    }

    function test_SetAuthorizedOperator_RevertsOnZeroAddress() public {
        vm.expectRevert(IRenterCompliance.RenterCompliance__InvalidAddress.selector);
        compliance.setAuthorizedOperator(address(0), true);
    }

    function test_SetAuthorizedOperator_RevertsWhenNotOwner() public {
        vm.prank(renter1);
        vm.expectRevert();
        compliance.setAuthorizedOperator(operator, true);
    }

    /*//////////////////////////////////////////////////////////////
                    REGISTRY MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetIdentityRegistry_UpdatesRegistry() public {
        MockIdentityRegistry newRegistry = new MockIdentityRegistry();

        compliance.setIdentityRegistry(address(newRegistry));

        assertEq(address(compliance.identityRegistry()), address(newRegistry));
    }

    function test_SetIdentityRegistry_RevertsOnZeroAddress() public {
        vm.expectRevert(IRenterCompliance.RenterCompliance__InvalidIdentityRegistry.selector);
        compliance.setIdentityRegistry(address(0));
    }

    function test_SetIdentityRegistry_RevertsWhenNotOwner() public {
        MockIdentityRegistry newRegistry = new MockIdentityRegistry();

        vm.prank(renter1);
        vm.expectRevert();
        compliance.setIdentityRegistry(address(newRegistry));
    }

    /*//////////////////////////////////////////////////////////////
                        GETTER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetRenterRequirements_ReturnsCurrentRequirements() public view {
        IRenterCompliance.RenterRequirements memory reqs = compliance.getRenterRequirements();

        assertEq(reqs.minimumAge, 21);
        assertEq(uint8(reqs.minimumCreditScoreTier), uint8(IRenterCompliance.CreditScoreTier.FAIR));
        assertEq(reqs.maxIncidentCount, 3);
        assertTrue(reqs.requireInsurance);
        assertTrue(reqs.requireDriverLicense);
    }

    function test_GetRenterProfile_ReturnsCompleteProfile() public {
        _setupValidRenter(renter1);

        IRenterCompliance.RenterProfile memory profile = compliance.getRenterProfile(renter1);

        assertTrue(profile.hasValidIdentity);
        assertEq(profile.age, 25);
        assertTrue(profile.hasDriverLicense);
        assertGt(profile.driverLicenseExpiry, block.timestamp);
        assertTrue(profile.hasInsurance);
        assertGt(profile.insuranceExpiry, block.timestamp);
        assertEq(uint8(profile.creditScoreTier), uint8(IRenterCompliance.CreditScoreTier.GOOD));
        assertEq(profile.incidentCount, 0);
        assertFalse(profile.isBlacklisted);
    }

    function test_GetRenterProfile_ReturnsInvalidWhenNotVerified() public view {
        IRenterCompliance.RenterProfile memory profile = compliance.getRenterProfile(renter1);

        assertFalse(profile.hasValidIdentity);
    }

    function test_IsRenterBlacklisted_ReturnsTrueWhenBlacklisted() public {
        compliance.blacklistRenter(renter1, "Bad behavior");

        assertTrue(compliance.isRenterBlacklisted(renter1));
    }

    function test_IsRenterBlacklisted_ReturnsFalseWhenNotBlacklisted() public view {
        assertFalse(compliance.isRenterBlacklisted(renter1));
    }

    function test_GetIncidentCount_ReturnsCorrectCount() public {
        compliance.setAuthorizedOperator(operator, true);

        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");
        compliance.recordIncident(renter1, VEHICLE_ID_2, "Damage");
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Late return");
        vm.stopPrank();

        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 3);
    }

    function test_GetIncidentCount_FiltersOldIncidents() public {
        compliance.setAuthorizedOperator(operator, true);

        // Record old incident
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Old accident");

        // Move forward 13 months
        vm.warp(BASE_TIMESTAMP + 390 days);

        // Record recent incidents
        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Recent accident");
        compliance.recordIncident(renter1, VEHICLE_ID_2, "Recent damage");
        vm.stopPrank();

        // Get count for last 12 months - should only include recent ones
        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 2);
    }

    function test_GetIncidentCount_DifferentTimePeriods() public {
        compliance.setAuthorizedOperator(operator, true);

        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident 1");

        vm.warp(BASE_TIMESTAMP + 100 days);
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident 2");

        vm.warp(BASE_TIMESTAMP + 200 days);
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident 3");

        vm.warp(BASE_TIMESTAMP + 250 days);

        // 12 months = 360 days, should include all 3
        uint256 count12 = compliance.getIncidentCount(renter1, 12);
        assertEq(count12, 3);

        // 6 months = 180 days, should include last 2
        uint256 count6 = compliance.getIncidentCount(renter1, 6);
        assertEq(count6, 2);

        // 3 months = 90 days, should include last 1
        uint256 count3 = compliance.getIncidentCount(renter1, 3);
        assertEq(count3, 1);
    }

    function test_GetBlacklistReason_ReturnsReason() public {
        compliance.blacklistRenter(renter1, "Repeated violations");

        assertEq(compliance.getBlacklistReason(renter1), "Repeated violations");
    }

    function test_GetBlacklistReason_ReturnsEmptyWhenNotBlacklisted() public view {
        assertEq(compliance.getBlacklistReason(renter1), "");
    }

    function test_IsAuthorizedOperator_ReturnsTrueForOwner() public view {
        assertTrue(compliance.isAuthorizedOperator(owner));
    }

    function test_IsAuthorizedOperator_ReturnsFalseForNonOperator() public view {
        assertFalse(compliance.isAuthorizedOperator(renter1));
    }

    /*//////////////////////////////////////////////////////////////
                    INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Integration_CompleteRenterLifecycle() public {
        _setupValidRenter(renter1);

        // Initial validation - should pass
        IRenterCompliance.RenterValidationResult memory result1 = compliance.validateRenter(renter1);
        assertTrue(result1.isValid);

        // Record incidents
        compliance.setAuthorizedOperator(operator, true);
        vm.startPrank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Minor damage");
        compliance.recordIncident(renter1, VEHICLE_ID_2, "Late return");
        vm.stopPrank();

        // Should still pass (2 < 3)
        IRenterCompliance.RenterValidationResult memory result2 = compliance.validateRenter(renter1);
        assertTrue(result2.isValid);
        assertEq(result2.renterProfile.incidentCount, 2);

        // Add one more (total 3, at limit)
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Speeding");

        // Should pass (3 == 3)
        IRenterCompliance.RenterValidationResult memory result3 = compliance.validateRenter(renter1);
        assertTrue(result3.isValid);
        assertEq(result3.renterProfile.incidentCount, 3);

        // Add one more (total 4, over limit)
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Accident");

        // Should fail
        IRenterCompliance.RenterValidationResult memory result4 = compliance.validateRenter(renter1);
        assertFalse(result4.isValid);
        assertEq(uint8(result4.reason), uint8(IRenterCompliance.RenterValidationReason.TOO_MANY_RECENT_INCIDENTS));

        // Blacklist
        compliance.blacklistRenter(renter1, "Too many incidents");

        // Should fail due to blacklist
        IRenterCompliance.RenterValidationResult memory result5 = compliance.validateRenter(renter1);
        assertFalse(result5.isValid);
        assertEq(uint8(result5.reason), uint8(IRenterCompliance.RenterValidationReason.BLACKLISTED));

        // Remove from blacklist
        compliance.removeRenterFromBlacklist(renter1);

        // Should fail due to incidents
        IRenterCompliance.RenterValidationResult memory result6 = compliance.validateRenter(renter1);
        assertFalse(result6.isValid);
        assertEq(uint8(result6.reason), uint8(IRenterCompliance.RenterValidationReason.TOO_MANY_RECENT_INCIDENTS));
    }

    function test_Integration_MultipleRenters() public {
        _setupValidRenter(renter1);
        _setupValidRenter(renter2);
        _setupValidRenter(renter3);

        // All valid
        assertTrue(compliance.validateRenter(renter1).isValid);
        assertTrue(compliance.validateRenter(renter2).isValid);
        assertTrue(compliance.validateRenter(renter3).isValid);

        // Blacklist renter2
        compliance.blacklistRenter(renter2, "Fraud");

        assertTrue(compliance.validateRenter(renter1).isValid);
        assertFalse(compliance.validateRenter(renter2).isValid);
        assertTrue(compliance.validateRenter(renter3).isValid);

        // Record incidents for renter1
        compliance.setAuthorizedOperator(operator, true);
        vm.startPrank(operator);
        for (uint256 i = 0; i < 5; i++) {
            compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident");
        }
        vm.stopPrank();

        assertFalse(compliance.validateRenter(renter1).isValid);
        assertFalse(compliance.validateRenter(renter2).isValid);
        assertTrue(compliance.validateRenter(renter3).isValid);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_EdgeCase_ZeroIncidentCount() public view {
        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, 0);
    }

    function test_EdgeCase_RequirementsWithZeroMaxIncidents() public {
        _setupValidRenter(renter1);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.maxIncidentCount = 0;
        compliance.setRenterRequirements(newReqs);

        // No incidents - should pass
        assertTrue(compliance.validateRenter(renter1).isValid);

        // Add incident
        compliance.setAuthorizedOperator(operator, true);
        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident");

        // Should fail
        assertFalse(compliance.validateRenter(renter1).isValid);
    }

    function test_EdgeCase_RequirementsWithZeroMinimumAge() public {
        _setupValidRenter(renter1);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.minimumAge = 0;
        compliance.setRenterRequirements(newReqs);

        assertTrue(compliance.validateRenter(renter1).isValid);
    }

    function test_EdgeCase_BothInsuranceAndLicenseNotRequired() public {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.CREDIT_SCORE_RANGE);

        identityRegistry.registerIdentity(renter1, address(onchainId), 840);
        identityRegistry.setVerified(renter1, true);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.requireInsurance = false;
        newReqs.requireDriverLicense = false;
        compliance.setRenterRequirements(newReqs);

        assertTrue(compliance.validateRenter(renter1).isValid);
    }

    function test_EdgeCase_NoOnchainIdRegistered() public view {
        IRenterCompliance.RenterProfile memory profile = compliance.getRenterProfile(renter1);

        assertFalse(profile.hasValidIdentity);
        assertEq(profile.age, 0);
        assertFalse(profile.hasDriverLicense);
        assertFalse(profile.hasInsurance);
        assertEq(uint8(profile.creditScoreTier), uint8(IRenterCompliance.CreditScoreTier.NONE));
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_RecordIncident_MultipleIncidents(uint8 incidentCount) public {
        vm.assume(incidentCount > 0 && incidentCount < 50);

        compliance.setAuthorizedOperator(operator, true);

        vm.startPrank(operator);
        for (uint256 i = 0; i < incidentCount; i++) {
            compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident");
        }
        vm.stopPrank();

        uint256 count = compliance.getIncidentCount(renter1, 12);
        assertEq(count, incidentCount);
    }

    function testFuzz_GetIncidentCount_DifferentMonths(uint256 months) public {
        // Limit to prevent underflow: months * 30 days must be < BASE_TIMESTAMP
        vm.assume(months > 0 && months <= 30); // 30 months * 30 days = 900 days < 1000 days

        compliance.setAuthorizedOperator(operator, true);

        vm.prank(operator);
        compliance.recordIncident(renter1, VEHICLE_ID_1, "Incident");

        // Should count within period
        uint256 count = compliance.getIncidentCount(renter1, months);
        assertEq(count, 1);
    }

    function testFuzz_SetRenterRequirements_MinimumAge(uint8 minimumAge) public {
        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.minimumAge = minimumAge;

        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterRequirements memory updated = compliance.getRenterRequirements();
        assertEq(updated.minimumAge, minimumAge);
    }

    function testFuzz_SetRenterRequirements_MaxIncidentCount(uint256 maxIncidentCount) public {
        vm.assume(maxIncidentCount < 1000);

        IRenterCompliance.RenterRequirements memory newReqs = compliance.getRenterRequirements();
        newReqs.maxIncidentCount = maxIncidentCount;

        compliance.setRenterRequirements(newReqs);

        IRenterCompliance.RenterRequirements memory updated = compliance.getRenterRequirements();
        assertEq(updated.maxIncidentCount, maxIncidentCount);
    }

    function testFuzz_BlacklistMultipleRenters(uint8 renterCount) public {
        vm.assume(renterCount > 0 && renterCount < 20);

        for (uint256 i = 0; i < renterCount; i++) {
            address renter = address(uint160(1000 + i));
            compliance.blacklistRenter(renter, "Test reason");
            assertTrue(compliance.isRenterBlacklisted(renter));
        }
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _setupValidRenter(address renter) internal {
        MockOnchainID onchainId = new MockOnchainID();
        onchainId.addClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID);
        onchainId.addClaimTopic(ClaimTopics.INSURANCE_VERIFIED);
        onchainId.addClaimTopic(ClaimTopics.CREDIT_SCORE_RANGE);

        identityRegistry.registerIdentity(renter, address(onchainId), 840);
        identityRegistry.setVerified(renter, true);
    }
}

/*//////////////////////////////////////////////////////////////
                        MOCK CONTRACTS
//////////////////////////////////////////////////////////////*/

contract MockIdentityRegistry is IIdentityRegistry {
    mapping(address => address) private _identities;
    mapping(address => uint16) private _countries;
    mapping(address => bool) private _verified;

    function registerIdentity(address user, address identityAddr, uint16 country) external override {
        _identities[user] = identityAddr;
        _countries[user] = country;
    }

    function deleteIdentity(address user) external override {
        delete _identities[user];
        delete _countries[user];
        delete _verified[user];
    }

    function updateCountry(address user, uint16 country) external override {
        _countries[user] = country;
    }

    function identity(address user) external view override returns (address) {
        return _identities[user];
    }

    function investorCountry(address user) external view override returns (uint16) {
        return _countries[user];
    }

    function isVerified(address user) external view override returns (bool) {
        return _verified[user];
    }

    function setVerified(address user, bool verified) external {
        _verified[user] = verified;
    }

    // Stub implementations
    function bindIdentityRegistry(address) external override {}
    function unbindIdentityRegistry(address) external override {}
    function addAgent(address) external override {}
    function removeAgent(address) external override {}
    function setInvestorTypeRegistry(address) external override {}
    function setComplianceRules(address, address) external override {}
    function isAgent(address) external pure override returns (bool) {
        return false;
    }
    function getTokensBound() external pure override returns (address[] memory) {
        return new address[](0);
    }
    function isTokenBound(address) external pure override returns (bool) {
        return false;
    }
    function getInvestorTypeRegistry() external pure override returns (address) {
        return address(0);
    }
    function getComplianceRules() external pure override returns (address) {
        return address(0);
    }
    function getInvestorType(address) external pure override returns (IInvestorTypeRegistry.InvestorType) {
        return IInvestorTypeRegistry.InvestorType.NORMAL;
    }
    function canTransferAmount(address, uint256) external pure override returns (bool) {
        return true;
    }
    function canHoldAmount(address, uint256) external pure override returns (bool) {
        return true;
    }
    function getRequiredWhitelistTier(address) external pure override returns (uint8) {
        return 0;
    }
    function batchRegisterIdentity(address[] calldata, address[] calldata, uint16[] calldata) external override {}
}

contract MockOnchainID is IOnchainID {
    mapping(uint256 => bytes32[]) private _claimIdsByTopic;
    uint256 private _claimCounter;

    function addClaimTopic(uint256 topic) external {
        bytes32 claimId = bytes32(_claimCounter++);
        _claimIdsByTopic[topic].push(claimId);
    }

    function getClaimIdsByTopic(uint256 topic) external view override returns (bytes32[] memory) {
        return _claimIdsByTopic[topic];
    }

    // Stub implementations
    function getKey(bytes32) external pure override returns (uint256, uint256, bytes32, uint256) {
        return (0, 0, bytes32(0), 0);
    }
    function keyHasPurpose(bytes32, uint256) external pure override returns (bool) {
        return false;
    }
    function getKeysByPurpose(uint256) external pure override returns (bytes32[] memory) {
        return new bytes32[](0);
    }
    function addKey(bytes32, uint256, uint256) external pure override returns (bool) {
        return true;
    }
    function removeKey(bytes32, uint256) external pure override returns (bool) {
        return true;
    }
    function execute(address, uint256, bytes calldata) external pure override returns (uint256) {
        return 0;
    }
    function approve(uint256, bool) external pure override returns (bool) {
        return true;
    }
    function getClaim(bytes32)
        external
        pure
        override
        returns (uint256, uint256, address, bytes memory, bytes memory, string memory)
    {
        return (0, 0, address(0), "", "", "");
    }
    function addClaim(uint256, uint256, address, bytes calldata, bytes calldata, string calldata)
        external
        pure
        override
        returns (bytes32)
    {
        return bytes32(0);
    }
    function removeClaim(bytes32) external pure override returns (bool) {
        return true;
    }
}
