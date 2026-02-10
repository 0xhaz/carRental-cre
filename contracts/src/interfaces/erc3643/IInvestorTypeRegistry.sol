// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IInvestorTypeRegistry
 * @dev Interface for managing investor types and their associated limits and privileges
 */
interface IInvestorTypeRegistry {
    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvestorTypeRegistry__UnauthorizedComplianceOfficer();
    error InvestorTypeRegistry__UnauthorizedGovernor();
    error InvestorTypeRegistry__TokenNotAuthorized();
    error InvestorTypeRegistry__InvalidInvestorType();
    error InvestorTypeRegistry__NotAnUpgrade();
    error InvestorTypeRegistry__NotADowngrade();
    error InvestorTypeRegistry__InvalidInvestorAddress();
    error InvestorTypeRegistry__InvalidMaxTransferAmount();
    error InvestorTypeRegistry__InvalidMaxHoldingAmount();
    error InvestorTypeRegistry__InvalidRequiredWhitelistTier();
    error InvestorTypeRegistry__InvalidOfficerAddress();
    error InvestorTypeRegistry__UnauthorizedToken();
    error InvestorTypeRegistry__InvalidWhitelistTier();
    error InvestorTypeRegistry__InvalidTokenAddress();
    error InvestorTypeRegistry__ProposalDoesNotExist();
    error InvestorTypeRegistry__ProposalNotActive();
    error InvestorTypeRegistry__AlreadyApproved();
    error InvestorTypeRegistry__ProposalNotExecutable();
    error InvestorTypeRegistry__ExecutionDelayNotPassed();
    error InvestorTypeRegistry__InsufficientApprovals();
    error InvestorTypeRegistry__ProposalNotCancellable();
    error InvestorTypeRegistry__InvalidGovernorAddress();
    error InvestorTypeRegistry__DelayTooShort();
    error InvestorTypeRegistry__DelayTooLong();
    error InvestorTypeRegistry__InvalidRequiredApprovals();
    /*//////////////////////////////////////////////////////////////
                                  ENUM
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Enum representing different investor types
     * @param NORMAL Basic investor type with standard privileges
     * @param RETAIL Retail investor type with specific limits
     * @param ACCREDITED Accredited investor type with higher limits
     * @param INSTITUTIONAL Institutional investor type with maximum privileges
     */
    enum InvestorType {
        NORMAL,
        RETAIL,
        ACCREDITED,
        INSTITUTIONAL
    }

    /**
     * @dev Enum representing the status of governance proposals
     * @param PENDING Proposal is created and awaiting approval
     * @param APPROVED Proposal has received required approvals
     * @param EXECUTED Proposal has been executed and changes applied
     * @param CANCELLED Proposal has been cancelled and will not be executed
     */
    enum ProposalStatus {
        PENDING,
        APPROVED,
        EXECUTED,
        CANCELLED
    }

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Investor type configurations
     * @param maxTransferAmount Maximum transfer amount per transaction
     * @param maxHoldingAmount Maximum holding amount
     * @param requiredWhitelistTier Minimum whitelist tier required
     * @param transferCooldownMinutes Transfer cooldown period in minutes
     * @param largeTransferThreshold Threshold for large transfers
     * @param enhancedLogging Whether enhanced logging is enabled
     * @param enhancedPrivacy Whether enhanced privacy features are enabled
     */
    struct InvestorTypeConfig {
        uint256 maxTransferAmount;
        uint256 maxHoldingAmount;
        uint8 requiredWhitelistTier;
        uint256 transferCooldownMinutes;
        uint256 largeTransferThreshold;
        bool enhancedLogging;
        bool enhancedPrivacy;
    }

    /**
     * @dev Governance proposal structure
     * @param id Unique identifier for the proposal
     * @param investorType Investor type to be modified
     * @param proposedConfig Proposed configuration changes
     * @param proposer Address of the proposal creator
     * @param createdAt Timestamp when the proposal was created
     * @param executionTime Timestamp when the proposal can be executed
     * @param status Current status of the proposal
     * @param description Description of the proposal
     * @param approvalsCount Number of approvals received
     * @param approvals Mapping of governor addresses to their approval status
     */
    struct Proposal {
        uint256 id;
        InvestorType investorType;
        InvestorTypeConfig proposedConfig;
        address proposer;
        uint256 createdAt;
        uint256 executionTime;
        ProposalStatus status;
        string description;
        uint256 approvalsCount;
        mapping(address => bool) approvals;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when an investor type is assigned
    event InvestorTypeAssigned(address indexed investor, InvestorType investorType, address indexed officer);

