// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Test, console, Vm} from "forge-std/Test.sol";
import {InvestorTypeCompliance} from "../../src/compliance/InvestorTypeCompliance.sol";
import {ICompliance} from "../../src/interfaces/compliance/ICompliance.sol";
import {IInvestorTypeRegistry} from "../../src/interfaces/erc3643/IInvestorTypeRegistry.sol";

contract MockInvestorTypeRegistry is IInvestorTypeRegistry {
    mapping(address => InvestorType) public investorTypes;
    mapping(address => bool) public _isComplianceOfficer;
    mapping(address => bool) public _isTokenAuthorized;
    mapping(InvestorType => InvestorTypeConfig) public configs;

    constructor() {
        // Set default configs for each investor type
        configs[InvestorType.NORMAL] = InvestorTypeConfig({
            maxTransferAmount: 1000 ether,
            maxHoldingAmount: 10000 ether,
            requiredWhitelistTier: 1,
            transferCooldownMinutes: 60, // 1 hour
            largeTransferThreshold: 500 ether,
            enhancedLogging: false,
            enhancedPrivacy: false
        });

        configs[InvestorType.RETAIL] = InvestorTypeConfig({
            maxTransferAmount: 5000 ether,
            maxHoldingAmount: 50000 ether,
            requiredWhitelistTier: 2,
            transferCooldownMinutes: 30,
            largeTransferThreshold: 2000 ether,
            enhancedLogging: true,
            enhancedPrivacy: false
        });

        configs[InvestorType.ACCREDITED] = InvestorTypeConfig({
            maxTransferAmount: 50000 ether,
            maxHoldingAmount: 500000 ether,
            requiredWhitelistTier: 3,
            transferCooldownMinutes: 15,
            largeTransferThreshold: 10000 ether,
            enhancedLogging: true,
            enhancedPrivacy: true
        });

        configs[InvestorType.INSTITUTIONAL] = InvestorTypeConfig({
            maxTransferAmount: type(uint256).max,
            maxHoldingAmount: type(uint256).max,
            requiredWhitelistTier: 4,
            transferCooldownMinutes: 0,
            largeTransferThreshold: 100000 ether,
            enhancedLogging: true,
            enhancedPrivacy: true
        });
    }

    function assignInvestorType(address investor, InvestorType investorType) external {
        investorTypes[investor] = investorType;
    }

    function upgradeInvestorType(address investor, InvestorType investorType) external {
        investorTypes[investor] = investorType;
    }

    function downgradeInvestorType(address investor, InvestorType investorType) external {
        investorTypes[investor] = investorType;
    }

    function getInvestorType(address investor) external view returns (InvestorType) {
        return investorTypes[investor];
    }

    function getInvestorTypeConfig(InvestorType investorType) external view returns (InvestorTypeConfig memory) {
        return configs[investorType];
    }

    function canTransferAmount(address investor, uint256 amount) external view returns (bool) {
        InvestorType invType = investorTypes[investor];
        return amount <= configs[invType].maxTransferAmount;
    }

    function canHoldAmount(address investor, uint256 amount) external view returns (bool) {
        InvestorType invType = investorTypes[investor];
        return amount <= configs[invType].maxHoldingAmount;
    }

    function getRequiredWhitelistTier(address investor) external view returns (uint8) {
        InvestorType invType = investorTypes[investor];
        return configs[invType].requiredWhitelistTier;
    }

    function getTransferCooldown(address investor) external view returns (uint256) {
        InvestorType invType = investorTypes[investor];
        return configs[invType].transferCooldownMinutes;
    }

    function isLargeTransfer(address investor, uint256 amount) external view returns (bool) {
        InvestorType invType = investorTypes[investor];
        return amount >= configs[invType].largeTransferThreshold;
    }

    function hasEnhancedLogging(address investor) external view returns (bool) {
        InvestorType invType = investorTypes[investor];
        return configs[invType].enhancedLogging;
    }

    function hasEnhancedPrivacy(address investor) external view returns (bool) {
        InvestorType invType = investorTypes[investor];
        return configs[invType].enhancedPrivacy;
    }

    function setComplianceOfficer(address officer, bool authorized) external {
        _isComplianceOfficer[officer] = authorized;
    }

    function authorizeToken(address token, bool authorized) external {
        _isTokenAuthorized[token] = authorized;
    }

    function isComplianceOfficer(address officer) external view returns (bool) {
        return _isComplianceOfficer[officer];
    }

    function isTokenAuthorized(address token) external view returns (bool) {
        return _isTokenAuthorized[token];
    }

    function getAllInvestorTypeConfigs()
        external
        view
        returns (
            InvestorTypeConfig memory normalConfig,
            InvestorTypeConfig memory retailConfig,
            InvestorTypeConfig memory accreditedConfig,
            InvestorTypeConfig memory institutionalConfig
        )
    {
        return (configs[InvestorType.NORMAL], configs[InvestorType.RETAIL], configs[InvestorType.ACCREDITED], configs[InvestorType.INSTITUTIONAL]);
    }

    // Governance functions - stub implementations
    function createProposal(InvestorType, InvestorTypeConfig calldata, string calldata) external pure returns (uint256) {
        return 0;
    }

    function approveProposal(uint256) external pure {}

    function executeProposal(uint256) external pure {}

    function cancelProposal(uint256) external pure {}

    function setGovernor(address, bool, uint256) external pure {}

    function updateGovernanceParameters(uint256, uint256) external pure {}

    function updateInvestorTypeConfig(InvestorType investorType, InvestorTypeConfig calldata config) external {
        configs[investorType] = config;
    }

    function getProposal(uint256)
        external
        pure
        returns (
            uint256,
            InvestorType,
            InvestorTypeConfig memory,
            address,
            uint256,
            uint256,
            ProposalStatus,
            string memory,
            uint256
        )
    {
        InvestorTypeConfig memory emptyConfig;
        return (0, InvestorType.NORMAL, emptyConfig, address(0), 0, 0, ProposalStatus.PENDING, "", 0);
    }

    function isGovernor(address) external pure returns (bool) {
        return false;
    }

    function getGovernorWeight(address) external pure returns (uint256) {
        return 0;
    }

    function hasApproved(uint256, address) external pure returns (bool) {
        return false;
    }
}

