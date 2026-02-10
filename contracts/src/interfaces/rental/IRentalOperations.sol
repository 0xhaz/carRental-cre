// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IRentalBooking} from "./IRentalBooking.sol";

/**
 * @title IRentalOperations
 * @notice Interface for rental operational management and condition tracking
 * @dev Handles vehicle handover, condition reports, and damage assessment
 */
interface IRentalOperations {
    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct DamageAssessment {
        uint256 timestamp;
        uint256 bookingId;
        string[] damages; // List of damage descriptions
        uint256[] costs; // Corresponding repair costs
        uint256 totalCost; // Total damage cost
        bytes32[] evidenceHashes; // IPFS hashes of damage photos
        address assessor; // Who performed the assessment
        bool approved; // Whether assessment is approved
    }

    struct RevenueRecord {
        uint256 vehicleId;
        uint256 bookingId;
        uint256 rentalRevenue; // Gross rental revenue
        uint256 damageRevenue; // Revenue from damage charges
        uint256 overdueCharges; // Revenue from overdue fees
        uint256 timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event ConditionReportCreated(
        uint256 indexed bookingId, uint256 indexed vehicleId, bool isPreRental, bytes32[] photoHashes
    );

    event VehicleHandedOver(
        uint256 indexed bookingId, uint256 indexed vehicleId, address indexed renter, uint256 timestamp
    );

    event VehicleReturned(
        uint256 indexed bookingId,
        uint256 indexed vehicleId,
        address indexed renter,
        uint256 mileageDriven,
        uint256 timestamp
    );

    event DamageAssessed(
        uint256 indexed bookingId, uint256 indexed vehicleId, uint256 totalCost, address assessor
    );

    event DamageAssessmentApproved(uint256 indexed bookingId, uint256 finalCost, address approver);

    event RevenueRecorded(
        uint256 indexed vehicleId, uint256 indexed bookingId, uint256 totalRevenue, uint256 timestamp
    );

    event OverdueChargeApplied(uint256 indexed bookingId, uint256 overdueMinutes, uint256 penaltyAmount);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error RentalOperations__BookingNotFound();
    error RentalOperations__VehicleNotFound();
    error RentalOperations__Unauthorized();
    error RentalOperations__InvalidConditionReport();
    error RentalOperations__DamageAssessmentNotFound();
    error RentalOperations__AlreadyApproved();
    error RentalOperations__InvalidPhotoHash();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create pre-rental condition report
     * @param bookingId Booking ID
     * @param vehicleId Vehicle NFT token ID
     * @param mileage Current mileage
     * @param fuelLevel Fuel level percentage
     * @param photoHashes IPFS hashes of vehicle photos
     * @param damageNotes Pre-existing damage notes
     * @return report Condition report
     */
    function createPreRentalReport(
        uint256 bookingId,
        uint256 vehicleId,
        uint256 mileage,
        uint8 fuelLevel,
        bytes32[] memory photoHashes,
        string[] memory damageNotes
    ) external returns (IRentalBooking.ConditionReport memory report);

    /**
     * @notice Create post-rental condition report
     * @param bookingId Booking ID
     * @param vehicleId Vehicle NFT token ID
     * @param mileage Return mileage
     * @param fuelLevel Fuel level percentage
     * @param photoHashes IPFS hashes of vehicle photos
     * @param damageNotes New damage notes
     * @return report Condition report
     */
    function createPostRentalReport(
        uint256 bookingId,
        uint256 vehicleId,
        uint256 mileage,
        uint8 fuelLevel,
        bytes32[] memory photoHashes,
        string[] memory damageNotes
    ) external returns (IRentalBooking.ConditionReport memory report);

    /**
     * @notice Perform vehicle handover (pickup)
     * @param bookingId Booking ID
     * @param preReport Pre-rental condition report
     */
    function performHandover(uint256 bookingId, IRentalBooking.ConditionReport memory preReport) external;

    /**
     * @notice Process vehicle return
     * @param bookingId Booking ID
     * @param postReport Post-rental condition report
     */
    function processReturn(uint256 bookingId, IRentalBooking.ConditionReport memory postReport) external;

    /**
     * @notice Assess damage and calculate costs
     * @param bookingId Booking ID
     * @param damages List of damage descriptions
     * @param costs Corresponding repair costs
     * @param evidenceHashes IPFS hashes of damage evidence
     * @return assessmentId Damage assessment ID
     */
    function assessDamage(
        uint256 bookingId,
        string[] memory damages,
        uint256[] memory costs,
        bytes32[] memory evidenceHashes
    ) external returns (uint256 assessmentId);

    /**
     * @notice Approve damage assessment
     * @param bookingId Booking ID
     * @param assessmentId Assessment ID
     * @param finalCost Final approved cost
     */
    function approveDamageAssessment(uint256 bookingId, uint256 assessmentId, uint256 finalCost) external;

    /**
     * @notice Calculate and apply overdue charges
     * @param bookingId Booking ID
     * @return penaltyAmount Penalty amount
     */
    function calculateOverdueCharges(uint256 bookingId) external returns (uint256 penaltyAmount);

    /**
     * @notice Record revenue from completed rental
     * @param vehicleId Vehicle NFT token ID
     * @param bookingId Booking ID
     * @param rentalRevenue Rental fee revenue
     * @param damageRevenue Damage charge revenue
     * @param overdueCharges Overdue penalty revenue
     */
    function recordRevenue(
        uint256 vehicleId,
        uint256 bookingId,
        uint256 rentalRevenue,
        uint256 damageRevenue,
        uint256 overdueCharges
    ) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get damage assessment
     * @param bookingId Booking ID
     * @param assessmentId Assessment ID
     * @return assessment Damage assessment details
     */
    function getDamageAssessment(uint256 bookingId, uint256 assessmentId)
        external
        view
        returns (DamageAssessment memory assessment);

    /**
     * @notice Get all damage assessments for a booking
     * @param bookingId Booking ID
     * @return assessments Array of damage assessments
     */
    function getBookingAssessments(uint256 bookingId) external view returns (DamageAssessment[] memory assessments);

    /**
     * @notice Get revenue records for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return records Array of revenue records
     */
    function getVehicleRevenue(uint256 vehicleId) external view returns (RevenueRecord[] memory records);

    /**
     * @notice Get total revenue for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return totalRevenue Total revenue generated
     */
    function getTotalVehicleRevenue(uint256 vehicleId) external view returns (uint256 totalRevenue);

    /**
     * @notice Calculate mileage driven during rental
     * @param bookingId Booking ID
     * @return mileageDriven Miles/km driven
     */
    function getMileageDriven(uint256 bookingId) external view returns (uint256 mileageDriven);
}
