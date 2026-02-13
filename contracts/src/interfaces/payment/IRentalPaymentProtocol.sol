// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRentalPaymentProtocol
 * @notice Interface for rental payment protocol handling renter payments and deposits
 */
interface IRentalPaymentProtocol {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error RentalPayment__InvalidAddress();
    error RentalPayment__InvalidAmount();
    error RentalPayment__InvalidVehicleId();
    error RentalPayment__InvalidBookingId();
    error RentalPayment__InvalidRenter();
    error RentalPayment__InvalidRentor();
    error RentalPayment__InsufficientDeposit();
    error RentalPayment__BookingNotActive();
    error RentalPayment__BookingNotCompleted();
    error RentalPayment__DepositAlreadyReleased();
    error RentalPayment__UnauthorizedCaller();
    error RentalPayment__RentalNotActive();
    error RentalPayment__PaymentAlreadyProcessed();

    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice State of rental payment
     */
    enum RentalPaymentState {
        PENDING,        // Initial booking created
        ESCROWED,       // Deposit escrowed
        ACTIVE,         // Rental in progress
        PROCESSING,     // Return evaluation in progress
        COMPLETED,      // Successfully completed
        DISPUTED,       // Dispute raised
        REFUNDED,       // Deposit refunded
        CANCELLED       // Booking cancelled
    }

    /**
     * @notice Penalty reasons for deposit deductions
     */
    enum PenaltyReason {
        NONE,
        DAMAGE,
        LATE_RETURN,
        EXCESSIVE_MILEAGE,
        CLEANING_FEE,
        MISSING_FUEL,
        TOLL_VIOLATION,
        TRAFFIC_VIOLATION,
        OTHER
    }

    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Rental payment details
     */
    struct RentalPayment {
        uint256 paymentId;
        uint256 bookingId;
        uint256 vehicleId;
        address renter;
        address rentor;
        uint256 rentalFee;
        uint256 securityDeposit;
        uint256 totalAmount;
        RentalPaymentState state;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        uint256 actualReturnTime;
        uint256 penaltyAmount;
        PenaltyReason penaltyReason;
        string penaltyDescription;
    }

    /**
     * @notice Revenue distribution details
     */
    struct RevenueDistribution {
        uint256 totalRevenue;
        uint256 platformFee;
        uint256 maintenanceReserve;
        uint256 netRevenue;
        uint256 distributedAt;
        bool distributed;
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a rental booking is created
    event RentalBookingCreated(
        uint256 indexed paymentId,
        uint256 indexed bookingId,
        uint256 indexed vehicleId,
        address renter,
        uint256 rentalFee,
        uint256 securityDeposit
    );

    /// @notice Emitted when rental starts
    event RentalStarted(uint256 indexed paymentId, uint256 indexed bookingId, uint256 startTime);

    /// @notice Emitted when rental is completed
    event RentalCompleted(
        uint256 indexed paymentId,
        uint256 indexed bookingId,
        uint256 returnTime,
        uint256 depositReturned
    );

    /// @notice Emitted when penalty is applied
    event PenaltyApplied(
        uint256 indexed paymentId,
        uint256 indexed bookingId,
        uint256 penaltyAmount,
        PenaltyReason reason
    );

    /// @notice Emitted when revenue is distributed
    event RevenueDistributed(
        uint256 indexed vehicleId,
        uint256 totalRevenue,
        uint256 platformFee,
        uint256 maintenanceReserve,
        uint256 netRevenue
    );

    /*//////////////////////////////////////////////////////////////
                         BOOKING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new rental booking with deposit
     * @param bookingId ID of the booking
     * @param vehicleId ID of the vehicle
     * @param rentor Address of the vehicle owner
     * @param rentalFee Rental fee amount
     * @param securityDeposit Security deposit amount
     * @param startTime Rental start time
     * @param endTime Rental end time
     * @return paymentId ID of the created payment
     */
    function createRentalBooking(
        uint256 bookingId,
        uint256 vehicleId,
        address rentor,
        uint256 rentalFee,
        uint256 securityDeposit,
        uint256 startTime,
        uint256 endTime
    ) external payable returns (uint256 paymentId);

    /**
     * @notice Start an active rental
     * @param paymentId ID of the payment
     */
    function startRental(uint256 paymentId) external;

    /**
     * @notice Complete a rental and process return
     * @param paymentId ID of the payment
     * @param penaltyAmount Penalty/damage amount to deduct
     * @param penaltyReason Reason for penalty
     * @param penaltyDescription Description of penalty
     */
    function completeRental(
        uint256 paymentId,
        uint256 penaltyAmount,
        PenaltyReason penaltyReason,
        string calldata penaltyDescription
    ) external;

    /**
     * @notice Cancel a rental booking
     * @param paymentId ID of the payment
     */
    function cancelRental(uint256 paymentId) external;

    /*//////////////////////////////////////////////////////////////
                    REVENUE DISTRIBUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Distribute revenue to RevenueToken holders
     * @param vehicleId ID of the vehicle
     * @param totalRevenue Total rental revenue collected
     */
    function distributeRevenue(uint256 vehicleId, uint256 totalRevenue) external;

    /*//////////////////////////////////////////////////////////////
                         VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get rental payment details
     * @param paymentId ID of the payment
     * @return RentalPayment struct
     */
    function getRentalPayment(uint256 paymentId) external view returns (RentalPayment memory);

    /**
     * @notice Get rental payment by booking ID
     * @param bookingId ID of the booking
     * @return paymentId ID of the payment
     */
    function getPaymentByBooking(uint256 bookingId) external view returns (uint256 paymentId);

    /**
     * @notice Get all rental payments for a renter
     * @param renter Address of the renter
     * @return Array of payment IDs
     */
    function getRenterPayments(address renter) external view returns (uint256[] memory);

    /**
     * @notice Get all rental payments for a vehicle
     * @param vehicleId ID of the vehicle
     * @return Array of payment IDs
     */
    function getVehicleRentalPayments(uint256 vehicleId) external view returns (uint256[] memory);

    /**
     * @notice Get revenue distribution for a vehicle
     * @param vehicleId ID of the vehicle
     * @return RevenueDistribution struct
     */
    function getVehicleRevenue(uint256 vehicleId) external view returns (RevenueDistribution memory);
}
