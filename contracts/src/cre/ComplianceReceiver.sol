// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReceiverTemplate} from "../interfaces/cre/ReceiverTemplate.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";
import {IOperationalCompliance} from "../interfaces/compliance/IOperationalCompliance.sol";

/**
 * @title ComplianceReceiver
 * @notice CRE receiver proxy that routes verified off-chain compliance data to compliance contracts
 * @dev Receives reports from Chainlink CRE workflows for:
 *      - Renter verification (driver license, insurance, credit score)
 *      - Operational compliance (vehicle registration, insurance validity, maintenance)
 *
 *  Report format:
 *    abi.encode(ReportAction action, bytes actionData)
 *
 *  Actions:
 *    RECORD_INCIDENT      → (address renter, uint256 vehicleId, string incidentType)
 *    BLACKLIST_RENTER      → (address renter, string reason)
 *    REMOVE_BLACKLIST      → (address renter)
 *    RENEW_REGISTRATION    → (uint256 vehicleId, uint256 newExpiryDate)
 *    RENEW_INSURANCE       → (uint256 vehicleId, uint256 newExpiryDate)
 *    RECORD_MAINTENANCE    → (uint256 vehicleId, string maintenanceType, string notes)
 *    SUSPEND_VEHICLE       → (uint256 vehicleId, string reason)
 *    LIFT_SUSPENSION       → (uint256 vehicleId)
 */
contract ComplianceReceiver is ReceiverTemplate {
    /*//////////////////////////////////////////////////////////////
                            ENUMS
    //////////////////////////////////////////////////////////////*/

    enum ReportAction {
        RECORD_INCIDENT,
        BLACKLIST_RENTER,
        REMOVE_BLACKLIST,
        RENEW_REGISTRATION,
        RENEW_INSURANCE,
        RECORD_MAINTENANCE,
        SUSPEND_VEHICLE,
        LIFT_SUSPENSION
    }

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    IRenterCompliance public renterCompliance;
    IOperationalCompliance public operationalCompliance;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event ComplianceReportProcessed(ReportAction indexed action, uint256 timestamp);
    event RenterComplianceUpdated(address indexed newAddress);
    event OperationalComplianceUpdated(address indexed newAddress);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error ComplianceReceiver__InvalidAction();
    error ComplianceReceiver__InvalidAddress();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _forwarderAddress,
        address _renterCompliance,
        address _operationalCompliance
    ) ReceiverTemplate(_forwarderAddress) {
        if (_renterCompliance == address(0) || _operationalCompliance == address(0)) {
            revert ComplianceReceiver__InvalidAddress();
        }
        renterCompliance = IRenterCompliance(_renterCompliance);
        operationalCompliance = IOperationalCompliance(_operationalCompliance);
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setRenterCompliance(address _renterCompliance) external onlyOwner {
        if (_renterCompliance == address(0)) revert ComplianceReceiver__InvalidAddress();
        renterCompliance = IRenterCompliance(_renterCompliance);
        emit RenterComplianceUpdated(_renterCompliance);
    }

    function setOperationalCompliance(address _operationalCompliance) external onlyOwner {
        if (_operationalCompliance == address(0)) revert ComplianceReceiver__InvalidAddress();
        operationalCompliance = IOperationalCompliance(_operationalCompliance);
        emit OperationalComplianceUpdated(_operationalCompliance);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        (ReportAction action, bytes memory actionData) = abi.decode(report, (ReportAction, bytes));

        if (action == ReportAction.RECORD_INCIDENT) {
            _handleRecordIncident(actionData);
        } else if (action == ReportAction.BLACKLIST_RENTER) {
            _handleBlacklistRenter(actionData);
        } else if (action == ReportAction.REMOVE_BLACKLIST) {
            _handleRemoveBlacklist(actionData);
        } else if (action == ReportAction.RENEW_REGISTRATION) {
            _handleRenewRegistration(actionData);
        } else if (action == ReportAction.RENEW_INSURANCE) {
            _handleRenewInsurance(actionData);
        } else if (action == ReportAction.RECORD_MAINTENANCE) {
            _handleRecordMaintenance(actionData);
        } else if (action == ReportAction.SUSPEND_VEHICLE) {
            _handleSuspendVehicle(actionData);
        } else if (action == ReportAction.LIFT_SUSPENSION) {
            _handleLiftSuspension(actionData);
        } else {
            revert ComplianceReceiver__InvalidAction();
        }

        emit ComplianceReportProcessed(action, block.timestamp);
    }

    function _handleRecordIncident(bytes memory data) private {
        (address renter, uint256 vehicleId, string memory incidentType) =
            abi.decode(data, (address, uint256, string));
        renterCompliance.recordIncident(renter, vehicleId, incidentType);
    }

    function _handleBlacklistRenter(bytes memory data) private {
        (address renter, string memory reason) = abi.decode(data, (address, string));
        renterCompliance.blacklistRenter(renter, reason);
    }

    function _handleRemoveBlacklist(bytes memory data) private {
        address renter = abi.decode(data, (address));
        renterCompliance.removeRenterFromBlacklist(renter);
    }

    function _handleRenewRegistration(bytes memory data) private {
        (uint256 vehicleId, uint256 newExpiryDate) = abi.decode(data, (uint256, uint256));
        operationalCompliance.renewRegistration(vehicleId, newExpiryDate);
    }

    function _handleRenewInsurance(bytes memory data) private {
        (uint256 vehicleId, uint256 newExpiryDate) = abi.decode(data, (uint256, uint256));
        operationalCompliance.renewInsurance(vehicleId, newExpiryDate);
    }

    function _handleRecordMaintenance(bytes memory data) private {
        (uint256 vehicleId, string memory maintenanceType, string memory notes) =
            abi.decode(data, (uint256, string, string));
        operationalCompliance.recordMaintenance(vehicleId, maintenanceType, notes);
    }

    function _handleSuspendVehicle(bytes memory data) private {
        (uint256 vehicleId, string memory reason) = abi.decode(data, (uint256, string));
        operationalCompliance.suspendVehicle(vehicleId, reason);
    }

    function _handleLiftSuspension(bytes memory data) private {
        uint256 vehicleId = abi.decode(data, (uint256));
        operationalCompliance.liftSuspension(vehicleId);
    }
}
