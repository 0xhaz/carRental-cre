// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IPaymentEscrow
 * @dev Interface for secure fund holding during payment processes
 */
interface IPaymentEscrow {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error PaymentEscrow__OnlyPaymentProtocol();
    error PaymentEscrow__InvalidEscrowId();
    error PaymentEscrow__OnlyEmergencyAuthority();
    error PaymentEscrow__InvalidTokenAddress();
    error PaymentEscrow__InvalidPaymentProtocolAddress();
    error PaymentEscrow__InsufficientEscrowAmount();
    error PaymentEscrow__EscrowNotActive();
    error PaymentEscrow__EscrowAlreadyReleased();
    error PaymentEscrow__InvalidAddress();
    error PaymentEscrow__InvalidAmount();
    error PaymentEscrow__InvalidDuration();
    error PaymentEscrow__EscrowAlreadyExistsForPayment();
    error PaymentEscrow__EscrowExpired();
    error PaymentEscrow__TokenTransferFailed();
    error PaymentEscrow__EmergencyRefundNotAllowed();
    error PaymentEscrow__EscrowNotExpired();
    error PaymentEscrow__DurationTooShort();
    error PaymentEscrow__DurationTooLong();
    error PaymentEscrow__InsufficientFees();

    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice State of the escrow
     * ACTIVE: Escrow is active and funds are held
     * RELEASED: Funds have been released to the payee
     * REFUNDED: Funds have been refunded to the payer
     * EXPIRED: Escrow has expired without action
     */
    enum EscrowState {
        ACTIVE,
        RELEASED,
        REFUNDED,
        EXPIRED
    }

    /*//////////////////////////////////////////////////////////////
                           STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Details of an escrow
     * @param escrowId Unique identifier for the escrow
     * @param paymentId Associated payment identifier
     * @param payer Address of the payer
     * @param payee Address of the payee
     * @param amount Amount held in escrow
     * @param fee Fee associated with the escrow
     */
    struct EscrowDetails {
        uint256 escrowId;
        uint256 paymentId;
        address payer;
        address payee;
        uint256 amount;
        uint256 fee;
        EscrowState state;
        uint256 createdAt;
        uint256 expiryTime;
        bool emergencyRefundable;
    }

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new escrow is created
    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed paymentId,
        address indexed payer,
        address payee,
        uint256 amount,
        uint256 fee
    );

    /// @notice Emitted when escrow funds are released to the payee
    event EscrowReleased(uint256 indexed escrowId, address indexed payee, uint256 amount);

    /// @notice Emitted when escrow funds are refunded to the payer
    event EscrowRefunded(uint256 indexed escrowId, address indexed payer, uint256 amount);

    /// @notice Emitted when an escrow expires without action
    event EscrowExpired(uint256 indexed escrowId, uint256 timestamp);

    /// @notice Emitted when an emergency refund is processed by an authorized entity
    event EmergencyEscrowRefund(uint256 indexed escrowId, address indexed authority, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                        ESCROW FUNCTIONALITYS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Create a new escrow for a payment
     * @param paymentId Identifier for the associated payment
     * @param payer Address of the payer
     * @param payee Address of the payee
     * @param amount Amount held in escrow
     * @param duration Duration for which the escrow is active
     */
    function createEscrow(uint256 paymentId, address payer, address payee, uint256 amount, uint256 duration)
        external
        payable
        returns (uint256 escrowId);

    /**
     * @notice Release funds from escrow to the payee
     * @param escrowId Identifier of the escrow to release funds from
     */
    function releaseEscrow(uint256 escrowId) external;

    /**
     * @notice Refund funds from escrow to the payer
     * @param escrowId Identifier of the escrow to refund funds from
     */
    function refundEscrow(uint256 escrowId) external;

    /**
     * @notice Process an emergency refund for an escrow
     * @param escrowId Identifier of the escrow to refund funds from
     */
    function emergencyRefund(uint256 escrowId) external;

    /**
     * @notice Extend the duration of an existing escrow
     * @param escrowId Identifier of the escrow to extend
     * @param additionalTime Additional time to extend the escrow by
     */
    function extendEscrow(uint256 escrowId, uint256 additionalTime) external;

    /**
     * @notice Process an expired escrow
     * @param escrowId Identifier of the escrow to process
     */
    function processExpiredEscrow(uint256 escrowId) external;

    /**
     * @notice Set the payment protocol contract address
     * @param _paymentProtocol Address of the payment protocol contract
     */
    function setPaymentProtocol(address _paymentProtocol) external;

    /**
     * @notice Set the emergency refund authority address
     * @param _authority Address of the emergency refund authority
     */
    function setEmergencyRefundAuthority(address _authority) external;

    /**
     * @notice Set the escrow fee rate
     * @param _feeRate New fee rate for escrows
     */
    function setEscrowFeeRate(uint256 _feeRate) external;

    /**
     * @notice Set the default duration for escrows
     * @param _duration New default duration for escrows
     */
    function setDefaultEscrowDuration(uint256 _duration) external;

    /**
     * @notice Withdraw accumulated fees
     * @param recipient Address to receive the withdrawn fees
     * @param amount Amount of fees to withdraw
     */
    function withdrawFees(address recipient, uint256 amount) external;

    /**
     * @notice Batch process multiple expired escrows
     * @param escrowIds Array of escrow identifiers to process
     */
    function batchProcessExpiredEscrows(uint256[] calldata escrowIds) external;

    /**
     * @notice Pause the escrow contract
     */
    function pause() external;

    /**
     * @notice Unpause the escrow contract
     */
    function unpause() external;
    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get details of a specific escrow
     * @param escrowId Identifier of the escrow
     * @return EscrowDetails Struct containing details of the escrow
     */
    function getEscrowDetails(uint256 escrowId) external view returns (EscrowDetails memory);

    /**
     * @notice Get escrow ID associated with a specific payment
     * @param paymentId Identifier of the payment
     * @return escrowId Identifier of the associated escrow
     */
    function getEscrowByPayment(uint256 paymentId) external view returns (uint256 escrowId);

    /**
     * @notice Check if an escrow has expired
     * @param escrowId Identifier of the escrow
     * @return bool True if the escrow has expired, false otherwise
     */
    function isEscrowExpired(uint256 escrowId) external view returns (bool);

    /**
     * @notice Get the current balance held in a specific escrow
     * @param escrowId Identifier of the escrow
     * @return uint256 Current balance in the escrow
     */
    function getEscrowBalance(uint256 escrowId) external view returns (uint256);

    /**
     * @notice Calculate the fee for a given escrow amount
     * @param amount The amount to calculate the fee for
     * @return uint256 The calculated fee
     */
    function calculateEscrowFee(uint256 amount) external view returns (uint256);

    /**
     * @notice Get the total available fees for withdrawal
     * @return uint256 Total available fees
     */
    function getAvailableFees() external view returns (uint256);
}
