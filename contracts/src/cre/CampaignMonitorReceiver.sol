// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReceiverTemplate} from "../interfaces/cre/ReceiverTemplate.sol";
import {RegShieldPaymentProtocol} from "../payment/RegShieldPaymentProtocol.sol";

/**
 * @title CampaignMonitorReceiver
 * @notice CRE receiver that monitors fundraising campaign deadlines and triggers
 *         batch refunds when a campaign expires without meeting its minimum funding target.
 * @dev Receives reports from a Chainlink CRE workflow that periodically checks:
 *      1. Campaign endDate has passed
 *      2. currentAmount < minFundingRequired
 *      When both conditions are true, the workflow sends a report to this receiver,
 *      which triggers batch cancellation of all PENDING escrow payments for the vehicle.
 *
 *  Report format:
 *    abi.encode(uint256 vehicleId, string action)
 *
 *  Supported actions:
 *    "CAMPAIGN_FAILED"     — Deadline passed, minimum funding not met → batch refund
 *    "CAMPAIGN_CANCELLED"  — Rentor manually cancelled → batch refund
 */
contract CampaignMonitorReceiver is ReceiverTemplate {
    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The RegShieldPaymentProtocol contract
    address public paymentProtocol;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event CampaignReportProcessed(uint256 indexed vehicleId, string action, uint256 refundedCount, uint256 timestamp);
    event PaymentProtocolUpdated(address indexed newAddress);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error CampaignMonitor__InvalidAddress();
    error CampaignMonitor__UnknownAction();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _forwarderAddress,
        address _paymentProtocol
    ) ReceiverTemplate(_forwarderAddress) {
        if (_paymentProtocol == address(0)) revert CampaignMonitor__InvalidAddress();
        paymentProtocol = _paymentProtocol;
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) revert CampaignMonitor__InvalidAddress();
        paymentProtocol = _paymentProtocol;
        emit PaymentProtocolUpdated(_paymentProtocol);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        (uint256 vehicleId, string memory action) = abi.decode(report, (uint256, string));

        bytes32 actionHash = keccak256(abi.encodePacked(action));

        if (
            actionHash == keccak256("CAMPAIGN_FAILED") ||
            actionHash == keccak256("CAMPAIGN_CANCELLED")
        ) {
            // CampaignMonitorReceiver must be set as an authorized operator
            // on RegShieldPaymentProtocol via setAuthorizedOperator()
            uint256 refundedCount = RegShieldPaymentProtocol(paymentProtocol)
                .batchCancelVehiclePayments(vehicleId);

            emit CampaignReportProcessed(vehicleId, action, refundedCount, block.timestamp);
        } else {
            revert CampaignMonitor__UnknownAction();
        }
    }
}
