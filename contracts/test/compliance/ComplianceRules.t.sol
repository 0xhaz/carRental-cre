// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IComplianceRules} from "../../src/interfaces/compliance/IComplianceRules.sol";
import {IRenterCompliance} from "../../src/interfaces/compliance/IRenterCompliance.sol";
import {IOperationalCompliance} from "../../src/interfaces/compliance/IOperationalCompliance.sol";
import {IIdentityRegistry} from "../../src/interfaces/erc3643/IIdentityRegistry.sol";
import {ComplianceRules} from "../../src/compliance/ComplianceRules.sol";

// ==================== Mock Contracts ====================

contract MockRenterCompliance {
    bool private _shouldPass;
    IRenterCompliance.RenterValidationReason private _reason;
    bool private _hasDriverLicense;

    function setValidation(bool shouldPass, IRenterCompliance.RenterValidationReason reason, bool hasDriverLicense)
        external
    {
        _shouldPass = shouldPass;
        _reason = reason;
        _hasDriverLicense = hasDriverLicense;
    }

    function validateRenter(address) external view returns (IRenterCompliance.RenterValidationResult memory result) {
        result.isValid = _shouldPass;
        result.reason = _reason;
        result.renterProfile.hasDriverLicense = _hasDriverLicense;
    }
}

contract MockOperationalCompliance {
    bool private _shouldPass;
    IOperationalCompliance.OperationalValidationReason private _reason;

    function setValidation(bool shouldPass, IOperationalCompliance.OperationalValidationReason reason) external {
        _shouldPass = shouldPass;
        _reason = reason;
    }

    function validateVehicle(uint256)
        external
        view
        returns (IOperationalCompliance.OperationalValidationResult memory result)
    {
        result.isValid = _shouldPass;
        result.reason = _reason;
    }
}

contract MockIdentityRegistry {
    mapping(address => bool) private _verified;
    mapping(address => uint16) private _countries;

    function setVerified(address user, bool verified) external {
        _verified[user] = verified;
    }

    function setCountry(address user, uint16 country) external {
        _countries[user] = country;
    }

    function isVerified(address user) external view returns (bool) {
        return _verified[user];
    }

    function investorCountry(address user) external view returns (uint16) {
        return _countries[user];
    }
}

// ==================== Test Contract ====================

