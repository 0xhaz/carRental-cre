// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReceiverTemplate} from "../interfaces/cre/ReceiverTemplate.sol";
import {IVehicleNFT} from "../interfaces/vehicle/IVehicleNFT.sol";

/**
 * @title VehicleReceiver
 * @notice CRE receiver proxy that routes verified telematics and damage data to vehicle contracts
 * @dev Receives reports from Chainlink CRE workflows for:
 *      - Telematics data (mileage updates from Geotab/Samsara)
 *      - AI damage assessment results (photo analysis, repair cost estimates)
 *      - Maintenance alerts from IoT sensors
 *      - Incident reports from external systems
 *
 *  Report format:
 *    abi.encode(ReportAction action, bytes actionData)
 *
 *  Actions:
 *    UPDATE_MILEAGE       → (uint256 tokenId, uint256 newMileage)
 *    RECORD_MAINTENANCE   → (uint256 tokenId, string description, uint256 cost)
 *    RECORD_INCIDENT      → (uint256 tokenId, string description, uint256 estimatedCost, uint256 bookingId)
 *    RESOLVE_INCIDENT     → (uint256 tokenId, uint256 incidentId, uint256 actualCost)
 *    UPDATE_METADATA      → (uint256 tokenId, string field, string value)
 */
contract VehicleReceiver is ReceiverTemplate {
    /*//////////////////////////////////////////////////////////////
                            ENUMS
    //////////////////////////////////////////////////////////////*/

    enum ReportAction {
        UPDATE_MILEAGE,
        RECORD_MAINTENANCE,
        RECORD_INCIDENT,
        RESOLVE_INCIDENT,
        UPDATE_METADATA
    }

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    IVehicleNFT public vehicleNFT;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event VehicleReportProcessed(ReportAction indexed action, uint256 indexed tokenId, uint256 timestamp);
    event VehicleNFTUpdated(address indexed newAddress);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error VehicleReceiver__InvalidAction();
    error VehicleReceiver__InvalidAddress();

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _forwarderAddress,
        address _vehicleNFT
    ) ReceiverTemplate(_forwarderAddress) {
        if (_vehicleNFT == address(0)) revert VehicleReceiver__InvalidAddress();
        vehicleNFT = IVehicleNFT(_vehicleNFT);
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setVehicleNFT(address _vehicleNFT) external onlyOwner {
        if (_vehicleNFT == address(0)) revert VehicleReceiver__InvalidAddress();
        vehicleNFT = IVehicleNFT(_vehicleNFT);
        emit VehicleNFTUpdated(_vehicleNFT);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ReceiverTemplate
    function _processReport(bytes calldata report) internal override {
        (ReportAction action, bytes memory actionData) = abi.decode(report, (ReportAction, bytes));

        if (action == ReportAction.UPDATE_MILEAGE) {
            _handleUpdateMileage(actionData);
        } else if (action == ReportAction.RECORD_MAINTENANCE) {
            _handleRecordMaintenance(actionData);
        } else if (action == ReportAction.RECORD_INCIDENT) {
            _handleRecordIncident(actionData);
        } else if (action == ReportAction.RESOLVE_INCIDENT) {
            _handleResolveIncident(actionData);
        } else if (action == ReportAction.UPDATE_METADATA) {
            _handleUpdateMetadata(actionData);
        } else {
            revert VehicleReceiver__InvalidAction();
        }
    }

    function _handleUpdateMileage(bytes memory data) private {
        (uint256 tokenId, uint256 newMileage) = abi.decode(data, (uint256, uint256));
        vehicleNFT.updateMileage(tokenId, newMileage);
        emit VehicleReportProcessed(ReportAction.UPDATE_MILEAGE, tokenId, block.timestamp);
    }

    function _handleRecordMaintenance(bytes memory data) private {
        (uint256 tokenId, string memory description, uint256 cost) =
            abi.decode(data, (uint256, string, uint256));
        vehicleNFT.recordMaintenance(tokenId, description, cost);
        emit VehicleReportProcessed(ReportAction.RECORD_MAINTENANCE, tokenId, block.timestamp);
    }

    function _handleRecordIncident(bytes memory data) private {
        (uint256 tokenId, string memory description, uint256 estimatedCost, uint256 bookingId) =
            abi.decode(data, (uint256, string, uint256, uint256));
        vehicleNFT.recordIncident(tokenId, description, estimatedCost, bookingId);
        emit VehicleReportProcessed(ReportAction.RECORD_INCIDENT, tokenId, block.timestamp);
    }

    function _handleResolveIncident(bytes memory data) private {
        (uint256 tokenId, uint256 incidentId, uint256 actualCost) =
            abi.decode(data, (uint256, uint256, uint256));
        vehicleNFT.resolveIncident(tokenId, incidentId, actualCost);
        emit VehicleReportProcessed(ReportAction.RESOLVE_INCIDENT, tokenId, block.timestamp);
    }

    function _handleUpdateMetadata(bytes memory data) private {
        (uint256 tokenId, string memory field, string memory value) =
            abi.decode(data, (uint256, string, string));
        vehicleNFT.updateMetadataField(tokenId, field, value);
        emit VehicleReportProcessed(ReportAction.UPDATE_METADATA, tokenId, block.timestamp);
    }
}
