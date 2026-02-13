// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IPaymentProtocol
 * @dev Interface for Payment Protocol with escrow and refund capabilities
 */
interface IPaymentProtocol {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error PaymentProtocol__InvalidPaymentId();
    error PaymentProtocol__InvalidAddress();
    error PaymentProtocol__OnlyTokenIssuer();
    error PaymentProtocol__CannotPaySelf();
    error PaymentProtocol__AmountBelowMinimum();
    error PaymentProtocol__AmountExceedsMaximum();
    error PaymentProtocol__ReasonRequired();
    error PaymentProtocol__InsufficientBalance();
    error PaymentProtocol__ETHTransferFailed();
    error PaymentProtocol__IdentityNotVerified();
    error PaymentProtocol__ComplianceValidationFailed();
    error PaymentProtocol__OracleAccessDenied();
    error PaymentProtocol__OnlyPayeeCanConfirm();
    error PaymentProtocol__PaymentNotPending();
    error PaymentProtocol__ConfirmationPeriodExpired();
    error PaymentProtocol__OnlyPayerCanDispute();
    error PaymentProtocol__DisputeWindowExpired();
    error PaymentProtocol__OnlyPayerCanCancel();
    error PaymentProtocol__PaymentNotConfirmed();
    error PaymentProtocol__OnlyRefundManager();
    error PaymentProtocol__PaymentNotRefundable();
    error PaymentProtocol__PaymentAlreadyRefunded();
    error PaymentProtocol__ConfirmationPeriodTooShort();
    error PaymentProtocol__ConfirmationPeriodTooLong();
    error PaymentProtocol__DisputeWindowTooShort();
    error PaymentProtocol__DisputeWindowTooLong();
    error PaymentProtocol__InvalidAmountLimits();
    error PaymentProtocol__EscrowFeeRateTooHigh();
    error PaymentProtocol__UnauthorizedOperator();

    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice State of the payment
     * PENDING: Payment is initiated but not yet confirmed
     * CONFIRMED: Payment has been confirmed by all parties
     * DISPUTED: A dispute has been raised regarding the payment
     * REFUNDED: Payment has been refunded to the payer
     * EXPIRED: Payment request has expired without action
     * CANCELLED: Payment has been cancelled by the payer
     */
    enum PaymentState {
        PENDING,
        CONFIRMED,
        DISPUTED,
        REFUNDED,
        EXPIRED,
        CANCELLED
    }

    /**
     * @notice Types of refunds
     * AUTOMATIC: Refunds processed automatically after expiry
     * MANUAL: Refunds processed manually by the payee
     * DISPUTE: Refunds processed due to a dispute resolution
     * EMERGENCY: Refunds processed in emergency situations
     */
    enum RefundType {
        AUTOMATIC,
        MANUAL,
        DISPUTE,
        EMERGENCY
    }

    /*//////////////////////////////////////////////////////////////
                           STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Details of a payment
     * @param paymentId Unique identifier for the payment
     * @param payer Address of the payer
     * @param payee Address of the payee
     * @param amount Amount of the payment
     * @param reason Reason for the payment
     * @param state Current state of the payment
     * @param createdAt Timestamp when the payment was created
     * @param confirmationDeadline Deadline for payment confirmation
     * @param disputeDeadline Deadline for raising disputes
     * @param complianceHash Hash of compliance data associated with the payment
     * @param refundable Indicates if the payment is refundable
     * @param paymentReason Description or reason for the payment
     * @param escrowAmount Amount held in escrow for the payment
     *
     */
    struct Payment {
        uint256 paymentId;
        address payer;
        address payee;
        uint256 amount;
        PaymentState state;
        uint256 createdAt;
        uint256 confirmationDeadline;
        uint256 disputeDeadline;
        bytes32 complianceHash;
        bool refundable;
        string paymentReason;
        uint256 escrowAmount;
    }

    /**
     * @notice Settings for the payment protocol
     * @param confirmationPeriod Time period allowed for payment confirmation
     * @param disputeWindow Time window allowed for raising disputes
     * @param refundWindow Time window allowed for requesting refunds
     * @param maxPaymentAmount Maximum allowable payment amount
     * @param minPaymentAmount Minimum allowable payment amount
     * @param escrowFeeRate Fee rate applied to escrowed payments
     */
    struct PaymentSettings {
        uint256 confirmationPeriod;
        uint256 disputeWindow;
        uint256 refundWindow;
        uint256 maxPaymentAmount;
        uint256 minPaymentAmount;
        uint256 escrowFeeRate;
    }

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new payment is initiated
    event PaymentInitiated(
        uint256 indexed paymentId, address indexed payer, address indexed payee, uint256 amount, string reason
    );

