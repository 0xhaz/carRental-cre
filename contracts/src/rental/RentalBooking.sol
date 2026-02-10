// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRentalBooking} from "../interfaces/rental/IRentalBooking.sol";
import {IVehicleNFT} from "../interfaces/vehicle/IVehicleNFT.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";

/**
 * @title RentalBooking
 * @notice Manages rental booking lifecycle from request to completion
 * @dev Integrates with VehicleNFT, RentalPaymentProtocol, and RenterCompliance
 *
 * Key Features:
 * - Complete booking lifecycle management
 * - Compliance integration (renter verification)
 * - Payment escrow integration
 * - Condition reporting (pre/post rental)
 * - Extensions and cancellations
 * - Dispute resolution
 */
contract RentalBooking is IRentalBooking, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Counter for booking IDs
    uint256 private _bookingIdCounter;

    /// @notice VehicleNFT contract
    IVehicleNFT public vehicleNFT;

    /// @notice Renter compliance module
    IRenterCompliance public renterCompliance;

    /// @notice Rental payment protocol contract
    address public rentalPaymentProtocol;

    /// @notice Rental operations contract (for condition reports)
    address public rentalOperations;

    /// @notice Mapping from booking ID to booking details
    mapping(uint256 => Booking) private _bookings;

    /// @notice Mapping from vehicle ID to active booking ID (0 if none)
    mapping(uint256 => uint256) private _activeBookings;

    /// @notice Mapping from renter to their booking IDs
    mapping(address => uint256[]) private _renterBookings;

    /// @notice Mapping from vehicle ID to its booking IDs
    mapping(uint256 => uint256[]) private _vehicleBookings;

    /// @notice Mapping from booking ID to dispute status
    mapping(uint256 => bool) private _disputes;

    /// @notice Authorized approvers (compliance officers)
    mapping(address => bool) public approvers;

    /// @notice Maximum extension allowed per booking
    uint256 public constant MAX_EXTENSIONS = 5;

    /// @notice Minimum booking duration (1 hour)
    uint256 public constant MIN_BOOKING_DURATION = 1 hours;

    /// @notice Maximum booking duration (90 days)
    uint256 public constant MAX_BOOKING_DURATION = 90 days;

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyApprover() {
        if (!approvers[msg.sender] && msg.sender != owner()) {
            revert RentalBooking__Unauthorized();
        }
        _;
    }

    modifier onlyRentalOperations() {
        if (msg.sender != rentalOperations && msg.sender != owner()) {
            revert RentalBooking__Unauthorized();
        }
        _;
    }

    modifier bookingExists(uint256 bookingId) {
        if (_bookings[bookingId].id == 0) {
            revert RentalBooking__BookingNotFound();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _vehicleNFT, address _renterCompliance, address _rentalPaymentProtocol) Ownable(msg.sender) {
        vehicleNFT = IVehicleNFT(_vehicleNFT);
        renterCompliance = IRenterCompliance(_renterCompliance);
        rentalPaymentProtocol = _rentalPaymentProtocol;
        _bookingIdCounter = 1; // Start from ID 1
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setApprover(address approver, bool status) external onlyOwner {
        approvers[approver] = status;
    }

    function setRentalOperations(address _rentalOperations) external onlyOwner {
        rentalOperations = _rentalOperations;
    }

    function setRentalPaymentProtocol(address _rentalPaymentProtocol) external onlyOwner {
        rentalPaymentProtocol = _rentalPaymentProtocol;
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Request a new booking
     */
    function requestBooking(
        uint256 vehicleId,
        uint256 startTime,
        uint256 endTime,
        uint256 ratePerDay,
        uint256 securityDeposit
    ) external payable override nonReentrant returns (uint256 bookingId) {
        // Validate time range
        if (startTime < block.timestamp || endTime <= startTime) {
            revert RentalBooking__InvalidTimeRange();
        }

        uint256 duration = endTime - startTime;
        if (duration < MIN_BOOKING_DURATION || duration > MAX_BOOKING_DURATION) {
            revert RentalBooking__InvalidTimeRange();
        }

        // Check vehicle availability
        if (!vehicleNFT.vehicleExists(vehicleId)) {
            revert RentalBooking__VehicleNotAvailable();
        }

        IVehicleNFT.VehicleStatus status = vehicleNFT.getVehicleStatus(vehicleId);
        if (status != IVehicleNFT.VehicleStatus.Available) {
            revert RentalBooking__VehicleNotAvailable();
        }

        // Check for conflicting bookings
        if (!isVehicleAvailable(vehicleId, startTime, endTime)) {
            revert RentalBooking__VehicleNotAvailable();
        }

        // Calculate total cost
        uint256 totalCost = calculateBookingCost(startTime, endTime, ratePerDay);
        uint256 totalPayment = totalCost + securityDeposit;

        if (msg.value < totalPayment) {
            revert RentalBooking__InsufficientPayment();
        }

        // Check renter compliance (basic check - full check during approval)
        IRenterCompliance.RenterValidationResult memory validation = renterCompliance.validateRenter(msg.sender);
        if (!validation.isValid) {
            revert RentalBooking__RenterNotVerified();
        }

        // Create booking
        bookingId = _bookingIdCounter++;

        _bookings[bookingId] = Booking({
            id: bookingId,
            vehicleId: vehicleId,
            renter: msg.sender,
            startTime: startTime,
            endTime: endTime,
            ratePerDay: ratePerDay,
            securityDeposit: securityDeposit,
            status: BookingStatus.REQUESTED,
            paymentId: 0, // Set when payment created
            preCondition: ConditionReport({
                timestamp: 0,
                mileage: 0,
                fuelLevel: 0,
                photoHashes: new bytes32[](0),
                damageNotes: new string[](0),
                inspector: address(0),
                signature: ""
            }),
            postCondition: ConditionReport({
                timestamp: 0,
                mileage: 0,
                fuelLevel: 0,
                photoHashes: new bytes32[](0),
                damageNotes: new string[](0),
                inspector: address(0),
                signature: ""
            }),
            extensionCount: 0,
            overdueMinutes: 0,
            damageCharges: 0,
            cancellationReason: ""
        });

        // Track booking
        _renterBookings[msg.sender].push(bookingId);
        _vehicleBookings[vehicleId].push(bookingId);

        // Update status to pending approval
        _bookings[bookingId].status = BookingStatus.PENDING_APPROVAL;

        emit BookingRequested(bookingId, vehicleId, msg.sender, startTime, endTime, totalCost);
    }

    /**
     * @notice Approve a booking after compliance checks
     */
    function approveBooking(uint256 bookingId) external override onlyApprover bookingExists(bookingId) {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.PENDING_APPROVAL) {
            revert RentalBooking__InvalidStatus();
        }

        // Perform full compliance check
        IRenterCompliance.RenterValidationResult memory fullValidation = renterCompliance.validateRenter(booking.renter);
        if (!fullValidation.isValid) {
            revert RentalBooking__ComplianceCheckFailed();
        }

        booking.status = BookingStatus.APPROVED;

        emit BookingApproved(bookingId, msg.sender);
    }

    /**
     * @notice Reject a booking
     */
    function rejectBooking(uint256 bookingId, string memory reason)
        external
        override
        onlyApprover
        bookingExists(bookingId)
        nonReentrant
    {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.PENDING_APPROVAL) {
            revert RentalBooking__InvalidStatus();
        }

        booking.status = BookingStatus.CANCELLED;
        booking.cancellationReason = reason;

        // Refund payment
        uint256 totalPayment =
            calculateBookingCost(booking.startTime, booking.endTime, booking.ratePerDay) + booking.securityDeposit;

        // payable(booking.renter).transfer(totalPayment);
        (bool success,) = payable(booking.renter).call{value: totalPayment}("");
        if (!success) {
            revert RentalBooking__RefundFailed();
        }

        emit BookingRejected(bookingId, reason);
    }

    /**
     * @notice Start rental (activate booking)
     */
    function startRental(uint256 bookingId, ConditionReport memory preCondition)
        external
        override
        onlyRentalOperations
        bookingExists(bookingId)
    {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.APPROVED) {
            revert RentalBooking__InvalidStatus();
        }

        if (preCondition.timestamp == 0 || preCondition.inspector == address(0)) {
            revert RentalBooking__InvalidConditionReport();
        }

        booking.status = BookingStatus.ACTIVE;
        booking.preCondition = preCondition;

        // Mark vehicle as rented
        vehicleNFT.updateStatus(booking.vehicleId, IVehicleNFT.VehicleStatus.Rented);
        vehicleNFT.setCurrentBooking(booking.vehicleId, bookingId);
        _activeBookings[booking.vehicleId] = bookingId;

        emit RentalStarted(bookingId, block.timestamp, preCondition.photoHashes);
    }

    /**
     * @notice Extend rental period
     */
    function extendRental(uint256 bookingId, uint256 additionalDays)
        external
        payable
        override
        bookingExists(bookingId)
        nonReentrant
        returns (uint256 newEndTime)
    {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.ACTIVE) {
            revert RentalBooking__InvalidStatus();
        }

        if (msg.sender != booking.renter) {
            revert RentalBooking__Unauthorized();
        }

        if (booking.extensionCount >= MAX_EXTENSIONS) {
            revert RentalBooking__ExtensionNotAllowed();
        }

        // Calculate additional cost
        uint256 additionalCost = (additionalDays * booking.ratePerDay * 1 days) / 1 days;

        if (msg.value < additionalCost) {
            revert RentalBooking__InsufficientPayment();
        }

        // Update booking
        newEndTime = booking.endTime + (additionalDays * 1 days);
        booking.endTime = newEndTime;
        booking.extensionCount++;

        emit RentalExtended(bookingId, newEndTime, additionalCost, booking.extensionCount);
    }

    /**
     * @notice Initiate return process
     */
    function initiateReturn(uint256 bookingId) external override bookingExists(bookingId) {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.ACTIVE) {
            revert RentalBooking__InvalidStatus();
        }

        if (msg.sender != booking.renter && msg.sender != rentalOperations) {
            revert RentalBooking__Unauthorized();
        }

        booking.status = BookingStatus.PENDING_RETURN;

        // Calculate if overdue
        if (block.timestamp > booking.endTime) {
            booking.overdueMinutes = (block.timestamp - booking.endTime) / 60;
        }

        emit ReturnInitiated(bookingId, block.timestamp);
    }

    /**
     * @notice Complete return and settle payment
     */
    function completeReturn(uint256 bookingId, ConditionReport memory postCondition, uint256 damageCharges)
        external
        override
        onlyRentalOperations
        bookingExists(bookingId)
        nonReentrant
    {
        Booking storage booking = _bookings[bookingId];

        if (booking.status != BookingStatus.PENDING_RETURN) {
            revert RentalBooking__InvalidStatus();
        }

        if (postCondition.timestamp == 0 || postCondition.inspector == address(0)) {
            revert RentalBooking__InvalidConditionReport();
        }

        booking.status = BookingStatus.COMPLETED;
        booking.postCondition = postCondition;
        booking.damageCharges = damageCharges;

        // Clear active booking
        vehicleNFT.updateStatus(booking.vehicleId, IVehicleNFT.VehicleStatus.Available);
        vehicleNFT.setCurrentBooking(booking.vehicleId, 0);
        _activeBookings[booking.vehicleId] = 0;

        // Calculate deposit return
        uint256 depositReturn = booking.securityDeposit > damageCharges ? booking.securityDeposit - damageCharges : 0;

        // Transfer deposit (minus damages) back to renter
        if (depositReturn > 0) {
            payable(booking.renter).transfer(depositReturn);
        }

        emit RentalCompleted(bookingId, block.timestamp, damageCharges, depositReturn, postCondition.photoHashes);
    }

    /**
     * @notice Report issue during rental
     */
    function reportIssue(uint256 bookingId, string memory issue) external override bookingExists(bookingId) {
        Booking storage booking = _bookings[bookingId];

        if (msg.sender != booking.renter && msg.sender != rentalOperations) {
            revert RentalBooking__Unauthorized();
        }

        emit IssueReported(bookingId, issue, msg.sender);
    }

    /**
     * @notice Dispute damage charges
     */
    function disputeCharges(uint256 bookingId, uint256 disputedAmount, string memory reason)
        external
        override
        bookingExists(bookingId)
    {
        Booking storage booking = _bookings[bookingId];

        if (msg.sender != booking.renter) {
            revert RentalBooking__Unauthorized();
        }

        if (booking.status != BookingStatus.COMPLETED) {
            revert RentalBooking__InvalidStatus();
        }

        booking.status = BookingStatus.DISPUTED;
        _disputes[bookingId] = true;

        emit ChargesDisputed(bookingId, disputedAmount, reason);
    }

    /**
     * @notice Resolve dispute (admin/arbitrator)
     */
    function resolveDispute(uint256 bookingId, uint256 finalCharges)
        external
        override
        onlyApprover
        bookingExists(bookingId)
        nonReentrant
    {
        Booking storage booking = _bookings[bookingId];

        if (!_disputes[bookingId]) {
            revert RentalBooking__InvalidStatus();
        }

        uint256 originalCharges = booking.damageCharges;
        booking.damageCharges = finalCharges;
        booking.status = BookingStatus.COMPLETED;
        _disputes[bookingId] = false;

        // Adjust deposit return if needed
        if (finalCharges < originalCharges) {
            uint256 refund = originalCharges - finalCharges;
            payable(booking.renter).transfer(refund);
        }

        emit DisputeResolved(bookingId, finalCharges, msg.sender);
    }

    /**
     * @notice Cancel booking
     */
    function cancelBooking(uint256 bookingId, string memory reason)
        external
        override
        bookingExists(bookingId)
        nonReentrant
    {
        Booking storage booking = _bookings[bookingId];

        if (msg.sender != booking.renter && msg.sender != owner() && !approvers[msg.sender]) {
            revert RentalBooking__Unauthorized();
        }

        if (booking.status == BookingStatus.ACTIVE || booking.status == BookingStatus.COMPLETED) {
            revert RentalBooking__InvalidStatus();
        }

        booking.status = BookingStatus.CANCELLED;
        booking.cancellationReason = reason;

        // Refund based on cancellation timing
        uint256 refundAmount = _calculateCancellationRefund(booking);

        if (refundAmount > 0) {
            payable(booking.renter).transfer(refundAmount);
        }

        emit BookingCancelled(bookingId, msg.sender, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getBooking(uint256 bookingId) external view override returns (Booking memory booking) {
        return _bookings[bookingId];
    }

    function getBookingStatus(uint256 bookingId) external view override returns (BookingStatus status) {
        return _bookings[bookingId].status;
    }

    function isVehicleAvailable(uint256 vehicleId, uint256 startTime, uint256 endTime)
        public
        view
        override
        returns (bool available)
    {
        uint256[] memory bookings = _vehicleBookings[vehicleId];

        for (uint256 i = 0; i < bookings.length; i++) {
            Booking memory booking = _bookings[bookings[i]];

            // Skip cancelled or completed bookings
            if (
                booking.status == BookingStatus.CANCELLED || booking.status == BookingStatus.COMPLETED
                    || booking.status == BookingStatus.DISPUTED
            ) {
                continue;
            }

            // Check for time overlap
            if (startTime < booking.endTime && endTime > booking.startTime) {
                return false;
            }
        }

        return true;
    }

    function getActiveBooking(uint256 vehicleId) external view override returns (uint256 bookingId) {
        return _activeBookings[vehicleId];
    }

    function getRenterBookings(address renter) external view override returns (uint256[] memory bookingIds) {
        return _renterBookings[renter];
    }

    function getVehicleBookings(uint256 vehicleId) external view override returns (uint256[] memory bookingIds) {
        return _vehicleBookings[vehicleId];
    }

    function calculateBookingCost(uint256 startTime, uint256 endTime, uint256 ratePerDay)
        public
        pure
        override
        returns (uint256 totalCost)
    {
        uint256 durationDays = (endTime - startTime) / 1 days;
        if ((endTime - startTime) % 1 days > 0) {
            durationDays++; // Round up partial days
        }

        totalCost = durationDays * ratePerDay;
    }

    function isBookingOverdue(uint256 bookingId)
        external
        view
        override
        returns (bool isOverdue, uint256 overdueMinutes)
    {
        Booking memory booking = _bookings[bookingId];

        if (booking.status == BookingStatus.ACTIVE && block.timestamp > booking.endTime) {
            isOverdue = true;
            overdueMinutes = (block.timestamp - booking.endTime) / 60;
        } else {
            isOverdue = false;
            overdueMinutes = 0;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _calculateCancellationRefund(Booking memory booking) internal view returns (uint256 refundAmount) {
        uint256 totalPaid =
            calculateBookingCost(booking.startTime, booking.endTime, booking.ratePerDay) + booking.securityDeposit;

        // Full refund if cancelled before 48 hours of start time
        if (block.timestamp < booking.startTime - 48 hours) {
            return totalPaid;
        }

        // 50% refund if cancelled between 24-48 hours
        if (block.timestamp < booking.startTime - 24 hours) {
            return totalPaid / 2;
        }

        // No refund if cancelled within 24 hours
        return 0;
    }
}
