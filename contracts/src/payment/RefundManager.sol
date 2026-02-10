// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IRefundManager} from "../interfaces/payment/IRefundManager.sol";
import {IPaymentEscrow} from "../interfaces/payment/IPaymentEscrow.sol";
import {IPaymentProtocol} from "../interfaces/payment/IPaymentProtocol.sol";

/**
 * @title RefundManager
 * @dev Manages different types of refunds within the payment ecosystem
 */
contract RefundManager is IRefundManager, Ownable, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IPaymentProtocol public paymentProtocol;
    IPaymentEscrow public paymentEscrow;

    mapping(uint256 refundId => RefundRequest) private _refundRequests;
    mapping(uint256 paymentId => uint256[] refundIds) private _paymentRefunds;
    mapping(address requester => uint256[] refundIds) private _requesterRefunds;

    uint256 private _nextRefundId = 1;
    uint256 public totalRefunds;
    uint256 public totalRefundAmount;

    mapping(address admin => bool isAuthorized) public authorizedProcessors;
    address public emergencyRefundAuthority;

    uint256 public refundProcessingDelay = 1 hours; // Delay before processing refunds
    uint256 public maxRefundWindow = 30 days; // Maximum window to request a refund

    /*//////////////////////////////////////////////////////////////
                        MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyPaymentProtocol() {
        if (msg.sender != address(paymentProtocol)) revert RefundManager__OnlyPaymentProtocol();
        _;
    }

    modifier onlyAuthorizedProcessor() {
        if (!authorizedProcessors[msg.sender] || msg.sender != owner()) revert RefundManager__NotAuthorizedProcessor();
        _;
    }

    modifier onlyEmergencyAuthority() {
        if (msg.sender != emergencyRefundAuthority || msg.sender != owner()) {
            revert RefundManager__OnlyEmergencyAuthority();
        }
        _;
    }

    modifier validRefundId(uint256 refundId) {
        if (refundId == 0 && refundId > _nextRefundId) revert RefundManager__InvalidRefundId();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _paymentProtocol, address _paymentEscrow) Ownable(msg.sender) {
        if (_paymentProtocol == address(0) || _paymentEscrow == address(0)) {
            revert RefundManager__InvalidAddress();
        }

        paymentProtocol = IPaymentProtocol(_paymentProtocol);
        paymentEscrow = IPaymentEscrow(_paymentEscrow);
        emergencyRefundAuthority = msg.sender;
        authorizedProcessors[msg.sender] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRefundManager
    function requestRefund(
        uint256 paymentId,
        RefundType refundType,
        RefundReason reason,
        string calldata description,
        bytes32 evidenceHash
    ) external override whenNotPaused returns (uint256 refundId) {
        if (!canRequestRefund(paymentId, msg.sender)) {
            revert RefundManager__CannotRequestRefund();
        }
        if (bytes(description).length == 0) revert RefundManager__DescriptionRequired();

        // Get payment details
        IPaymentProtocol.Payment memory payment = paymentProtocol.getPayment(paymentId);
        if (payment.paymentId == 0) revert RefundManager__InvalidPaymentId();

        // Validate refund eligibility
        if (!isRefundEligible(paymentId, refundType)) revert RefundManager__RefundNotEligible();

        refundId = _nextRefundId++;
        RefundRequest storage refund = _refundRequests[refundId];

        refund.refundId = refundId;
        refund.paymentId = paymentId;
        refund.requester = msg.sender;
        refund.recipient = payment.payer;
        refund.amount = payment.amount;
        refund.refundType = refundType;
        refund.reason = reason;
        refund.description = description;
        refund.requestedAt = block.timestamp;
        refund.processedAt = 0;
        refund.approved = false;
        refund.processed = false;
        refund.evidenceHash = evidenceHash;

        // Update mappings
        _paymentRefunds[paymentId].push(refundId);
        _requesterRefunds[msg.sender].push(refundId);
        totalRefunds += 1;

        // Auto-approve certain refund types
        if (refundType == RefundType.AUTOMATIC) {
            refund.approved = true;
        }

        emit RefundRequested(refundId, paymentId, msg.sender, refundType, reason, payment.amount);

        // Process automatic refunds immediately
        if (refundType == RefundType.AUTOMATIC) {
            _processRefund(refundId);
        }
    }

    /// @inheritdoc IRefundManager
    function approveRefund(uint256 refundId) external override validRefundId(refundId) onlyAuthorizedProcessor {
        RefundRequest storage refund = _refundRequests[refundId];
        if (refund.approved) revert RefundManager__RefundAlreadyApproved();
        if (refund.processed) revert RefundManager__RefundAlreadyProcessed();

        refund.approved = true;

        emit RefundApproved(refundId, msg.sender, block.timestamp);

        // Process the refund after a delay
        if (_canProcessRefund(refundId)) {
            _processRefund(refundId);
        }
    }

    /// @inheritdoc IRefundManager
    function rejectRefund(uint256 refundId, string calldata reason)
        external
        override
        validRefundId(refundId)
        onlyAuthorizedProcessor
    {
        RefundRequest storage refund = _refundRequests[refundId];
        if (refund.approved) revert RefundManager__RefundAlreadyApproved();
        if (refund.processed) revert RefundManager__RefundAlreadyProcessed();
        if (bytes(reason).length == 0) revert RefundManager__RejectionReasonRequired();

        refund.processed = true;
        refund.processedAt = block.timestamp;

        emit RefundRejected(refundId, msg.sender, reason);
    }

    /// @inheritdoc IRefundManager
    function processRefund(uint256 refundId) external override validRefundId(refundId) nonReentrant {
        if (!_canProcessRefund(refundId)) revert RefundManager__CannotProcessRefund();
        _processRefund(refundId);
    }

    /// @inheritdoc IRefundManager
    function emergencyRefund(uint256 paymentId, address recipient, RefundReason reason, string calldata description)
        external
        override
        onlyEmergencyAuthority
        returns (uint256 refundId)
    {
        if (recipient == address(0)) revert RefundManager__InvalidAddress();
        if (bytes(description).length == 0) revert RefundManager__DescriptionRequired();

        // Get payment details
        IPaymentProtocol.Payment memory payment = paymentProtocol.getPayment(paymentId);
        if (payment.paymentId == 0) revert RefundManager__InvalidPaymentId();

        // Create emergency refund request
        refundId = _nextRefundId++;
        RefundRequest storage refund = _refundRequests[refundId];

        refund.refundId = refundId;
        refund.paymentId = paymentId;
        refund.requester = msg.sender;
        refund.recipient = recipient;
        refund.amount = payment.amount;
        refund.refundType = RefundType.EMERGENCY;
        refund.reason = reason;
        refund.description = description;
        refund.requestedAt = block.timestamp;
        refund.approved = true;
        refund.processed = false;
        refund.evidenceHash = keccak256(abi.encodePacked(description));

        // Update mappings
        _paymentRefunds[paymentId].push(refundId);
        _requesterRefunds[msg.sender].push(refundId);
        totalRefunds += 1;

        emit RefundRequested(refundId, paymentId, msg.sender, RefundType.EMERGENCY, reason, payment.amount);

        _processRefund(refundId);

        emit EmergencyRefundExecuted(refundId, msg.sender, refund.amount);
    }

    /// @inheritdoc IRefundManager
    function processAutomaticRefund(uint256 paymentId, RefundReason reason)
        external
        override
        onlyPaymentProtocol
        returns (uint256 refundId)
    {
        // Get payment details
        IPaymentProtocol.Payment memory payment = paymentProtocol.getPayment(paymentId);
        if (payment.paymentId == 0) revert RefundManager__InvalidPaymentId();

        // Create automatic refund request
        refundId = _nextRefundId++;
        RefundRequest storage refund = _refundRequests[refundId];

        refund.refundId = refundId;
        refund.paymentId = paymentId;
        refund.requester = address(paymentProtocol);
        refund.recipient = payment.payer;
        refund.amount = payment.amount;
        refund.refundType = RefundType.AUTOMATIC;
        refund.reason = reason;
        refund.description = "Automatic refund";
        refund.requestedAt = block.timestamp;
        refund.approved = true;
        refund.processed = false;
        refund.evidenceHash = bytes32(0);

        // Update mappings
        _paymentRefunds[paymentId].push(refundId);
        _requesterRefunds[address(paymentProtocol)].push(refundId);
        totalRefunds += 1;

        emit RefundRequested(
            refundId, paymentId, address(paymentProtocol), RefundType.AUTOMATIC, reason, payment.amount
        );

        _processRefund(refundId);
    }

    /// @inheritdoc IRefundManager
    function getRefundRequest(uint256 refundId)
        public
        view
        override
        validRefundId(refundId)
        returns (RefundRequest memory)
    {
        return _refundRequests[refundId];
    }

    /// @inheritdoc IRefundManager
    function getRefundsByPayment(uint256 paymentId) external view override returns (uint256[] memory) {
        return _paymentRefunds[paymentId];
    }

    /// @inheritdoc IRefundManager
    function getRefundsByRequester(address requester) external view override returns (uint256[] memory) {
        return _requesterRefunds[requester];
    }

    /// @inheritdoc IRefundManager
    function canRequestRefund(uint256 paymentId, address requester) public view override returns (bool) {
        IPaymentProtocol.Payment memory payment = paymentProtocol.getPayment(paymentId);
        if (payment.paymentId == 0) {
            return false;
        }

        // Only the payer can request a refund
        if (payment.payer != requester && payment.payee != requester) {
            return false;
        }

        // Check if within the refund window
        if (block.timestamp > payment.createdAt + maxRefundWindow) {
            return false;
        }

        // Check payment state
        IPaymentProtocol.PaymentState state = paymentProtocol.getPaymentState(paymentId);
        return state != IPaymentProtocol.PaymentState.REFUNDED;
    }

    /// @inheritdoc IRefundManager
    function isRefundEligible(uint256 paymentId, RefundType refundType) public view override returns (bool) {
        IPaymentProtocol.PaymentState state = paymentProtocol.getPaymentState(paymentId);

        if (refundType == RefundType.AUTOMATIC) {
            return state == IPaymentProtocol.PaymentState.PENDING || state == IPaymentProtocol.PaymentState.EXPIRED;
        }

        if (refundType == RefundType.MANUAL) {
            return state == IPaymentProtocol.PaymentState.CONFIRMED;
        }

        if (refundType == RefundType.DISPUTE) {
            return state == IPaymentProtocol.PaymentState.DISPUTED;
        }

        if (refundType == RefundType.EMERGENCY) {
            return state != IPaymentProtocol.PaymentState.REFUNDED;
        }

        return false;
    }

    /// @inheritdoc IRefundManager
    function getRefundAmount(uint256 paymentId) external view override returns (uint256) {
        IPaymentProtocol.Payment memory payment = paymentProtocol.getPayment(paymentId);
        return payment.amount;
    }

    /// @inheritdoc IRefundManager
    function setAuthorizedProcessor(address processor, bool authorized) external onlyOwner {
        if (processor == address(0)) revert RefundManager__InvalidAddress();
        authorizedProcessors[processor] = authorized;
    }

    /// @inheritdoc IRefundManager
    function setEmergencyRefundAuthority(address authority) external onlyOwner {
        if (authority == address(0)) revert RefundManager__InvalidAddress();
        emergencyRefundAuthority = authority;
    }

    /// @inheritdoc IRefundManager
    function setRefundProcessingDelay(uint256 delay) external onlyOwner {
        if (delay >= 7 days) revert RefundManager__DelayTooLong();
        refundProcessingDelay = delay;
    }

    /// @inheritdoc IRefundManager
    function setMaxRefundWindow(uint256 window) external onlyOwner {
        if (window <= 7 days) revert RefundManager__WindowTooShort();
        if (window >= 90 days) revert RefundManager__WindowTooLong();
        maxRefundWindow = window;
    }

    /// @inheritdoc IRefundManager
    function pause() external onlyOwner {
        _pause();
    }

    /// @inheritdoc IRefundManager
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function _processRefund(uint256 refundId) internal {
        RefundRequest storage refund = _refundRequests[refundId];
        if (!refund.approved) revert RefundManager__RefundNotApproved();
        if (refund.processed) revert RefundManager__RefundAlreadyProcessed();

        // Mark as processed
        refund.processed = true;
        refund.processedAt = block.timestamp;
        totalRefundAmount += refund.amount;

        // Execute refund through payment protocol
        IPaymentProtocol.RefundType protocolRefundType;
        if (refund.refundType == RefundType.AUTOMATIC) {
            protocolRefundType = IPaymentProtocol.RefundType.AUTOMATIC;
        } else if (refund.refundType == RefundType.MANUAL) {
            protocolRefundType = IPaymentProtocol.RefundType.MANUAL;
        } else if (refund.refundType == RefundType.DISPUTE) {
            protocolRefundType = IPaymentProtocol.RefundType.DISPUTE;
        } else {
            protocolRefundType = IPaymentProtocol.RefundType.EMERGENCY;
        }

        paymentProtocol.processRefund(refund.paymentId, protocolRefundType);

        emit RefundProcessed(refundId, refund.recipient, refund.amount, block.timestamp);
    }

    function _canProcessRefund(uint256 refundId) internal view returns (bool) {
        RefundRequest storage refund = _refundRequests[refundId];

        if (!refund.approved || refund.processed) {
            return false;
        }

        if (refund.refundType == RefundType.MANUAL) {
            return block.timestamp >= refund.requestedAt + refundProcessingDelay;
        }

        return true;
    }
}
