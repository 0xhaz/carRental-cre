// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IDisputeResolver
 * @dev Interface for oracle-mediated dispute resolution in payment transactions
 */
interface IDisputeResolver {
    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Dispute states
     * @param FILED Dispute has been filed, awaiting oracle review
     * @param UNDERREVIEW Dispute is under review by the oracle
     * @param RESOLVED Dispute has been resolved by the oracle consensus
     * @param APPEALED Dispute resolution has been appealed for further review
     * @param CLOSED Dispute has been closed after resolution or appeal
     */
    enum DisputeState {
        FILED,
        UNDERREVIEW,
        RESOLVED,
        APPEALED,
        CLOSED
    }

    /**
     * @dev Possible outcomes of a dispute
     * @param PENDING Dispute is still pending review
     * @param FAVOR_PAYER Resolution favors the payer, full refund issued
     * @param FAVOR_PAYEE Resolution favors the payee, no refund issued
     * @param PARTIAL_REFUND Resolution calls for a partial refund to the payer
     * @param ESCALATED Dispute has been escalated for higher-level review
     */
    enum DisputeOutcome {
        PENDING,
        FAVOR_PAYER,
        FAVOR_PAYEE,
        PARTIAL_REFUND,
        ESCALATED
    }

    /*//////////////////////////////////////////////////////////////
                           STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Dispute structure
     * @param disputeId Unique identifier for the dispute
     * @param paymentId Identifier of the payment transaction under dispute
     * @param disputer Address of the party filing the dispute (payer)
     * @param respondent Address of the party responding to the dispute (payee)
     * @param state Current state of the dispute
     * @param outcome Outcome of the dispute resolution
     * @param reason Reason provided for filing the dispute
     * @param evidenceHash Hash of the evidence submitted for the dispute
     * @param filedAt Timestamp when the dispute was filed
     * @param reviewDeadline Deadline for oracle review of the dispute
     * @param resolvedAt Timestamp when the dispute was resolved
     * @param refundAmount Amount to be refunded to the payer if applicable
     * @param assignedOracles List of oracles assigned to review the dispute
     * @param oracleVotes Mapping of oracle addresses to their votes
     * @param oracleVoted Mapping to track if an oracle has voted
     * @param votesForPayer Count of votes in favor of the payer
     * @param votesForPayee Count of votes in favor of the payee
     */
    struct Dispute {
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
        mapping(address => bool) oracleVotes;
        mapping(address => bool) oracleVoted;
        uint256 votesForPayer;
        uint256 votesForPayee;
    }

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a dispute is filed
    event DisputeFiled(
        uint256 indexed disputeId,
        uint256 indexed paymentId,
        address indexed disputer,
        address respondent,
        string reason
    );

    /// @notice Emitted when a dispute is assigned to oracles for review
    event DisputeAssigned(uint256 indexed disputeId, address[] oracles, uint256 reviewDeadline);

    /// @notice Emitted when an oracle submits a vote on a dispute
    event OracleVoteSubmitted(uint256 indexed disputeId, address indexed oracle, bool favorsPayer, string reasoning);

    /// @notice Emitted when a dispute is resolved
    event DisputeResolved(uint256 indexed disputeId, DisputeOutcome outcome, uint256 refundAmount, uint256 timestamp);

    /// @notice Emitted when a dispute is appealed
    event DisputeAppealed(uint256 indexed disputeId, address indexed appellant, string reason);

    /// @notice Emitted when a dispute is closed
    event DisputeClosed(uint256 indexed disputeId, uint256 timestamp);

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice File a dispute for a payment
     * @param paymentId Identifier of the payment transaction under dispute
     * @param reason Reason for filing the dispute
     * @param evidenceHash Hash of the evidence supporting the dispute
     * @return disputeId Unique identifier of the filed dispute
     */
    function fileDispute(uint256 paymentId, string calldata reason, bytes32 evidenceHash)
        external
        returns (uint256 disputeId);

