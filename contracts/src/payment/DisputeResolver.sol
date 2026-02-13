// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IDisputeResolver} from "../interfaces/payment/IDisputeResolver.sol";
import {IPaymentProtocol} from "../interfaces/payment/IPaymentProtocol.sol";

/**
 * @title DisputeResolver
 * @notice Oracle-mediated dispute resolution for payment transactions
 * @dev Supports multi-oracle voting, appeals, and emergency resolution
 *
 * Flow:
 * 1. Payer files dispute via RegShieldPaymentProtocol.disputePayment()
 * 2. Protocol calls fileDispute() here
 * 3. Owner assigns oracles to review
 * 4. Oracles vote (favorsPayer or favorsPayee)
 * 5. Once quorum reached, resolveDispute() tallies votes
 * 6. Outcome determines refund action
 */
contract DisputeResolver is IDisputeResolver, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Storage for disputes (without mappings — those are stored separately)
    struct DisputeStorage {
        uint256 disputeId;
        uint256 paymentId;
        address disputer;
        address respondent;
        DisputeState state;
        DisputeOutcome outcome;
        string reason;
        bytes32 evidenceHash;
        uint256 filedAt;
        uint256 reviewDeadline;
        uint256 resolvedAt;
        uint256 refundAmount;
        address[] assignedOracles;
        uint256 votesForPayer;
        uint256 votesForPayee;
    }

    mapping(uint256 => DisputeStorage) private _disputes;
    mapping(uint256 => mapping(address => bool)) private _oracleVotes;
    mapping(uint256 => mapping(address => bool)) private _oracleVoted;

    mapping(uint256 => uint256[]) private _paymentDisputes;
    mapping(address => uint256[]) private _disputerDisputes;

    uint256 private _nextDisputeId = 1;

    /// @notice Payment protocol that can file disputes
    address public paymentProtocol;

    /// @notice Authorized oracles that can vote on disputes
    mapping(address => bool) public authorizedOracles;

    /// @notice Default review period (48 hours)
    uint256 public reviewPeriod = 48 hours;

    /// @notice Minimum oracle quorum for resolution
    uint256 public minQuorum = 2;

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error DisputeResolver__InvalidPaymentProtocol();
    error DisputeResolver__UnauthorizedCaller();
    error DisputeResolver__UnauthorizedOracle();
    error DisputeResolver__InvalidDisputeId();
    error DisputeResolver__InvalidState();
    error DisputeResolver__AlreadyVoted();
    error DisputeResolver__QuorumNotReached();
    error DisputeResolver__DisputeNotResolved();
    error DisputeResolver__ReasonRequired();

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier validDisputeId(uint256 disputeId) {
        if (disputeId == 0 || disputeId >= _nextDisputeId) {
            revert DisputeResolver__InvalidDisputeId();
        }
        _;
    }

    modifier onlyOracle() {
        if (!authorizedOracles[msg.sender] && msg.sender != owner()) {
            revert DisputeResolver__UnauthorizedOracle();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _paymentProtocol) Ownable(msg.sender) {
        if (_paymentProtocol == address(0)) {
            revert DisputeResolver__InvalidPaymentProtocol();
        }
        paymentProtocol = _paymentProtocol;
    }

    /*//////////////////////////////////////////////////////////////
                         ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setPaymentProtocol(address _paymentProtocol) external onlyOwner {
        if (_paymentProtocol == address(0)) revert DisputeResolver__InvalidPaymentProtocol();
        paymentProtocol = _paymentProtocol;
    }

    function setAuthorizedOracle(address oracle, bool authorized) external onlyOwner {
        authorizedOracles[oracle] = authorized;
    }

    function setReviewPeriod(uint256 period) external onlyOwner {
        reviewPeriod = period;
    }

    function setMinQuorum(uint256 quorum) external onlyOwner {
        minQuorum = quorum;
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDisputeResolver
    function fileDispute(uint256 paymentId, string calldata reason, bytes32 evidenceHash)
        external
        override
        returns (uint256 disputeId)
    {
        if (msg.sender != paymentProtocol && msg.sender != owner()) {
            revert DisputeResolver__UnauthorizedCaller();
        }
        if (bytes(reason).length == 0) revert DisputeResolver__ReasonRequired();

        // Get payment info to identify disputer and respondent
        IPaymentProtocol.Payment memory payment = IPaymentProtocol(paymentProtocol).getPayment(paymentId);

        disputeId = _nextDisputeId++;

        DisputeStorage storage dispute = _disputes[disputeId];
        dispute.disputeId = disputeId;
        dispute.paymentId = paymentId;
        dispute.disputer = payment.payer;
        dispute.respondent = payment.payee;
        dispute.state = DisputeState.FILED;
        dispute.outcome = DisputeOutcome.PENDING;
        dispute.reason = reason;
        dispute.evidenceHash = evidenceHash;
        dispute.filedAt = block.timestamp;
        dispute.reviewDeadline = block.timestamp + reviewPeriod;

        _paymentDisputes[paymentId].push(disputeId);
        _disputerDisputes[payment.payer].push(disputeId);

        emit DisputeFiled(disputeId, paymentId, payment.payer, payment.payee, reason);
    }

    /// @inheritdoc IDisputeResolver
    function submitOracleVote(uint256 disputeId, bool favorsPayer, string calldata reasoning)
        external
        override
        validDisputeId(disputeId)
        onlyOracle
    {
        DisputeStorage storage dispute = _disputes[disputeId];

        if (dispute.state != DisputeState.FILED && dispute.state != DisputeState.UNDERREVIEW) {
            revert DisputeResolver__InvalidState();
        }
        if (_oracleVoted[disputeId][msg.sender]) {
            revert DisputeResolver__AlreadyVoted();
        }

        // Move to UNDERREVIEW on first vote
        if (dispute.state == DisputeState.FILED) {
            dispute.state = DisputeState.UNDERREVIEW;
        }

        _oracleVoted[disputeId][msg.sender] = true;
        _oracleVotes[disputeId][msg.sender] = favorsPayer;

        if (favorsPayer) {
            dispute.votesForPayer++;
        } else {
            dispute.votesForPayee++;
        }

        emit OracleVoteSubmitted(disputeId, msg.sender, favorsPayer, reasoning);
    }

    /// @inheritdoc IDisputeResolver
    function resolveDispute(uint256 disputeId) external override validDisputeId(disputeId) {
        DisputeStorage storage dispute = _disputes[disputeId];

        if (dispute.state != DisputeState.UNDERREVIEW) {
            revert DisputeResolver__InvalidState();
        }

        uint256 totalVotes = dispute.votesForPayer + dispute.votesForPayee;
        if (totalVotes < minQuorum) {
            revert DisputeResolver__QuorumNotReached();
        }

        // Determine outcome
        if (dispute.votesForPayer > dispute.votesForPayee) {
            dispute.outcome = DisputeOutcome.FAVOR_PAYER;
        } else if (dispute.votesForPayee > dispute.votesForPayer) {
            dispute.outcome = DisputeOutcome.FAVOR_PAYEE;
        } else {
            // Tie — partial refund (50%)
            dispute.outcome = DisputeOutcome.PARTIAL_REFUND;
        }

        dispute.state = DisputeState.RESOLVED;
        dispute.resolvedAt = block.timestamp;

        emit DisputeResolved(disputeId, dispute.outcome, dispute.refundAmount, block.timestamp);
    }

    /// @inheritdoc IDisputeResolver
    function appealDispute(uint256 disputeId, string calldata reason) external override validDisputeId(disputeId) {
        DisputeStorage storage dispute = _disputes[disputeId];

        if (dispute.state != DisputeState.RESOLVED) {
            revert DisputeResolver__DisputeNotResolved();
        }
        if (msg.sender != dispute.disputer && msg.sender != dispute.respondent) {
            revert DisputeResolver__UnauthorizedCaller();
        }
        if (bytes(reason).length == 0) revert DisputeResolver__ReasonRequired();

        dispute.state = DisputeState.APPEALED;
        dispute.outcome = DisputeOutcome.ESCALATED;

        emit DisputeAppealed(disputeId, msg.sender, reason);
    }

    /// @inheritdoc IDisputeResolver
    function closeDispute(uint256 disputeId) external override validDisputeId(disputeId) onlyOwner {
        DisputeStorage storage dispute = _disputes[disputeId];

        if (dispute.state != DisputeState.RESOLVED && dispute.state != DisputeState.APPEALED) {
            revert DisputeResolver__InvalidState();
        }

        dispute.state = DisputeState.CLOSED;

        emit DisputeClosed(disputeId, block.timestamp);
    }

    /// @inheritdoc IDisputeResolver
    function emergencyResolve(uint256 disputeId, DisputeOutcome outcome, uint256 refundAmount)
        external
        override
        validDisputeId(disputeId)
        onlyOwner
    {
        DisputeStorage storage dispute = _disputes[disputeId];

        dispute.state = DisputeState.RESOLVED;
        dispute.outcome = outcome;
        dispute.refundAmount = refundAmount;
        dispute.resolvedAt = block.timestamp;

        emit DisputeResolved(disputeId, outcome, refundAmount, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDisputeResolver
    function getDispute(uint256 disputeId)
        external
        view
        override
        validDisputeId(disputeId)
        returns (
            uint256 id,
            uint256 paymentId,
            address disputer,
            address respondent,
            DisputeState state,
            DisputeOutcome outcome,
            string memory reason,
            bytes32 evidenceHash,
            uint256 filedAt,
            uint256 reviewDeadline,
            uint256 resolvedAt,
            uint256 refundAmount
        )
    {
        DisputeStorage storage d = _disputes[disputeId];
        return (
            d.disputeId,
            d.paymentId,
            d.disputer,
            d.respondent,
            d.state,
            d.outcome,
            d.reason,
            d.evidenceHash,
            d.filedAt,
            d.reviewDeadline,
            d.resolvedAt,
            d.refundAmount
        );
    }

    /// @inheritdoc IDisputeResolver
    function getDisputesByPayment(uint256 paymentId) external view override returns (uint256[] memory) {
        return _paymentDisputes[paymentId];
    }

    /// @inheritdoc IDisputeResolver
    function getDisputesByDisputer(address disputer) external view override returns (uint256[] memory) {
        return _disputerDisputes[disputer];
    }

    /// @inheritdoc IDisputeResolver
    function canFileDispute(uint256 paymentId, address disputer) external view override returns (bool) {
        // Check if there's already an active dispute for this payment
        uint256[] memory disputes = _paymentDisputes[paymentId];
        for (uint256 i = 0; i < disputes.length; i++) {
            DisputeStorage storage d = _disputes[disputes[i]];
            if (d.state != DisputeState.CLOSED && d.disputer == disputer) {
                return false;
            }
        }
        return true;
    }

    /// @inheritdoc IDisputeResolver
    function isDisputeExpired(uint256 disputeId) external view override validDisputeId(disputeId) returns (bool) {
        DisputeStorage storage d = _disputes[disputeId];
        return block.timestamp > d.reviewDeadline && d.state == DisputeState.UNDERREVIEW;
    }

    /// @inheritdoc IDisputeResolver
    function getAssignedOracles(uint256 disputeId)
        external
        view
        override
        validDisputeId(disputeId)
        returns (address[] memory)
    {
        return _disputes[disputeId].assignedOracles;
    }

    /// @inheritdoc IDisputeResolver
    function hasOracleVoted(uint256 disputeId, address oracle)
        external
        view
        override
        validDisputeId(disputeId)
        returns (bool)
    {
        return _oracleVoted[disputeId][oracle];
    }

    /// @inheritdoc IDisputeResolver
    function getVoteCounts(uint256 disputeId)
        external
        view
        override
        validDisputeId(disputeId)
        returns (uint256 forPayer, uint256 forPayee)
    {
        DisputeStorage storage d = _disputes[disputeId];
        return (d.votesForPayer, d.votesForPayee);
    }
}