    /// @notice Emitted when an investor type is changed
    event InvestorTypeUpgraded(
        address indexed investor, InvestorType oldType, InvestorType newType, address indexed officer
    );

    /// @notice Emitted when an investor type is downgraded
    event InvestorTypeDowngraded(
        address indexed investor, InvestorType oldType, InvestorType newType, address indexed officer
    );

    /// @notice Emitted when an investor type configuration is updated
    event InvestorTypeConfigUpdated(InvestorType investorType, InvestorTypeConfig config);

    /// @notice Emitted when a compliance officer is updated
    event ComplianceOfficerUpdated(address indexed officer, bool authorized);

    /// @notice Emitted when a token is authorized or deauthorized
    event TokenAuthorized(address indexed token, bool authorized);

    /*//////////////////////////////////////////////////////////////
                             GOVERNANCE EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a proposal is created
    event ProposalCreated(
        uint256 indexed proposalId, address indexed proposer, InvestorType investorType, string description
    );

    /// @notice Emitted when a proposal is approved
    event ProposalApproved(uint256 indexed proposalId, address indexed governor);

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is cancelled
    event ProposalCancelled(uint256 indexed proposalId);

    /// @notice Emitted when a governor is added or removed
    event GovernorUpdated(address indexed governor, bool authorized, uint256 weight);

    /// @notice Emitted when governance parameters are updated
    event GovernanceParametersUpdated(uint256 delay, uint256 requiredApprovals);

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Assign investor type to an address
     * @param investor Address of the investor
     * @param investorType Type of the investor
     */
    function assignInvestorType(address investor, InvestorType investorType) external;

    /**
     * @notice Upgrade investor type of an address
     * @dev Requires compliance officer authorization
     * @param investor Address of the investor
     * @param investorType New type of the investor
     */
    function upgradeInvestorType(address investor, InvestorType investorType) external;

    /**
     * @notice Downgrade investor type of an address
     * @dev Requires compliance officer authorization
     * @param investor Address of the investor
     * @param investorType New type of the investor
     */
    function downgradeInvestorType(address investor, InvestorType investorType) external;

    /**
     * @dev Get the investor type of an address
     * @param investor Address of the investor
     * @return InvestorType of the address
     */
    function getInvestorType(address investor) external view returns (InvestorType);

    /**
     * @dev Get investor type configuration
     * @param investorType Type of the investor
     * @return InvestorTypeConfig associated with the investor type
     */
    function getInvestorTypeConfig(InvestorType investorType) external view returns (InvestorTypeConfig memory);

    /**
     * @dev Check if investor can transfer a specific amount
     * @param investor Address of the investor
     * @param amount Amount to be transferred
     * @return Boolean indicating if the transfer is allowed
     */
    function canTransferAmount(address investor, uint256 amount) external view returns (bool);

    /**
     * @dev Check if investor can hold a specific amount
     * @param investor Address of the investor
     * @param amount Amount to be held
     * @return Boolean indicating if the holding is allowed
     */
    function canHoldAmount(address investor, uint256 amount) external view returns (bool);

    /**
     * @dev Get required whitelist tier for an investor
     * @param investor Address of the investor
     * @return Required whitelist tier
     */
    function getRequiredWhitelistTier(address investor) external view returns (uint8);

    /**
     * @dev Get transfer cooldown period for an investor
     * @param investor Address of the investor
     * @return Transfer cooldown period in minutes
     */
    function getTransferCooldown(address investor) external view returns (uint256);

    /**
     * @dev Check if transfer amount requires large transfer notification
     * @param investor Address of the investor
     * @param amount Amount to be transferred
     * @return Boolean indicating if large transfer notification is required
     */
    function isLargeTransfer(address investor, uint256 amount) external view returns (bool);

    /**
     * @dev Check if investor has enhanced logging enabled
     * @param investor Address of the investor
     * @return Boolean indicating if enhanced logging is enabled
     */
    function hasEnhancedLogging(address investor) external view returns (bool);