contract InvestorTypeComplianceTest is Test {
    InvestorTypeCompliance public compliance;
    MockInvestorTypeRegistry public registry;

    address public owner = address(this);
    address public officer = makeAddr("officer");
    address public investor1 = makeAddr("investor1");
    address public investor2 = makeAddr("investor2");
    address public module1 = makeAddr("module1");
    address public module2 = makeAddr("module2");

    event LargeTransferDetected(
        address indexed from, address indexed to, uint256 amount, IInvestorTypeRegistry.InvestorType investorType
    );
    event LargeTransferApproved(address indexed from, address indexed to, uint256 amount, address indexed officer);
    event TransferCooldownViolation(address indexed investor, uint256 remainingCooldown);
    event EmergencyOverrideActivated(address indexed investor, address indexed officer);
    event EmergencyOverrideDeactivated(address indexed investor, address indexed officer);
    event ComplianceOfficerUpdated(address indexed officer, bool authorized);
    event ComplianceAdded(address indexed compliance);
    event ComplianceRemoved(address indexed compliance);

    function setUp() public {
        registry = new MockInvestorTypeRegistry();
        compliance = new InvestorTypeCompliance(address(registry));

        // Set up investor types
        registry.assignInvestorType(investor1, IInvestorTypeRegistry.InvestorType.NORMAL);
        registry.assignInvestorType(investor2, IInvestorTypeRegistry.InvestorType.ACCREDITED);
    }

    /*//////////////////////////////////////////////////////////////
                         CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_Success() public {
        InvestorTypeCompliance newCompliance = new InvestorTypeCompliance(address(registry));
        assertEq(newCompliance.getInvestorTypeRegistry(), address(registry));
        assertTrue(newCompliance.isComplianceOfficer(address(this)));
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert(ICompliance.Compliance__InvalidRegistryAddress.selector);
        new InvestorTypeCompliance(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        CANTRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CanTransfer_AllowsMinting() public view {
        assertTrue(compliance.canTransfer(address(0), investor1, 100 ether));
    }

    function test_CanTransfer_AllowsBurning() public view {
        assertTrue(compliance.canTransfer(investor1, address(0), 100 ether));
    }

    function test_CanTransfer_AllowsWithEmergencyOverride() public {
        compliance.setComplianceOfficer(officer, true);
        vm.prank(officer);
        compliance.activateEmergencyOverride(investor1);

        assertTrue(compliance.canTransfer(investor1, investor2, 10000 ether));
    }

    function test_CanTransfer_BlocksWhenExceedsTransferLimit() public view {
        // investor1 is NORMAL with maxTransferAmount = 1000 ether
        assertFalse(compliance.canTransfer(investor1, investor2, 1001 ether));
    }

    function test_CanTransfer_AllowsWithinTransferLimit() public view {
        // investor1 is NORMAL with maxTransferAmount = 1000 ether, largeTransferThreshold = 500 ether
        // Use 400 ether to be within limit and below large transfer threshold
        assertTrue(compliance.canTransfer(investor1, investor2, 400 ether));
    }

    function test_CanTransfer_BlocksLargeTransferWithoutApproval() public view {
        // investor1 NORMAL has largeTransferThreshold = 500 ether
        assertFalse(compliance.canTransfer(investor1, investor2, 600 ether));
    }

    function test_CanTransfer_AllowsLargeTransferWithApproval() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp + 1 days;

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        assertTrue(compliance.canTransfer(investor1, investor2, amount));
    }

    function test_CanTransfer_BlocksExpiredLargeTransferApproval() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);

        assertFalse(compliance.canTransfer(investor1, investor2, amount));
    }

    function test_CanTransfer_FirstTransferAlwaysAllowed() public view {
        // First transfer should be allowed (no cooldown violation)
        assertTrue(compliance.canTransfer(investor1, investor2, 100 ether));
    }

    /*//////////////////////////////////////////////////////////////
                       TRANSFERRED TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Transferred_UpdatesLastTransferTime() public {
        uint256 timeBefore = block.timestamp;
        compliance.transferred(investor1, investor2, 100 ether);

        (,, uint256 lastTransferTime) = compliance.getTransferCooldownViolation(investor1);
        assertEq(lastTransferTime, timeBefore);
    }

    function test_Transferred_EmitsLargeTransferEvent() public {
        uint256 largeAmount = 600 ether; // Above NORMAL threshold of 500 ether

        vm.expectEmit(true, true, false, true);
        emit LargeTransferDetected(investor1, investor2, largeAmount, IInvestorTypeRegistry.InvestorType.NORMAL);

        compliance.transferred(investor1, investor2, largeAmount);
    }

    function test_Transferred_NoEventForSmallTransfer() public {
        uint256 smallAmount = 100 ether;

        // Should not emit LargeTransferDetected
        vm.recordLogs();
        compliance.transferred(investor1, investor2, smallAmount);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            assertFalse(
                logs[i].topics[0] == keccak256("LargeTransferDetected(address,address,uint256,uint8)")
            );
        }
    }

    /*//////////////////////////////////////////////////////////////
                    CREATED/DESTROYED TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Created_NoOp() public {
        // Should not revert
        compliance.created(investor1, 1000 ether);
    }

    function test_Destroyed_NoOp() public {
        // Should not revert
        compliance.destroyed(investor1, 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                      MODULE MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AddModule_Success() public {
        vm.expectEmit(true, false, false, false);
        emit ComplianceAdded(module1);

        compliance.addModule(module1);

        assertTrue(compliance.isModuleBound(module1));
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], module1);
    }

    function test_AddModule_RevertsOnZeroAddress() public {
        vm.expectRevert(ICompliance.Compliance__InvalidModuleAddress.selector);
        compliance.addModule(address(0));
    }

    function test_AddModule_RevertsOnDuplicate() public {
        compliance.addModule(module1);

        vm.expectRevert(ICompliance.Compliance__ModuleAlreadyBound.selector);
        compliance.addModule(module1);
    }

    function test_AddModule_RevertsOnNonOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        compliance.addModule(module1);
    }

    function test_RemoveModule_Success() public {
        compliance.addModule(module1);
        compliance.addModule(module2);

        vm.expectEmit(true, false, false, false);
        emit ComplianceRemoved(module1);

        compliance.removeModule(module1);

        assertFalse(compliance.isModuleBound(module1));
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], module2);
    }

    function test_RemoveModule_RevertsOnNotBound() public {
        vm.expectRevert(ICompliance.Compliance__ModuleNotBound.selector);
        compliance.removeModule(module1);
    }

    function test_RemoveModule_RevertsOnNonOwner() public {
        compliance.addModule(module1);

        vm.prank(investor1);
        vm.expectRevert();
        compliance.removeModule(module1);
    }

    function test_GetModules_ReturnsEmptyArray() public view {
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 0);
    }

    function test_GetModules_ReturnsMultipleModules() public {
        compliance.addModule(module1);
        compliance.addModule(module2);

        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 2);
    }

    function test_IsModuleBound_ReturnsFalseForUnbound() public view {
        assertFalse(compliance.isModuleBound(module1));
    }

    /*//////////////////////////////////////////////////////////////
                   LARGE TRANSFER APPROVAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ApproveLargeTransfer_Success() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether; // Above NORMAL threshold
        uint256 expiry = block.timestamp + 1 days;

        vm.expectEmit(true, true, false, true);
        emit LargeTransferApproved(investor1, investor2, amount, officer);

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        assertTrue(compliance.isLargeTransferApproved(investor1, investor2, amount));
        assertEq(compliance.getLargeTransferExpiry(investor1, investor2, amount), expiry);
    }

    function test_ApproveLargeTransfer_RevertsOnNotLargeTransfer() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 100 ether; // Below threshold
        uint256 expiry = block.timestamp + 1 days;

        vm.prank(officer);
        vm.expectRevert(ICompliance.Compliance__NotALargeTransfer.selector);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);
    }

    function test_ApproveLargeTransfer_RevertsOnInvalidExpiry() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp - 1; // Past expiry

        vm.prank(officer);
        vm.expectRevert(ICompliance.Compliance__InvalidExpiryTime.selector);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);
    }

    function test_ApproveLargeTransfer_RevertsOnNonOfficer() public {
        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp + 1 days;

        vm.prank(investor1);
        vm.expectRevert(ICompliance.Compliance__InvalidRegistryAddress.selector);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);
    }

    function test_IsLargeTransferApproved_ReturnsFalseForUnapproved() public view {
        assertFalse(compliance.isLargeTransferApproved(investor1, investor2, 600 ether));
    }

    function test_IsLargeTransferApproved_ReturnsFalseWhenExpired() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        vm.warp(block.timestamp + 2 hours);

        assertFalse(compliance.isLargeTransferApproved(investor1, investor2, amount));
    }

    function test_GetLargeTransferExpiry_ReturnsZeroForUnapproved() public view {
        assertEq(compliance.getLargeTransferExpiry(investor1, investor2, 600 ether), 0);
    }

    /*//////////////////////////////////////////////////////////////
                   EMERGENCY OVERRIDE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ActivateEmergencyOverride_Success() public {
        compliance.setComplianceOfficer(officer, true);

        vm.expectEmit(true, true, false, false);
        emit EmergencyOverrideActivated(investor1, officer);

        vm.prank(officer);
        compliance.activateEmergencyOverride(investor1);

        assertTrue(compliance.hasEmergencyOverride(investor1));
    }

    function test_ActivateEmergencyOverride_RevertsOnNonOfficer() public {
        vm.prank(investor1);
        vm.expectRevert(ICompliance.Compliance__InvalidRegistryAddress.selector);
        compliance.activateEmergencyOverride(investor1);
    }

    function test_DeactivateEmergencyOverride_Success() public {
        compliance.setComplianceOfficer(officer, true);

        vm.prank(officer);
        compliance.activateEmergencyOverride(investor1);

        vm.expectEmit(true, true, false, false);
        emit EmergencyOverrideDeactivated(investor1, officer);

        vm.prank(officer);
        compliance.deactivateEmergencyOverride(investor1);

        assertFalse(compliance.hasEmergencyOverride(investor1));
    }

    function test_DeactivateEmergencyOverride_RevertsOnNonOfficer() public {
        vm.prank(investor1);
        vm.expectRevert(ICompliance.Compliance__InvalidRegistryAddress.selector);
        compliance.deactivateEmergencyOverride(investor1);
    }

    function test_HasEmergencyOverride_ReturnsFalseByDefault() public view {
        assertFalse(compliance.hasEmergencyOverride(investor1));
    }

    /*//////////////////////////////////////////////////////////////
                   COMPLIANCE OFFICER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetComplianceOfficer_Success() public {
        vm.expectEmit(true, false, false, true);
        emit ComplianceOfficerUpdated(officer, true);

        compliance.setComplianceOfficer(officer, true);

        assertTrue(compliance.isComplianceOfficer(officer));
    }

    function test_SetComplianceOfficer_CanRevoke() public {
        compliance.setComplianceOfficer(officer, true);

        vm.expectEmit(true, false, false, true);
        emit ComplianceOfficerUpdated(officer, false);

        compliance.setComplianceOfficer(officer, false);

        assertFalse(compliance.isComplianceOfficer(officer));
    }

    function test_SetComplianceOfficer_RevertsOnZeroAddress() public {
        vm.expectRevert(ICompliance.Compliance__InvalidOfficerAddress.selector);
        compliance.setComplianceOfficer(address(0), true);
    }

    function test_SetComplianceOfficer_RevertsOnNonOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        compliance.setComplianceOfficer(officer, true);
    }

    function test_IsComplianceOfficer_ReturnsTrueForOwner() public view {
        assertTrue(compliance.isComplianceOfficer(owner));
    }

    function test_IsComplianceOfficer_ReturnsFalseByDefault() public view {
        assertFalse(compliance.isComplianceOfficer(investor1));
    }

    /*//////////////////////////////////////////////////////////////
                    REGISTRY MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetInvestorTypeRegistry_Success() public {
        MockInvestorTypeRegistry newRegistry = new MockInvestorTypeRegistry();

        compliance.setInvestorTypeRegistry(address(newRegistry));

        assertEq(compliance.getInvestorTypeRegistry(), address(newRegistry));
    }

    function test_SetInvestorTypeRegistry_RevertsOnZeroAddress() public {
        vm.expectRevert(ICompliance.Compliance__InvalidRegistryAddress.selector);
        compliance.setInvestorTypeRegistry(address(0));
    }

    function test_SetInvestorTypeRegistry_RevertsOnNonOwner() public {
        MockInvestorTypeRegistry newRegistry = new MockInvestorTypeRegistry();

        vm.prank(investor1);
        vm.expectRevert();
        compliance.setInvestorTypeRegistry(address(newRegistry));
    }

    function test_GetInvestorTypeRegistry_ReturnsCorrectAddress() public view {
        assertEq(compliance.getInvestorTypeRegistry(), address(registry));
    }

    /*//////////////////////////////////////////////////////////////
                       COOLDOWN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetRemainingCooldown_ReturnsZeroForFirstTransfer() public view {
        assertEq(compliance.getRemainingCooldown(investor1), 0);
    }

    function test_GetRemainingCooldown_ReturnsCorrectValue() public {
        // investor1 is NORMAL with 60 min cooldown
        compliance.transferred(investor1, investor2, 100 ether);

        uint256 remaining = compliance.getRemainingCooldown(investor1);
        assertEq(remaining, 60 * 60); // 3600 seconds

        // Fast forward 30 minutes
        vm.warp(block.timestamp + 30 minutes);

        remaining = compliance.getRemainingCooldown(investor1);
        assertEq(remaining, 30 * 60); // 1800 seconds
    }

    function test_GetRemainingCooldown_ReturnsZeroAfterCooldown() public {
        compliance.transferred(investor1, investor2, 100 ether);

        // Fast forward past cooldown
        vm.warp(block.timestamp + 61 minutes);

        assertEq(compliance.getRemainingCooldown(investor1), 0);
    }

    function test_GetTransferCooldownViolation_NoViolationForFirstTransfer() public view {
        (bool hasViolation, uint256 remaining, uint256 lastTransferTime) =
            compliance.getTransferCooldownViolation(investor1);

        assertFalse(hasViolation);
        assertEq(remaining, 0);
        assertEq(lastTransferTime, 0);
    }

    function test_GetTransferCooldownViolation_HasViolationDuringCooldown() public {
        compliance.transferred(investor1, investor2, 100 ether);

        (bool hasViolation, uint256 remaining, uint256 lastTransferTime) =
            compliance.getTransferCooldownViolation(investor1);

        assertTrue(hasViolation);
        assertEq(remaining, 60 * 60);
        assertEq(lastTransferTime, block.timestamp);
    }

    function test_GetTransferCooldownViolation_NoViolationAfterCooldown() public {
        compliance.transferred(investor1, investor2, 100 ether);

        vm.warp(block.timestamp + 61 minutes);

        (bool hasViolation,,) = compliance.getTransferCooldownViolation(investor1);

        assertFalse(hasViolation);
    }

    /*//////////////////////////////////////////////////////////////
                    ISTRUSTEDCONTRACT TEST
    //////////////////////////////////////////////////////////////*/

    function test_IsTrustedContract_AlwaysReturnsFalse() public view {
        assertFalse(compliance.isTrustedContract(module1));
        assertFalse(compliance.isTrustedContract(address(0)));
        assertFalse(compliance.isTrustedContract(address(this)));
    }

    /*//////////////////////////////////////////////////////////////
                      INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Integration_FullTransferFlow() public {
        // Setup: Set compliance officer
        compliance.setComplianceOfficer(officer, true);

        // Step 1: Small transfer (no approval needed)
        assertTrue(compliance.canTransfer(investor1, investor2, 100 ether));
        compliance.transferred(investor1, investor2, 100 ether);

        // Step 2: Check cooldown is active immediately after transfer
        (bool hasViolation,,) = compliance.getTransferCooldownViolation(investor1);
        assertTrue(hasViolation);

        // Step 3: Fast forward past cooldown (60 minutes for NORMAL investor)
        vm.warp(block.timestamp + 61 minutes);

        // Step 4: Try large transfer without approval (should fail)
        uint256 largeAmount = 600 ether;
        assertFalse(compliance.canTransfer(investor1, investor2, largeAmount));

        // Step 5: Approve large transfer
        uint256 expiry = block.timestamp + 1 days;
        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, largeAmount, expiry);

        // Step 6: Large transfer should now pass
        assertTrue(compliance.canTransfer(investor1, investor2, largeAmount));
        compliance.transferred(investor1, investor2, largeAmount);

        // Step 7: Check cooldown is active again
        (bool hasViolation2,,) = compliance.getTransferCooldownViolation(investor1);
        assertTrue(hasViolation2);
    }

    function test_Integration_EmergencyOverrideBypassesAllChecks() public {
        compliance.setComplianceOfficer(officer, true);

        // Activate emergency override
        vm.prank(officer);
        compliance.activateEmergencyOverride(investor1);

        // Should allow transfer exceeding limits without approval
        assertTrue(compliance.canTransfer(investor1, investor2, 10000 ether));

        // Deactivate override
        vm.prank(officer);
        compliance.deactivateEmergencyOverride(investor1);

        // Transfer should now be blocked
        assertFalse(compliance.canTransfer(investor1, investor2, 10000 ether));
    }

    function test_Integration_MultipleModules() public {
        compliance.addModule(module1);
        compliance.addModule(module2);

        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 2);

        compliance.removeModule(module1);

        modules = compliance.getModules();
        assertEq(modules.length, 1);
        assertEq(modules[0], module2);
    }

    /*//////////////////////////////////////////////////////////////
                         EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_EdgeCase_LargeTransferExpiryExactTime() public {
        compliance.setComplianceOfficer(officer, true);

        uint256 amount = 600 ether;
        uint256 expiry = block.timestamp + 1 hours;

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        // At exact expiry time
        vm.warp(expiry);

        // Should still be valid at expiry time (<=)
        assertTrue(compliance.isLargeTransferApproved(investor1, investor2, amount));

        // One second after expiry
        vm.warp(expiry + 1);

        assertFalse(compliance.isLargeTransferApproved(investor1, investor2, amount));
    }

    function test_EdgeCase_InstitutionalInvestorNoCooldown() public {
        address institutional = makeAddr("institutional");
        registry.assignInvestorType(institutional, IInvestorTypeRegistry.InvestorType.INSTITUTIONAL);

        // First transfer
        compliance.transferred(institutional, investor2, 1000 ether);

        // Institutional has 0 cooldown, so should have no violation immediately
        assertEq(compliance.getRemainingCooldown(institutional), 0);
    }

    function test_EdgeCase_MaxUintTransferForInstitutional() public {
        address institutional = makeAddr("institutional");
        registry.assignInvestorType(institutional, IInvestorTypeRegistry.InvestorType.INSTITUTIONAL);

        // Institutional can transfer up to max amount (below large transfer threshold of 100000 ether)
        // Use 50000 ether which is within limits and below threshold
        assertTrue(compliance.canTransfer(institutional, investor2, 50000 ether));

        // Can also transfer very large amounts with approval
        compliance.setComplianceOfficer(officer, true);
        uint256 largeAmount = 200000 ether;
        uint256 expiry = block.timestamp + 1 days;

        vm.prank(officer);
        compliance.approveLargeTransfer(institutional, investor2, largeAmount, expiry);

        assertTrue(compliance.canTransfer(institutional, investor2, largeAmount));
    }

    function test_EdgeCase_DifferentInvestorTypes() public view {
        // investor1 = NORMAL (1000 ether max, 500 ether large transfer threshold)
        // investor2 = ACCREDITED (50000 ether max, 10000 ether large transfer threshold)

        // Test below large transfer threshold
        assertTrue(compliance.canTransfer(investor1, investor2, 400 ether));
        assertFalse(compliance.canTransfer(investor1, investor2, 1001 ether));

        assertTrue(compliance.canTransfer(investor2, investor1, 9000 ether));
        assertFalse(compliance.canTransfer(investor2, investor1, 50001 ether));
    }

    /*//////////////////////////////////////////////////////////////
                         FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_CanTransfer_WithinLimits(uint256 amount) public view {
        // Bound amount to valid range for NORMAL investor (below large transfer threshold)
        // maxTransferAmount = 1000 ether, largeTransferThreshold = 500 ether
        amount = bound(amount, 1, 499 ether);

        assertTrue(compliance.canTransfer(investor1, investor2, amount));
    }

    function testFuzz_CanTransfer_ExceedsLimits(uint256 amount) public view {
        // Amount above NORMAL max transfer (1000 ether)
        amount = bound(amount, 1001 ether, type(uint256).max);

        assertFalse(compliance.canTransfer(investor1, investor2, amount));
    }

    function testFuzz_RemainingCooldown(uint256 timeElapsed) public {
        // Cooldown is 60 minutes for NORMAL investor
        uint256 cooldownSeconds = 60 * 60;

        compliance.transferred(investor1, investor2, 100 ether);

        // Bound time elapsed to reasonable range
        timeElapsed = bound(timeElapsed, 0, cooldownSeconds * 2);

        vm.warp(block.timestamp + timeElapsed);

        uint256 remaining = compliance.getRemainingCooldown(investor1);

        if (timeElapsed >= cooldownSeconds) {
            assertEq(remaining, 0);
        } else {
            assertEq(remaining, cooldownSeconds - timeElapsed);
        }
    }

    function testFuzz_ApproveLargeTransfer(uint256 amount, uint256 expiryOffset) public {
        compliance.setComplianceOfficer(officer, true);

        // Amount must be above NORMAL threshold (500 ether)
        amount = bound(amount, 501 ether, 1000 ether);

        // Expiry must be in the future (1 second to 30 days)
        expiryOffset = bound(expiryOffset, 1, 30 days);
        uint256 expiry = block.timestamp + expiryOffset;

        vm.prank(officer);
        compliance.approveLargeTransfer(investor1, investor2, amount, expiry);

        assertTrue(compliance.isLargeTransferApproved(investor1, investor2, amount));
        assertEq(compliance.getLargeTransferExpiry(investor1, investor2, amount), expiry);
    }
}
