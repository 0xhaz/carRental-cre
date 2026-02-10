// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IRefundManager
 * @dev Interface for managing different types of refunds in payment processes
 */
interface IRefundManager {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error RefundManager__OnlyPaymentProtocol();
    error RefundManager__NotAuthorizedProcessor();
    error RefundManager__OnlyEmergencyAuthority();
    error RefundManager__InvalidRefundId();
    error RefundManager__InvalidAddress();
    error RefundManager__CannotRequestRefund();
    error RefundManager__DescriptionRequired();
    error RefundManager__InvalidPaymentId();
    error RefundManager__RefundNotEligible();
    error RefundManager__RefundAlreadyApproved();
    error RefundManager__RefundAlreadyProcessed();
    error RefundManager__RefundNotApproved();
    error RefundManager__RejectionReasonRequired();
    error RefundManager__CannotProcessRefund();
    error RefundManager__DelayTooLong();
    error RefundManager__WindowTooLong();
    error RefundManager__WindowTooShort();

    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Types of refunds
     * AUTOMATIC: Refunds processed automatically based on predefined conditions
     * MANUAL: Refunds processed manually by the payee or authorized personnel
     * DISPUTE: Refunds processed due to a dispute resolution
     * EMERGENCY: Refunds processed in emergency situations
     */
    enum RefundType {
        AUTOMATIC,
        MANUAL,
        DISPUTE,
        EMERGENCY
    }

    /**
     * @notice Reasons for refunds
     * TIMEOUT: Refund due to payment confirmation timeout
     * COMPLIANCE_VIOLATION: Refund due to compliance issues
     * MUTUAL_AGREEMENT: Refund agreed upon by both parties
     * DISPUTE_RESOLUTION: Refund resulting from dispute resolution
     * EMERGENCY_ACTION: Refund due to emergency actions taken
     * PAYMENT_CANCELLATION: Refund due to payment cancellation by payer
     * SYSTEM_ERROR: Refund due to system errors or failures
     * RENTAL_CANCELLATION: Refund due to rental booking cancellation
     * BOOKING_CONFLICT: Refund due to booking conflicts
     * VEHICLE_UNAVAILABLE: Refund due to vehicle unavailability
     * MAINTENANCE_REQUIRED: Refund due to mandatory vehicle maintenance
     * WEATHER_EMERGENCY: Refund due to severe weather conditions
     * PLATFORM_ERROR: Refund due to platform technical issues
     * MILESTONE_FAILURE: Refund due to investment milestone not met
     */
    enum RefundReason {
        TIMEOUT,
        COMPLIANCE_VIOLATION,
        MUTUAL_AGREEMENT,
        DISPUTE_RESOLUTION,
        EMERGENCY_ACTION,
        PAYMENT_CANCELLATION,
        SYSTEM_ERROR,
        RENTAL_CANCELLATION,
        BOOKING_CONFLICT,
        VEHICLE_UNAVAILABLE,
        MAINTENANCE_REQUIRED,
        WEATHER_EMERGENCY,
        PLATFORM_ERROR,
        MILESTONE_FAILURE
    }

    /*//////////////////////////////////////////////////////////////
                           STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Details of a refund request
     * @param refundId Unique identifier for the refund
     * @param paymentId Associated payment identifier
     * @param requester Address of the refund requester
     * @param recipient Address of the refund recipient
     * @param amount Amount to be refunded
     * @param refundType Type of the refund
     * @param reason Reason for the refund
     * @param description Additional description for the refund
     * @param requestedAt Timestamp when the refund was requested
     * @param processedAt Timestamp when the refund was processed
     * @param approved Indicates if the refund has been approved
     * @param processed Indicates if the refund has been processed
     * @param evidenceHash Hash of evidence supporting the refund request
     */
    struct RefundRequest {
        uint256 refundId;
        uint256 paymentId;
        address requester;
        address recipient;
        uint256 amount;
        RefundType refundType;
        RefundReason reason;
        string description;
        uint256 requestedAt;
        uint256 processedAt;
        bool approved;
        bool processed;
        bytes32 evidenceHash;
    }

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a refund is requested
    event RefundRequested(
        uint256 indexed refundId,
        uint256 indexed paymentId,
        address indexed requester,
        RefundType refundType,
        RefundReason reason,
        uint256 amount
    );

    /// @notice Emitted when a refund is approved
    event RefundApproved(uint256 indexed refundId, address indexed approver, uint256 timestamp);

    /// @notice Emitted when a refund is processed
    event RefundProcessed(uint256 indexed refundId, address indexed recipient, uint256 amount, uint256 timestamp);