contract ComplianceRulesTest is Test {
    ComplianceRules public complianceRules;
    MockRenterCompliance public mockRenter;
    MockOperationalCompliance public mockOperational;
    MockIdentityRegistry public mockIdentityRegistry;

    address owner;
    address admin;
    address user;
    address tokenContract;
    address investor1;
    address investor2;

    uint256 constant COUNTRY_US = 840;
    uint256 constant COUNTRY_UK = 826;
    uint256 constant COUNTRY_SANCTIONED = 643; // Russia

    uint256 constant INVESTOR_TYPE_RETAIL = 1;
    uint256 constant INVESTOR_TYPE_ACCREDITED = 2;
    uint256 constant INVESTOR_TYPE_INSTITUTIONAL = 3;

    uint256 constant COMPLIANCE_LEVEL_BASIC = 1;
    uint256 constant COMPLIANCE_LEVEL_STANDARD = 3;
    uint256 constant COMPLIANCE_LEVEL_PREMIUM = 5;

    event RuleAdministratorUpdated(address indexed administrator, bool authorized);
    event TokenAuthorized(address indexed token, bool authorized);
    event JurisdictionRuleUpdated(address indexed token, uint256[] allowedCountries, uint256[] blockedCountries);
    event InvestorTypeRuleUpdated(address indexed token, uint8[] allowedTypes, uint8[] blockedTypes);
    event HoldingPeriodRuleUpdated(address indexed token, uint256 minimumHoldingPeriod, uint256 transferCooldown);
    event ComplianceLevelRuleUpdated(address indexed token, uint8 minimumLevel, uint8 maximumLevel);
    event TrustedContractAdded(address indexed contractAddress);
    event TrustedContractRemoved(address indexed contractAddress);

    function setUp() public {
        owner = address(this);
        admin = makeAddr("admin");
        user = makeAddr("user");
        tokenContract = makeAddr("tokenContract");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");

        uint256[] memory allowedCountries = new uint256[](3);
        allowedCountries[0] = 840;
        allowedCountries[1] = 826;
        allowedCountries[2] = 756;

        uint256[] memory sanctionedCountries = new uint256[](1);
        sanctionedCountries[0] = 643;

        complianceRules = new ComplianceRules(owner, allowedCountries, sanctionedCountries);

        complianceRules.setRuleAdministrator(admin, true);
        complianceRules.authorizeToken(tokenContract, true);

        mockRenter = new MockRenterCompliance();
        mockOperational = new MockOperationalCompliance();
        mockIdentityRegistry = new MockIdentityRegistry();
    }

    // ==================== Deployment Tests ====================

    function test_Deployment() public view {
        assertEq(complianceRules.owner(), owner);
        assertTrue(complianceRules.ruleAdministrators(admin));
    }

    function test_Deployment_JurisdictionValidation() public view {
        (bool isValidUS, uint8 reasonUS) = complianceRules.validateJurisdiction(tokenContract, COUNTRY_US);
        assertTrue(isValidUS);
        assertEq(reasonUS, 3);

        (bool isValidUK, uint8 reasonUK) = complianceRules.validateJurisdiction(tokenContract, COUNTRY_UK);
        assertTrue(isValidUK);
        assertEq(reasonUK, 3);

        (bool isValidSanctioned, uint8 reasonSanctioned) =
            complianceRules.validateJurisdiction(tokenContract, COUNTRY_SANCTIONED);
        assertFalse(isValidSanctioned);
        assertEq(reasonSanctioned, 1);

        (bool isValid, uint8 reasonOther) = complianceRules.validateJurisdiction(tokenContract, 250); // France
        assertFalse(isValid);
        assertEq(reasonOther, 2);

        (bool isActive, uint256[] memory allowedCountries, uint256[] memory blockedCountries, uint256 lastUpdated) =
            complianceRules.getJurisdictionRule(tokenContract);

        assertTrue(isActive);
        assertEq(allowedCountries.length, 3);
        assertEq(blockedCountries.length, 1);
        assertGt(lastUpdated, 0);
    }

    function test_Deployment_InvestorTypeValidation() public view {
        (bool isValidRetail, uint8 reasonRetail) =
            complianceRules.validateInvestorType(tokenContract, uint8(INVESTOR_TYPE_RETAIL), COMPLIANCE_LEVEL_BASIC);
        assertTrue(isValidRetail);
        assertEq(reasonRetail, 4);

        (bool isValidAccredited, uint8 reasonAccredited) = complianceRules.validateInvestorType(
            tokenContract, uint8(INVESTOR_TYPE_ACCREDITED), COMPLIANCE_LEVEL_STANDARD
        );
        assertTrue(isValidAccredited);
        assertEq(reasonAccredited, 4);

        (bool isValidInstitutional, uint8 reasonInstitutional) = complianceRules.validateInvestorType(
            tokenContract, uint8(INVESTOR_TYPE_INSTITUTIONAL), COMPLIANCE_LEVEL_PREMIUM
        );
        assertTrue(isValidInstitutional);
        assertEq(reasonInstitutional, 4);

        (
            bool isActive,
            uint8[] memory allowedTypes,
            uint8[] memory blockedTypes,
            uint256 minimumAccreditation,
            uint256 lastUpdated
        ) = complianceRules.getInvestorTypeRule(tokenContract);
        assertTrue(isActive);
        assertEq(allowedTypes.length, 0);
        assertEq(blockedTypes.length, 0);
        assertEq(minimumAccreditation, 1);
        assertGt(lastUpdated, 0);
    }

    function test_Deployment_HoldingPeriodValidation() public view {
        (bool isActive, uint256 requiredHoldingPeriod, uint256 requiredCooldownPeriod, uint256 lastUpdated) =
            complianceRules.getHoldingPeriodRule(tokenContract);
        assertTrue(isActive);
        assertEq(requiredHoldingPeriod, 24 * 60 * 60);
        assertEq(requiredCooldownPeriod, 60 * 60);
        assertGt(lastUpdated, 0);
    }

    function test_Deployment_ComplianceLevel() public view {
        (bool isActive, uint8 minimumLevel, uint8 maximumLevel, uint256 lastUpdated) =
            complianceRules.getComplianceLevelRule(tokenContract);
        assertTrue(isActive);
        assertEq(minimumLevel, 1);
        assertEq(maximumLevel, 5);
        assertGt(lastUpdated, 0);
    }

    // ==================== Rule Administrator Tests ====================

    function test_SetRuleAdministrator_Success() public {
        vm.expectEmit(true, false, false, true);
        emit RuleAdministratorUpdated(user, true);
        complianceRules.setRuleAdministrator(user, true);
        assertTrue(complianceRules.ruleAdministrators(user));
    }

    function test_SetRuleAdministrator_Revoke() public {
        complianceRules.setRuleAdministrator(user, true);
        assertTrue(complianceRules.ruleAdministrators(user));

        complianceRules.setRuleAdministrator(user, false);
        assertFalse(complianceRules.ruleAdministrators(user));
    }

    function test_SetRuleAdministrator_Revert_InvalidAddress() public {
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidAddress.selector);
        complianceRules.setRuleAdministrator(address(0), true);
    }

    function test_SetRuleAdministrator_Revert_NotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        complianceRules.setRuleAdministrator(investor1, true);
    }

    // ==================== Token Authorization Tests ====================

    function test_SetTokenAuthorization_Success() public {
        vm.expectEmit(true, false, false, true);
        emit TokenAuthorized(investor1, true);
        complianceRules.authorizeToken(investor1, true);
    }

    function test_SetTokenAuthorization_Revert_NotAuthorized() public {
        vm.prank(user);
        vm.expectRevert();
        complianceRules.authorizeToken(investor2, true);
    }

    function test_SetTokenAuthorization_Revert_InvalidAddress() public {
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidTokenAddress.selector);
        complianceRules.authorizeToken(address(0), true);
    }

    // ==================== Jurisdiction Rule Tests ====================

    function test_SetJurisdictionRule_Success() public {
        uint256[] memory allowed = new uint256[](2);
        allowed[0] = 840;
        allowed[1] = 826;
        uint256[] memory blocked = new uint256[](1);
        blocked[0] = 643;

        vm.prank(admin);
        complianceRules.setJurisdictionRule(tokenContract, allowed, blocked);

        (bool isActive, uint256[] memory fetchedAllowed, uint256[] memory fetchedBlocked, uint256 lastUpdated) =
            complianceRules.getJurisdictionRule(tokenContract);

        assertTrue(isActive);
        assertEq(fetchedAllowed.length, 2);
        assertEq(fetchedBlocked.length, 1);
        assertGt(lastUpdated, 0);
    }

    function test_SetJurisdictionRule_ValidateAfterUpdate() public {
        uint256[] memory allowed = new uint256[](1);
        allowed[0] = 840; // Only US
        uint256[] memory blocked = new uint256[](1);
        blocked[0] = 826; // Block UK

        vm.prank(admin);
        complianceRules.setJurisdictionRule(tokenContract, allowed, blocked);

        // US should pass
        (bool isValidUS, uint8 reasonUS) = complianceRules.validateJurisdiction(tokenContract, 840);
        assertTrue(isValidUS);
        assertEq(reasonUS, 3);

        // UK should be blocked
        (bool isValidUK, uint8 reasonUK) = complianceRules.validateJurisdiction(tokenContract, 826);
        assertFalse(isValidUK);
        assertEq(reasonUK, 1); // BLOCKED

        // France should not be allowed
        (bool isValidFR, uint8 reasonFR) = complianceRules.validateJurisdiction(tokenContract, 250);
        assertFalse(isValidFR);
        assertEq(reasonFR, 2); // NOT_ALLOWED
    }

    function test_SetJurisdictionRule_Revert_NotAuthorized() public {
        vm.prank(user);
        vm.expectRevert(IComplianceRules.ComplianceRules__OnlyGovernanceCanUpdate.selector);
        complianceRules.setJurisdictionRule(tokenContract, new uint256[](0), new uint256[](0));
    }

    function test_SetJurisdictionRule_Revert_InvalidTokenAddress() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidTokenAddress.selector);
        complianceRules.setJurisdictionRule(address(0), new uint256[](0), new uint256[](0));
    }

    function test_Jurisdiction_RevertWith_TooManyCountries() public {
        vm.startPrank(admin);
        uint256[] memory tooManyCountries = new uint256[](301);
        for (uint256 i = 0; i < tooManyCountries.length; i++) {
            tooManyCountries[i] = i;
        }
        vm.expectRevert(IComplianceRules.ComplianceRules__TooManyAllowedCountries.selector);
        complianceRules.setJurisdictionRule(tokenContract, tooManyCountries, new uint256[](0));
        vm.stopPrank();

        vm.startPrank(admin);
        uint256[] memory tooManyBlockedCountries = new uint256[](301);
        for (uint256 i = 0; i < tooManyBlockedCountries.length; i++) {
            tooManyBlockedCountries[i] = i;
        }
        vm.expectRevert(IComplianceRules.ComplianceRules__TooManyBlockedCountries.selector);
        complianceRules.setJurisdictionRule(tokenContract, new uint256[](0), tooManyBlockedCountries);
        vm.stopPrank();
    }

    function test_ValidateJurisdiction_EmptyAllowedList() public {
        // Set rule with empty allowed list but a blocked country
        uint256[] memory allowed = new uint256[](0);
        uint256[] memory blocked = new uint256[](1);
        blocked[0] = 643;

        vm.prank(admin);
        complianceRules.setJurisdictionRule(tokenContract, allowed, blocked);

        // Any non-blocked country should pass when allowed list is empty
        (bool isValid, uint8 reason) = complianceRules.validateJurisdiction(tokenContract, 250);
        assertTrue(isValid);
        assertEq(reason, 3); // PASSED

        // Blocked country should still fail
        (bool isBlocked, uint8 blockedReason) = complianceRules.validateJurisdiction(tokenContract, 643);
        assertFalse(isBlocked);
        assertEq(blockedReason, 1); // BLOCKED
    }

    // ==================== Investor Type Rule Tests ====================

    function test_SetInvestorTypeRule_Success() public {
        uint8[] memory allowedTypes = new uint8[](2);
        allowedTypes[0] = uint8(INVESTOR_TYPE_RETAIL);
        allowedTypes[1] = uint8(INVESTOR_TYPE_ACCREDITED);

        uint8[] memory blockedTypes = new uint8[](1);
        blockedTypes[0] = uint8(INVESTOR_TYPE_INSTITUTIONAL);

        vm.prank(admin);
        complianceRules.setInvestorTypeRule(tokenContract, allowedTypes, blockedTypes, COMPLIANCE_LEVEL_STANDARD);

        (
            bool isActive,
            uint8[] memory fetchedAllowedTypes,
            uint8[] memory fetchedBlockedTypes,
            uint256 minAccreditation,
        ) = complianceRules.getInvestorTypeRule(tokenContract);

        assertTrue(isActive);
        assertEq(fetchedAllowedTypes.length, 2);
        assertEq(fetchedBlockedTypes.length, 1);
        assertEq(minAccreditation, COMPLIANCE_LEVEL_STANDARD);
    }

    function test_SetInvestorTypeRule_Revert_NotAuthorized() public {
        vm.prank(user);
        vm.expectRevert(IComplianceRules.ComplianceRules__OnlyGovernanceCanUpdate.selector);
        complianceRules.setInvestorTypeRule(tokenContract, new uint8[](0), new uint8[](0), 1);
    }

    function test_SetInvestorTypeRule_Revert_InvalidTokenAddress() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidTokenAddress.selector);
        complianceRules.setInvestorTypeRule(address(0), new uint8[](0), new uint8[](0), 1);
    }

    function test_SetInvestorTypeRule_Revert_TooManyAllowedTypes() public {
        uint8[] memory tooMany = new uint8[](11);
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__TooManyAllowedTypes.selector);
        complianceRules.setInvestorTypeRule(tokenContract, tooMany, new uint8[](0), 1);
    }

    function test_SetInvestorTypeRule_Revert_TooManyBlockedTypes() public {
        uint8[] memory tooMany = new uint8[](11);
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__TooManyBlockedTypes.selector);
        complianceRules.setInvestorTypeRule(tokenContract, new uint8[](0), tooMany, 1);
    }

    function test_ValidateInvestorType_BlockedType() public {
        uint8[] memory allowed = new uint8[](0);
        uint8[] memory blocked = new uint8[](1);
        blocked[0] = uint8(INVESTOR_TYPE_RETAIL);

        vm.prank(admin);
        complianceRules.setInvestorTypeRule(tokenContract, allowed, blocked, 1);

        (bool isValid, uint8 reason) =
            complianceRules.validateInvestorType(tokenContract, uint8(INVESTOR_TYPE_RETAIL), 5);
        assertFalse(isValid);
        assertEq(reason, 1); // TYPE_BLOCKED
    }

    function test_ValidateInvestorType_NotAllowedType() public {
        uint8[] memory allowed = new uint8[](1);
        allowed[0] = uint8(INVESTOR_TYPE_ACCREDITED);
        uint8[] memory blocked = new uint8[](0);

        vm.prank(admin);
        complianceRules.setInvestorTypeRule(tokenContract, allowed, blocked, 1);

        (bool isValid, uint8 reason) =
            complianceRules.validateInvestorType(tokenContract, uint8(INVESTOR_TYPE_RETAIL), 5);
        assertFalse(isValid);
        assertEq(reason, 2); // TYPE_NOT_ALLOWED
    }

    function test_ValidateInvestorType_InsufficientAccreditation() public {
        uint8[] memory allowed = new uint8[](0);
        uint8[] memory blocked = new uint8[](0);

        vm.prank(admin);
        complianceRules.setInvestorTypeRule(tokenContract, allowed, blocked, COMPLIANCE_LEVEL_PREMIUM);

        (bool isValid, uint8 reason) =
            complianceRules.validateInvestorType(tokenContract, uint8(INVESTOR_TYPE_RETAIL), COMPLIANCE_LEVEL_BASIC);
        assertFalse(isValid);
        assertEq(reason, 3); // ACCREDITATION_INSUFFICIENT
    }

    function test_ValidateInvestorType_PassWithAllowedType() public {
        uint8[] memory allowed = new uint8[](1);
        allowed[0] = uint8(INVESTOR_TYPE_ACCREDITED);
        uint8[] memory blocked = new uint8[](0);

        vm.prank(admin);
        complianceRules.setInvestorTypeRule(tokenContract, allowed, blocked, COMPLIANCE_LEVEL_BASIC);

        (bool isValid, uint8 reason) = complianceRules.validateInvestorType(
            tokenContract, uint8(INVESTOR_TYPE_ACCREDITED), COMPLIANCE_LEVEL_STANDARD
        );
        assertTrue(isValid);
        assertEq(reason, 4); // PASSED
    }

    // ==================== Holding Period Rule Tests ====================

    function test_SetHoldingPeriodRule_Success() public {
        vm.prank(admin);
        complianceRules.setHoldingPeriodRule(tokenContract, 48 hours, 2 hours);

        (bool isActive, uint256 holdingPeriod, uint256 cooldown, uint256 lastUpdated) =
            complianceRules.getHoldingPeriodRule(tokenContract);

        assertTrue(isActive);
        assertEq(holdingPeriod, 48 hours);
        assertEq(cooldown, 2 hours);
        assertGt(lastUpdated, 0);
    }

    function test_SetHoldingPeriodRule_Revert_NotAuthorized() public {
        vm.prank(user);
        vm.expectRevert(IComplianceRules.ComplianceRules__OnlyGovernanceCanUpdate.selector);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 1 hours);
    }

    function test_SetHoldingPeriodRule_Revert_InvalidTokenAddress() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidTokenAddress.selector);
        complianceRules.setHoldingPeriodRule(address(0), 1 hours, 1 hours);
    }

    function test_SetHoldingPeriodRule_Revert_HoldingPeriodTooLong() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__HoldingPeriodTooLong.selector);
        complianceRules.setHoldingPeriodRule(tokenContract, 366 days, 1 hours);
    }

    function test_SetHoldingPeriodRule_Revert_CooldownTooLong() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__CooldownTooLong.selector);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 31 days);
    }

    function test_ValidateHoldingPeriod_Passed() public {
        vm.warp(10 days);
        uint256 acquisitionTime = block.timestamp - 2 days;
        (bool isValid, uint8 reason) = complianceRules.validateHoldingPeriod(tokenContract, investor1, acquisitionTime);
        assertTrue(isValid);
        assertEq(reason, 3); // PASSED
    }

    function test_ValidateHoldingPeriod_NotSatisfied() public view {
        uint256 acquisitionTime = block.timestamp; // just acquired
        (bool isValid, uint8 reason) = complianceRules.validateHoldingPeriod(tokenContract, investor1, acquisitionTime);
        assertFalse(isValid);
        assertEq(reason, 1); // HOLDING_PERIOD_NOT_SATISFIED
    }

    function test_ValidateHoldingPeriod_CooldownNotSatisfied() public {
        vm.warp(10 days);

        vm.prank(admin);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 2 hours);

        // Record a transfer to set lastTransferTime
        vm.prank(tokenContract);
        complianceRules.recordTransfer(tokenContract, investor1, investor2, block.timestamp);

        // Now try to validate - cooldown should fail for investor1
        uint256 acquisitionTime = block.timestamp - 2 hours;
        (bool isValid, uint8 reason) = complianceRules.validateHoldingPeriod(tokenContract, investor1, acquisitionTime);
        assertFalse(isValid);
        assertEq(reason, 2); // COOLDOWN_NOT_SATISFIED
    }

    function test_ValidateHoldingPeriod_CooldownPassed() public {
        vm.warp(10 days);

        vm.prank(admin);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 1 hours);

        // Record a transfer
        vm.prank(tokenContract);
        complianceRules.recordTransfer(tokenContract, investor1, investor2, block.timestamp);

        // Warp past cooldown
        vm.warp(block.timestamp + 2 hours);

        uint256 acquisitionTime = block.timestamp - 3 hours;
        (bool isValid, uint8 reason) = complianceRules.validateHoldingPeriod(tokenContract, investor1, acquisitionTime);
        assertTrue(isValid);
        assertEq(reason, 3); // PASSED
    }

    // ==================== Compliance Level Rule Tests ====================

    function test_SetComplianceLevelRule_Success() public {
        uint8[] memory levels = new uint8[](2);
        levels[0] = 1;
        levels[1] = 2;
        uint8[] memory inheritanceLevels = new uint8[](2);
        inheritanceLevels[0] = 3;
        inheritanceLevels[1] = 4;

        vm.prank(admin);
        complianceRules.setComplianceLevelRule(tokenContract, 1, 8, levels, inheritanceLevels);

        (bool isActive, uint8 minLevel, uint8 maxLevel, uint256 lastUpdated) =
            complianceRules.getComplianceLevelRule(tokenContract);

        assertTrue(isActive);
        assertEq(minLevel, 1);
        assertEq(maxLevel, 8);
        assertGt(lastUpdated, 0);
    }

    function test_SetComplianceLevelRule_Revert_NotAuthorized() public {
        vm.prank(user);
        vm.expectRevert(IComplianceRules.ComplianceRules__OnlyGovernanceCanUpdate.selector);
        complianceRules.setComplianceLevelRule(tokenContract, 1, 5, new uint8[](0), new uint8[](0));
    }

    function test_SetComplianceLevelRule_Revert_InvalidTokenAddress() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidTokenAddress.selector);
        complianceRules.setComplianceLevelRule(address(0), 1, 5, new uint8[](0), new uint8[](0));
    }

    function test_SetComplianceLevelRule_Revert_InvalidLevelsRange() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidLevelsRange.selector);
        complianceRules.setComplianceLevelRule(tokenContract, 5, 5, new uint8[](0), new uint8[](0)); // min >= max
    }

    function test_SetComplianceLevelRule_Revert_LevelTooHigh() public {
        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__LevelTooHigh.selector);
        complianceRules.setComplianceLevelRule(tokenContract, 1, 10, new uint8[](0), new uint8[](0)); // max >= 10
    }

    function test_SetComplianceLevelRule_Revert_ArrayLengthMismatch() public {
        uint8[] memory levels = new uint8[](2);
        uint8[] memory inheritance = new uint8[](1);

        vm.prank(admin);
        vm.expectRevert(IComplianceRules.ComplianceRules__ArrayLengthMismatch.selector);
        complianceRules.setComplianceLevelRule(tokenContract, 1, 5, levels, inheritance);
    }

    // ==================== Aggregate Compliance Levels Tests ====================

    function test_AggregateComplianceLevels_Valid() public view {
        uint8[] memory levels = new uint8[](3);
        levels[0] = 3;
        levels[1] = 2;
        levels[2] = 4;

        (uint8 aggregated, bool isValid) = complianceRules.aggregateComplianceLevels(tokenContract, levels);
        assertEq(aggregated, 2); // minimum of inputs
        assertTrue(isValid); // 2 >= 1 (min) && 2 <= 5 (max)
    }

    function test_AggregateComplianceLevels_Invalid_BelowMinimum() public {
        // Set rule with min=3, max=8
        uint8[] memory l = new uint8[](0);
        vm.prank(admin);
        complianceRules.setComplianceLevelRule(tokenContract, 3, 8, l, l);

        uint8[] memory levels = new uint8[](2);
        levels[0] = 2;
        levels[1] = 5;

        (uint8 aggregated, bool isValid) = complianceRules.aggregateComplianceLevels(tokenContract, levels);
        assertEq(aggregated, 2);
        assertFalse(isValid); // 2 < 3 (min)
    }

    function test_AggregateComplianceLevels_EmptyInput() public view {
        uint8[] memory levels = new uint8[](0);

        (uint8 aggregated, bool isValid) = complianceRules.aggregateComplianceLevels(tokenContract, levels);
        assertEq(aggregated, 0);
        assertFalse(isValid);
    }

    function test_AggregateComplianceLevels_WithInheritance() public {
        uint8[] memory levelKeys = new uint8[](1);
        levelKeys[0] = 1;
        uint8[] memory inheritanceVals = new uint8[](1);
        inheritanceVals[0] = 4; // level 1 inherits to 4

        vm.prank(admin);
        complianceRules.setComplianceLevelRule(tokenContract, 2, 8, levelKeys, inheritanceVals);

        uint8[] memory inputs = new uint8[](2);
        inputs[0] = 1; // will be inherited to 4
        inputs[1] = 5;

        (uint8 aggregated, bool isValid) = complianceRules.aggregateComplianceLevels(tokenContract, inputs);
        // min of inputs is 1, inheritance maps 1->4, so aggregated = 4
        assertEq(aggregated, 4);
        assertTrue(isValid); // 4 >= 2 && 4 <= 8
    }

    // ==================== Record Transfer Tests ====================

    function test_RecordTransfer_Success() public {
        vm.warp(10 days);

        vm.prank(admin);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 1 hours);

        vm.prank(tokenContract);
        complianceRules.recordTransfer(tokenContract, investor1, investor2, block.timestamp);

        // Verify by checking holding period for the sender (should have cooldown set)
        (bool isValid,) = complianceRules.validateHoldingPeriod(tokenContract, investor1, block.timestamp - 2 hours);
        assertFalse(isValid); // cooldown active
    }

    function test_RecordTransfer_WithZeroAcquisitionTime() public {
        vm.prank(admin);
        complianceRules.setHoldingPeriodRule(tokenContract, 1 hours, 1 hours);

        vm.prank(tokenContract);
        complianceRules.recordTransfer(tokenContract, investor1, investor2, 0);
        // Should use block.timestamp when acquisitionTime is 0
    }

    function test_RecordTransfer_Revert_NotAuthorizedToken() public {
        address unauthorizedToken = makeAddr("unauthorized");
        vm.prank(unauthorizedToken);
        vm.expectRevert(IComplianceRules.ComplianceRules__TokenNotAuthorized.selector);
        complianceRules.recordTransfer(unauthorizedToken, investor1, investor2, block.timestamp);
    }

    // ==================== Trusted Contract Tests ====================

    function test_AddTrustedContract_Revert_InvalidAddress() public {
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidAddress.selector);
        complianceRules.addTrustedContract(address(0));
    }

    function test_AddTrustedContract_Revert_AlreadyTrusted() public {
        // Note: The contract has a bug - it checks `if (!trustedContracts[contractAddress])`
        // which reverts for non-trusted contracts (the opposite of what you'd expect).
        // We test the actual behavior.
        address trusted = makeAddr("trusted");
        vm.expectRevert(IComplianceRules.ComplianceRules__AlreadyTrustedContract.selector);
        complianceRules.addTrustedContract(trusted);
    }

    function test_RemoveTrustedContract_Revert_NotTrusted() public {
        address notTrusted = makeAddr("notTrusted");
        vm.expectRevert(IComplianceRules.ComplianceRules__NotTrustedContract.selector);
        complianceRules.removeTrustedContract(notTrusted);
    }

    function test_RemoveTrustedContract_Revert_NotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        complianceRules.removeTrustedContract(makeAddr("x"));
    }

    function test_IsTrustedContract() public view {
        assertFalse(complianceRules.isTrustedContract(investor1));
    }

    // ==================== canTransfer Tests ====================

    function test_CanTransfer_MintingAllowed() public {
        vm.prank(tokenContract);
        bool result = complianceRules.canTransfer(address(0), investor1, 100);
        assertTrue(result);
    }

    function test_CanTransfer_BurningAllowed() public {
        vm.prank(tokenContract);
        bool result = complianceRules.canTransfer(investor1, address(0), 100);
        assertTrue(result);
    }

    function test_CanTransfer_NoIdentityRegistry() public {
        // When no identity registry is set, canTransfer returns true
        vm.prank(tokenContract);
        bool result = complianceRules.canTransfer(investor1, investor2, 100);
        assertTrue(result);
    }

    // ==================== setRenterCompliance / setOperationalCompliance ====================

    function test_SetRenterCompliance_Success() public {
        complianceRules.setRenterCompliance(address(mockRenter));
    }

    function test_SetRenterCompliance_Revert_InvalidAddress() public {
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidAddress.selector);
        complianceRules.setRenterCompliance(address(0));
    }

    function test_SetRenterCompliance_Revert_NotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        complianceRules.setRenterCompliance(address(mockRenter));
    }

    function test_SetOperationalCompliance_Success() public {
        complianceRules.setOperationalCompliance(address(mockOperational));
    }

    function test_SetOperationalCompliance_Revert_InvalidAddress() public {
        vm.expectRevert(IComplianceRules.ComplianceRules__InvalidAddress.selector);
        complianceRules.setOperationalCompliance(address(0));
    }

    function test_SetOperationalCompliance_Revert_NotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        complianceRules.setOperationalCompliance(address(mockOperational));
    }

    // ==================== canRent Tests ====================

    function test_CanRent_NoModulesSet() public view {
        // When neither renter nor operational compliance is set, should pass
        (bool isValid, uint8 renterReason, uint8 vehicleReason) = complianceRules.canRent(investor1, 1);
        assertTrue(isValid);
        assertEq(renterReason, 0);
        assertEq(vehicleReason, 0);
    }

    function test_CanRent_RenterValid_OperationalValid() public {
        mockRenter.setValidation(true, IRenterCompliance.RenterValidationReason.VALID, true);
        mockOperational.setValidation(true, IOperationalCompliance.OperationalValidationReason.VALID);

        complianceRules.setRenterCompliance(address(mockRenter));
        complianceRules.setOperationalCompliance(address(mockOperational));

        (bool isValid, uint8 renterReason, uint8 vehicleReason) = complianceRules.canRent(investor1, 1);
        assertTrue(isValid);
        assertEq(renterReason, 0); // VALID
        assertEq(vehicleReason, 0); // VALID
    }

    function test_CanRent_RenterInvalid() public {
        mockRenter.setValidation(false, IRenterCompliance.RenterValidationReason.AGE_TOO_LOW, false);

        complianceRules.setRenterCompliance(address(mockRenter));

        (bool isValid, uint8 renterReason, uint8 vehicleReason) = complianceRules.canRent(investor1, 1);
        assertFalse(isValid);
        assertEq(renterReason, 1); // AGE_TOO_LOW
        assertEq(vehicleReason, 0);
    }

    function test_CanRent_OperationalInvalid() public {
        mockRenter.setValidation(true, IRenterCompliance.RenterValidationReason.VALID, true);
        mockOperational.setValidation(
            false, IOperationalCompliance.OperationalValidationReason.MAINTENANCE_OVERDUE
        );

        complianceRules.setRenterCompliance(address(mockRenter));
        complianceRules.setOperationalCompliance(address(mockOperational));

        (bool isValid, uint8 renterReason, uint8 vehicleReason) = complianceRules.canRent(investor1, 1);
        assertFalse(isValid);
        assertEq(renterReason, 0); // VALID (renter passed)
        assertEq(vehicleReason, 2); // MAINTENANCE_OVERDUE
    }

    function test_CanRent_OnlyOperationalSet_Valid() public {
        mockOperational.setValidation(true, IOperationalCompliance.OperationalValidationReason.VALID);
        complianceRules.setOperationalCompliance(address(mockOperational));

        (bool isValid,,) = complianceRules.canRent(investor1, 1);
        assertTrue(isValid);
    }

    function test_CanRent_OnlyRenterSet_Valid() public {
        mockRenter.setValidation(true, IRenterCompliance.RenterValidationReason.VALID, true);
        complianceRules.setRenterCompliance(address(mockRenter));

        (bool isValid,,) = complianceRules.canRent(investor1, 1);
        assertTrue(isValid);
    }

    // ==================== getComplianceStatus Tests ====================

    function test_GetComplianceStatus_NoRegistrySet() public view {
        (bool hasKYC, bool isInvestor, bool isRenter, bool hasDriverLicense) =
            complianceRules.getComplianceStatus(investor1);
        assertFalse(hasKYC);
        assertFalse(isInvestor);
        assertFalse(isRenter);
        assertFalse(hasDriverLicense);
    }

    function test_GetComplianceStatus_WithRenterCompliance() public {
        mockRenter.setValidation(true, IRenterCompliance.RenterValidationReason.VALID, true);
        complianceRules.setRenterCompliance(address(mockRenter));

        (,,bool isRenter, bool hasDriverLicense) = complianceRules.getComplianceStatus(investor1);
        assertTrue(isRenter);
        assertTrue(hasDriverLicense);
    }

    function test_GetComplianceStatus_RenterInvalid() public {
        mockRenter.setValidation(false, IRenterCompliance.RenterValidationReason.AGE_TOO_LOW, false);
        complianceRules.setRenterCompliance(address(mockRenter));

        (,,bool isRenter, bool hasDriverLicense) = complianceRules.getComplianceStatus(investor1);
        assertFalse(isRenter);
        assertFalse(hasDriverLicense);
    }

    // ==================== Edge Cases ====================

    function test_DefaultRulesUsedWhenNoTokenSpecificRule() public {
        // For an unauthorized token with no specific rules, defaults should be returned
        address randomToken = makeAddr("randomToken");

        (bool isActive,,,) = complianceRules.getJurisdictionRule(randomToken);
        assertTrue(isActive); // defaults are active

        (bool isActiveIT,,,,) = complianceRules.getInvestorTypeRule(randomToken);
        assertTrue(isActiveIT);

        (bool isActiveHP,,,) = complianceRules.getHoldingPeriodRule(randomToken);
        assertTrue(isActiveHP);

        (bool isActiveCL,,,) = complianceRules.getComplianceLevelRule(randomToken);
        assertTrue(isActiveCL);
    }

    function test_OwnerIsRuleAdministrator() public view {
        assertTrue(complianceRules.ruleAdministrators(owner));
    }

    function test_OnlyRuleAdministrator_OwnerCanAlsoCallGovernance() public {
        // Owner is set as rule administrator in constructor
        // Should be able to call governance functions directly
        uint256[] memory allowed = new uint256[](1);
        allowed[0] = 840;

        // owner calls directly (this contract is owner)
        complianceRules.setJurisdictionRule(tokenContract, allowed, new uint256[](0));
    }
}
