// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IPaymentProtocol} from "../interfaces/payment/IPaymentProtocol.sol";
import {IPaymentEscrow} from "../interfaces/payment/IPaymentEscrow.sol";
import {IRefundManager} from "../interfaces/payment/IRefundManager.sol";
import {IDisputeResolver} from "../interfaces/payment/IDisputeResolver.sol";
import {IComplianceRules} from "../interfaces/compliance/IComplianceRules.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {IParticipantTypeRegistry} from "../interfaces/erc3643/IParticipantTypeRegistry.sol";
import {IInvestorRequestManager} from "../interfaces/investor/IInvestorRequestManager.sol";
import {IERC3643} from "../interfaces/erc3643/IERC3643.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title RegShieldPaymentProtocol
 * @dev Investment payment protocol for rental car tokenization platform
 * @notice Handles capital raising, investment transactions, and milestone-based fund releases
 */
contract RegShieldPaymentProtocol is IPaymentProtocol, Ownable, ReentrancyGuard, Pausable {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IPaymentEscrow public paymentEscrow;
    IRefundManager public refundManager;
    IDisputeResolver public disputeResolver;
    IComplianceRules public complianceRules;
    IIdentityRegistry public identityRegistry;
    IParticipantTypeRegistry public participantTypeRegistry;
    IInvestorRequestManager public investorRequestManager;

    PaymentSettings public paymentSettings;

    mapping(uint256 => Payment) private _payments;
    mapping(address => uint256[]) private _payerPayments;
    mapping(address => uint256[]) private _payeePayments;

    /// @notice Mapping from vehicle ID to payment IDs
    mapping(uint256 => uint256[]) private _vehiclePayments;

    /// @notice Mapping from payment ID to vehicle ID (for investment payments)
    mapping(uint256 => uint256) private _paymentToVehicle;

    /// @notice Total invested amount per vehicle
    mapping(uint256 => uint256) public vehicleInvestmentTotal;

    /// @notice VehicleNFT contract reference (for ownership verification)
    IERC721 public vehicleNFT;

    /// @notice Rentor co-investment amount per vehicle (vehicleId => amount)
    mapping(uint256 => uint256) public rentorCoInvestment;

    /// @notice Milestone tracking for payments (legacy per-payment)
    mapping(uint256 => MilestoneStatus) public paymentMilestones;

    /// @notice Vehicle-level milestone tracking (vehicleId => milestones)
    mapping(uint256 => VehicleMilestoneStatus) public vehicleMilestones;

    /// @notice Token addresses for each vehicle (assetToken + revenueToken)
    struct VehicleTokens {
        address assetToken;
        address revenueToken;
    }

    /// @notice Mapping from vehicle ID to its token pair
    mapping(uint256 => VehicleTokens) public vehicleTokens;

    /// @notice Authorized operators that can call completeMilestone (e.g. CRE PaymentReceiver)
    mapping(address => bool) public authorizedOperators;

    uint256 private _nextPaymentId = 1;
    uint256 public totalPayments;
    uint256 public totalVolume;
    uint256 public totalInvestmentVolume;

    uint256 public constant MAX_FEE_RATE = 1000; // Max fee rate in basis points (10%)
    uint256 public constant FEE_RATE_DENOMINATOR = 10000; // Denominator for fee rate calculations

    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Milestone tracking for investment payments
     * @param vehicleIdentified Whether vehicle has been identified
     * @param purchaseVerified Whether purchase agreement is verified
     * @param insuranceObtained Whether insurance is obtained
     * @param registrationCompleted Whether registration is completed
     * @param fundsReleased Whether funds have been released
     * @param vehicleId ID of the vehicle
     */
    struct MilestoneStatus {
        bool vehicleIdentified;
        bool purchaseVerified;
        bool insuranceObtained;
        bool registrationCompleted;
        bool fundsReleased;
        uint256 vehicleId;
        uint256 completedAt;
    }

    /**
     * @notice Vehicle-level milestone tracking
     * @dev Milestones are vehicle events (purchase, insurance, registration) — not per-investor
     */
    struct VehicleMilestoneStatus {
        bool vehicleIdentified;
        bool purchaseVerified;
        bool insuranceObtained;
        bool registrationCompleted;
        bool allFundsReleased;
        uint256 completedAt;
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a vehicle investment payment is initiated
    event VehicleInvestmentInitiated(
        uint256 indexed paymentId, uint256 indexed vehicleId, address indexed investor, uint256 amount
    );

    /// @notice Emitted when a milestone is completed
    event MilestoneCompleted(uint256 indexed paymentId, string milestoneName, uint256 timestamp);

    /// @notice Emitted when investment funds are released
    event InvestmentFundsReleased(uint256 indexed paymentId, uint256 indexed vehicleId, uint256 amount);

    /// @notice Emitted when tokens are minted to an investor after milestone completion
    event InvestorTokensMinted(
        uint256 indexed paymentId, uint256 indexed vehicleId, address indexed investor, uint256 amount
    );

    /// @notice Emitted when vehicle tokens are registered
    event VehicleTokensRegistered(uint256 indexed vehicleId, address assetToken, address revenueToken);

    /// @notice Emitted when participant type registry is updated
    event ParticipantTypeRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /// @notice Emitted when investor request manager is updated
    event InvestorRequestManagerUpdated(address indexed oldManager, address indexed newManager);

    /// @notice Emitted when an operator is authorized or revoked
    event AuthorizedOperatorUpdated(address indexed operator, bool authorized);

    /// @notice Emitted when all PENDING payments for a vehicle campaign are batch-cancelled
    event CampaignPaymentsBatchCancelled(uint256 indexed vehicleId, uint256 refundedCount);

    /// @notice Emitted when a vehicle-level milestone is completed
    event VehicleMilestoneCompleted(uint256 indexed vehicleId, string milestoneName, uint256 timestamp);

    /// @notice Emitted when all vehicle milestones complete and all payments are batch-released
    event VehicleMilestonesFullyCompleted(uint256 indexed vehicleId, uint256 releasedCount, uint256 timestamp);

    /// @notice Emitted when a rentor co-investment is initiated
    event RentorCoInvestmentInitiated(
        uint256 indexed paymentId, uint256 indexed vehicleId, address indexed rentor, uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier validPaymentId(uint256 paymentId) {
        if (paymentId == 0 || paymentId >= _nextPaymentId) revert PaymentProtocol__InvalidPaymentId();
        _;
    }

    modifier onlyPaymentParty(uint256 paymentId) {
        Payment storage payment = _payments[paymentId];
        if (msg.sender != payment.payer && msg.sender != payment.payee) {
            revert PaymentProtocol__InvalidAddress();
        }
        _;
    }

    modifier onlyTokenIssuer() {
        if (msg.sender != owner()) {
            revert PaymentProtocol__OnlyTokenIssuer();
        }
        _;
    }

    modifier onlyOwnerOrOperator() {
        if (msg.sender != owner() && !authorizedOperators[msg.sender]) {
            revert PaymentProtocol__UnauthorizedOperator();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _complianceRules, address _identityRegistry) Ownable(msg.sender) {
        if (_complianceRules == address(0) || _identityRegistry == address(0)) {
            revert PaymentProtocol__InvalidAddress();
        }

        complianceRules = IComplianceRules(_complianceRules);
        identityRegistry = IIdentityRegistry(_identityRegistry);

        // Initialize default payment settings
        paymentSettings = PaymentSettings({
            confirmationPeriod: 24 hours,
            disputeWindow: 7 days,
            refundWindow: 30 days,
            maxPaymentAmount: 10 ether,
            minPaymentAmount: 0.001 ether,
            escrowFeeRate: 10
        });
    }

    /// @inheritdoc IPaymentProtocol
    function setPaymentEscrow(address _paymentEscrow) external onlyOwner {
        if (_paymentEscrow == address(0)) {
            revert PaymentProtocol__InvalidAddress();
        }
        paymentEscrow = IPaymentEscrow(_paymentEscrow);
    }

    /// @inheritdoc IPaymentProtocol
    function setRefundManager(address _refundManager) external onlyOwner {
        if (_refundManager == address(0)) {
            revert PaymentProtocol__InvalidAddress();
        }
        refundManager = IRefundManager(_refundManager);
    }

    /// @inheritdoc IPaymentProtocol
    function setDisputeResolver(address _disputeResolver) external onlyOwner {
        if (_disputeResolver == address(0)) {
            revert PaymentProtocol__InvalidAddress();
        }
        disputeResolver = IDisputeResolver(_disputeResolver);
    }

    /**
     * @notice Authorize or revoke an operator for milestone completion
     * @param operator Address to authorize (e.g. CRE PaymentReceiver)
     * @param authorized Whether to grant or revoke access
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert PaymentProtocol__InvalidAddress();
        authorizedOperators[operator] = authorized;
        emit AuthorizedOperatorUpdated(operator, authorized);
    }

    /// @inheritdoc IPaymentProtocol
    function initiatePayment(address payee, uint256 amount, string calldata reason)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (uint256 paymentId)
    {
        if (payee == address(0)) revert PaymentProtocol__InvalidAddress();
        if (payee == msg.sender) revert PaymentProtocol__CannotPaySelf();
        if (amount <= paymentSettings.minPaymentAmount) revert PaymentProtocol__AmountBelowMinimum();
        if (amount >= paymentSettings.maxPaymentAmount) revert PaymentProtocol__AmountExceedsMaximum();
        if (bytes(reason).length == 0) revert PaymentProtocol__ReasonRequired();

        // Validate compliance
        _validatePaymentCompliance(msg.sender, payee, amount);

        // Check oracle whitelist/blacklist
        _validateOracleAccess(msg.sender, payee);

        // Calculate escrow fee
        uint256 escrowFee = (amount * paymentSettings.escrowFeeRate) / FEE_RATE_DENOMINATOR;
        uint256 totalAmount = amount + escrowFee;

        // Check payer's ETH value
        if (msg.value < totalAmount) {
            revert PaymentProtocol__InsufficientBalance();
        }

        // Create payment record
        paymentId = _nextPaymentId++;
        Payment storage payment = _payments[paymentId];

        payment.paymentId = paymentId;
        payment.payer = msg.sender;
        payment.payee = payee;
        payment.amount = amount;
        payment.state = PaymentState.PENDING;
        payment.createdAt = block.timestamp;
        payment.confirmationDeadline = block.timestamp + paymentSettings.confirmationPeriod;
        payment.disputeDeadline = 0;
        payment.complianceHash = _generateComplianceHash(msg.sender, payee, amount);
        payment.refundable = true;
        payment.paymentReason = reason;
        payment.escrowAmount = totalAmount;

        // Forward ETH to escrow
        paymentEscrow.createEscrow{value: totalAmount}(
            paymentId, msg.sender, payee, amount, paymentSettings.confirmationPeriod + paymentSettings.disputeWindow
        );

        // Refund excess ETH
        if (msg.value > totalAmount) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalAmount}("");
            if (!refunded) revert PaymentProtocol__ETHTransferFailed();
        }

        // Update mappings
        _payerPayments[msg.sender].push(paymentId);
        _payeePayments[payee].push(paymentId);
        totalPayments += 1;
        totalVolume += amount;

        emit PaymentInitiated(paymentId, msg.sender, payee, amount, reason);
    }

    /// @inheritdoc IPaymentProtocol
    function confirmPayment(uint256 paymentId) external override validPaymentId(paymentId) nonReentrant {
        Payment storage payment = _payments[paymentId];
        if (msg.sender != payment.payee) {
            revert PaymentProtocol__OnlyPayeeCanConfirm();
        }
        if (payment.state != PaymentState.PENDING) {
            revert PaymentProtocol__PaymentNotPending();
        }
        if (block.timestamp >= payment.confirmationDeadline) {
            revert PaymentProtocol__ConfirmationPeriodExpired();
        }

        // Update payment state
        payment.state = PaymentState.CONFIRMED;
        payment.disputeDeadline = block.timestamp + paymentSettings.disputeWindow;

        // Release funds from escrow to payee
        paymentEscrow.releaseEscrow(paymentId);

        emit PaymentConfirmed(paymentId, msg.sender, block.timestamp);
    }

    /// @inheritdoc IPaymentProtocol
    function disputePayment(uint256 paymentId, string calldata reason) external override validPaymentId(paymentId) {
        Payment storage payment = _payments[paymentId];
        if (msg.sender != payment.payer) revert PaymentProtocol__OnlyPayerCanDispute();
        if (payment.state != PaymentState.CONFIRMED) revert PaymentProtocol__PaymentNotConfirmed();
        if (block.timestamp >= payment.disputeDeadline) revert PaymentProtocol__DisputeWindowExpired();
        if (bytes(reason).length == 0) revert PaymentProtocol__ReasonRequired();

        // Update payment state
        payment.state = PaymentState.DISPUTED;

        // File dispute with resolver
        if (address(disputeResolver) != address(0)) {
            disputeResolver.fileDispute(paymentId, reason, keccak256(abi.encodePacked(reason)));
        }

        emit PaymentDisputed(paymentId, msg.sender, reason);
    }

    /// @inheritdoc IPaymentProtocol
    function cancelPayment(uint256 paymentId) external override validPaymentId(paymentId) nonReentrant {
        Payment storage payment = _payments[paymentId];
        if (msg.sender != payment.payer) {
            revert PaymentProtocol__OnlyPayerCanCancel();
        }
        if (payment.state != PaymentState.PENDING) {
            revert PaymentProtocol__PaymentNotPending();
        }

        // Update payment state
        payment.state = PaymentState.CANCELLED;

        // Refund funds from escrow to payer
        refundManager.processAutomaticRefund(paymentId, IRefundManager.RefundReason.PAYMENT_CANCELLATION);

        emit PaymentCancelled(paymentId, msg.sender);
    }

    /// @inheritdoc IPaymentProtocol
    function processRefund(uint256 paymentId, RefundType refundType) external override validPaymentId(paymentId) {
        if (msg.sender != address(refundManager)) {
            revert PaymentProtocol__OnlyRefundManager();
        }

        Payment storage payment = _payments[paymentId];
        if (!payment.refundable) {
            revert PaymentProtocol__PaymentNotRefundable();
        }
        if (payment.state == PaymentState.REFUNDED) {
            revert PaymentProtocol__PaymentAlreadyRefunded();
        }

        // Update payment state
        payment.state = PaymentState.REFUNDED;

        // Refund funds from escrow to payer
        paymentEscrow.refundEscrow(paymentId);

        emit PaymentRefunded(paymentId, payment.payer, payment.amount, refundType);
    }

    /// @inheritdoc IPaymentProtocol
    function emergencyRefund(uint256 paymentId) external override validPaymentId(paymentId) onlyTokenIssuer {
        Payment storage payment = _payments[paymentId];
        if (payment.state == PaymentState.REFUNDED) {
            revert PaymentProtocol__PaymentAlreadyRefunded();
        }

        // Update payment state
        payment.state = PaymentState.REFUNDED;

        // Emergency refund from escrow to payer
        paymentEscrow.emergencyRefund(paymentId);

        emit PaymentRefunded(paymentId, payment.payer, payment.amount, RefundType.EMERGENCY);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IPaymentProtocol
    function getPayment(uint256 paymentId) external view override validPaymentId(paymentId) returns (Payment memory) {
        return _payments[paymentId];
    }

    /// @inheritdoc IPaymentProtocol
    function getPaymentState(uint256 paymentId)
        external
        view
        override
        validPaymentId(paymentId)
        returns (PaymentState)
    {
        return _payments[paymentId].state;
    }

    /// @inheritdoc IPaymentProtocol
    function isPaymentExpired(uint256 paymentId) external view override returns (bool) {
        Payment storage payment = _payments[paymentId];
        if (payment.state == PaymentState.PENDING) {
            return block.timestamp > payment.confirmationDeadline;
        }
        return false;
    }

    /// @inheritdoc IPaymentProtocol
    function canDispute(uint256 paymentId) external view override validPaymentId(paymentId) returns (bool) {
        Payment storage payment = _payments[paymentId];
        return payment.state == PaymentState.CONFIRMED && block.timestamp <= payment.disputeDeadline;
    }

    /// @inheritdoc IPaymentProtocol
    function getPaymentsByPayer(address payer) external view override returns (uint256[] memory) {
        return _payerPayments[payer];
    }

    /// @inheritdoc IPaymentProtocol
    function getPaymentsByPayee(address payee) external view override returns (uint256[] memory) {
        return _payeePayments[payee];
    }

    /// @inheritdoc IPaymentProtocol
    function updatePaymentSettings(PaymentSettings calldata newSettings) external override onlyOwner {
        if (newSettings.confirmationPeriod <= 1 hours) revert PaymentProtocol__ConfirmationPeriodTooShort();
        if (newSettings.confirmationPeriod >= 7 days) revert PaymentProtocol__ConfirmationPeriodTooLong();
        if (newSettings.disputeWindow <= 1 days) revert PaymentProtocol__DisputeWindowTooShort();
        if (newSettings.disputeWindow >= 30 days) revert PaymentProtocol__DisputeWindowTooLong();
        if (newSettings.maxPaymentAmount < newSettings.minPaymentAmount) revert PaymentProtocol__InvalidAmountLimits();
        if (newSettings.escrowFeeRate <= MAX_FEE_RATE) revert PaymentProtocol__EscrowFeeRateTooHigh();

        paymentSettings = newSettings;
    }

    /**
     * @dev Pause contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
          RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set participant type registry
     * @param _participantTypeRegistry Address of the participant type registry
     */
    function setParticipantTypeRegistry(address _participantTypeRegistry) external onlyOwner {
        if (_participantTypeRegistry == address(0)) revert PaymentProtocol__InvalidAddress();

        address oldRegistry = address(participantTypeRegistry);
        participantTypeRegistry = IParticipantTypeRegistry(_participantTypeRegistry);

        emit ParticipantTypeRegistryUpdated(oldRegistry, _participantTypeRegistry);
    }

    /**
     * @notice Set investor request manager
     * @param _investorRequestManager Address of the investor request manager
     */
    function setInvestorRequestManager(address _investorRequestManager) external onlyOwner {
        if (_investorRequestManager == address(0)) revert PaymentProtocol__InvalidAddress();

        address oldManager = address(investorRequestManager);
        investorRequestManager = IInvestorRequestManager(_investorRequestManager);

        emit InvestorRequestManagerUpdated(oldManager, _investorRequestManager);
    }

    /**
     * @notice Set VehicleNFT contract reference for ownership verification
     * @param _vehicleNFT Address of the VehicleNFT contract
     */
    function setVehicleNFT(address _vehicleNFT) external onlyOwner {
        if (_vehicleNFT == address(0)) revert PaymentProtocol__InvalidAddress();
        vehicleNFT = IERC721(_vehicleNFT);
    }

    /**
     * @notice Register token pair for a vehicle
     * @param vehicleId ID of the vehicle
     * @param _assetToken Address of the vehicle's AssetToken
     * @param _revenueToken Address of the vehicle's RevenueToken
     */
    function registerVehicleTokens(uint256 vehicleId, address _assetToken, address _revenueToken) external onlyOwner {
        if (_assetToken == address(0) || _revenueToken == address(0)) {
            revert PaymentProtocol__InvalidAddress();
        }

        vehicleTokens[vehicleId] = VehicleTokens({assetToken: _assetToken, revenueToken: _revenueToken});

        emit VehicleTokensRegistered(vehicleId, _assetToken, _revenueToken);
    }

    /**
     * @notice Initiate investment payment for a vehicle
     * @param vehicleId ID of the vehicle to invest in
     * @param rentor Address of the vehicle owner (payee)
     * @param amount Investment amount
     * @param reason Investment reason/description
     * @return paymentId ID of the created payment
     */
    function initiateVehicleInvestment(uint256 vehicleId, address rentor, uint256 amount, string calldata reason)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 paymentId)
    {
        if (rentor == address(0)) revert PaymentProtocol__InvalidAddress();
        if (rentor == msg.sender) revert PaymentProtocol__CannotPaySelf();
        if (amount <= paymentSettings.minPaymentAmount) revert PaymentProtocol__AmountBelowMinimum();
        if (amount >= paymentSettings.maxPaymentAmount) revert PaymentProtocol__AmountExceedsMaximum();
        if (bytes(reason).length == 0) revert PaymentProtocol__ReasonRequired();

        // Validate investor compliance
        _validateInvestorCompliance(msg.sender, vehicleId, amount);

        // Check oracle whitelist/blacklist
        _validateOracleAccess(msg.sender, rentor);

        // Calculate escrow fee
        uint256 escrowFee = (amount * paymentSettings.escrowFeeRate) / FEE_RATE_DENOMINATOR;
        uint256 totalAmount = amount + escrowFee;

        // Check investor's ETH value
        if (msg.value < totalAmount) {
            revert PaymentProtocol__InsufficientBalance();
        }

        // Create payment record
        paymentId = _nextPaymentId++;
        Payment storage payment = _payments[paymentId];

        payment.paymentId = paymentId;
        payment.payer = msg.sender;
        payment.payee = rentor;
        payment.amount = amount;
        payment.state = PaymentState.PENDING;
        payment.createdAt = block.timestamp;
        payment.confirmationDeadline = block.timestamp + paymentSettings.confirmationPeriod;
        payment.disputeDeadline = 0;
        payment.complianceHash = _generateComplianceHash(msg.sender, rentor, amount);
        payment.refundable = true;
        payment.paymentReason = reason;
        payment.escrowAmount = totalAmount;

        // Forward ETH to escrow
        paymentEscrow.createEscrow{value: totalAmount}(
            paymentId, msg.sender, rentor, amount, paymentSettings.confirmationPeriod + paymentSettings.disputeWindow
        );

        // Refund excess ETH
        if (msg.value > totalAmount) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalAmount}("");
            if (!refunded) revert PaymentProtocol__ETHTransferFailed();
        }

        // Initialize milestone tracking
        paymentMilestones[paymentId].vehicleId = vehicleId;

        // Update mappings
        _payerPayments[msg.sender].push(paymentId);
        _payeePayments[rentor].push(paymentId);
        _vehiclePayments[vehicleId].push(paymentId);
        _paymentToVehicle[paymentId] = vehicleId;

        totalPayments += 1;
        totalVolume += amount;
        totalInvestmentVolume += amount;
        vehicleInvestmentTotal[vehicleId] += amount;

        // Record investment with InvestorRequestManager if available
        if (address(investorRequestManager) != address(0)) {
            investorRequestManager.recordVehicleInvestment(msg.sender, vehicleId, amount);
        }

        emit PaymentInitiated(paymentId, msg.sender, rentor, amount, reason);
        emit VehicleInvestmentInitiated(paymentId, vehicleId, msg.sender, amount);

        // Auto-release if vehicle milestones are already completed
        if (_areVehicleMilestonesCompleted(vehicleId)) {
            payment.state = PaymentState.CONFIRMED;
            paymentEscrow.releaseEscrow(paymentId);
            _mintInvestorTokens(paymentId, vehicleId, msg.sender, amount);
            emit InvestmentFundsReleased(paymentId, vehicleId, amount);
            emit PaymentConfirmed(paymentId, rentor, block.timestamp);
        }
    }

    /**
     * @notice Initiate rentor co-investment for a vehicle they own
     * @dev Bypasses CannotPaySelf and investor compliance checks.
     *      Validates rentor identity, vehicle ownership, and amount bounds.
     * @param vehicleId ID of the vehicle (on-chain NFT token ID)
     * @param amount Co-investment amount in ETH
     * @param reason Description of the co-investment
     * @return paymentId ID of the created payment
     */
    function initiateRentorCoInvestment(uint256 vehicleId, uint256 amount, string calldata reason)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 paymentId)
    {
        // Basic validations
        if (amount <= paymentSettings.minPaymentAmount) revert PaymentProtocol__AmountBelowMinimum();
        if (amount >= paymentSettings.maxPaymentAmount) revert PaymentProtocol__AmountExceedsMaximum();
        if (bytes(reason).length == 0) revert PaymentProtocol__ReasonRequired();

        // Validate rentor identity
        if (!identityRegistry.isVerified(msg.sender)) {
            revert PaymentProtocol__IdentityNotVerified();
        }

        // Validate rentor role
        if (address(participantTypeRegistry) != address(0)) {
            if (!participantTypeRegistry.isRentor(msg.sender)) {
                revert PaymentProtocol__ComplianceValidationFailed();
            }
        }

        // Validate on-chain vehicle ownership
        if (address(vehicleNFT) != address(0)) {
            if (vehicleNFT.ownerOf(vehicleId) != msg.sender) {
                revert PaymentProtocol__NotVehicleOwner();
            }
        }

        // Prevent duplicate co-investment for same vehicle
        if (rentorCoInvestment[vehicleId] > 0) {
            revert PaymentProtocol__RentorCoInvestmentAlreadyExists();
        }

        // Calculate escrow fee
        uint256 escrowFee = (amount * paymentSettings.escrowFeeRate) / FEE_RATE_DENOMINATOR;
        uint256 totalAmount = amount + escrowFee;

        // Check ETH value
        if (msg.value < totalAmount) {
            revert PaymentProtocol__InsufficientBalance();
        }

        // Create payment record (payer == payee for co-investment)
        paymentId = _nextPaymentId++;
        Payment storage payment = _payments[paymentId];

        payment.paymentId = paymentId;
        payment.payer = msg.sender;
        payment.payee = msg.sender;
        payment.amount = amount;
        payment.state = PaymentState.PENDING;
        payment.createdAt = block.timestamp;
        payment.confirmationDeadline = block.timestamp + paymentSettings.confirmationPeriod;
        payment.disputeDeadline = 0;
        payment.complianceHash = _generateComplianceHash(msg.sender, msg.sender, amount);
        payment.refundable = true;
        payment.paymentReason = reason;
        payment.escrowAmount = totalAmount;

        // Forward ETH to escrow (payer == payee == msg.sender for co-investment)
        paymentEscrow.createEscrow{value: totalAmount}(
            paymentId, msg.sender, msg.sender, amount, paymentSettings.confirmationPeriod + paymentSettings.disputeWindow
        );

        // Refund excess ETH
        if (msg.value > totalAmount) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - totalAmount}("");
            if (!refunded) revert PaymentProtocol__ETHTransferFailed();
        }

        // Initialize milestone tracking
        paymentMilestones[paymentId].vehicleId = vehicleId;

        // Update mappings
        _payerPayments[msg.sender].push(paymentId);
        _payeePayments[msg.sender].push(paymentId);
        _vehiclePayments[vehicleId].push(paymentId);
        _paymentToVehicle[paymentId] = vehicleId;

        totalPayments += 1;
        totalVolume += amount;
        totalInvestmentVolume += amount;
        vehicleInvestmentTotal[vehicleId] += amount;

        // Track rentor co-investment
        rentorCoInvestment[vehicleId] = amount;

        // Record investment for token minting
        if (address(investorRequestManager) != address(0)) {
            investorRequestManager.recordVehicleInvestment(msg.sender, vehicleId, amount);
        }

        emit PaymentInitiated(paymentId, msg.sender, msg.sender, amount, reason);
        emit VehicleInvestmentInitiated(paymentId, vehicleId, msg.sender, amount);
        emit RentorCoInvestmentInitiated(paymentId, vehicleId, msg.sender, amount);
    }

    /**
     * @notice Get rentor co-investment amount for a vehicle
     * @param vehicleId ID of the vehicle
     * @return amount Rentor's co-investment amount
     */
    function getRentorCoInvestment(uint256 vehicleId) external view returns (uint256 amount) {
        return rentorCoInvestment[vehicleId];
    }

    /**
     * @notice Complete a milestone for an investment payment
     * @param paymentId ID of the payment
     * @param milestone Name of the milestone completed
     */
    function completeMilestone(uint256 paymentId, string calldata milestone)
        external
        validPaymentId(paymentId)
        onlyOwnerOrOperator
    {
        MilestoneStatus storage milestones = paymentMilestones[paymentId];

        bytes32 milestoneHash = keccak256(abi.encodePacked(milestone));

        if (milestoneHash == keccak256("VEHICLE_IDENTIFIED")) {
            milestones.vehicleIdentified = true;
        } else if (milestoneHash == keccak256("PURCHASE_VERIFIED")) {
            milestones.purchaseVerified = true;
        } else if (milestoneHash == keccak256("INSURANCE_OBTAINED")) {
            milestones.insuranceObtained = true;
        } else if (milestoneHash == keccak256("REGISTRATION_COMPLETED")) {
            milestones.registrationCompleted = true;
        }

        emit MilestoneCompleted(paymentId, milestone, block.timestamp);

        // Auto-release funds if all milestones are completed
        if (_areMilestonesCompleted(paymentId) && !milestones.fundsReleased) {
            _releaseMilestoneFunds(paymentId);
        }
    }

    /**
     * @notice Release funds after all milestones are completed
     * @param paymentId ID of the payment
     */
    function releaseMilestoneFunds(uint256 paymentId) external validPaymentId(paymentId) onlyOwner nonReentrant {
        if (!_areMilestonesCompleted(paymentId)) {
            revert PaymentProtocol__PaymentNotPending();
        }

        _releaseMilestoneFunds(paymentId);
    }

    /*//////////////////////////////////////////////////////////////
                    VEHICLE-LEVEL MILESTONE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Complete a vehicle-level milestone (applies to ALL payments for this vehicle)
     * @dev Milestones are vehicle events (car purchased, insured, registered) — not per-investor.
     *      When all 4 milestones complete, auto-releases ALL pending payments and mints tokens.
     * @param vehicleId ID of the vehicle
     * @param milestone Name of the milestone completed
     */
    function completeVehicleMilestone(uint256 vehicleId, string calldata milestone)
        external
        onlyOwnerOrOperator
        nonReentrant
    {
        VehicleMilestoneStatus storage milestones = vehicleMilestones[vehicleId];
        require(!milestones.allFundsReleased, "Vehicle milestones already finalized");

        bytes32 milestoneHash = keccak256(abi.encodePacked(milestone));

        if (milestoneHash == keccak256("VEHICLE_IDENTIFIED")) {
            milestones.vehicleIdentified = true;
        } else if (milestoneHash == keccak256("PURCHASE_VERIFIED")) {
            milestones.purchaseVerified = true;
        } else if (milestoneHash == keccak256("INSURANCE_OBTAINED")) {
            milestones.insuranceObtained = true;
        } else if (milestoneHash == keccak256("REGISTRATION_COMPLETED")) {
            milestones.registrationCompleted = true;
        } else {
            revert("Invalid milestone name");
        }

        emit VehicleMilestoneCompleted(vehicleId, milestone, block.timestamp);

        // Auto-release ALL pending payments when all 4 milestones complete
        if (_areVehicleMilestonesCompleted(vehicleId)) {
            _releaseAllVehiclePayments(vehicleId);
        }
    }

    /**
     * @notice Get vehicle-level milestone status
     * @param vehicleId ID of the vehicle
     * @return VehicleMilestoneStatus struct
     */
    function getVehicleMilestoneStatus(uint256 vehicleId) external view returns (VehicleMilestoneStatus memory) {
        return vehicleMilestones[vehicleId];
    }

    /**
     * @notice Manually release all pending payments for a vehicle after milestones are complete
     * @param vehicleId ID of the vehicle
     */
    function releaseAllVehiclePayments(uint256 vehicleId) external onlyOwner nonReentrant {
        require(_areVehicleMilestonesCompleted(vehicleId), "Not all milestones completed");
        _releaseAllVehiclePayments(vehicleId);
    }

    /**
     * @notice Batch cancel all PENDING payments for a vehicle (campaign failed/cancelled)
     * @dev Only callable by owner or authorized operators (e.g. CampaignMonitorReceiver)
     *      Automatically refunds each investor via escrow
     * @param vehicleId ID of the vehicle whose campaign is being cancelled
     * @return refundedCount Number of payments successfully refunded
     */
    function batchCancelVehiclePayments(uint256 vehicleId)
        external
        onlyOwnerOrOperator
        nonReentrant
        returns (uint256 refundedCount)
    {
        uint256[] storage paymentIds = _vehiclePayments[vehicleId];
        uint256 len = paymentIds.length;

        for (uint256 i = 0; i < len; i++) {
            uint256 paymentId = paymentIds[i];
            Payment storage payment = _payments[paymentId];

            // Only refund PENDING payments (CONFIRMED ones already released funds)
            if (payment.state != PaymentState.PENDING) continue;

            payment.state = PaymentState.CANCELLED;
            refundManager.processAutomaticRefund(paymentId, IRefundManager.RefundReason.PAYMENT_CANCELLATION);

            emit PaymentCancelled(paymentId, msg.sender);
            refundedCount++;
        }

        emit CampaignPaymentsBatchCancelled(vehicleId, refundedCount);
    }

    /**
     * @notice Get investment payments for a specific vehicle
     * @param vehicleId ID of the vehicle
     * @return Array of payment IDs
     */
    function getVehiclePayments(uint256 vehicleId) external view returns (uint256[] memory) {
        return _vehiclePayments[vehicleId];
    }

    /**
     * @notice Get vehicle ID for a payment
     * @param paymentId ID of the payment
     * @return vehicleId ID of the vehicle
     */
    function getPaymentVehicle(uint256 paymentId) external view validPaymentId(paymentId) returns (uint256 vehicleId) {
        return _paymentToVehicle[paymentId];
    }

    /**
     * @notice Get milestone status for a payment
     * @param paymentId ID of the payment
     * @return MilestoneStatus struct
     */
    function getMilestoneStatus(uint256 paymentId)
        external
        view
        validPaymentId(paymentId)
        returns (MilestoneStatus memory)
    {
        return paymentMilestones[paymentId];
    }

    /**
     * @notice Get total investment in a vehicle
     * @param vehicleId ID of the vehicle
     * @return total Total invested amount
     */
    function getVehicleInvestmentTotal(uint256 vehicleId) external view returns (uint256 total) {
        return vehicleInvestmentTotal[vehicleId];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate investor compliance for vehicle investment
     */
    function _validateInvestorCompliance(address investor, uint256 vehicleId, uint256 amount) internal view {
        // Check if investor has valid identity
        if (!identityRegistry.isVerified(investor)) {
            revert PaymentProtocol__IdentityNotVerified();
        }

        // Check if investor has investor role
        if (address(participantTypeRegistry) != address(0)) {
            if (!participantTypeRegistry.isInvestor(investor)) {
                revert PaymentProtocol__ComplianceValidationFailed();
            }
        }

        // Check investment limits via InvestorRequestManager
        if (address(investorRequestManager) != address(0)) {
            (bool canInvest,) = investorRequestManager.canInvestInVehicle(investor, vehicleId, amount);
            if (!canInvest) {
                revert PaymentProtocol__ComplianceValidationFailed();
            }
        }
    }

    /**
     * @dev Check if all milestones are completed for a payment (legacy per-payment)
     */
    function _areMilestonesCompleted(uint256 paymentId) internal view returns (bool) {
        MilestoneStatus storage milestones = paymentMilestones[paymentId];
        return milestones.vehicleIdentified && milestones.purchaseVerified && milestones.insuranceObtained
            && milestones.registrationCompleted;
    }

    /**
     * @dev Check if all vehicle-level milestones are completed
     */
    function _areVehicleMilestonesCompleted(uint256 vehicleId) internal view returns (bool) {
        VehicleMilestoneStatus storage m = vehicleMilestones[vehicleId];
        return m.vehicleIdentified && m.purchaseVerified && m.insuranceObtained && m.registrationCompleted;
    }

    /**
     * @dev Release all PENDING payments for a vehicle and mint tokens to each investor
     */
    function _releaseAllVehiclePayments(uint256 vehicleId) internal {
        VehicleMilestoneStatus storage milestones = vehicleMilestones[vehicleId];
        uint256[] storage paymentIds = _vehiclePayments[vehicleId];
        uint256 len = paymentIds.length;
        uint256 releasedCount = 0;

        for (uint256 i = 0; i < len; i++) {
            uint256 paymentId = paymentIds[i];
            Payment storage payment = _payments[paymentId];

            // Only release PENDING payments (skip already CONFIRMED or CANCELLED)
            if (payment.state != PaymentState.PENDING) continue;

            // Update payment state
            payment.state = PaymentState.CONFIRMED;

            // Also update legacy per-payment milestone status for consistency
            MilestoneStatus storage pm = paymentMilestones[paymentId];
            pm.vehicleIdentified = true;
            pm.purchaseVerified = true;
            pm.insuranceObtained = true;
            pm.registrationCompleted = true;
            pm.fundsReleased = true;
            pm.completedAt = block.timestamp;

            // Release funds from escrow
            paymentEscrow.releaseEscrow(paymentId);

            // Mint tokens to investor
            _mintInvestorTokens(paymentId, vehicleId, payment.payer, payment.amount);

            emit InvestmentFundsReleased(paymentId, vehicleId, payment.amount);
            emit PaymentConfirmed(paymentId, payment.payee, block.timestamp);
            releasedCount++;
        }

        milestones.allFundsReleased = true;
        milestones.completedAt = block.timestamp;

        emit VehicleMilestonesFullyCompleted(vehicleId, releasedCount, block.timestamp);
    }

    /**
     * @dev Release funds after milestone completion and mint tokens to investor
     */
    function _releaseMilestoneFunds(uint256 paymentId) internal {
        MilestoneStatus storage milestones = paymentMilestones[paymentId];
        Payment storage payment = _payments[paymentId];

        if (milestones.fundsReleased) {
            revert PaymentProtocol__PaymentAlreadyRefunded();
        }

        // Update state
        milestones.fundsReleased = true;
        milestones.completedAt = block.timestamp;
        payment.state = PaymentState.CONFIRMED;

        // Release funds from escrow
        paymentEscrow.releaseEscrow(paymentId);

        // Mint AssetToken + RevenueToken to investor
        _mintInvestorTokens(paymentId, milestones.vehicleId, payment.payer, payment.amount);

        emit InvestmentFundsReleased(paymentId, milestones.vehicleId, payment.amount);
        emit PaymentConfirmed(paymentId, payment.payee, block.timestamp);
    }

    /**
     * @dev Mint AssetToken and RevenueToken to the investor proportional to their investment
     */
    function _mintInvestorTokens(uint256 paymentId, uint256 vehicleId, address investor, uint256 amount) internal {
        VehicleTokens storage tokens = vehicleTokens[vehicleId];

        // Only mint if tokens are registered for this vehicle
        if (tokens.assetToken == address(0) || tokens.revenueToken == address(0)) {
            return;
        }

        // Mint equal amounts of AssetToken and RevenueToken
        // Amount corresponds to the investment amount (1:1 with payment token)
        IERC3643(tokens.assetToken).mint(investor, amount);
        IERC3643(tokens.revenueToken).mint(investor, amount);

        emit InvestorTokensMinted(paymentId, vehicleId, investor, amount);
    }

    /**
     * @dev Validate payment compliance using the compliance rules contract
     */
    function _validatePaymentCompliance(
        address payer,
        address payee,
        uint256 /*amount*/
    )
        internal
        view
    {
        // Check if both parties have valid identities
        if (!identityRegistry.isVerified(payer) || !identityRegistry.isVerified(payee)) {
            revert PaymentProtocol__IdentityNotVerified();
        }

        // Validate compliance rules using available interface methods
        // For simplicity, we'll do basic validation
        if (payer == payee) {
            revert PaymentProtocol__ComplianceValidationFailed();
        }
    }

    /**
     * @dev Validate oracle access for both parties
     */
    function _validateOracleAccess(address payer, address payee) internal pure {
        // This would integrate with oracle whitelists/blacklists
        // For simplicity, we'll assume both parties have access
        if (payer == address(0) || payee == address(0)) {
            revert PaymentProtocol__OracleAccessDenied();
        }
    }

    /**
     * @dev Generate a compliance hash for the payment
     */
    function _generateComplianceHash(address payer, address payee, uint256 amount) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(payer, payee, amount, block.timestamp));
    }
}
