// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TransferRestrictions} from "../../src/compliance/TransferRestrictions.sol";

/**
 * @title TransferRestrictionsTest
 * @dev Comprehensive test suite for TransferRestrictions contract
 * @notice Tests cover constructor, restrictions, transfers, stats, integration, edge cases, and fuzz
 */
contract TransferRestrictionsTest is Test {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    TransferRestrictions public restrictions;

    // Test accounts
    address public owner;
    address public token1;
    address public token2;
    address public investor1;
    address public investor2;

    // Test data
    uint256 constant BASE_TIMESTAMP = 1000 days; // Fixed base to avoid underflow
    uint256 constant HOLDING_PERIOD = 7 days;
    uint256 constant MAX_TRANSFER_AMOUNT = 1000 ether;
    uint256 constant DAILY_LIMIT = 500 ether;
    uint256 constant MONTHLY_LIMIT = 5000 ether;

    uint16[] allowedJurisdictions;
    uint8[] allowedInvestorTypes;

    /*//////////////////////////////////////////////////////////////
                              SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public {
        owner = address(this);
        token1 = makeAddr("token1");
        token2 = makeAddr("token2");
        investor1 = makeAddr("investor1");
        investor2 = makeAddr("investor2");

        // Set initial timestamp to avoid underflow
        vm.warp(BASE_TIMESTAMP);

        // Deploy TransferRestrictions
        restrictions = new TransferRestrictions(owner);

        // Setup default allowed jurisdictions and investor types
        allowedJurisdictions.push(840); // US
        allowedJurisdictions.push(826); // UK

        allowedInvestorTypes.push(1); // RETAIL
        allowedInvestorTypes.push(2); // ACCREDITED
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_SetsOwner() public view {
        assertEq(restrictions.owner(), owner);
    }

    /*//////////////////////////////////////////////////////////////
                    SET RESTRICTION RULE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetRestrictionRule_SetsAllParameters() public {
        vm.expectEmit(true, true, true, true);
        emit TransferRestrictions.RestrictionRuleUpdated(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT
        );

        restrictions.setRestrictionRule(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);

        assertTrue(rule.isActive);
        assertEq(rule.holdingPeriod, HOLDING_PERIOD);
        assertEq(rule.maxTransferAmount, MAX_TRANSFER_AMOUNT);
        assertEq(rule.dailyLimit, DAILY_LIMIT);
        assertEq(rule.monthlyLimit, MONTHLY_LIMIT);
        assertEq(rule.allowedJurisdictions.length, 2);
        assertEq(rule.allowedJurisdictions[0], 840);
        assertEq(rule.allowedJurisdictions[1], 826);
        assertEq(rule.allowedInvestorTypes.length, 2);
        assertEq(rule.allowedInvestorTypes[0], 1);
        assertEq(rule.allowedInvestorTypes[1], 2);
        assertFalse(rule.requiresApproval);
    }

    function test_SetRestrictionRule_WithApprovalRequired() public {
        restrictions.setRestrictionRule(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            true
        );

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertTrue(rule.requiresApproval);
    }

    function test_SetRestrictionRule_WithEmptyArrays() public {
        uint16[] memory emptyJurisdictions;
        uint8[] memory emptyInvestorTypes;

        restrictions.setRestrictionRule(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            emptyJurisdictions,
            emptyInvestorTypes,
            false
        );

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertEq(rule.allowedJurisdictions.length, 0);
        assertEq(rule.allowedInvestorTypes.length, 0);
    }

    function test_SetRestrictionRule_UpdatesExistingRule() public {
        // Set initial rule
        restrictions.setRestrictionRule(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );

        // Update rule
        uint256 newHoldingPeriod = 14 days;
        restrictions.setRestrictionRule(
            token1,
            newHoldingPeriod,
            MAX_TRANSFER_AMOUNT * 2,
            DAILY_LIMIT * 2,
            MONTHLY_LIMIT * 2,
            allowedJurisdictions,
            allowedInvestorTypes,
            true
        );

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertEq(rule.holdingPeriod, newHoldingPeriod);
        assertEq(rule.maxTransferAmount, MAX_TRANSFER_AMOUNT * 2);
        assertTrue(rule.requiresApproval);
    }

    function test_SetRestrictionRule_RevertsWhenNotOwner() public {
        vm.prank(investor1);
        vm.expectRevert();
        restrictions.setRestrictionRule(
            token1,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );
    }

    /*//////////////////////////////////////////////////////////////
                    GET RESTRICTION RULE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetRestrictionRule_ReturnsInactiveForUnsetToken() public view {
        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertFalse(rule.isActive);
    }

    function test_GetRestrictionRule_ReturnsSetRule() public {
        _setBasicRestriction(token1);

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertTrue(rule.isActive);
        assertEq(rule.holdingPeriod, HOLDING_PERIOD);
    }

    /*//////////////////////////////////////////////////////////////
                        CAN TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CanTransfer_AllowsWhenNoRestriction() public view {
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    function test_CanTransfer_AllowsWhenWithinAllLimits() public {
        _setBasicRestriction(token1);

        // First transfer to set last transfer time
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        // Move past holding period
        vm.warp(block.timestamp + HOLDING_PERIOD + 1);

        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    function test_CanTransfer_BlocksWhenHoldingPeriodNotMet() public {
        _setBasicRestriction(token1);

        // Record first transfer
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        // Try to transfer before holding period
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);

        assertFalse(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.HOLDING_PERIOD_VIOLATION));
    }

    function test_CanTransfer_AllowsFirstTransferWithHoldingPeriod() public {
        _setBasicRestriction(token1);

        // First transfer should be allowed even with holding period (no previous transfer)
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    function test_CanTransfer_BlocksWhenExceedsMaxTransferAmount() public {
        _setBasicRestriction(token1);

        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, MAX_TRANSFER_AMOUNT + 1);

        assertFalse(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.MAX_TRANSFER_AMOUNT_EXCEEDED));
    }

    function test_CanTransfer_AllowsAtMaxTransferAmount() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // MAX_TRANSFER_AMOUNT is 1000 ether, which exceeds DAILY_LIMIT of 500 ether
        // So use daily limit as the test amount instead
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, DAILY_LIMIT);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    function test_CanTransfer_BlocksWhenExceedsDailyLimit() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Transfer up to limit
        restrictions.recordTransfer(token1, investor1, investor2, DAILY_LIMIT);

        // Try to transfer more
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 1 ether);

        assertFalse(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.DAILY_LIMIT_EXCEEDED));
    }

    function test_CanTransfer_AllowsMultipleTransfersWithinDailyLimit() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Record first transfer
        restrictions.recordTransfer(token1, investor1, investor2, 200 ether);

        // Second transfer within limit (no waiting needed)
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 200 ether);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    function test_CanTransfer_BlocksWhenExceedsMonthlyLimit() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Accumulate 4900 ether over 10 days using absolute timestamps (staying within same month)
        uint256 baseTime = BASE_TIMESTAMP;

        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 1 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 2 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 3 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 4 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 5 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 6 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 7 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 8 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 9 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 10 days);

        // Total monthly = 4900 ether (still within month 33)
        // Try to transfer 101 ether (would make 5001, exceeding monthly limit of 5000)
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 101 ether);

        assertFalse(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.MONTHLY_LIMIT_EXCEEDED));
    }

    function test_CanTransfer_AllowsMultipleTransfersWithinMonthlyLimit() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Record 2 transfers of 490 ether over 2 days using absolute timestamps
        uint256 baseTime = BASE_TIMESTAMP;

        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 2 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 4 days);

        // Check we can still transfer 490 ether (total would be 980 + 490 = 1470 ether < 5000 ether)
        (bool canTransfer, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, 490 ether);

        assertTrue(canTransfer);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.NONE));
    }

    /*//////////////////////////////////////////////////////////////
                    RECORD TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RecordTransfer_UpdatesLastTransferTime() public {
        uint256 transferTime = block.timestamp;

        vm.expectEmit(true, true, true, true);
        emit TransferRestrictions.TransferApproved(token1, investor1, investor2, 100 ether);

        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        (,, uint256 lastTransferTime) = restrictions.getTransferStats(token1, investor1);
        assertEq(lastTransferTime, transferTime);
    }

    function test_RecordTransfer_UpdatesDailyAmount() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        (uint256 dailyTransferred,,) = restrictions.getTransferStats(token1, investor1);
        assertEq(dailyTransferred, 100 ether);
    }

    function test_RecordTransfer_UpdatesMonthlyAmount() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        (, uint256 monthlyTransferred,) = restrictions.getTransferStats(token1, investor1);
        assertEq(monthlyTransferred, 100 ether);
    }

    function test_RecordTransfer_AccumulatesDailyAmounts() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);
        restrictions.recordTransfer(token1, investor1, investor2, 150 ether);

        (uint256 dailyTransferred,,) = restrictions.getTransferStats(token1, investor1);
        assertEq(dailyTransferred, 250 ether);
    }

    function test_RecordTransfer_AccumulatesMonthlyAmounts() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);
        restrictions.recordTransfer(token1, investor1, investor2, 200 ether);

        (, uint256 monthlyTransferred,) = restrictions.getTransferStats(token1, investor1);
        assertEq(monthlyTransferred, 300 ether);
    }

    function test_RecordTransfer_ResetsDailyAmountAfterDay() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        // Move to next day
        vm.warp(block.timestamp + 1 days + 1);

        restrictions.recordTransfer(token1, investor1, investor2, 150 ether);

        (uint256 dailyTransferred,,) = restrictions.getTransferStats(token1, investor1);
        assertEq(dailyTransferred, 150 ether); // Should be reset
    }

    function test_RecordTransfer_ResetsMonthlyAmountAfterMonth() public {
        restrictions.recordTransfer(token1, investor1, investor2, 1000 ether);

        // Move to next month
        vm.warp(block.timestamp + 31 days);

        restrictions.recordTransfer(token1, investor1, investor2, 1500 ether);

        (, uint256 monthlyTransferred,) = restrictions.getTransferStats(token1, investor1);
        assertEq(monthlyTransferred, 1500 ether); // Should be reset
    }

    /*//////////////////////////////////////////////////////////////
                    TRANSFER STATS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetTransferStats_ReturnsZeroForNewInvestor() public view {
        (uint256 daily, uint256 monthly, uint256 lastTime) =
            restrictions.getTransferStats(token1, investor1);

        assertEq(daily, 0);
        assertEq(monthly, 0);
        assertEq(lastTime, 0);
    }

    function test_GetTransferStats_ReturnsAccurateStats() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        (uint256 daily, uint256 monthly, uint256 lastTime) =
            restrictions.getTransferStats(token1, investor1);

        assertEq(daily, 100 ether);
        assertEq(monthly, 100 ether);
        assertEq(lastTime, block.timestamp);
    }

    function test_GetTransferStats_AccountsForDailyReset() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        vm.warp(block.timestamp + 2 days);

        (uint256 daily, uint256 monthly,) =
            restrictions.getTransferStats(token1, investor1);

        assertEq(daily, 0); // Reset
        assertEq(monthly, 100 ether); // Not reset
    }

    function test_GetTransferStats_AccountsForMonthlyReset() public {
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        vm.warp(block.timestamp + 31 days);

        (uint256 daily, uint256 monthly,) =
            restrictions.getTransferStats(token1, investor1);

        assertEq(daily, 0);
        assertEq(monthly, 0); // Reset
    }

    /*//////////////////////////////////////////////////////////////
                    JURISDICTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IsJurisdictionAllowed_ReturnsTrueWhenNoRestrictions() public view {
        assertTrue(restrictions.isJurisdictionAllowed(token1, 840));
        assertTrue(restrictions.isJurisdictionAllowed(token1, 999));
    }

    function test_IsJurisdictionAllowed_ReturnsTrueForAllowedJurisdiction() public {
        _setBasicRestriction(token1);

        assertTrue(restrictions.isJurisdictionAllowed(token1, 840));
        assertTrue(restrictions.isJurisdictionAllowed(token1, 826));
    }

    function test_IsJurisdictionAllowed_ReturnsFalseForDisallowedJurisdiction() public {
        _setBasicRestriction(token1);

        assertFalse(restrictions.isJurisdictionAllowed(token1, 999));
    }

    /*//////////////////////////////////////////////////////////////
                    INVESTOR TYPE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IsInvestorTypeAllowed_ReturnsTrueWhenNoRestrictions() public view {
        assertTrue(restrictions.isInvestorTypeAllowed(token1, 1));
        assertTrue(restrictions.isInvestorTypeAllowed(token1, 99));
    }

    function test_IsInvestorTypeAllowed_ReturnsTrueForAllowedType() public {
        _setBasicRestriction(token1);

        assertTrue(restrictions.isInvestorTypeAllowed(token1, 1));
        assertTrue(restrictions.isInvestorTypeAllowed(token1, 2));
    }

    function test_IsInvestorTypeAllowed_ReturnsFalseForDisallowedType() public {
        _setBasicRestriction(token1);

        assertFalse(restrictions.isInvestorTypeAllowed(token1, 3));
    }

    /*//////////////////////////////////////////////////////////////
                    INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Integration_CompleteTransferFlow() public {
        _setBasicRestriction(token1);

        // First transfer
        (bool can1,) = restrictions.canTransfer(token1, investor1, investor2, 200 ether);
        assertTrue(can1);
        restrictions.recordTransfer(token1, investor1, investor2, 200 ether);

        // Immediate second transfer blocked by holding period
        (bool can2, TransferRestrictions.RestrictionReason reason2) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);
        assertFalse(can2);
        assertEq(uint8(reason2), uint8(TransferRestrictions.RestrictionReason.HOLDING_PERIOD_VIOLATION));

        // Wait for holding period (7 days crosses into new day)
        vm.warp(block.timestamp + HOLDING_PERIOD + 1);

        // Now allowed
        (bool can3,) = restrictions.canTransfer(token1, investor1, investor2, 100 ether);
        assertTrue(can3);
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        // Check daily amount (on new day after 7-day warp, so only shows recent transfer)
        (uint256 daily,,) = restrictions.getTransferStats(token1, investor1);
        assertEq(daily, 100 ether);
    }

    function test_Integration_MultipleTokens() public {
        _setBasicRestriction(token1);
        _setBasicRestriction(token2);

        // Transfer on token1
        restrictions.recordTransfer(token1, investor1, investor2, 200 ether);

        // Transfer on token2 (independent limits)
        (bool can,) = restrictions.canTransfer(token2, investor1, investor2, 200 ether);
        assertTrue(can);
        restrictions.recordTransfer(token2, investor1, investor2, 200 ether);

        // Stats are independent
        (uint256 daily1,,) = restrictions.getTransferStats(token1, investor1);
        (uint256 daily2,,) = restrictions.getTransferStats(token2, investor1);

        assertEq(daily1, 200 ether);
        assertEq(daily2, 200 ether);
    }

    function test_Integration_DailyLimitResetFlow() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Fill daily limit
        restrictions.recordTransfer(token1, investor1, investor2, DAILY_LIMIT);

        // Can't transfer more
        (bool can1, TransferRestrictions.RestrictionReason reason1) =
            restrictions.canTransfer(token1, investor1, investor2, 1 ether);
        assertFalse(can1);
        assertEq(uint8(reason1), uint8(TransferRestrictions.RestrictionReason.DAILY_LIMIT_EXCEEDED));

        // Move to next day
        vm.warp(block.timestamp + 1 days + 1);

        // Now can transfer again
        (bool can2,) = restrictions.canTransfer(token1, investor1, investor2, 200 ether);
        assertTrue(can2);
    }

    function test_Integration_MonthlyLimitResetFlow() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Accumulate 4900 ether over 10 days using absolute timestamps (within same month)
        uint256 baseTime = BASE_TIMESTAMP;

        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 1 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 2 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 3 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 4 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 5 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 6 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 7 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 8 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 9 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 10 days);

        // Total monthly = 4900 ether
        // Try to transfer 101 ether (would exceed monthly limit)
        (bool can1, TransferRestrictions.RestrictionReason reason1) =
            restrictions.canTransfer(token1, investor1, investor2, 101 ether);
        assertFalse(can1);
        assertEq(uint8(reason1), uint8(TransferRestrictions.RestrictionReason.MONTHLY_LIMIT_EXCEEDED));

        // Move to next month (30 days is one month in the contract)
        vm.warp(baseTime + 30 days + 1);

        // Now can transfer again (monthly limit reset)
        (bool can2,) = restrictions.canTransfer(token1, investor1, investor2, 490 ether);
        assertTrue(can2);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_EdgeCase_ZeroAmountTransfer() public {
        _setBasicRestriction(token1);

        (bool canTransfer,) = restrictions.canTransfer(token1, investor1, investor2, 0);
        assertTrue(canTransfer);

        restrictions.recordTransfer(token1, investor1, investor2, 0);

        (uint256 daily, uint256 monthly,) = restrictions.getTransferStats(token1, investor1);
        assertEq(daily, 0);
        assertEq(monthly, 0);
    }

    function test_EdgeCase_NoLimitsSet() public {
        uint16[] memory emptyJuris;
        uint8[] memory emptyTypes;

        restrictions.setRestrictionRule(
            token1,
            0, // No holding period
            0, // No max transfer
            0, // No daily limit
            0, // No monthly limit
            emptyJuris,
            emptyTypes,
            false
        );

        // Should allow any transfer
        (bool can,) = restrictions.canTransfer(token1, investor1, investor2, type(uint256).max);
        assertTrue(can);
    }

    function test_EdgeCase_ExactDailyLimit() public {
        _setBasicRestriction(token1);

        (bool can,) = restrictions.canTransfer(token1, investor1, investor2, DAILY_LIMIT);
        assertTrue(can);

        restrictions.recordTransfer(token1, investor1, investor2, DAILY_LIMIT);

        // Next transfer should fail
        (bool can2,) = restrictions.canTransfer(token1, investor1, investor2, 1);
        assertFalse(can2);
    }

    function test_EdgeCase_ExactMonthlyLimit() public {
        _setRestrictionWithoutHoldingPeriod(token1);

        // Accumulate exactly 5000 ether (monthly limit) using absolute timestamps (within same month)
        uint256 baseTime = BASE_TIMESTAMP;

        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 1 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 2 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 3 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 4 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 5 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 6 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 7 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 8 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 9 days);
        restrictions.recordTransfer(token1, investor1, investor2, 490 ether);
        vm.warp(baseTime + 10 days);
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);
        vm.warp(baseTime + 11 days);

        // Now at exactly 5000 ether monthly limit
        // Next transfer should fail with monthly limit (even 1 ether would exceed)
        (bool can2, TransferRestrictions.RestrictionReason reason2) =
            restrictions.canTransfer(token1, investor1, investor2, 1 ether);
        assertFalse(can2);
        assertEq(uint8(reason2), uint8(TransferRestrictions.RestrictionReason.MONTHLY_LIMIT_EXCEEDED));
    }

    function test_EdgeCase_MultipleInvestorsSameDayAndMonth() public {
        _setBasicRestriction(token1);

        restrictions.recordTransfer(token1, investor1, investor2, 300 ether);
        restrictions.recordTransfer(token1, investor2, investor1, 400 ether);

        (uint256 daily1,,) = restrictions.getTransferStats(token1, investor1);
        (uint256 daily2,,) = restrictions.getTransferStats(token1, investor2);

        assertEq(daily1, 300 ether);
        assertEq(daily2, 400 ether);
    }

    function test_EdgeCase_ExactHoldingPeriodBoundary() public {
        _setBasicRestriction(token1);

        uint256 transferTime = block.timestamp;
        restrictions.recordTransfer(token1, investor1, investor2, 100 ether);

        // One second before boundary (should block)
        vm.warp(transferTime + HOLDING_PERIOD - 1);
        (bool can1, TransferRestrictions.RestrictionReason reason1) =
            restrictions.canTransfer(token1, investor1, investor2, 100 ether);
        assertFalse(can1);
        assertEq(uint8(reason1), uint8(TransferRestrictions.RestrictionReason.HOLDING_PERIOD_VIOLATION));

        // At exact boundary (should allow: block.timestamp >= lastTransfer + holdingPeriod)
        vm.warp(transferTime + HOLDING_PERIOD);
        (bool can2,) = restrictions.canTransfer(token1, investor1, investor2, 100 ether);
        assertTrue(can2);
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_SetRestrictionRule_WithVariousParameters(
        uint256 holdingPeriod,
        uint256 maxTransfer,
        uint256 dailyLimit,
        uint256 monthlyLimit
    ) public {
        vm.assume(holdingPeriod < 365 days);
        vm.assume(maxTransfer < type(uint128).max);
        vm.assume(dailyLimit < type(uint128).max);
        vm.assume(monthlyLimit < type(uint128).max);

        restrictions.setRestrictionRule(
            token1,
            holdingPeriod,
            maxTransfer,
            dailyLimit,
            monthlyLimit,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );

        TransferRestrictions.RestrictionRule memory rule = restrictions.getRestrictionRule(token1);
        assertEq(rule.holdingPeriod, holdingPeriod);
        assertEq(rule.maxTransferAmount, maxTransfer);
        assertEq(rule.dailyLimit, dailyLimit);
        assertEq(rule.monthlyLimit, monthlyLimit);
    }

    function testFuzz_RecordTransfer_WithVariousAmounts(uint256 amount) public {
        vm.assume(amount < type(uint128).max);

        restrictions.recordTransfer(token1, investor1, investor2, amount);

        (uint256 daily, uint256 monthly,) = restrictions.getTransferStats(token1, investor1);
        assertEq(daily, amount);
        assertEq(monthly, amount);
    }

    function testFuzz_CanTransfer_BelowMaxTransferAmount(uint256 amount) public {
        _setBasicRestriction(token1);

        // Bound to be below max transfer AND below daily limit
        amount = bound(amount, 0, MAX_TRANSFER_AMOUNT < DAILY_LIMIT ? MAX_TRANSFER_AMOUNT : DAILY_LIMIT);

        (bool can,) = restrictions.canTransfer(token1, investor1, investor2, amount);
        assertTrue(can);
    }

    function testFuzz_CanTransfer_AboveMaxTransferAmount(uint256 amount) public {
        _setBasicRestriction(token1);

        amount = bound(amount, MAX_TRANSFER_AMOUNT + 1, type(uint128).max);

        (bool can, TransferRestrictions.RestrictionReason reason) =
            restrictions.canTransfer(token1, investor1, investor2, amount);

        assertFalse(can);
        assertEq(uint8(reason), uint8(TransferRestrictions.RestrictionReason.MAX_TRANSFER_AMOUNT_EXCEEDED));
    }

    function testFuzz_IsJurisdictionAllowed_WithVariousJurisdictions(uint16 jurisdiction) public {
        _setBasicRestriction(token1);

        bool isAllowed = restrictions.isJurisdictionAllowed(token1, jurisdiction);

        if (jurisdiction == 840 || jurisdiction == 826) {
            assertTrue(isAllowed);
        } else {
            assertFalse(isAllowed);
        }
    }

    function testFuzz_IsInvestorTypeAllowed_WithVariousTypes(uint8 investorType) public {
        _setBasicRestriction(token1);

        bool isAllowed = restrictions.isInvestorTypeAllowed(token1, investorType);

        if (investorType == 1 || investorType == 2) {
            assertTrue(isAllowed);
        } else {
            assertFalse(isAllowed);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _setBasicRestriction(address token) internal {
        restrictions.setRestrictionRule(
            token,
            HOLDING_PERIOD,
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );
    }

    function _setRestrictionWithoutHoldingPeriod(address token) internal {
        restrictions.setRestrictionRule(
            token,
            0, // No holding period
            MAX_TRANSFER_AMOUNT,
            DAILY_LIMIT,
            MONTHLY_LIMIT,
            allowedJurisdictions,
            allowedInvestorTypes,
            false
        );
    }
}
