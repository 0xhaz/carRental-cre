// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IRentalBooking
 * @notice Interface for rental booking lifecycle management
 * @dev Manages the complete rental flow from request to completion
 */
interface IRentalBooking {
    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/

    enum BookingStatus {
        REQUESTED, // Renter initiated booking
        PENDING_APPROVAL, // Compliance checks running
        APPROVED, // Ready for pickup
        ACTIVE, // Vehicle in renter possession
        PENDING_RETURN, // Return process initiated
        COMPLETED, // Successfully closed
        CANCELLED, // Cancelled by renter/system
        DISPUTED // Issue requiring resolution
    }

    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct ConditionReport {
        uint256 timestamp; // Report timestamp
        uint256 mileage; // Vehicle mileage
        uint8 fuelLevel; // Fuel level percentage (0-100)
        bytes32[] photoHashes; // IPFS hashes of photos
        string[] damageNotes; // Damage descriptions
        address inspector; // Who created the report
        bytes signature; // Inspector signature
    }

    struct Booking {
        uint256 id; // Booking ID
        uint256 vehicleId; // Vehicle NFT token ID
        address renter; // Renter address (OnchainID)
        uint256 startTime; // Rental start timestamp
        uint256 endTime; // Rental end timestamp
        uint256 ratePerDay; // Daily rental rate
        uint256 securityDeposit; // Security deposit amount
        BookingStatus status; // Current status
        uint256 paymentId; // Link to payment escrow
        ConditionReport preCondition; // Pre-rental condition
        ConditionReport postCondition; // Post-rental condition
        uint256 extensionCount; // Number of extensions
        uint256 overdueMinutes; // Minutes overdue
        uint256 damageCharges; // Damage charges assessed
        string cancellationReason; // Reason for cancellation (if cancelled)
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event BookingRequested(
        uint256 indexed bookingId,
        uint256 indexed vehicleId,
        address indexed renter,
        uint256 startTime,
        uint256 endTime,
        uint256 totalCost
    );

    event BookingApproved(uint256 indexed bookingId, address indexed approver);

    event BookingRejected(uint256 indexed bookingId, string reason);

    event RentalStarted(uint256 indexed bookingId, uint256 timestamp, bytes32[] preConditionPhotos);

    event RentalExtended(
        uint256 indexed bookingId, uint256 newEndTime, uint256 additionalCost, uint256 extensionNumber
    );

    event ReturnInitiated(uint256 indexed bookingId, uint256 timestamp);

    event RentalCompleted(
        uint256 indexed bookingId,
        uint256 timestamp,
        uint256 damageCharges,
        uint256 depositReturned,
        bytes32[] postConditionPhotos
    );

    event BookingCancelled(uint256 indexed bookingId, address indexed canceller, string reason);

    event IssueReported(uint256 indexed bookingId, string issue, address reporter);

    event ChargesDisputed(uint256 indexed bookingId, uint256 disputedAmount, string reason);

    event DisputeResolved(uint256 indexed bookingId, uint256 finalCharges, address resolver);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error RentalBooking__VehicleNotAvailable();
    error RentalBooking__InvalidTimeRange();
    error RentalBooking__InsufficientPayment();
    error RentalBooking__BookingNotFound();
    error RentalBooking__InvalidStatus();
    error RentalBooking__Unauthorized();
    error RentalBooking__RenterNotVerified();
    error RentalBooking__ComplianceCheckFailed();
    error RentalBooking__ExtensionNotAllowed();
    error RentalBooking__AlreadyReturned();
    error RentalBooking__NotOverdue();
    error RentalBooking__InvalidConditionReport();
    error RentalBooking__RefundFailed();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Request a new booking
     * @param vehicleId Vehicle NFT token ID
     * @param startTime Desired start timestamp
     * @param endTime Desired end timestamp
     * @param ratePerDay Daily rental rate
     * @param securityDeposit Security deposit amount
     * @return bookingId The ID of the newly created booking
     */
    function requestBooking(
        uint256 vehicleId,
        uint256 startTime,
        uint256 endTime,
        uint256 ratePerDay,
        uint256 securityDeposit
    ) external payable returns (uint256 bookingId);

