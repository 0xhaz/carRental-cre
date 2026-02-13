// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReceiverTemplate} from "../interfaces/cre/ReceiverTemplate.sol";

/**
 * @title OnboardingReceiver
 * @notice CRE receiver proxy that routes verified KYC/AML and renter verification data
 * @dev Receives reports from Chainlink CRE workflows for:
 *      - Investor KYC/AML verification results (approve/reject onboarding)
 *      - Renter identity verification during booking approval
 *
 *  Report format:
 *    abi.encode(ReportAction action, bytes actionData)
 *
 *  Actions:
 *    APPROVE_INVESTOR     → (address investor)
 *    REJECT_INVESTOR      → (address investor, string reason)
 *    APPROVE_BOOKING      → (uint256 bookingId)
 *    REJECT_BOOKING       → (uint256 bookingId, string reason)
 */
contract OnboardingReceiver is ReceiverTemplate {
    /*//////////////////////////////////////////////////////////////
                            ENUMS
    //////////////////////////////////////////////////////////////*/

    enum ReportAction {
        APPROVE_INVESTOR,
        REJECT_INVESTOR,
        APPROVE_BOOKING,
        REJECT_BOOKING
    }

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice InvestorRequestManager contract
    address public investorRequestManager;

    /// @notice RentalBooking contract
    address public rentalBooking;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event OnboardingReportProcessed(ReportAction indexed action, uint256 timestamp);
    event InvestorRequestManagerUpdated(address indexed newAddress);
    event RentalBookingUpdated(address indexed newAddress);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnboardingReceiver__InvalidAction();
    error OnboardingReceiver__InvalidAddress();
    error OnboardingReceiver__CallFailed();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _forwarderAddress,
        address _investorRequestManager,
        address _rentalBooking
    ) ReceiverTemplate(_forwarderAddress) {
        if (_investorRequestManager == address(0) || _rentalBooking == address(0)) {
            revert OnboardingReceiver__InvalidAddress();
        }
        investorRequestManager = _investorRequestManager;
        rentalBooking = _rentalBooking;
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setInvestorRequestManager(address _investorRequestManager) external onlyOwner {
        if (_investorRequestManager == address(0)) revert OnboardingReceiver__InvalidAddress();
        investorRequestManager = _investorRequestManager;
        emit InvestorRequestManagerUpdated(_investorRequestManager);
    }

    function setRentalBooking(address _rentalBooking) external onlyOwner {
        if (_rentalBooking == address(0)) revert OnboardingReceiver__InvalidAddress();
        rentalBooking = _rentalBooking;
        emit RentalBookingUpdated(_rentalBooking);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        (ReportAction action, bytes memory actionData) = abi.decode(report, (ReportAction, bytes));

        if (action == ReportAction.APPROVE_INVESTOR) {
            _handleApproveInvestor(actionData);
        } else if (action == ReportAction.REJECT_INVESTOR) {
            _handleRejectInvestor(actionData);
        } else if (action == ReportAction.APPROVE_BOOKING) {
            _handleApproveBooking(actionData);
        } else if (action == ReportAction.REJECT_BOOKING) {
            _handleRejectBooking(actionData);
        } else {
            revert OnboardingReceiver__InvalidAction();
        }

        emit OnboardingReportProcessed(action, block.timestamp);
    }

    function _handleApproveInvestor(bytes memory data) private {
        address investor = abi.decode(data, (address));

        (bool success,) = investorRequestManager.call(
            abi.encodeWithSignature("approveRequest(address)", investor)
        );
        if (!success) revert OnboardingReceiver__CallFailed();
    }

    function _handleRejectInvestor(bytes memory data) private {
        (address investor, string memory reason) = abi.decode(data, (address, string));

        (bool success,) = investorRequestManager.call(
            abi.encodeWithSignature("rejectRequest(address,string)", investor, reason)
        );
        if (!success) revert OnboardingReceiver__CallFailed();
    }

    function _handleApproveBooking(bytes memory data) private {
        uint256 bookingId = abi.decode(data, (uint256));

        (bool success,) = rentalBooking.call(
            abi.encodeWithSignature("approveBooking(uint256)", bookingId)
        );
        if (!success) revert OnboardingReceiver__CallFailed();
    }

    function _handleRejectBooking(bytes memory data) private {
        (uint256 bookingId, string memory reason) = abi.decode(data, (uint256, string));

        (bool success,) = rentalBooking.call(
            abi.encodeWithSignature("rejectBooking(uint256,string)", bookingId, reason)
        );
        if (!success) revert OnboardingReceiver__CallFailed();
    }
}
