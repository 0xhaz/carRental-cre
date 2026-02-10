// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IComplianceRules} from "../../src/interfaces/compliance/IComplianceRules.sol";
import {ComplianceRules} from "../../src/compliance/ComplianceRules.sol";

contract ComplianceRulesTest is Test {
    ComplianceRules public complianceRules;

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
    }

    function test_Deployment() public view {
        assertEq(complianceRules.owner(), owner);
        assertTrue(complianceRules.ruleAdministrators(admin));
    }

    function test_Deployment_JurisdictionValidation() public view {
        // NOT_ACTIVE = 0,
        // BLOCKED = 1,
        // NOT_ALLOWED = 2,
        // PASSED = 3
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
        // NOT_ACTIVE = 0,
        // TYPE_BLOCKED = 1,
        // TYPE_NOT_ALLOWED = 2,
        // ACCREDITATION_INSUFFICIENT = 3,
        // PASSED = 4

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
        //  NOT_ACTIVE = 0,
        // HOLDING_PERIOD_NOT_SATISFIED = 1,
        // COOLDOWN_NOT_SATISFIED = 2,
        // PASSED = 3

        (bool isActive, uint256 requiredHoldingPeriod, uint256 requiredCooldownPeriod, uint256 lastUpdated) =
            complianceRules.getHoldingPeriodRule(tokenContract);
        assertTrue(isActive);
        assertEq(requiredHoldingPeriod, 24 * 60 * 60); // 24 hours
        assertEq(requiredCooldownPeriod, 60 * 60); // 1 hour
        assertGt(lastUpdated, 0);
    }

    function test_Deployment_ComplianceLevel() public view {
        (bool isActive, uint8 minimumLevel, uint8 maximumLevel, uint256 lastUpdated) =
            complianceRules.getComplianceLevelRule(tokenContract);
        assertTrue(isActive);
        assertEq(minimumLevel, 1); // BASIC
        assertEq(maximumLevel, 5); // PREMIUM
        assertGt(lastUpdated, 0);
    }

    function test_SetRuleAdministrator_Success() public {
        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit RuleAdministratorUpdated(user, true);
        complianceRules.setRuleAdministrator(user, true);
        vm.stopPrank();

        assertTrue(complianceRules.ruleAdministrators(user));
    }

    function test_SetTokenAuthorization_Success() public {
        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit TokenAuthorized(investor1, true);
        complianceRules.authorizeToken(investor1, true);
        vm.stopPrank();

        (bool isAuthorized,,,) = complianceRules.getJurisdictionRule(investor1);
        assertTrue(isAuthorized);
    }

    function test_SetJurisdictionRule_Revert_NotAuthorized() public {
        vm.startPrank(user);
        vm.expectRevert(IComplianceRules.ComplianceRules__OnlyGovernanceCanUpdate.selector);
        complianceRules.setJurisdictionRule(tokenContract, new uint256[](0), new uint256[](0));
        vm.stopPrank();
    }

    function test_SetTokenAuthorization_Revert_NotAuthorized() public {
        vm.startPrank(user);
        vm.expectRevert();
        complianceRules.authorizeToken(investor2, true);
        vm.stopPrank();
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

    function test_SetInvestorTypeRule_Success() public {
        vm.startPrank(admin);
        uint8[] memory allowedTypes = new uint8[](2);
        allowedTypes[0] = uint8(INVESTOR_TYPE_RETAIL);
        allowedTypes[1] = uint8(INVESTOR_TYPE_ACCREDITED);

        uint8[] memory blockedTypes = new uint8[](1);
        blockedTypes[0] = uint8(INVESTOR_TYPE_INSTITUTIONAL);

        complianceRules.setInvestorTypeRule(tokenContract, allowedTypes, blockedTypes, COMPLIANCE_LEVEL_STANDARD);
        vm.stopPrank();

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
}