    /**
     * @dev Check if investor has enhanced privacy enabled
     * @param investor Address of the investor
     * @return Boolean indicating if enhanced privacy is enabled
     */
    function hasEnhancedPrivacy(address investor) external view returns (bool);

    /**
     * @dev Set compliance officer authorization
     * @param officer Address of the compliance officer
     * @param authorized Boolean indicating authorization status
     */
    function setComplianceOfficer(address officer, bool authorized) external;

    /**
     * @dev Authorize or deauthorize a token
     * @param token Address of the token
     * @param authorized Boolean indicating authorization status
     */
    function authorizeToken(address token, bool authorized) external;

    /**
     * @dev Check if an address is a compliance officer
     * @param officer Address to check
     * @return Boolean indicating if the address is a compliance officer
     */
    function isComplianceOfficer(address officer) external view returns (bool);

    /**
     * @dev Check if a token is authorized
     * @param token Address of the token
     * @return Boolean indicating if the token is authorized
     */
    function isTokenAuthorized(address token) external view returns (bool);

    /**
     * @dev Get all investor type configurations
     * @return normalConfig Configuration for NORMAL investor type
     * @return retailConfig Configuration for RETAIL investor type
     * @return accreditedConfig Configuration for ACCREDITED investor type
     * @return institutionalConfig Configuration for INSTITUTIONAL investor type
     */
    function getAllInvestorTypeConfigs()
        external
        view
        returns (
            InvestorTypeConfig memory normalConfig,
            InvestorTypeConfig memory retailConfig,
            InvestorTypeConfig memory accreditedConfig,
            InvestorTypeConfig memory institutionalConfig
        );

    /*//////////////////////////////////////////////////////////////
                          GOVERNANCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Create a proposal to change investor type configurations
     * @param investorType Type of the investor
     * @param config New configuration for the investor type
     * @param description Description of the proposal
     * @return proposalId ID of the created proposal
     */
    function createProposal(InvestorType investorType, InvestorTypeConfig calldata config, string calldata description)
        external
        returns (uint256 proposalId);

    /**
     * @dev Approve a proposal
     * @param proposalId ID of the proposal to approve
     */
    function approveProposal(uint256 proposalId) external;

    /**
     * @dev Execute a proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external;

    /**
     * @dev Cancel a proposal
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external;

    /**
     * @dev Set governance parameters
     * @param governor Address of the governor
     * @param authorized Whether the governor is authorized
     * @param weight Voting weight of the governor
     */
    function setGovernor(address governor, bool authorized, uint256 weight) external;

    /**
     * @dev Update governance parameters
     * @param delay Delay before proposal execution
     * @param requiredApprovals Number of required approvals for proposals
     */
    function updateGovernanceParameters(uint256 delay, uint256 requiredApprovals) external;

    /**
     * @dev Update investor type configuration
     * @dev only callable through owner or governance proposal
     * @param investorType Type of the investor
     * @param config New configuration for the investor type
     */
    function updateInvestorTypeConfig(InvestorType investorType, InvestorTypeConfig calldata config) external;

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * @return id Unique identifier for the proposal
     * @return investorType Investor type to be modified
     * @return proposedConfig Proposed configuration changes
     * @return proposer Address of the proposal creator
     * @return createdAt Timestamp when the proposal was created
     * @return executionTime Timestamp when the proposal can be executed
     * @return status Current status of the proposal
     * @return description Description of the proposal
     * @return approvalsCount Number of approvals received
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            InvestorType investorType,
            InvestorTypeConfig memory proposedConfig,
            address proposer,
            uint256 createdAt,
            uint256 executionTime,
            ProposalStatus status,
            string memory description,
            uint256 approvalsCount
        );

    /**
     * @dev Check if an address is a governor
     * @param governor Address to check
     * @return Boolean indicating if the address is a governor
     */
    function isGovernor(address governor) external view returns (bool);

    /**
     * @dev Get the voting weight of a governor
     * @param governor Address of the governor
     * @return Voting weight of the governor
     */
    function getGovernorWeight(address governor) external view returns (uint256);

    /**
     * @dev Check if a governor has approved a proposal
     * @param proposalId ID of the proposal
     * @param governor Address of the governor
     * @return Boolean indicating if the governor has approved the proposal
     */
    function hasApproved(uint256 proposalId, address governor) external view returns (bool);
}