    /// @notice Emitted when a payment is confirmed
    event PaymentConfirmed(uint256 indexed paymentId, address indexed payee, uint256 timestamp);

    /// @notice Emitted when a payment is disputed
    event PaymentDisputed(uint256 indexed paymentId, address indexed disputer, string reason);

    /// @notice Emitted when a payment is refunded
    event PaymentRefunded(uint256 indexed paymentId, address indexed recipient, uint256 amount, RefundType refundType);

    /// @notice Emitted when a payment has expired
    event PaymentExpired(uint256 indexed paymentId, uint256 timestamp);

    /// @notice Emitted when a payment is cancelled
    event PaymentCancelled(uint256 indexed paymentId, address indexed canceller);

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set the payment escrow contract address
     * @param _paymentEscrow Address of the payment escrow contract
     */
    function setPaymentEscrow(address _paymentEscrow) external;

    /**
     * @dev Set the refund manager contract address
     * @param _refundManager Address of the refund manager contract
     */
    function setRefundManager(address _refundManager) external;

    /**
     * @dev Set the dispute resolver contract address
     * @param _disputeResolver Address of the dispute resolver contract
     */
    function setDisputeResolver(address _disputeResolver) external;

    /*//////////////////////////////////////////////////////////////
                    PAYMENT PROTOCOL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initiate a new payment
     * @param payee Address of the payee
     * @param amount Amount of the payment
     * @param reason Reason for the payment
     * @return paymentId Unique identifier for the initiated payment
     */
    function initiatePayment(address payee, uint256 amount, string calldata reason) external payable returns (uint256 paymentId);

    /**
     * @notice Confirm a payment
     * @param paymentId Unique identifier of the payment to confirm
     */
    function confirmPayment(uint256 paymentId) external;

    /**
     * @notice Dispute a payment
     * @param paymentId Unique identifier of the payment to dispute
     * @param reason Reason for disputing the payment
     */
    function disputePayment(uint256 paymentId, string calldata reason) external;

    /**
     * @notice Cancel a payment
     * @param paymentId Unique identifier of the payment to cancel
     */
    function cancelPayment(uint256 paymentId) external;

    /**
     * @notice Process a refund for a payment
     * @param paymentId Unique identifier of the payment to refund
     * @param refundType Type of refund to process
     */
    function processRefund(uint256 paymentId, RefundType refundType) external;

    /**
     * @notice Perform an emergency refund for a payment
     * @param paymentId Unique identifier of the payment for emergency refund
     */
    function emergencyRefund(uint256 paymentId) external;

    /**
     * @notice Update payment protocol settings
     * @param newSettings New settings to apply
     */
    function updatePaymentSettings(PaymentSettings calldata newSettings) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get details of a payment
     * @param paymentId Unique identifier of the payment
     * @return Payment struct containing payment details
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory);

    /**
     * @notice Get the current state of a payment
     * @param paymentId Unique identifier of the payment
     * @return PaymentState enum value representing the payment state
     */
    function getPaymentState(uint256 paymentId) external view returns (PaymentState);

    /**
     * @notice Check if a payment has expired
     * @param paymentId Unique identifier of the payment
     * @return bool indicating if the payment is expired
     */
    function isPaymentExpired(uint256 paymentId) external view returns (bool);

    /**
     * @notice Check if a payment can be disputed
     * @param paymentId Unique identifier of the payment
     * @return bool indicating if the payment can be disputed
     */
    function canDispute(uint256 paymentId) external view returns (bool);

    /**
     * @notice Get all payments made by a specific payer
     * @param payer Address of the payer
     * @return Array of payment IDs made by the payer
     */
    function getPaymentsByPayer(address payer) external view returns (uint256[] memory);
    /**
     * @notice Get all payments received by a specific payee
     * @param payee Address of the payee
     * @return Array of payment IDs received by the payee
     */
    function getPaymentsByPayee(address payee) external view returns (uint256[] memory);
}
