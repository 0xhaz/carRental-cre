// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRentalOperations} from "../interfaces/rental/IRentalOperations.sol";
import {IRentalBooking} from "../interfaces/rental/IRentalBooking.sol";
import {IVehicleNFT} from "../interfaces/vehicle/IVehicleNFT.sol";

/**
 * @title RentalOperations
 * @notice Manages rental operational tasks including condition reports and damage assessment
 * @dev Integrates with RentalBooking and VehicleNFT for complete rental lifecycle management
 *
 * Key Features:
 * - Pre/post rental condition reporting
 * - Vehicle handover and return processing
 * - Damage assessment and cost calculation
 * - Overdue charge calculation
 * - Revenue tracking for distribution
 */
contract RentalOperations is IRentalOperations, Ownable {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice RentalBooking contract
    IRentalBooking public rentalBooking;

    /// @notice VehicleNFT contract
    IVehicleNFT public vehicleNFT;

    /// @notice Revenue distributor contract
    address public revenueDistributor;

    /// @notice Mapping from booking ID to damage assessments
    mapping(uint256 => DamageAssessment[]) private _damageAssessments;

    /// @notice Mapping from vehicle ID to revenue records
    mapping(uint256 => RevenueRecord[]) private _vehicleRevenue;

    /// @notice Mapping from vehicle ID to total revenue
    mapping(uint256 => uint256) private _totalVehicleRevenue;

    /// @notice Mapping from booking ID to pre-rental mileage
    mapping(uint256 => uint256) private _preRentalMileage;

    /// @notice Mapping from booking ID to post-rental mileage
    mapping(uint256 => uint256) private _postRentalMileage;

    /// @notice Authorized operators (inspectors)
    mapping(address => bool) public operators;

    /// @notice Overdue charge rate per hour (in wei or smallest unit)
    uint256 public overdueRatePerHour;

    /// @notice Maximum overdue charge as percentage of rental cost (in basis points)
    uint256 public maxOverduePercentage; // 10000 = 100%

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert RentalOperations__Unauthorized();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _rentalBooking, address _vehicleNFT) Ownable(msg.sender) {
        rentalBooking = IRentalBooking(_rentalBooking);
        vehicleNFT = IVehicleNFT(_vehicleNFT);

        // Default: $10/hour overdue charge (assuming 18 decimals)
        overdueRatePerHour = 10 ether;

        // Default: Max 50% of rental cost
        maxOverduePercentage = 5000; // 50%
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
    }

    function setRevenueDistributor(address _revenueDistributor) external onlyOwner {
        revenueDistributor = _revenueDistributor;
    }

    function setOverdueRate(uint256 _overdueRatePerHour) external onlyOwner {
        overdueRatePerHour = _overdueRatePerHour;
    }

    function setMaxOverduePercentage(uint256 _maxOverduePercentage) external onlyOwner {
        maxOverduePercentage = _maxOverduePercentage;
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create pre-rental condition report
     */
    function createPreRentalReport(
        uint256 bookingId,
        uint256 vehicleId,
        uint256 mileage,
        uint8 fuelLevel,
        bytes32[] memory photoHashes,
        string[] memory damageNotes
    ) external override onlyOperator returns (IRentalBooking.ConditionReport memory report) {
        // Validate inputs
        if (photoHashes.length == 0) {
            revert RentalOperations__InvalidPhotoHash();
        }

        // Store pre-rental mileage
        _preRentalMileage[bookingId] = mileage;

        // Create condition report
        report = IRentalBooking.ConditionReport({
            timestamp: block.timestamp,
            mileage: mileage,
            fuelLevel: fuelLevel,
            photoHashes: photoHashes,
            damageNotes: damageNotes,
            inspector: msg.sender,
            signature: "" // Can be added for off-chain signature verification
        });

        emit ConditionReportCreated(bookingId, vehicleId, true, photoHashes);
    }

    /**
     * @notice Create post-rental condition report
     */
    function createPostRentalReport(
        uint256 bookingId,
        uint256 vehicleId,
        uint256 mileage,
        uint8 fuelLevel,
        bytes32[] memory photoHashes,
        string[] memory damageNotes
    ) external override onlyOperator returns (IRentalBooking.ConditionReport memory report) {
        // Validate inputs
        if (photoHashes.length == 0) {
            revert RentalOperations__InvalidPhotoHash();
        }

        // Validate mileage hasn't decreased
        if (mileage < _preRentalMileage[bookingId]) {
            revert RentalOperations__InvalidConditionReport();
        }

        // Store post-rental mileage
        _postRentalMileage[bookingId] = mileage;

        // Update vehicle mileage
        vehicleNFT.updateMileage(vehicleId, mileage);

        // Create condition report
        report = IRentalBooking.ConditionReport({
            timestamp: block.timestamp,
            mileage: mileage,
            fuelLevel: fuelLevel,
            photoHashes: photoHashes,
            damageNotes: damageNotes,
            inspector: msg.sender,
            signature: "" // Can be added for off-chain signature verification
        });

        emit ConditionReportCreated(bookingId, vehicleId, false, photoHashes);
    }

    /**
     * @notice Perform vehicle handover (pickup)
     */
    function performHandover(uint256 bookingId, IRentalBooking.ConditionReport memory preReport)
        external
        override
        onlyOperator
    {
        IRentalBooking.Booking memory booking = rentalBooking.getBooking(bookingId);

        if (booking.id == 0) {
            revert RentalOperations__BookingNotFound();
        }

        // Start rental in booking contract
        rentalBooking.startRental(bookingId, preReport);

        emit VehicleHandedOver(bookingId, booking.vehicleId, booking.renter, block.timestamp);
    }

    /**
     * @notice Process vehicle return
     */
    function processReturn(uint256 bookingId, IRentalBooking.ConditionReport memory postReport)
        external
        override
        onlyOperator
    {
        IRentalBooking.Booking memory booking = rentalBooking.getBooking(bookingId);

        if (booking.id == 0) {
            revert RentalOperations__BookingNotFound();
        }

        // Calculate mileage driven
        uint256 mileageDriven = postReport.mileage - booking.preCondition.mileage;

        // Initiate return in booking contract
        rentalBooking.initiateReturn(bookingId);

        emit VehicleReturned(bookingId, booking.vehicleId, booking.renter, mileageDriven, block.timestamp);
    }

    /**
     * @notice Assess damage and calculate costs
     */
    function assessDamage(
        uint256 bookingId,
        string[] memory damages,
        uint256[] memory costs,
        bytes32[] memory evidenceHashes
    ) external override onlyOperator returns (uint256 assessmentId) {
        if (damages.length != costs.length) {
            revert RentalOperations__InvalidConditionReport();
        }

        // Calculate total cost
        uint256 totalCost = 0;
        for (uint256 i = 0; i < costs.length; i++) {
            totalCost += costs[i];
        }

        IRentalBooking.Booking memory booking = rentalBooking.getBooking(bookingId);

        // Create damage assessment
        DamageAssessment memory assessment = DamageAssessment({
            timestamp: block.timestamp,
            bookingId: bookingId,
            damages: damages,
            costs: costs,
            totalCost: totalCost,
            evidenceHashes: evidenceHashes,
            assessor: msg.sender,
            approved: false
        });

        _damageAssessments[bookingId].push(assessment);
        assessmentId = _damageAssessments[bookingId].length - 1;

        // Record incident in VehicleNFT
        if (totalCost > 0) {
            vehicleNFT.recordIncident(booking.vehicleId, "Rental damage", totalCost, bookingId);
        }

        emit DamageAssessed(bookingId, booking.vehicleId, totalCost, msg.sender);
    }

    /**
     * @notice Approve damage assessment
     */
    function approveDamageAssessment(uint256 bookingId, uint256 assessmentId, uint256 finalCost)
        external
        override
        onlyOperator
    {
        if (assessmentId >= _damageAssessments[bookingId].length) {
            revert RentalOperations__DamageAssessmentNotFound();
        }

        DamageAssessment storage assessment = _damageAssessments[bookingId][assessmentId];

        if (assessment.approved) {
            revert RentalOperations__AlreadyApproved();
        }

        assessment.approved = true;
        assessment.totalCost = finalCost;

        IRentalBooking.Booking memory booking = rentalBooking.getBooking(bookingId);

        // Get post-rental condition report from booking
        IRentalBooking.ConditionReport memory postReport = booking.postCondition;

        // Complete return in booking contract with approved damage charges
        rentalBooking.completeReturn(bookingId, postReport, finalCost);

        emit DamageAssessmentApproved(bookingId, finalCost, msg.sender);
    }

    /**
     * @notice Calculate and apply overdue charges
     */
    function calculateOverdueCharges(uint256 bookingId) external override onlyOperator returns (uint256 penaltyAmount) {
        (bool isOverdue, uint256 overdueMinutes) = rentalBooking.isBookingOverdue(bookingId);

        if (!isOverdue) {
            revert RentalOperations__InvalidConditionReport();
        }

        IRentalBooking.Booking memory booking = rentalBooking.getBooking(bookingId);

        // Calculate penalty: minutes * (hourly rate / 60)
        uint256 overdueHours = (overdueMinutes + 59) / 60; // Round up to nearest hour
        penaltyAmount = overdueHours * overdueRatePerHour;

        // Cap at maximum percentage of rental cost
        uint256 rentalCost = rentalBooking.calculateBookingCost(booking.startTime, booking.endTime, booking.ratePerDay);
        uint256 maxPenalty = (rentalCost * maxOverduePercentage) / 10000;

        if (penaltyAmount > maxPenalty) {
            penaltyAmount = maxPenalty;
        }

        emit OverdueChargeApplied(bookingId, overdueMinutes, penaltyAmount);
    }

    /**
     * @notice Record revenue from completed rental
     */
    function recordRevenue(
        uint256 vehicleId,
        uint256 bookingId,
        uint256 rentalRevenue,
        uint256 damageRevenue,
        uint256 overdueCharges
    ) external override {
        if (msg.sender != address(rentalBooking) && msg.sender != owner()) {
            revert RentalOperations__Unauthorized();
        }

        uint256 totalRevenue = rentalRevenue + damageRevenue + overdueCharges;

        RevenueRecord memory record = RevenueRecord({
            vehicleId: vehicleId,
            bookingId: bookingId,
            rentalRevenue: rentalRevenue,
            damageRevenue: damageRevenue,
            overdueCharges: overdueCharges,
            timestamp: block.timestamp
        });

        _vehicleRevenue[vehicleId].push(record);
        _totalVehicleRevenue[vehicleId] += totalRevenue;

        emit RevenueRecorded(vehicleId, bookingId, totalRevenue, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get damage assessment
     */
    function getDamageAssessment(uint256 bookingId, uint256 assessmentId)
        external
        view
        override
        returns (DamageAssessment memory assessment)
    {
        if (assessmentId >= _damageAssessments[bookingId].length) {
            revert RentalOperations__DamageAssessmentNotFound();
        }

        return _damageAssessments[bookingId][assessmentId];
    }

    /**
     * @notice Get all damage assessments for a booking
     */
    function getBookingAssessments(uint256 bookingId)
        external
        view
        override
        returns (DamageAssessment[] memory assessments)
    {
        return _damageAssessments[bookingId];
    }

    /**
     * @notice Get revenue records for a vehicle
     */
    function getVehicleRevenue(uint256 vehicleId) external view override returns (RevenueRecord[] memory records) {
        return _vehicleRevenue[vehicleId];
    }

    /**
     * @notice Get total revenue for a vehicle
     */
    function getTotalVehicleRevenue(uint256 vehicleId) external view override returns (uint256 totalRevenue) {
        return _totalVehicleRevenue[vehicleId];
    }

    /**
     * @notice Calculate mileage driven during rental
     */
    function getMileageDriven(uint256 bookingId) external view override returns (uint256 mileageDriven) {
        uint256 postMileage = _postRentalMileage[bookingId];
        uint256 preMileage = _preRentalMileage[bookingId];

        if (postMileage == 0 || preMileage == 0) {
            return 0;
        }

        return postMileage - preMileage;
    }
}
