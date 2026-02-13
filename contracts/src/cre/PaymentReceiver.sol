// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReceiverTemplate} from "../interfaces/cre/ReceiverTemplate.sol";
import {RegShieldPaymentProtocol} from "../payment/RegShieldPaymentProtocol.sol";

/**
 * @title PaymentReceiver
 * @notice CRE receiver proxy that routes verified milestone data to RegShieldPaymentProtocol
 * @dev Receives reports from Chainlink CRE workflows for investment milestone verification:
 *      - Vehicle identification (purchase agreement found)
 *      - Purchase verification (title transfer confirmed)
 *      - Insurance verification (policy issued)
 *      - Registration completion (DMV records updated)
 *
 *  Report format:
 *    abi.encode(uint256 paymentId, string milestoneName)
 *
 *  Milestone names (must match RegShieldPaymentProtocol expectations):
 *    "VEHICLE_IDENTIFIED"
 *    "PURCHASE_VERIFIED"
 *    "INSURANCE_OBTAINED"
 *    "REGISTRATION_COMPLETED"
 */
contract PaymentReceiver is ReceiverTemplate {
    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The RegShieldPaymentProtocol contract
    address public paymentProtocol;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event PaymentReportProcessed(uint256 indexed paymentId, string milestone, uint256 timestamp);
    event PaymentProtocolUpdated(address indexed newAddress);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error PaymentReceiver__InvalidAddress();
    error PaymentReceiver__MilestoneCallFailed();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _forwarderAddress,
        address _paymentProtocol
    ) ReceiverTemplate(_forwarderAddress) {
        if (_paymentProtocol == address(0)) revert PaymentReceiver__InvalidAddress();
        paymentProtocol = _paymentProtocol;
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) revert PaymentReceiver__InvalidAddress();
        paymentProtocol = _paymentProtocol;
        emit PaymentProtocolUpdated(_paymentProtocol);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        (uint256 paymentId, string memory milestone) = abi.decode(report, (uint256, string));

        // Direct call — PaymentReceiver must be set as an authorized operator
        // on RegShieldPaymentProtocol via setAuthorizedOperator()
        RegShieldPaymentProtocol(paymentProtocol).completeMilestone(paymentId, milestone);

        emit PaymentReportProcessed(paymentId, milestone, block.timestamp);
    }
}
