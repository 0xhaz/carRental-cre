// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IRentalPaymentProtocol} from "../interfaces/payment/IRentalPaymentProtocol.sol";
import {IPaymentEscrow} from "../interfaces/payment/IPaymentEscrow.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {IParticipantTypeRegistry} from "../interfaces/erc3643/IParticipantTypeRegistry.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";
import {IRevenueDistributor} from "../interfaces/revenue/IRevenueDistributor.sol";

/**
 * @title RentalPaymentProtocol
 * @notice Handles rental payment operations for the rental car platform
 * @dev Manages renter payments, deposits, and revenue distribution
 */
contract RentalPaymentProtocol is IRentalPaymentProtocol, Ownable, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IPaymentEscrow public paymentEscrow;
    IIdentityRegistry public identityRegistry;
    IParticipantTypeRegistry public participantTypeRegistry;
    IRenterCompliance public renterCompliance;
    IRevenueDistributor public revenueDistributor;

    mapping(uint256 => RentalPayment) private _rentalPayments;
    mapping(uint256 => uint256) private _bookingToPayment;
    mapping(address => uint256[]) private _renterPayments;
    mapping(uint256 => uint256[]) private _vehiclePayments;
    mapping(uint256 => RevenueDistribution) private _vehicleRevenue;

    uint256 private _nextPaymentId = 1;
    uint256 public totalRentalPayments;
    uint256 public totalRentalVolume;

    /// @notice Platform fee rate in basis points (e.g., 500 = 5%)
    uint256 public platformFeeRate = 500;

    /// @notice Maintenance reserve rate in basis points (e.g., 200 = 2%)
    uint256 public maintenanceReserveRate = 200;

    uint256 public constant MAX_FEE_RATE = 2000; // Max 20%
    uint256 public constant FEE_DENOMINATOR = 10_000;

    /// @notice Authorized rental operators
    mapping(address => bool) public authorizedOperators;

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedOperator() {
        if (!authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert RentalPayment__UnauthorizedCaller();
        }
        _;
    }

    modifier validPaymentId(uint256 paymentId) {
        if (paymentId == 0 || paymentId >= _nextPaymentId) {
            revert RentalPayment__InvalidBookingId();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _paymentEscrow,
        address _identityRegistry,
        address _participantTypeRegistry,
        address _renterCompliance
    ) Ownable(msg.sender) {
        if (
            _paymentEscrow == address(0) || _identityRegistry == address(0)
                || _participantTypeRegistry == address(0) || _renterCompliance == address(0)
        ) {
            revert RentalPayment__InvalidAddress();
        }

        paymentEscrow = IPaymentEscrow(_paymentEscrow);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        participantTypeRegistry = IParticipantTypeRegistry(_participantTypeRegistry);
        renterCompliance = IRenterCompliance(_renterCompliance);

        authorizedOperators[msg.sender] = true;
    }

    /*//////////////////////////////////////////////////////////////
                         BOOKING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRentalPaymentProtocol
    function createRentalBooking(
        uint256 bookingId,
        uint256 vehicleId,
        address rentor,
        uint256 rentalFee,
        uint256 securityDeposit,
        uint256 startTime,
        uint256 endTime
    ) external payable override nonReentrant whenNotPaused returns (uint256 paymentId) {
        if (rentor == address(0)) revert RentalPayment__InvalidAddress();
        if (vehicleId == 0) revert RentalPayment__InvalidVehicleId();
        if (rentalFee == 0) revert RentalPayment__InvalidAmount();
        if (securityDeposit == 0) revert RentalPayment__InsufficientDeposit();
        if (startTime >= endTime) revert RentalPayment__InvalidBookingId();
        if (_bookingToPayment[bookingId] != 0) revert RentalPayment__BookingNotActive();

        // Validate renter compliance
        _validateRenterCompliance(msg.sender);

        // Validate rentor
        if (!participantTypeRegistry.isRentor(rentor)) {
            revert RentalPayment__InvalidRentor();
        }

        uint256 totalAmount = rentalFee + securityDeposit;
        uint256 escrowFee = paymentEscrow.calculateEscrowFee(totalAmount);
        uint256 totalWithFee = totalAmount + escrowFee;

        // Check renter's ETH value (must cover escrow fee too)
        if (msg.value < totalWithFee) {
            revert RentalPayment__InvalidAmount();
        }

        // Create payment record
        paymentId = _nextPaymentId++;
        RentalPayment storage payment = _rentalPayments[paymentId];

        payment.paymentId = paymentId;
        payment.bookingId = bookingId;
        payment.vehicleId = vehicleId;
        payment.renter = msg.sender;
        payment.rentor = rentor;
        payment.rentalFee = rentalFee;
        payment.securityDeposit = securityDeposit;
        payment.totalAmount = totalAmount;
        payment.state = RentalPaymentState.PENDING;
        payment.createdAt = block.timestamp;
        payment.startTime = startTime;
        payment.endTime = endTime;
        payment.actualReturnTime = 0;
        payment.penaltyAmount = 0;

        // Forward ETH to escrow (including escrow fee)
        paymentEscrow.createEscrow{value: totalWithFee}(
            paymentId, msg.sender, rentor, totalAmount, (endTime - startTime) + 7 days
        );

        // Refund excess ETH
        if (msg.value > totalWithFee) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalWithFee}("");
            if (!refunded) revert RentalPayment__PaymentAlreadyProcessed();
        }

        payment.state = RentalPaymentState.ESCROWED;

        // Update mappings
        _bookingToPayment[bookingId] = paymentId;
        _renterPayments[msg.sender].push(paymentId);
        _vehiclePayments[vehicleId].push(paymentId);

        totalRentalPayments += 1;
        totalRentalVolume += totalAmount;

        emit RentalBookingCreated(paymentId, bookingId, vehicleId, msg.sender, rentalFee, securityDeposit);
    }

    /// @inheritdoc IRentalPaymentProtocol
    function startRental(uint256 paymentId) external override validPaymentId(paymentId) onlyAuthorizedOperator {
        RentalPayment storage payment = _rentalPayments[paymentId];

        if (payment.state != RentalPaymentState.ESCROWED) {
            revert RentalPayment__BookingNotActive();
        }
        if (block.timestamp < payment.startTime) {
            revert RentalPayment__BookingNotActive();
        }

        payment.state = RentalPaymentState.ACTIVE;

        emit RentalStarted(paymentId, payment.bookingId, block.timestamp);
    }

    /// @inheritdoc IRentalPaymentProtocol
    function completeRental(
        uint256 paymentId,
        uint256 penaltyAmount,
        PenaltyReason penaltyReason,
        string calldata penaltyDescription
    ) external override validPaymentId(paymentId) onlyAuthorizedOperator nonReentrant {
        RentalPayment storage payment = _rentalPayments[paymentId];

        if (payment.state != RentalPaymentState.ACTIVE) {
            revert RentalPayment__RentalNotActive();
        }

        payment.actualReturnTime = block.timestamp;
        payment.state = RentalPaymentState.PROCESSING;

        // Apply penalty if any
        if (penaltyAmount > 0) {
            if (penaltyAmount > payment.securityDeposit) {
                penaltyAmount = payment.securityDeposit;
            }

            payment.penaltyAmount = penaltyAmount;
            payment.penaltyReason = penaltyReason;
            payment.penaltyDescription = penaltyDescription;

            emit PenaltyApplied(paymentId, payment.bookingId, penaltyAmount, penaltyReason);
        }

        // Calculate deposit return amount
        uint256 depositReturn = payment.securityDeposit - penaltyAmount;

        // Release escrow funds
        // Rental fee + penalty goes to rentor
        // Remaining deposit returns to renter
        paymentEscrow.releaseEscrow(paymentId);

        payment.state = RentalPaymentState.COMPLETED;

        // Add rental revenue to vehicle revenue pool
        _addVehicleRevenue(payment.vehicleId, payment.rentalFee + penaltyAmount);

        emit RentalCompleted(paymentId, payment.bookingId, block.timestamp, depositReturn);
    }

    /// @inheritdoc IRentalPaymentProtocol
    function cancelRental(uint256 paymentId) external override validPaymentId(paymentId) nonReentrant {
        RentalPayment storage payment = _rentalPayments[paymentId];

        if (msg.sender != payment.renter && !authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert RentalPayment__UnauthorizedCaller();
        }

        if (payment.state != RentalPaymentState.PENDING && payment.state != RentalPaymentState.ESCROWED) {
            revert RentalPayment__BookingNotActive();
        }

        // Can only cancel before rental starts
        if (block.timestamp >= payment.startTime) {
            revert RentalPayment__RentalNotActive();
        }

        payment.state = RentalPaymentState.CANCELLED;

        // Refund full amount to renter
        paymentEscrow.refundEscrow(paymentId);
    }

    /*//////////////////////////////////////////////////////////////
                    REVENUE DISTRIBUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRentalPaymentProtocol
    function distributeRevenue(uint256 vehicleId, uint256 totalRevenue)
        external
        override
        onlyAuthorizedOperator
        nonReentrant
    {
        if (vehicleId == 0) revert RentalPayment__InvalidVehicleId();
        if (totalRevenue == 0) revert RentalPayment__InvalidAmount();

        RevenueDistribution storage revenue = _vehicleRevenue[vehicleId];

        // Calculate fees and reserves
        uint256 platformFee = (totalRevenue * platformFeeRate) / FEE_DENOMINATOR;
        uint256 maintenanceReserve = (totalRevenue * maintenanceReserveRate) / FEE_DENOMINATOR;
        uint256 netRevenue = totalRevenue - platformFee - maintenanceReserve;

        revenue.totalRevenue = totalRevenue;
        revenue.platformFee = platformFee;
        revenue.maintenanceReserve = maintenanceReserve;
        revenue.netRevenue = netRevenue;
        revenue.distributedAt = block.timestamp;
        revenue.distributed = true;

        emit RevenueDistributed(vehicleId, totalRevenue, platformFee, maintenanceReserve, netRevenue);
    }

    /*//////////////////////////////////////////////////////////////
                         VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRentalPaymentProtocol
    function getRentalPayment(uint256 paymentId)
        external
        view
        override
        validPaymentId(paymentId)
        returns (RentalPayment memory)
    {
        return _rentalPayments[paymentId];
    }

    /// @inheritdoc IRentalPaymentProtocol
    function getPaymentByBooking(uint256 bookingId) external view override returns (uint256 paymentId) {
        return _bookingToPayment[bookingId];
    }

    /// @inheritdoc IRentalPaymentProtocol
    function getRenterPayments(address renter) external view override returns (uint256[] memory) {
        return _renterPayments[renter];
    }

    /// @inheritdoc IRentalPaymentProtocol
    function getVehicleRentalPayments(uint256 vehicleId) external view override returns (uint256[] memory) {
        return _vehiclePayments[vehicleId];
    }

    /// @inheritdoc IRentalPaymentProtocol
    function getVehicleRevenue(uint256 vehicleId) external view override returns (RevenueDistribution memory) {
        return _vehicleRevenue[vehicleId];
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set platform fee rate
     * @param feeRate New fee rate in basis points
     */
    function setPlatformFeeRate(uint256 feeRate) external onlyOwner {
        if (feeRate > MAX_FEE_RATE) revert RentalPayment__InvalidAmount();
        platformFeeRate = feeRate;
    }

    /**
     * @notice Set maintenance reserve rate
     * @param reserveRate New reserve rate in basis points
     */
    function setMaintenanceReserveRate(uint256 reserveRate) external onlyOwner {
        if (reserveRate > MAX_FEE_RATE) revert RentalPayment__InvalidAmount();
        maintenanceReserveRate = reserveRate;
    }

    /**
     * @notice Set authorized operator
     * @param operator Address of the operator
     * @param authorized Whether the operator is authorized
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert RentalPayment__InvalidAddress();
        authorizedOperators[operator] = authorized;
    }

    /**
     * @notice Set payment escrow
     * @param _paymentEscrow Address of the payment escrow
     */
    function setPaymentEscrow(address _paymentEscrow) external onlyOwner {
        if (_paymentEscrow == address(0)) revert RentalPayment__InvalidAddress();
        paymentEscrow = IPaymentEscrow(_paymentEscrow);
    }

    /**
     * @notice Set revenue distributor for forwarding rental revenue
     * @param _revenueDistributor Address of the RevenueDistributor contract
     */
    function setRevenueDistributor(address _revenueDistributor) external onlyOwner {
        if (_revenueDistributor == address(0)) revert RentalPayment__InvalidAddress();
        revenueDistributor = IRevenueDistributor(_revenueDistributor);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate renter compliance
     */
    function _validateRenterCompliance(address renter) internal view {
        // Check if renter has valid identity
        if (!identityRegistry.isVerified(renter)) {
            revert RentalPayment__InvalidRenter();
        }

        // Check if renter has renter role
        if (!participantTypeRegistry.isRenter(renter)) {
            revert RentalPayment__InvalidRenter();
        }

        // Validate renter compliance
        IRenterCompliance.RenterValidationResult memory result = renterCompliance.validateRenter(renter);
        if (!result.isValid) {
            revert RentalPayment__InvalidRenter();
        }
    }

    /**
     * @dev Add revenue to vehicle revenue pool and forward to RevenueDistributor
     */
    function _addVehicleRevenue(uint256 vehicleId, uint256 amount) internal {
        RevenueDistribution storage revenue = _vehicleRevenue[vehicleId];
        revenue.totalRevenue += amount;

        // Forward revenue to RevenueDistributor for waterfall distribution
        if (address(revenueDistributor) != address(0)) {
            revenueDistributor.addRevenue(vehicleId, amount);
        }
    }
}