    /// @notice Emitted when a refund is rejected
    event RefundRejected(uint256 indexed refundId, address indexed rejector, string reason);

    /// @notice Emitted when an emergency refund is executed
    event EmergencyRefundExecuted(uint256 indexed refundId, address indexed authority, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                      REFUND MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Request a refund for a specific payment
     * @param paymentId ID of the payment for which the refund is requested
     * @param refundType Type of the refund
     * @param reason Reason for the refund
     * @param description Additional description for the refund
     * @param evidenceHash Hash of evidence supporting the refund request
     * @return refundId ID of the created refund request
     */
    function requestRefund(
        uint256 paymentId,
        RefundType refundType,
        RefundReason reason,
        string calldata description,
        bytes32 evidenceHash
    ) external returns (uint256 refundId);

    /**
     * @dev Approve a refund request
     * @param refundId ID of the refund request to approve
     */
    function approveRefund(uint256 refundId) external;

    /**
     * @dev Reject a refund request
     * @param refundId ID of the refund request to reject
     * @param reason Reason for rejecting the refund
     */
    function rejectRefund(uint256 refundId, string calldata reason) external;

    /**
     * @dev Process a refund request
     * @param refundId ID of the refund request to process
     */
    function processRefund(uint256 refundId) external;

    /**
     * @dev Execute an emergency refund
     * @param paymentId ID of the payment for which the emergency refund is executed
     * @param recipient Address of the recipient of the emergency refund
     * @param reason Reason for the emergency refund
     * @param description Additional description for the emergency refund
     * @return refundId ID of the created emergency refund request
     */
    function emergencyRefund(uint256 paymentId, address recipient, RefundReason reason, string calldata description)
        external
        returns (uint256 refundId);

    /**
     * @dev Process an automatic refund based on predefined conditions
     * @param paymentId ID of the payment for which the automatic refund is processed
     * @param reason Reason for the automatic refund
     * @return refundId ID of the created automatic refund request
     */
    function processAutomaticRefund(uint256 paymentId, RefundReason reason) external returns (uint256 refundId);

    /*//////////////////////////////////////////////////////////////
                      ADMINISTRATIVE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set or unset an authorized refund processor
     * @param processor Address of the refund processor
     * @param authorized Boolean indicating whether to authorize or deauthorize the processor
     */
    function setAuthorizedProcessor(address processor, bool authorized) external;

    /**
     * @dev Set the emergency refund authority address
     * @param authority Address of the emergency refund authority
     */
    function setEmergencyRefundAuthority(address authority) external;

    /**
     * @dev Set the delay before processing refunds
     * @param delay Delay duration in seconds
     */
    function setRefundProcessingDelay(uint256 delay) external;

    /**
     * @dev Set the maximum window to request a refund
     * @param window Duration in seconds
     */
    function setMaxRefundWindow(uint256 window) external;

    /**
     * @dev Pause the refund manager contract
     */
    function pause() external;

    /**
     * @dev Unpause the refund manager contract
     */
    function unpause() external;

    /*//////////////////////////////////////////////////////////////
                         VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get details of a specific refund request
     * @param refundId ID of the refund request
     * @return RefundRequest Struct containing details of the refund request
     */
    function getRefundRequest(uint256 refundId) external view returns (RefundRequest memory);

    /**
     * @dev Get all refund requests associated with a specific payment
     * @param paymentId ID of the payment
     * @return Array of refund IDs associated with the payment
     */
    function getRefundsByPayment(uint256 paymentId) external view returns (uint256[] memory);

    /**
     * @dev Get all refund requests made by a specific requester
     * @param requester Address of the requester
     * @return Array of refund IDs made by the requester
     */
    function getRefundsByRequester(address requester) external view returns (uint256[] memory);

    /**
     * @dev Check if a refund can be requested for a specific payment by a requester
     * @param paymentId ID of the payment
     * @param requester Address of the requester
     * @return Boolean indicating if a refund can be requested
     */
    function canRequestRefund(uint256 paymentId, address requester) external view returns (bool);

    /**
     * @dev Check if a refund is eligible for a specific payment and refund type
     * @param paymentId ID of the payment
     * @param refundType Type of the refund
     * @return Boolean indicating if the refund is eligible
     */
    function isRefundEligible(uint256 paymentId, RefundType refundType) external view returns (bool);

    /**
     * @dev Get the refund amount for a specific payment
     * @param paymentId ID of the payment
     * @return Amount eligible for refund
     */
    function getRefundAmount(uint256 paymentId) external view returns (uint256);
}
