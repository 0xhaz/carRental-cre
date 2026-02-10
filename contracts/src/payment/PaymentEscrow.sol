// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPaymentEscrow} from "../interfaces/payment/IPaymentEscrow.sol";

/**
 * @title PaymentEscrow
 * @dev Secure fund holding system for payment processes
 */
contract PaymentEscrow is IPaymentEscrow, Ownable, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IERC20 public immutable regToken;
    address public paymentProtocol;

    mapping(uint256 => EscrowDetails) private _escrows;
    mapping(uint256 paymentId => uint256 escrowId) private _paymentToEscrow;

    uint256 private _nextEscrowId = 1;
    uint256 public totalEscrows;
    uint256 public totalEscrowedAmount;

    uint256 public escrowFeeRate = 10; // 0.1% fee
    uint256 public constant MAX_FEE_RATE = 1000; // 10% max fee
    uint256 public constant FEE_DENOMINATOR = 10_000; // 100% = 10,000 basis points

    address public emergencyRefundAuthority;
    uint256 public defaultEscrowDuration = 31 days; // 24h confirmations + 30 days expiry

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyPaymentProtocol() {
        if (msg.sender != paymentProtocol) revert PaymentEscrow__OnlyPaymentProtocol();
        _;
    }

    modifier validEscrowId(uint256 escrowId) {
        if (escrowId == 0 && escrowId < _nextEscrowId) revert PaymentEscrow__InvalidEscrowId();
        _;
    }

    modifier onlyEmergencyAuthority() {
        if (msg.sender != emergencyRefundAuthority || msg.sender != owner() || msg.sender != paymentProtocol) {
            revert PaymentEscrow__OnlyEmergencyAuthority();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _regToken, address _paymentProtocol) Ownable(msg.sender) {
        if (_regToken == address(0)) revert PaymentEscrow__InvalidTokenAddress();
        if (_paymentProtocol == address(0)) revert PaymentEscrow__InvalidPaymentProtocolAddress();

        regToken = IERC20(_regToken);
        paymentProtocol = _paymentProtocol;
        emergencyRefundAuthority = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IPaymentEscrow
    function createEscrow(uint256 paymentId, address payer, address payee, uint256 amount, uint256 duration)
        external
        override
        onlyPaymentProtocol
        whenNotPaused
        returns (uint256 escrowId)
    {
        if (payer == address(0) || payee == address(0)) {
            revert PaymentEscrow__InvalidAddress();
        }
        if (amount == 0) {
            revert PaymentEscrow__InvalidAmount();
        }
        if (duration == 0) revert PaymentEscrow__InvalidDuration();
        if (_paymentToEscrow[paymentId] != 0) {
            revert PaymentEscrow__EscrowAlreadyExistsForPayment();
        }

        // Calculate fee
        uint256 fee = calculateEscrowFee(amount);
        uint256 totalAmount = amount + fee;

        // Verify tokens are received
        if (regToken.balanceOf(address(this)) <= totalAmount) {
            revert PaymentEscrow__InsufficientEscrowAmount();
        }

        // Create escrow
        escrowId = _nextEscrowId++;
        EscrowDetails storage escrow = _escrows[escrowId];

        escrow.escrowId = escrowId;
        escrow.paymentId = paymentId;
        escrow.payer = payer;
        escrow.payee = payee;
        escrow.amount = amount;
        escrow.fee = fee;
        escrow.state = EscrowState.ACTIVE;
        escrow.createdAt = block.timestamp;
        escrow.expiryTime = block.timestamp + duration;
        escrow.emergencyRefundable = true;

        // Map payment to escrow
        _paymentToEscrow[paymentId] = escrowId;
        totalEscrows += 1;
        totalEscrowedAmount += totalAmount;

        emit EscrowCreated(escrowId, paymentId, payer, payee, amount, fee);
    }

    /// @inheritdoc IPaymentEscrow
    function releaseEscrow(uint256 escrowId)
        external
        override
        validEscrowId(escrowId)
        onlyPaymentProtocol
        nonReentrant
    {
        EscrowDetails storage escrow = _escrows[escrowId];
        if (escrow.state != EscrowState.ACTIVE) {
            revert PaymentEscrow__EscrowNotActive();
        }
        if (isEscrowExpired(escrowId)) {
            revert PaymentEscrow__EscrowExpired();
        }

        // Update state
        escrow.state = EscrowState.RELEASED;
        totalEscrowedAmount -= (escrow.amount + escrow.fee);

        // Transfer funds to payee
        bool success = regToken.transfer(escrow.payee, escrow.amount);
        if (!success) {
            revert PaymentEscrow__TokenTransferFailed();
        }

        emit EscrowReleased(escrowId, escrow.payee, escrow.amount);
    }

    /// @inheritdoc IPaymentEscrow
    function refundEscrow(uint256 escrowId) external override validEscrowId(escrowId) onlyPaymentProtocol nonReentrant {
        EscrowDetails storage escrow = _escrows[escrowId];
        if (escrow.state != EscrowState.ACTIVE) {
            revert PaymentEscrow__EscrowNotActive();
        }

        // Update state
        escrow.state = EscrowState.REFUNDED;
        totalEscrowedAmount -= (escrow.amount + escrow.fee);

        // Refund funds to payer
        uint256 refundAmount = escrow.amount + escrow.fee;
        bool success = regToken.transfer(escrow.payer, refundAmount);
        if (!success) {
            revert PaymentEscrow__TokenTransferFailed();
        }

        emit EscrowRefunded(escrowId, escrow.payer, refundAmount);
    }

    /// @inheritdoc IPaymentEscrow
    function emergencyRefund(uint256 escrowId)
        external
        override
        validEscrowId(escrowId)
        onlyEmergencyAuthority
        nonReentrant
    {
        EscrowDetails storage escrow = _escrows[escrowId];

        if (escrow.state != EscrowState.ACTIVE) {
            revert PaymentEscrow__EscrowNotActive();
        }
        if (!escrow.emergencyRefundable) {
            revert PaymentEscrow__EmergencyRefundNotAllowed();
        }

        // Update state
        escrow.state = EscrowState.REFUNDED;
        totalEscrowedAmount -= (escrow.amount + escrow.fee);

        // Emergency refund to payer
        uint256 refundAmount = escrow.amount + escrow.fee;
        bool success = regToken.transfer(escrow.payer, refundAmount);
        if (!success) {
            revert PaymentEscrow__TokenTransferFailed();
        }

        emit EmergencyEscrowRefund(escrowId, msg.sender, refundAmount);
    }

    /// @inheritdoc IPaymentEscrow
    function extendEscrow(uint256 escrowId, uint256 additionalTime)
        external
        override
        validEscrowId(escrowId)
        onlyPaymentProtocol
    {
        EscrowDetails storage escrow = _escrows[escrowId];
        if (escrow.state != EscrowState.ACTIVE) {
            revert PaymentEscrow__EscrowNotActive();
        }
        if (additionalTime == 0) {
            revert PaymentEscrow__InvalidDuration();
        }

        escrow.expiryTime += additionalTime;
    }

    /// @inheritdoc IPaymentEscrow
    function processExpiredEscrow(uint256 escrowId) external override validEscrowId(escrowId) nonReentrant {
        EscrowDetails storage escrow = _escrows[escrowId];
        if (escrow.state != EscrowState.ACTIVE) {
            revert PaymentEscrow__EscrowNotActive();
        }
        if (!isEscrowExpired(escrowId)) {
            revert PaymentEscrow__EscrowNotExpired();
        }

        // Update state
        escrow.state = EscrowState.EXPIRED;
        totalEscrowedAmount -= (escrow.amount + escrow.fee);

        // Auto-refund to payer
        uint256 refundAmount = escrow.amount + escrow.fee;
        bool success = regToken.transfer(escrow.payer, refundAmount);
        if (!success) {
            revert PaymentEscrow__TokenTransferFailed();
        }

        emit EscrowExpired(escrowId, block.timestamp);
        emit EscrowRefunded(escrowId, escrow.payer, refundAmount);
    }

    /// @inheritdoc IPaymentEscrow
    function setPaymentProtocol(address _paymentProtocol) external override onlyOwner {
        if (_paymentProtocol == address(0)) {
            revert PaymentEscrow__InvalidPaymentProtocolAddress();
        }
        paymentProtocol = _paymentProtocol;
    }

    /// @inheritdoc IPaymentEscrow
    function setEmergencyRefundAuthority(address authority) external override onlyOwner {
        if (authority == address(0)) {
            revert PaymentEscrow__InvalidAddress();
        }
        emergencyRefundAuthority = authority;
    }

    /// @inheritdoc IPaymentEscrow
    function setEscrowFeeRate(uint256 feeRate) external override onlyOwner {
        if (feeRate >= MAX_FEE_RATE) {
            revert PaymentEscrow__InvalidAmount();
        }
        escrowFeeRate = feeRate;
    }

    /// @inheritdoc IPaymentEscrow
    function setDefaultEscrowDuration(uint256 duration) external override onlyOwner {
        if (duration <= 1 days) revert PaymentEscrow__DurationTooShort();
        if (duration >= 90 days) revert PaymentEscrow__DurationTooLong();
        defaultEscrowDuration = duration;
    }

    /// @inheritdoc IPaymentEscrow
    function withdrawFees(address recipient, uint256 amount) external override onlyOwner nonReentrant {
        if (recipient == address(0)) {
            revert PaymentEscrow__InvalidAddress();
        }
        if (amount == 0) {
            revert PaymentEscrow__InvalidAmount();
        }

        uint256 availableFees = regToken.balanceOf(address(this)) - totalEscrowedAmount;
        if (amount >= availableFees) {
            revert PaymentEscrow__InsufficientFees();
        }

        bool success = regToken.transfer(recipient, amount);
        if (!success) {
            revert PaymentEscrow__TokenTransferFailed();
        }
    }

    /// @inheritdoc IPaymentEscrow
    function batchProcessExpiredEscrows(uint256[] calldata escrowIds) external override {
        for (uint256 i = 0; i < escrowIds.length; i++) {
            if (isEscrowExpired(escrowIds[i]) && _escrows[escrowIds[i]].state == EscrowState.ACTIVE) {
                this.processExpiredEscrow(escrowIds[i]);
            }
        }
    }

    /// @inheritdoc IPaymentEscrow
    function pause() external onlyOwner {
        _pause();
    }

    /// @inheritdoc IPaymentEscrow
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc IPaymentEscrow
    function getEscrowDetails(uint256 escrowId)
        external
        view
        override
        validEscrowId(escrowId)
        returns (EscrowDetails memory)
    {
        return _escrows[escrowId];
    }

    /// @inheritdoc IPaymentEscrow
    function getEscrowByPayment(uint256 paymentId) external view override returns (uint256 escrowId) {
        escrowId = _paymentToEscrow[paymentId];
    }

    /// @inheritdoc IPaymentEscrow
    function isEscrowExpired(uint256 escrowId) public view override validEscrowId(escrowId) returns (bool) {
        return block.timestamp > _escrows[escrowId].expiryTime;
    }

    /// @inheritdoc IPaymentEscrow
    function getEscrowBalance(uint256 escrowId) external view override validEscrowId(escrowId) returns (uint256) {
        EscrowDetails storage escrow = _escrows[escrowId];
        if (escrow.state == EscrowState.ACTIVE) {
            return escrow.amount + escrow.fee;
        }
        return 0;
    }

    /// @inheritdoc IPaymentEscrow
    function calculateEscrowFee(uint256 amount) public view override returns (uint256) {
        return (amount * escrowFeeRate) / FEE_DENOMINATOR;
    }

    /// @inheritdoc IPaymentEscrow
    function getAvailableFees() external view override returns (uint256) {
        uint256 totalBalance = regToken.balanceOf(address(this));
        return totalBalance > totalEscrowedAmount ? totalBalance - totalEscrowedAmount : 0;
    }
}