    /**
     * @notice Approve a booking after compliance checks
     * @param bookingId Booking ID
     */
    function approveBooking(uint256 bookingId) external;

    /**
     * @notice Reject a booking
     * @param bookingId Booking ID
     * @param reason Rejection reason
     */
    function rejectBooking(uint256 bookingId, string memory reason) external;

    /**
     * @notice Start rental (activate booking)
     * @param bookingId Booking ID
     * @param preCondition Pre-rental condition report
     */
    function startRental(uint256 bookingId, ConditionReport memory preCondition) external;

    /**
     * @notice Extend rental period
     * @param bookingId Booking ID
     * @param additionalDays Number of days to extend
     * @return newEndTime New end timestamp
     */
    function extendRental(uint256 bookingId, uint256 additionalDays) external payable returns (uint256 newEndTime);

    /**
     * @notice Initiate return process
     * @param bookingId Booking ID
     */
    function initiateReturn(uint256 bookingId) external;

    /**
     * @notice Complete return and settle payment
     * @param bookingId Booking ID
     * @param postCondition Post-rental condition report
     * @param damageCharges Assessed damage charges
     */
    function completeReturn(uint256 bookingId, ConditionReport memory postCondition, uint256 damageCharges) external;

    /**
     * @notice Report issue during rental
     * @param bookingId Booking ID
     * @param issue Issue description
     */
    function reportIssue(uint256 bookingId, string memory issue) external;

    /**
     * @notice Dispute damage charges
     * @param bookingId Booking ID
     * @param disputedAmount Amount being disputed
     * @param reason Dispute reason
     */
    function disputeCharges(uint256 bookingId, uint256 disputedAmount, string memory reason) external;

    /**
     * @notice Resolve dispute (admin/arbitrator)
     * @param bookingId Booking ID
     * @param finalCharges Final damage charges after resolution
     */
    function resolveDispute(uint256 bookingId, uint256 finalCharges) external;

    /**
     * @notice Cancel booking
     * @param bookingId Booking ID
     * @param reason Cancellation reason
     */
    function cancelBooking(uint256 bookingId, string memory reason) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get booking details
     * @param bookingId Booking ID
     * @return booking Booking details
     */
    function getBooking(uint256 bookingId) external view returns (Booking memory booking);

    /**
     * @notice Get booking status
     * @param bookingId Booking ID
     * @return status Current status
     */
    function getBookingStatus(uint256 bookingId) external view returns (BookingStatus status);

    /**
     * @notice Check if vehicle is available for booking
     * @param vehicleId Vehicle NFT token ID
     * @param startTime Desired start time
     * @param endTime Desired end time
     * @return available Whether vehicle is available
     */
    function isVehicleAvailable(uint256 vehicleId, uint256 startTime, uint256 endTime)
        external
        view
        returns (bool available);

    /**
     * @notice Get active booking for vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return bookingId Active booking ID (0 if none)
     */
    function getActiveBooking(uint256 vehicleId) external view returns (uint256 bookingId);

    /**
     * @notice Get all bookings for a renter
     * @param renter Renter address
     * @return bookingIds Array of booking IDs
     */
    function getRenterBookings(address renter) external view returns (uint256[] memory bookingIds);

    /**
     * @notice Get all bookings for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return bookingIds Array of booking IDs
     */
    function getVehicleBookings(uint256 vehicleId) external view returns (uint256[] memory bookingIds);

    /**
     * @notice Calculate total booking cost
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @param ratePerDay Daily rate
     * @return totalCost Total cost
     */
    function calculateBookingCost(uint256 startTime, uint256 endTime, uint256 ratePerDay)
        external
        pure
        returns (uint256 totalCost);

    /**
     * @notice Check if booking is overdue
     * @param bookingId Booking ID
     * @return isOverdue Whether booking is overdue
     * @return overdueMinutes Minutes overdue
     */
    function isBookingOverdue(uint256 bookingId) external view returns (bool isOverdue, uint256 overdueMinutes);
}
