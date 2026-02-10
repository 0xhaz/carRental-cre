// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IInvestorTypeRegistry} from "../interfaces/erc3643/IInvestorTypeRegistry.sol";
import {IParticipantTypeRegistry} from "../interfaces/erc3643/IParticipantTypeRegistry.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {MultiSigWallet} from "./MultiSigWallet.sol";

/**
 * @title InvestorRequestManager
 * @notice Manages investor onboarding requests and approvals for rental car tokenization platform
 * @dev Manages investor status requests with multi-sig wallet creation and token locking
 * @dev Supports investment in vehicle AssetTokens and RevenueTokens
 */
contract InvestorRequestManager is Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvestorRequestManager__InvalidBankAddress();
    error InvestorRequestManager__InvalidTokenAddress();
    error InvestorRequestManager__InvalidInvestorRegistry();
    error InvestorRequestManager__InvalidIdentityRegistry();
    error InvestorRequestManager__CannotRequestNormalType();
    error InvestorRequestManager__InvalidInvestorType();
    error InvestorRequestManager__ActiveRequestExists();
    error InvestorRequestManager__VerificationRequired();
    error InvestorRequestManager__AlreadyAnInvestor();
    error InvestorRequestManager__LockRequirementNotMet();
    error InvestorRequestManager__OnlyBankCanCreateWallet();
    error InvestorRequestManager__InvalidRequestStatus();
    error InvestorRequestManager__WalletAlreadyCreated();
    error InvestorRequestManager__WalletNotCreatedYet();
    error InvestorRequestManager__NoWalletAssigned();
    error InvestorRequestManager__InsufficientLockedTokens();
    error InvestorRequestManager__OnlyBankCanApprove();
    error InvestorRequestManager__TokensNotLocked();
    error InvestorRequestManager__TokensNoLongerLocked();
    error InvestorRequestManager__OnlyBankCanReject();
    error InvestorRequestManager__ReasonRequired();
    error InvestorRequestManager__CannotSetForNormalType();
    error InvestorRequestManager__AmountMustBeGreaterThanZero();
    error InvestorRequestManager__IndexOutOfBounds();
    error InvestorRequestManager__InvalidPaymentProtocol();
    error InvestorRequestManager__UnauthorizedCaller();
    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev RequestStatus enum representing various stages of an investor request
     * @notice NONE: No request exists
     * @notice PENDING: Request has been created and is pending action
     * @notice WALLETCREATED: Multi-signature wallet has been created for the investor
     * @notice TOKENSLOCKED: Required tokens have been locked in the wallet
     * @notice APPROVED: Investor request has been approved
     * @notice REJECTED: Investor request has been rejected
     */
    enum RequestStatus {
        NONE,
        PENDING,
        WALLETCREATED,
        TOKENSLOCKED,
        APPROVED,
        REJECTED
    }

    /*//////////////////////////////////////////////////////////////
                            STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev InvestorRequest struct to hold details of each investor request
     * @param user Address of the investor requesting status change
     * @param requestedType The investor type being requested
     * @param requiredLockAmount Amount of tokens required to be locked for the requested type
     * @param status Current status of the request
     * @param createdAt Timestamp when the request was created
     * @param approvedAt Timestamp when the request was approved
     * @param rejectionReason Reason for rejection, if applicable
     */
    struct InvestorRequest {
        address user;
        IInvestorTypeRegistry.InvestorType requestedType;
        uint256 requiredLockAmount;
        address multiSigWallet;
        RequestStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        string rejectionReason;
    }
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Mapping from investor address to their request details
    mapping(address => InvestorRequest) public requests;

    /// @notice Mapping from investor type to required lock amount
    mapping(IInvestorTypeRegistry.InvestorType => uint256) public lockRequirements;

    /// @notice Banking Institution address
    address public immutable bank;

    /// @notice Security Token address
    address public immutable token;

    /// @notice Identity Registry integration
    IIdentityRegistry public immutable identityRegistry;

    /// @notice Investor Type Registry integration (legacy)
    IInvestorTypeRegistry public immutable investorRegistry;

    /// @notice Participant Type Registry integration (new)
    IParticipantTypeRegistry public participantRegistry;

    /// @notice List of all investor requests
    address[] public allRequests;

    /// @notice Mapping to track if a user has an active request
    mapping(address => bool) public hasActiveRequest;

    /// @notice Mapping to track investment per vehicle per investor
    mapping(address => mapping(uint256 => uint256)) public vehicleInvestments;

    /// @notice Mapping to track total investment per investor
    mapping(address => uint256) public totalInvestment;

    /// @notice Payment protocol address (authorized to record investments)
    address public paymentProtocol;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a new investor request is created
    event InvestorRequestCreated(
        address indexed user,
        IInvestorTypeRegistry.InvestorType requestedType,
        uint256 requiredLockAmount,
        uint256 timestamp
    );

    /// @notice Emitted when a multi-signature wallet is created for an investor
    event MultiSigWalletCreated(address indexed user, address indexed wallet, uint256 timestamp);

    /// @notice Emitted when tokens are locked in the multi-signature wallet
    event TokensLocked(address indexed user, address indexed wallet, uint256 amount, uint256 timestamp);

    /// @notice Emitted when tokens are unlocked in the multi-signature wallet
    event InvestorRequestApproved(
        address indexed user, IInvestorTypeRegistry.InvestorType investorType, uint256 timestamp
    );

    /// @notice Emitted when an investor request is rejected
    event InvestorRequestRejected(address indexed user, string reason, uint256 timestamp);

    /// @notice Emitted when lock requirement for an investor type is updated
    event LockRequirementUpdated(IInvestorTypeRegistry.InvestorType investorType, uint256 oldAmount, uint256 newAmount);

    /// @notice Emitted when an investor is downgraded to a lower investor type
    event InvestorDowngraded(
        address indexed user,
        IInvestorTypeRegistry.InvestorType oldType,
        IInvestorTypeRegistry.InvestorType newType,
        uint256 timestamp
    );

    /// @notice Emitted when an investment is made in a vehicle
    event VehicleInvestmentRecorded(
        address indexed investor,
        uint256 indexed vehicleId,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when participant type registry is updated
    event ParticipantRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /// @notice Emitted when payment protocol is updated
    event PaymentProtocolUpdated(address indexed oldProtocol, address indexed newProtocol);

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Constructor to initialize the InvestorRequestManager contract
     * @param _bank Address of the banking institution
     * @param _token Address of the security token
     * @param _investorRegistry Address of the Investor Type Registry contract
     * @param _identityRegistry Address of the Identity Registry contract
     */
    constructor(address _bank, address _token, address _investorRegistry, address _identityRegistry)
        Ownable(msg.sender)
    {
        if (_bank == address(0)) {
            revert InvestorRequestManager__InvalidBankAddress();
        }
        if (_token == address(0)) {
            revert InvestorRequestManager__InvalidTokenAddress();
        }
        if (_investorRegistry == address(0)) {
            revert InvestorRequestManager__InvalidInvestorRegistry();
        }
        if (_identityRegistry == address(0)) {
            revert InvestorRequestManager__InvalidIdentityRegistry();
        }

        bank = _bank;
        token = _token;
        investorRegistry = IInvestorTypeRegistry(_investorRegistry);
        identityRegistry = IIdentityRegistry(_identityRegistry);

        // Initialize default lock requirements
        _initializeLockRequirements();
    }

    /*//////////////////////////////////////////////////////////////
                     EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Request investor status
     * @param requestedType The desired investor type
     */
    function requestInvestorStatus(IInvestorTypeRegistry.InvestorType requestedType) external nonReentrant {
        if (requestedType == IInvestorTypeRegistry.InvestorType.NORMAL) {
            revert InvestorRequestManager__CannotRequestNormalType();
        }
        if (uint8(requestedType) <= uint8(IInvestorTypeRegistry.InvestorType.INSTITUTIONAL)) {
            revert InvestorRequestManager__InvalidInvestorType();
        }
        if (hasActiveRequest[msg.sender]) {
            revert InvestorRequestManager__ActiveRequestExists();
        }

        // Verify KYC/AML compliance
        if (!identityRegistry.isVerified(msg.sender)) {
            revert InvestorRequestManager__VerificationRequired();
        }

        // Get current investor type
        IInvestorTypeRegistry.InvestorType currentType = investorRegistry.getInvestorType(msg.sender);
        if (currentType != IInvestorTypeRegistry.InvestorType.NORMAL) {
            revert InvestorRequestManager__AlreadyAnInvestor();
        }

        // Get required lock amount
        uint256 requiredAmount = lockRequirements[requestedType];
        if (requiredAmount == 0) {
            revert InvestorRequestManager__LockRequirementNotMet();
        }

        // Create request
        requests[msg.sender] = InvestorRequest({
            user: msg.sender,
            requestedType: requestedType,
            requiredLockAmount: requiredAmount,
            multiSigWallet: address(0),
            status: RequestStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0,
            rejectionReason: ""
        });

        allRequests.push(msg.sender);
        hasActiveRequest[msg.sender] = true;

        emit InvestorRequestCreated(msg.sender, requestedType, requiredAmount, block.timestamp);
    }

    /**
     * @dev Create multi-signature wallet for investor
     * @param user Address of the investor
     */
    function createMultiSigWallet(address user) external nonReentrant {
        if (msg.sender != bank || msg.sender != owner()) {
            revert InvestorRequestManager__OnlyBankCanCreateWallet();
        }

        InvestorRequest storage request = requests[user];
        if (request.status != RequestStatus.PENDING) {
            revert InvestorRequestManager__InvalidRequestStatus();
        }
        if (request.multiSigWallet != address(0)) {
            revert InvestorRequestManager__WalletAlreadyCreated();
        }

        // Create multi-signature wallet
        MultiSigWallet wallet = new MultiSigWallet(bank, user, token);

        // Update request
        request.multiSigWallet = address(wallet);
        request.status = RequestStatus.WALLETCREATED;

        emit MultiSigWalletCreated(user, address(wallet), block.timestamp);
    }

    /**
     * @dev Confirm tokens locked (called after user locks tokens)
     * @notice User must approve tokens and call lockTokens on MultiSigWallet first
     */
    function confirmTokensLocked() external nonReentrant {
        InvestorRequest storage request = requests[msg.sender];
        if (request.status != RequestStatus.WALLETCREATED) {
            revert InvestorRequestManager__WalletNotCreatedYet();
        }
        if (request.multiSigWallet == address(0)) {
            revert InvestorRequestManager__NoWalletAssigned();
        }

        // Verify tokens are locked in the multi-sig wallet
        MultiSigWallet wallet = MultiSigWallet(request.multiSigWallet);
        uint256 lockedAmount = wallet.getLockedBalance();

        if (lockedAmount <= request.requiredLockAmount) {
            revert InvestorRequestManager__InsufficientLockedTokens();
        }

        request.status = RequestStatus.TOKENSLOCKED;

        emit TokensLocked(msg.sender, request.multiSigWallet, lockedAmount, block.timestamp);
    }

    /**
     * @dev Approve investor request (bank only)
     * @param user Address of the investor to approve
     */
    function approveRequest(address user) external nonReentrant {
        if (msg.sender != bank || msg.sender != owner()) {
            revert InvestorRequestManager__OnlyBankCanApprove();
        }

        InvestorRequest storage request = requests[user];
        if (request.status != RequestStatus.TOKENSLOCKED) {
            revert InvestorRequestManager__TokensNotLocked();
        }

        // Verify tokens are still locked
        MultiSigWallet wallet = MultiSigWallet(request.multiSigWallet);
        if (wallet.getLockedBalance() <= request.requiredLockAmount) {
            revert InvestorRequestManager__TokensNoLongerLocked();
        }

        // Assign investor type
        investorRegistry.assignInvestorType(user, request.requestedType);

        // Update request
        request.status = RequestStatus.APPROVED;
        request.approvedAt = block.timestamp;
        hasActiveRequest[user] = false;

        emit InvestorRequestApproved(user, request.requestedType, block.timestamp);
    }

    /**
     * @dev Reject investor request (bank only)
     * @param user Address of the investor to reject
     * @param reason Reason for rejection
     */
    function rejectRequest(address user, string calldata reason) external {
        if (msg.sender != bank || msg.sender != owner()) {
            revert InvestorRequestManager__OnlyBankCanReject();
        }
        if (bytes(reason).length == 0) {
            revert InvestorRequestManager__ReasonRequired();
        }

        InvestorRequest storage request = requests[user];
        if (
            request.status != RequestStatus.PENDING && request.status != RequestStatus.WALLETCREATED
                || request.status != RequestStatus.TOKENSLOCKED
        ) {
            revert InvestorRequestManager__InvalidRequestStatus();
        }

        // Update request
        request.status = RequestStatus.REJECTED;
        request.rejectionReason = reason;
        hasActiveRequest[user] = false;

        emit InvestorRequestRejected(user, reason, block.timestamp);
    }

    /**
     * @dev Update lock requirement for an investor type (owner only)
     * @param investorType The investor type to update
     * @param newAmount The new lock amount
     */
    function updateLockRequirement(IInvestorTypeRegistry.InvestorType investorType, uint256 newAmount)
        external
        onlyOwner
    {
        if (investorType == IInvestorTypeRegistry.InvestorType.NORMAL) {
            revert InvestorRequestManager__CannotSetForNormalType();
        }
        if (newAmount == 0) {
            revert InvestorRequestManager__AmountMustBeGreaterThanZero();
        }

        uint256 oldAmount = lockRequirements[investorType];
        lockRequirements[investorType] = newAmount;

        emit LockRequirementUpdated(investorType, oldAmount, newAmount);
    }

    /**
     * @dev Get request details for a user
     * @param user Address of the investor
     * @return requestedType The requested investor type
     * @return requiredLockAmount The required token lock amount
     * @return multiSigWallet The address of the multi-signature wallet
     * @return status The current status of the request
     * @return createdAt The timestamp when the request was created
     * @return approvedAt The timestamp when the request was approved
     * @return rejectionReason The reason for rejection, if applicable
     */
    function getRequest(address user)
        external
        view
        returns (
            IInvestorTypeRegistry.InvestorType requestedType,
            uint256 requiredLockAmount,
            address multiSigWallet,
            RequestStatus status,
            uint256 createdAt,
            uint256 approvedAt,
            string memory rejectionReason
        )
    {
        InvestorRequest storage request = requests[user];
        return (
            request.requestedType,
            request.requiredLockAmount,
            request.multiSigWallet,
            request.status,
            request.createdAt,
            request.approvedAt,
            request.rejectionReason
        );
    }

    /**
     * @dev Get total request count
     * @return The total number of investor requests
     */
    function getRequestCount() external view returns (uint256) {
        return allRequests.length;
    }

    /**
     * @dev Get request by index
     * @param index The index of the request
     * @return The address of the investor at the specified index
     */
    function getRequestByIndex(uint256 index) external view returns (address) {
        if (index > allRequests.length) revert InvestorRequestManager__IndexOutOfBounds();
        return allRequests[index];
    }

    /*//////////////////////////////////////////////////////////////
                     PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Initializes default lock requirements for investor types
     * @notice Aligned with ARCHITECTURE.md specifications for rental car platform
     */
    function _initializeLockRequirements() private {
        // Type 1: Retail Accredited Investor - Min: $1,000, Max: $50,000 per vehicle
        lockRequirements[IInvestorTypeRegistry.InvestorType.RETAIL] = 1_000 * 10 ** 18; // 1,000 tokens (represents $1,000)

        // Type 2: Institutional Investor - Min: $50,000, Max: $500,000 per fleet
        lockRequirements[IInvestorTypeRegistry.InvestorType.ACCREDITED] = 50_000 * 10 ** 18; // 50,000 tokens

        // Type 3: Strategic Partner - Min: $500,000, Max: Unlimited
        lockRequirements[IInvestorTypeRegistry.InvestorType.INSTITUTIONAL] = 500_000 * 10 ** 18; // 500,000 tokens
    }

    /*//////////////////////////////////////////////////////////////
            RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set participant type registry
     * @param _participantRegistry Address of the participant type registry
     */
    function setParticipantRegistry(address _participantRegistry) external onlyOwner {
        if (_participantRegistry == address(0)) {
            revert InvestorRequestManager__InvalidInvestorRegistry();
        }

        address oldRegistry = address(participantRegistry);
        participantRegistry = IParticipantTypeRegistry(_participantRegistry);

        emit ParticipantRegistryUpdated(oldRegistry, _participantRegistry);
    }

    /**
     * @notice Set payment protocol address (authorized to record investments)
     * @param _paymentProtocol Address of the payment protocol
     */
    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) {
            revert InvestorRequestManager__InvalidPaymentProtocol();
        }

        address oldProtocol = paymentProtocol;
        paymentProtocol = _paymentProtocol;

        emit PaymentProtocolUpdated(oldProtocol, _paymentProtocol);
    }

    /**
     * @notice Record investment in a specific vehicle
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @param amount Investment amount
     */
    function recordVehicleInvestment(address investor, uint256 vehicleId, uint256 amount) external {
        if (msg.sender != paymentProtocol && msg.sender != owner()) {
            revert InvestorRequestManager__UnauthorizedCaller();
        }

        vehicleInvestments[investor][vehicleId] += amount;
        totalInvestment[investor] += amount;

        emit VehicleInvestmentRecorded(investor, vehicleId, amount, block.timestamp);
    }

    /**
     * @notice Get investment in a specific vehicle
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @return amount Investment amount in the vehicle
     */
    function getVehicleInvestment(address investor, uint256 vehicleId)
        external
        view
        returns (uint256 amount)
    {
        return vehicleInvestments[investor][vehicleId];
    }

    /**
     * @notice Get total investment across all vehicles
     * @param investor Address of the investor
     * @return total Total investment amount
     */
    function getTotalInvestment(address investor) external view returns (uint256 total) {
        return totalInvestment[investor];
    }

    /**
     * @notice Check if investor can invest in a vehicle based on limits
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @param amount Amount to invest
     * @return canInvest Whether the investor can make this investment
     * @return reason Reason code if cannot invest
     */
    function canInvestInVehicle(address investor, uint256 vehicleId, uint256 amount)
        external
        view
        returns (bool canInvest, uint8 reason)
    {
        // Get investor type
        IInvestorTypeRegistry.InvestorType investorType = investorRegistry.getInvestorType(investor);

        // Check investment limits per ARCHITECTURE.md
        uint256 currentVehicleInvestment = vehicleInvestments[investor][vehicleId];
        uint256 newVehicleInvestment = currentVehicleInvestment + amount;

        // Type 1: Retail Accredited - Max $50,000 per vehicle
        if (investorType == IInvestorTypeRegistry.InvestorType.RETAIL) {
            if (amount < 1_000 * 10 ** 18) return (false, 1); // Min $1,000
            if (newVehicleInvestment > 50_000 * 10 ** 18) return (false, 2); // Max $50,000
        }
        // Type 2: Institutional - Max $500,000 per fleet
        else if (investorType == IInvestorTypeRegistry.InvestorType.ACCREDITED) {
            if (amount < 50_000 * 10 ** 18) return (false, 3); // Min $50,000
            if (totalInvestment[investor] + amount > 500_000 * 10 ** 18) {
                return (false, 4); // Max $500,000 total
            }
        }
        // Type 3: Strategic Partner - Unlimited
        else if (investorType == IInvestorTypeRegistry.InvestorType.INSTITUTIONAL) {
            if (amount < 500_000 * 10 ** 18) return (false, 5); // Min $500,000
            // No maximum limit
        }

        return (true, 0);
    }

    /**
     * @notice Get participant type registry address
     * @return Address of the participant type registry
     */
    function getParticipantRegistry() external view returns (address) {
        return address(participantRegistry);
    }
}