    /**
     * @notice Submit an oracle vote on a dispute
     * @param disputeId Identifier of the dispute being voted on
     * @param favorsPayer True if the vote favors the payer, false if it favors the payee
     * @param reasoning Explanation for the oracle's vote
     */
    function submitOracleVote(uint256 disputeId, bool favorsPayer, string calldata reasoning) external;

    /**
     * @notice Resolve a dispute based on oracle votes
     * @param disputeId Identifier of the dispute to resolve
     */
    function resolveDispute(uint256 disputeId) external;

    /**
     * @notice Appeal a dispute resolution
     * @param disputeId Identifier of the dispute being appealed
     * @param reason Reason for appealing the dispute resolution
     */
    function appealDispute(uint256 disputeId, string calldata reason) external;

    /**
     * @notice Close a dispute after resolution or appeal
     * @param disputeId Identifier of the dispute to close
     */
    function closeDispute(uint256 disputeId) external;

    /**
     * @notice Emergency resolve a dispute (admin function)
     * @param disputeId Identifier of the dispute to resolve
     * @param outcome Outcome to assign to the dispute
     * @param refundAmount Amount to refund to the payer if applicable
     */
    function emergencyResolve(uint256 disputeId, DisputeOutcome outcome, uint256 refundAmount) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Get details of a dispute
     * @param disputeId Identifier of the dispute to retrieve
     * @return id  Dispute ID
     * @return paymentId  Payment ID
     * @return disputer  Address of the disputer
     * @return respondent  Address of the respondent
     * @return state  Dispute state
     * @return outcome  Dispute outcome
     * @return reason  Reason for the dispute
     * @return evidenceHash  Hash of the evidence
     * @return filedAt  Timestamp when the dispute was filed
     * @return reviewDeadline  Deadline for review
     * @return resolvedAt  Timestamp when the dispute was resolved
     * @return refundAmount  Amount to be refunded
     */
    function getDispute(uint256 disputeId)
        external
        view
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
        );

    /**
     * @notice Get disputes associated with a specific payment
     * @param paymentId Identifier of the payment
     * @return Array of dispute IDs associated with the payment
     */
    function getDisputesByPayment(uint256 paymentId) external view returns (uint256[] memory);

    /**
     * @notice Get disputes filed by a specific disputer
     * @param disputer Address of the disputer
     * @return Array of dispute IDs filed by the disputer
     */
    function getDisputesByDisputer(address disputer) external view returns (uint256[] memory);

    /**
     * @notice Check if a dispute can be filed for a specific payment by a disputer
     * @param paymentId Identifier of the payment
     * @param disputer Address of the disputer
     * @return True if a dispute can be filed, false otherwise
     */
    function canFileDispute(uint256 paymentId, address disputer) external view returns (bool);

    /**
     * @notice Check if a dispute has expired
     * @param disputeId Identifier of the dispute
     * @return True if the dispute has expired, false otherwise
     */
    function isDisputeExpired(uint256 disputeId) external view returns (bool);

    /**
     * @notice Get oracles assigned to a dispute
     * @param disputeId Identifier of the dispute
     * @return Array of oracle addresses assigned to the dispute
     */
    function getAssignedOracles(uint256 disputeId) external view returns (address[] memory);

    /**
     * @notice Check if an oracle has voted on a dispute
     * @param disputeId Identifier of the dispute
     * @param oracle Address of the oracle
     * @return True if the oracle has voted, false otherwise
     */
    function hasOracleVoted(uint256 disputeId, address oracle) external view returns (bool);

    /**
     * @notice Get vote counts for a dispute
     * @param disputeId Identifier of the dispute
     * @return forPayer Number of votes for the payer
     * @return forPayee Number of votes for the payee
     */
    function getVoteCounts(uint256 disputeId) external view returns (uint256 forPayer, uint256 forPayee);
}
