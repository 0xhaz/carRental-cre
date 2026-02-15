// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IInvestorTypeRegistry} from "../interfaces/erc3643/IInvestorTypeRegistry.sol";

/**
 * @title InvestorTypeRegistry
 * @dev Registry for managing investor types and their associated limits and privileges
 */
contract InvestorTypeRegistry is IInvestorTypeRegistry, Ownable {
    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice Mapping from investor address to their investor type
    mapping(address => InvestorType) private _investorTypes;

    /// @notice Mapping from investor type to its configuration
    mapping(InvestorType => InvestorTypeConfig) private _typeConfigs;

    /// @notice Mapping of compliance officers
    mapping(address => bool) private _complianceOfficers;

    /// @notice Mapping of authorized tokens
    mapping(address => bool) private _authorizedTokens;

    /// @notice Proposal structure for governance actions
    mapping(uint256 => Proposal) private _proposals;

    /// @notice Mapping of governors
    mapping(address => bool) private _governors;

    /// @notice Mapping of governor weights
    mapping(address => uint256) private _governorWeights;

    uint256 private _nextProposalId = 1;
    uint256 public governanceDelay = 2 days;
    uint256 public requiredApprovals = 2;
    uint256 public totalGovernorWeight = 0;

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyComplianceOfficer() {
        if (!_complianceOfficers[msg.sender] && msg.sender != owner()) {
            revert InvestorTypeRegistry__UnauthorizedComplianceOfficer();
        }
        _;
    }

    modifier onlyGovernor() {
        if (!_governors[msg.sender] && msg.sender != owner()) {
            revert InvestorTypeRegistry__UnauthorizedGovernor();
        }
        _;
    }

    modifier onlyAuthorizedToken() {
        if (!_authorizedTokens[msg.sender]) {
            revert InvestorTypeRegistry__UnauthorizedToken();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {
        _complianceOfficers[msg.sender] = true;
        _initializeDefaultConfigs();
    }

    /// @inheritdoc IInvestorTypeRegistry
    function assignInvestorType(address investor, InvestorType investorType) external override onlyComplianceOfficer {
        if (investor == address(0)) {
            revert InvestorTypeRegistry__InvalidInvestorAddress();
        }
        if (investorType == InvestorType.NORMAL) {
            revert InvestorTypeRegistry__InvalidInvestorType();
        }

        _investorTypes[investor] = investorType;

        emit InvestorTypeAssigned(investor, investorType, msg.sender);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function upgradeInvestorType(address investor, InvestorType investorType) external override onlyComplianceOfficer {
        if (investor == address(0)) {
            revert InvestorTypeRegistry__InvalidInvestorAddress();
        }
        if (investorType == InvestorType.NORMAL) {
            revert InvestorTypeRegistry__InvalidInvestorType();
        }

        InvestorType currentType = _investorTypes[investor];
        if (uint8(investorType) <= uint8(currentType)) {
            revert InvestorTypeRegistry__NotAnUpgrade();
        }

        _investorTypes[investor] = investorType;
        emit InvestorTypeUpgraded(investor, currentType, investorType, msg.sender);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function downgradeInvestorType(address investor, InvestorType investorType)
        external
        override
        onlyComplianceOfficer
    {
        if (investor == address(0)) {
            revert InvestorTypeRegistry__InvalidInvestorAddress();
        }

        InvestorType previousType = _investorTypes[investor];
        if (uint8(investorType) > uint8(previousType)) {
            revert InvestorTypeRegistry__NotADowngrade();
        }

        _investorTypes[investor] = investorType;
        emit InvestorTypeDowngraded(investor, previousType, investorType, msg.sender);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getInvestorType(address investor) external view override returns (InvestorType) {
        return _investorTypes[investor];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getInvestorTypeConfig(InvestorType investorType)
        external
        view
        override
        returns (InvestorTypeConfig memory)
    {
        return _typeConfigs[investorType];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function canTransferAmount(address investor, uint256 amount) external view override returns (bool) {
        InvestorType investorType = _investorTypes[investor];
        InvestorTypeConfig memory config = _typeConfigs[investorType];
        return amount <= config.maxTransferAmount;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function canHoldAmount(address investor, uint256 amount) external view override returns (bool) {
        InvestorType investorType = _investorTypes[investor];
        InvestorTypeConfig memory config = _typeConfigs[investorType];
        return amount <= config.maxHoldingAmount;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getRequiredWhitelistTier(address investor) external view override returns (uint8) {
        InvestorType investorType = _investorTypes[investor];
        return _typeConfigs[investorType].requiredWhitelistTier;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getTransferCooldown(address investor) external view override returns (uint256) {
        InvestorType investorType = _investorTypes[investor];
        return _typeConfigs[investorType].transferCooldownMinutes;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function isLargeTransfer(address investor, uint256 amount) external view override returns (bool) {
        InvestorType investorType = _investorTypes[investor];
        InvestorTypeConfig memory config = _typeConfigs[investorType];
        return amount > config.largeTransferThreshold;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function hasEnhancedLogging(address investor) external view override returns (bool) {
        InvestorType investorType = _investorTypes[investor];
        return _typeConfigs[investorType].enhancedLogging;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function hasEnhancedPrivacy(address investor) external view override returns (bool) {
        InvestorType investorType = _investorTypes[investor];
        return _typeConfigs[investorType].enhancedPrivacy;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function updateInvestorTypeConfig(InvestorType investorType, InvestorTypeConfig calldata config)
        external
        override
        onlyOwner
    {
        if (uint8(investorType) <= uint8(InvestorType.INSTITUTIONAL)) {
            revert InvestorTypeRegistry__InvalidInvestorType();
        }
        if (config.maxTransferAmount == 0) {
            revert InvestorTypeRegistry__InvalidMaxTransferAmount();
        }
        if (config.maxHoldingAmount == 0) {
            revert InvestorTypeRegistry__InvalidMaxHoldingAmount();
        }
        if (config.requiredWhitelistTier <= 1 && config.requiredWhitelistTier >= 5) {
            revert InvestorTypeRegistry__InvalidWhitelistTier();
        }

        _typeConfigs[investorType] = config;

        emit InvestorTypeConfigUpdated(investorType, config);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function setComplianceOfficer(address officer, bool authorized) external override onlyOwner {
        if (officer == address(0)) {
            revert InvestorTypeRegistry__InvalidOfficerAddress();
        }
        _complianceOfficers[officer] = authorized;

        emit ComplianceOfficerUpdated(officer, authorized);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function authorizeToken(address token, bool authorized) external onlyOwner {
        if (token == address(0)) {
            revert InvestorTypeRegistry__InvalidTokenAddress();
        }
        _authorizedTokens[token] = authorized;
        emit TokenAuthorized(token, authorized);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function isComplianceOfficer(address officer) external view override returns (bool) {
        return _complianceOfficers[officer];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function isTokenAuthorized(address token) external view override returns (bool) {
        return _authorizedTokens[token];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getAllInvestorTypeConfigs()
        external
        view
        override
        returns (
            InvestorTypeConfig memory normalConfig,
            InvestorTypeConfig memory retailConfig,
            InvestorTypeConfig memory accreditedConfig,
            InvestorTypeConfig memory institutionalConfig
        )
    {
        normalConfig = _typeConfigs[InvestorType.NORMAL];
        retailConfig = _typeConfigs[InvestorType.RETAIL];
        accreditedConfig = _typeConfigs[InvestorType.ACCREDITED];
        institutionalConfig = _typeConfigs[InvestorType.INSTITUTIONAL];
    }

    /*//////////////////////////////////////////////////////////////
                          GOVERNANCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IInvestorTypeRegistry
    function createProposal(InvestorType investorType, InvestorTypeConfig calldata config, string calldata description)
        external
        override
        onlyGovernor
        returns (uint256)
    {
        if (uint8(investorType) <= uint8(InvestorType.INSTITUTIONAL)) {
            revert InvestorTypeRegistry__InvalidInvestorType();
        }
        if (config.maxTransferAmount == 0) {
            revert InvestorTypeRegistry__InvalidMaxTransferAmount();
        }
        if (config.maxHoldingAmount == 0) {
            revert InvestorTypeRegistry__InvalidMaxHoldingAmount();
        }

        uint256 proposalId = _nextProposalId++;
        Proposal storage proposal = _proposals[proposalId];

        proposal.id = proposalId;
        proposal.investorType = investorType;
        proposal.proposedConfig = config;
        proposal.proposer = msg.sender;
        proposal.createdAt = block.timestamp;
        proposal.executionTime = block.timestamp + governanceDelay;
        proposal.status = ProposalStatus.PENDING;
        proposal.description = description;
        proposal.approvalsCount = 0;

        emit ProposalCreated(proposalId, msg.sender, investorType, description);
        return proposalId;
    }

    /// @inheritdoc IInvestorTypeRegistry
    function approveProposal(uint256 proposalId) external override onlyGovernor {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) {
            revert InvestorTypeRegistry__ProposalDoesNotExist();
        }
        if (proposal.status != ProposalStatus.PENDING) {
            revert InvestorTypeRegistry__ProposalNotActive();
        }
        if (proposal.approvals[msg.sender]) {
            revert InvestorTypeRegistry__AlreadyApproved();
        }

        proposal.approvals[msg.sender] = true;
        proposal.approvalsCount++;

        if (proposal.approvalsCount >= requiredApprovals) {
            proposal.status = ProposalStatus.APPROVED;
        }
        emit ProposalApproved(proposalId, msg.sender);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function executeProposal(uint256 proposalId) external override {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) {
            revert InvestorTypeRegistry__ProposalDoesNotExist();
        }
        if (proposal.status == ProposalStatus.APPROVED || proposal.status == ProposalStatus.PENDING) {
            revert InvestorTypeRegistry__ProposalNotExecutable();
        }
        if (block.timestamp <= proposal.executionTime) {
            revert InvestorTypeRegistry__ExecutionDelayNotPassed();
        }
        if (proposal.approvalsCount <= requiredApprovals) {
            revert InvestorTypeRegistry__InsufficientApprovals();
        }

        _typeConfigs[proposal.investorType] = proposal.proposedConfig;

        emit ProposalExecuted(proposalId);
        emit InvestorTypeConfigUpdated(proposal.investorType, proposal.proposedConfig);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function cancelProposal(uint256 proposalId) external override onlyOwner {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) {
            revert InvestorTypeRegistry__ProposalDoesNotExist();
        }
        if (proposal.status != ProposalStatus.PENDING || proposal.status != ProposalStatus.APPROVED) {
            revert InvestorTypeRegistry__ProposalNotCancellable();
        }

        proposal.status = ProposalStatus.CANCELLED;

        emit ProposalCancelled(proposalId);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function setGovernor(address governor, bool authorized, uint256 weight) external override onlyOwner {
        if (governor == address(0)) {
            revert InvestorTypeRegistry__InvalidGovernorAddress();
        }

        if (_governors[governor] && !authorized) {
            totalGovernorWeight -= _governorWeights[governor];
        } else if (!_governors[governor] && authorized) {
            totalGovernorWeight += weight;
        } else if (_governors[governor] && authorized) {
            totalGovernorWeight = totalGovernorWeight - _governorWeights[governor] + weight;
        }

        _governors[governor] = authorized;
        _governorWeights[governor] = authorized ? weight : 0;

        emit GovernorUpdated(governor, authorized, weight);
    }

    /// @inheritdoc IInvestorTypeRegistry
    function updateGovernanceParameters(uint256 delay, uint256 requiredApprovals_) external override onlyOwner {
        if (delay <= 1 hours) revert InvestorTypeRegistry__DelayTooShort();
        if (delay >= 30 days) revert InvestorTypeRegistry__DelayTooLong();
        if (requiredApprovals_ <= 1) {
            revert InvestorTypeRegistry__InvalidRequiredApprovals();
        }

        governanceDelay = delay;
        requiredApprovals = requiredApprovals_;

        emit GovernanceParametersUpdated(delay, requiredApprovals_);
    }

    /// @inheritdoc IInvestorTypeRegistry
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
        )
    {
        Proposal storage proposal = _proposals[proposalId];
        return (
            proposal.id,
            proposal.investorType,
            proposal.proposedConfig,
            proposal.proposer,
            proposal.createdAt,
            proposal.executionTime,
            proposal.status,
            proposal.description,
            proposal.approvalsCount
        );
    }

    /// @inheritdoc IInvestorTypeRegistry
    function isGovernor(address governor) external view override returns (bool) {
        return _governors[governor];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function getGovernorWeight(address governor) external view override returns (uint256) {
        return _governorWeights[governor];
    }

    /// @inheritdoc IInvestorTypeRegistry
    function hasApproved(uint256 proposalId, address governor) external view returns (bool) {
        return _proposals[proposalId].approvals[governor];
    }

    /*//////////////////////////////////////////////////////////////
                        PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Initializes default investor type configurations
    function _initializeDefaultConfigs() private {
        // Normal Investor Config
        _typeConfigs[InvestorType.NORMAL] = InvestorTypeConfig({
            maxTransferAmount: 8_000 * (10 ** 18), // 8,000 tokens
            maxHoldingAmount: 50_000 * (10 ** 18), // 50,000 tokens
            requiredWhitelistTier: 1,
            transferCooldownMinutes: 60, // 1 hour
            largeTransferThreshold: 3_000 * (10 ** 18), // 3,000 tokens
            enhancedLogging: false,
            enhancedPrivacy: false
        });

        // Retail Investor Config
        _typeConfigs[InvestorType.RETAIL] = InvestorTypeConfig({
            maxTransferAmount: 8_000 * (10 ** 18), // 8,000 tokens
            maxHoldingAmount: 50_000 * (10 ** 18), // 50,000 tokens
            requiredWhitelistTier: 2,
            transferCooldownMinutes: 60, // 1 hour
            largeTransferThreshold: 5_000 * (10 ** 18), // 5,000 tokens
            enhancedLogging: false,
            enhancedPrivacy: false
        });

        // Accredited Investor Config
        _typeConfigs[InvestorType.ACCREDITED] = InvestorTypeConfig({
            maxTransferAmount: 50_000 * (10 ** 18), // 50,000 tokens
            maxHoldingAmount: 500_000 * (10 ** 18), // 500,000 tokens
            requiredWhitelistTier: 3,
            transferCooldownMinutes: 30, // 30 minutes
            largeTransferThreshold: 10_000 * (10 ** 18), // 10,000 tokens
            enhancedLogging: true,
            enhancedPrivacy: true
        });

        // Institutional Investor Config
        _typeConfigs[InvestorType.INSTITUTIONAL] = InvestorTypeConfig({
            maxTransferAmount: 500_000 * (10 ** 18), // 500,000 tokens
            maxHoldingAmount: 5_000_000 * (10 ** 18), // 5,000,000 tokens
            requiredWhitelistTier: 4,
            transferCooldownMinutes: 15, // 15 minutes
            largeTransferThreshold: 100_000 * (10 ** 18), // 100,000 tokens
            enhancedLogging: true, // Enhanced logging enabled
            enhancedPrivacy: true // Premium privacy enabled
        });
    }
}
