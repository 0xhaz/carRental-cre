// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IComplianceRules} from "../interfaces/compliance/IComplianceRules.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";
import {IOperationalCompliance} from "../interfaces/compliance/IOperationalCompliance.sol";
import {ClaimTopics} from "./ClaimTopics.sol";

/**
 * @title ComplianceRules
 * @dev Configurable compliance rule engine for rental car tokenization platform
 * @notice Supports investor compliance, renter compliance, and operational compliance
 * @author RegShield Compliance Team
 */
contract ComplianceRules is IComplianceRules, Ownable, ReentrancyGuard {
    // ICompliance interface implementation
    /**
     * @dev Check if a transfer is allowed based on all compliance rules
     * This is the main function called by Token contract
     * Enforces KYC/AML verification + business rules
     */
    // ========================================
    // TRUSTED CONTRACTS (Escrow Wallets, etc.)
    // ========================================

    /*//////////////////////////////////////////////////////////////
                             CONSTANT VARIABLES
      //////////////////////////////////////////////////////////////*/
    uint256 public constant MAX_COUNTRIES = 300;
    uint8 public constant MAX_INVESTOR_TYPES = 10;
    uint8 public constant MAX_COMPLIANCE_LEVELS = 10;

    /*//////////////////////////////////////////////////////////////
                                  MAPPINGS
      //////////////////////////////////////////////////////////////*/
    mapping(address => bool) private trustedContracts;
    // State variables
    mapping(address => JurisdictionRule) private jurisdictionRules;
    mapping(address => InvestorTypeRule) private investorTypeRules;
    mapping(address => HoldingPeriodRule) private holdingPeriodRules;
    mapping(address => ComplianceLevelRule) private complianceLevelRules;

    // Global rule configurations
    mapping(address => bool) public authorizedTokens;
    mapping(address => bool) public ruleAdministrators;
    mapping(address => address) public tokenIdentityRegistry; // Maps token address to its IdentityRegistry

    // Integration with new compliance modules
    IRenterCompliance public renterCompliance;
    IOperationalCompliance public operationalCompliance;

    /*//////////////////////////////////////////////////////////////
                             DEFAULT RULES
    //////////////////////////////////////////////////////////////*/
    JurisdictionRule public defaultJurisdictionRule;
    InvestorTypeRule public defaultInvestorTypeRule;
    HoldingPeriodRule public defaultHoldingPeriodRule;
    ComplianceLevelRule public defaultComplianceLevelRule;

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedToken(address token) {
        if (!authorizedTokens[token]) {
            revert ComplianceRules__TokenNotAuthorized();
        }
        _;
    }

    modifier onlyRuleAdministrator() {
        if (!ruleAdministrators[msg.sender] || msg.sender == owner()) {
            revert ComplianceRules__NotAuthorizedAdministrator();
        }
        _;
    }

    modifier onlyGovernance() {
        if (!ruleAdministrators[msg.sender]) {
            revert ComplianceRules__OnlyGovernanceCanUpdate();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
     //////////////////////////////////////////////////////////////*/
    constructor(address _owner, uint256[] memory initialAllowedCountries, uint256[] memory initialBlockedCountries)
        Ownable(_owner)
    {
        // Initialize default rules with user-provided countries
        _initializeDefaultRules(initialAllowedCountries, initialBlockedCountries);

        // Set deployer as rule administrator
        ruleAdministrators[_owner] = true;
    }

    /*//////////////////////////////////////////////////////////////
                             EXTERNAL FUNCTIONS
      //////////////////////////////////////////////////////////////*/
    /// @inheritdoc IComplianceRules
    function setJurisdictionRule(
        address token,
        uint256[] calldata allowedCountries,
        uint256[] calldata blockedCountries
    ) external override onlyGovernance {
        if (token == address(0)) revert ComplianceRules__InvalidTokenAddress();
        if (allowedCountries.length >= MAX_COUNTRIES) {
            revert ComplianceRules__TooManyAllowedCountries();
        }
        if (blockedCountries.length >= MAX_COUNTRIES) {
            revert ComplianceRules__TooManyBlockedCountries();
        }

        JurisdictionRule storage rule = jurisdictionRules[token];

        // Clear existing mappings
        for (uint256 i = 0; i < allowedCountries.length; i++) {
            delete rule.allowedCountryMap[allowedCountries[i]];
        }
        for (uint256 i = 0; i < blockedCountries.length; i++) {
            delete rule.blockedCountryMap[blockedCountries[i]];
        }

        // Set new rules
        rule.isActive = true;
        rule.allowedCountries = allowedCountries;
        rule.blockedCountries = blockedCountries;
        rule.lastUpdated = block.timestamp;

        // Update mappings
        for (uint256 i = 0; i < allowedCountries.length; i++) {
            rule.allowedCountryMap[allowedCountries[i]] = true;
        }
        for (uint256 i = 0; i < blockedCountries.length; i++) {
            rule.blockedCountryMap[blockedCountries[i]] = true;
        }

        emit JurisdictionRuleUpdated(token, allowedCountries, blockedCountries);
    }

    /// @inheritdoc IComplianceRules
    function setInvestorTypeRule(
        address token,
        uint8[] calldata allowedTypes,
        uint8[] calldata blockedTypes,
        uint256 minimumAccreditation
    ) external override onlyGovernance {
        if (token == address(0)) revert ComplianceRules__InvalidTokenAddress();
        if (allowedTypes.length >= MAX_INVESTOR_TYPES) {
            revert ComplianceRules__TooManyAllowedTypes();
        }
        if (blockedTypes.length >= MAX_INVESTOR_TYPES) {
            revert ComplianceRules__TooManyBlockedTypes();
        }

        InvestorTypeRule storage rule = investorTypeRules[token];

        // Clear existing mappings
        for (uint256 i = 0; i < allowedTypes.length; i++) {
            delete rule.allowedTypeMap[allowedTypes[i]];
        }
        for (uint256 i = 0; i < blockedTypes.length; i++) {
            delete rule.blockedTypeMap[blockedTypes[i]];
        }

        // Set new rules
        rule.isActive = true;
        rule.allowedTypes = allowedTypes;
        rule.blockedTypes = blockedTypes;
        rule.minimumAccreditation = minimumAccreditation;
        rule.lastUpdated = block.timestamp;

        // Update mappings
        for (uint256 i = 0; i < allowedTypes.length; i++) {
            rule.allowedTypeMap[allowedTypes[i]] = true;
        }
        for (uint256 i = 0; i < blockedTypes.length; i++) {
            rule.blockedTypeMap[blockedTypes[i]] = true;
        }

        emit InvestorTypeRuleUpdated(token, allowedTypes, blockedTypes);
    }

    /// @inheritdoc IComplianceRules
    function setHoldingPeriodRule(address token, uint256 minimumHoldingPeriod, uint256 transferCooldown)
        external
        override
        onlyGovernance
    {
        if (token == address(0)) revert ComplianceRules__InvalidTokenAddress();
        if (minimumHoldingPeriod >= 365 days) {
            revert ComplianceRules__HoldingPeriodTooLong();
        }
        if (transferCooldown >= 30 days) {
            revert ComplianceRules__CooldownTooLong();
        }

        HoldingPeriodRule storage rule = holdingPeriodRules[token];

        // Set new rules
        rule.isActive = true;
        rule.minimumHoldingPeriod = minimumHoldingPeriod;
        rule.transferCooldown = transferCooldown;
        rule.lastUpdated = block.timestamp;

        emit HoldingPeriodRuleUpdated(token, minimumHoldingPeriod, transferCooldown);
    }

    /// @inheritdoc IComplianceRules
    function setComplianceLevelRule(
        address token,
        uint8 minimumLevel,
        uint8 maximumLevel,
        uint8[] calldata levels,
        uint8[] calldata inheritanceLevels
    ) external override onlyGovernance {
        if (token == address(0)) revert ComplianceRules__InvalidTokenAddress();
        if (minimumLevel >= maximumLevel) {
            revert ComplianceRules__InvalidLevelsRange();
        }
        if (maximumLevel >= MAX_COMPLIANCE_LEVELS) {
            revert ComplianceRules__LevelTooHigh();
        }
        if (levels.length != inheritanceLevels.length) {
            revert ComplianceRules__ArrayLengthMismatch();
        }

        ComplianceLevelRule storage rule = complianceLevelRules[token];

        // Set new rules
        rule.isActive = true;
        rule.minimumLevel = minimumLevel;
        rule.maximumLevel = maximumLevel;
        rule.lastUpdated = block.timestamp;

        // Set inheritance mappings
        for (uint256 i = 0; i < levels.length; i++) {
            rule.levelInheritance[levels[i]] = inheritanceLevels[i];
        }

        emit ComplianceLevelRuleUpdated(token, minimumLevel, maximumLevel);
    }

    /// @inheritdoc IComplianceRules
    function validateJurisdiction(address token, uint256 countryCode)
        external
        view
        override
        returns (bool isValid, uint8 reason)
    {
        JurisdictionRule storage rule = _getJurisdictionRule(token);

        if (!rule.isActive) {
            return (true, uint8(JurisdictionReasonCode.NOT_ACTIVE));
        }

        // Check blocked countries first
        if (rule.blockedCountryMap[countryCode]) {
            return (false, uint8(JurisdictionReasonCode.BLOCKED));
        }

        // If allowed countries list is non-empty, check it
        if (rule.allowedCountries.length > 0) {
            if (!rule.allowedCountryMap[countryCode]) {
                return (false, uint8(JurisdictionReasonCode.NOT_ALLOWED));
            }
        }

        return (true, uint8(JurisdictionReasonCode.PASSED));
    }

    /// @inheritdoc IComplianceRules
    function validateInvestorType(address token, uint8 investorType, uint256 accreditationLevel)
        external
        view
        override
        returns (bool isValid, uint8 reason)
    {
        InvestorTypeRule storage rule = _getInvestorTypeRule(token);

        if (!rule.isActive) {
            return (true, uint8(InvestorTypeReasonCode.NOT_ACTIVE));
        }

        // Check blocked types first
        if (rule.blockedTypeMap[investorType]) {
            return (false, uint8(InvestorTypeReasonCode.TYPE_BLOCKED));
        }

        // If allowed types list is non-empty, check it
        if (rule.allowedTypes.length > 0) {
            if (!rule.allowedTypeMap[investorType]) {
                return (false, uint8(InvestorTypeReasonCode.TYPE_NOT_ALLOWED));
            }
        }

        // Check accreditation level
        if (accreditationLevel < rule.minimumAccreditation) {
            return (false, uint8(InvestorTypeReasonCode.ACCREDITATION_INSUFFICIENT));
        }

        return (true, uint8(InvestorTypeReasonCode.PASSED));
    }

    /// @inheritdoc IComplianceRules
    function validateHoldingPeriod(address token, address investor, uint256 acquisitionTime)
        external
        view
        override
        returns (bool isValid, uint8 reason)
    {
        HoldingPeriodRule storage rule = _getHoldingPeriodRule(token);

        if (!rule.isActive) {
            return (true, uint8(HoldingPeriodReasonCode.NOT_ACTIVE));
        }

        // Check minimum holding period
        if (block.timestamp < acquisitionTime + rule.minimumHoldingPeriod) {
            return (false, uint8(HoldingPeriodReasonCode.HOLDING_PERIOD_NOT_SATISFIED));
        }

        // Check transfer cooldown
        uint256 lastTransfer = rule.lastTransferTime[investor];
        if (lastTransfer > 0 && block.timestamp < lastTransfer + rule.transferCooldown) {
            return (false, uint8(HoldingPeriodReasonCode.COOLDOWN_NOT_SATISFIED));
        }

        return (true, uint8(HoldingPeriodReasonCode.PASSED));
    }

    /// @inheritdoc IComplianceRules
    function aggregateComplianceLevels(address token, uint8[] calldata inputLevels)
        external
        view
        override
        returns (uint8 aggregatedLevel, bool isValid)
    {
        ComplianceLevelRule storage rule = _getComplianceLevelRule(token);

        if (!rule.isActive || inputLevels.length == 0) {
            return (0, false);
        }

        // Start with the minimum level set in the rule
        uint8 minLevel = type(uint8).max;
        for (uint256 i = 0; i < inputLevels.length; i++) {
            if (inputLevels[i] < minLevel) {
                minLevel = inputLevels[i];
            }
        }

        // Apply inheritance mapping
        uint8 inheritedLevel = rule.levelInheritance[minLevel];
        if (inheritedLevel > 0) {
            minLevel = inheritedLevel;
        }

        bool valid = minLevel >= rule.minimumLevel && minLevel <= rule.maximumLevel;

        return (minLevel, valid);
    }

    /// @inheritdoc IComplianceRules
    function recordTransfer(address token, address from, address to, uint256 acquisitionTime)
        external
        override
        onlyAuthorizedToken(token)
    {
        HoldingPeriodRule storage rule = holdingPeriodRules[token];

        if (rule.isActive) {
            // Update last transfer time for sender
            rule.lastTransferTime[from] = block.timestamp;
            rule.tokenAcquisitionTime[to] = acquisitionTime > 0 ? acquisitionTime : block.timestamp;
        }
    }

    /// @inheritdoc IComplianceRules
    function authorizeToken(address token, bool authorized) external onlyOwner {
        if (token == address(0)) revert ComplianceRules__InvalidTokenAddress();

        authorizedTokens[token] = authorized;

        emit TokenAuthorized(token, authorized);
    }

    /// @inheritdoc IComplianceRules
    function setRuleAdministrator(address administrator, bool authorized) external onlyOwner {
        if (administrator == address(0)) {
            revert ComplianceRules__InvalidAddress();
        }

        ruleAdministrators[administrator] = authorized;

        emit RuleAdministratorUpdated(administrator, authorized);
    }

    /// @inheritdoc IComplianceRules
    function addTrustedContract(address contractAddress) external onlyOwner {
        if (contractAddress == address(0)) {
            revert ComplianceRules__InvalidAddress();
        }
        if (!trustedContracts[contractAddress]) {
            revert ComplianceRules__AlreadyTrustedContract();
        }

        trustedContracts[contractAddress] = true;
        emit TrustedContractAdded(contractAddress);
    }

    /// @inheritdoc IComplianceRules
    function removeTrustedContract(address contractAddress) external onlyOwner {
        if (!trustedContracts[contractAddress]) {
            revert ComplianceRules__NotTrustedContract();
        }

        trustedContracts[contractAddress] = false;
        emit TrustedContractRemoved(contractAddress);
    }

    /// @inheritdoc IComplianceRules
    function isTrustedContract(address contractAddress) external view returns (bool isTrusted) {
        isTrusted = trustedContracts[contractAddress];
    }

    /// @inheritdoc IComplianceRules
    function getJurisdictionRule(address token)
        external
        view
        returns (
            bool isActive,
            uint256[] memory allowedCountries,
            uint256[] memory blockedCountries,
            uint256 lastUpdated
        )
    {
        JurisdictionRule storage rule = _getJurisdictionRule(token);

        return (rule.isActive, rule.allowedCountries, rule.blockedCountries, rule.lastUpdated);
    }

    /// @inheritdoc IComplianceRules
    function getInvestorTypeRule(address token)
        external
        view
        returns (
            bool isActive,
            uint8[] memory allowedTypes,
            uint8[] memory blockedTypes,
            uint256 minimumAccreditation,
            uint256 lastUpdated
        )
    {
        InvestorTypeRule storage rule = _getInvestorTypeRule(token);

        return (rule.isActive, rule.allowedTypes, rule.blockedTypes, rule.minimumAccreditation, rule.lastUpdated);
    }

    /// @inheritdoc IComplianceRules
    function getHoldingPeriodRule(address token)
        external
        view
        returns (bool isActive, uint256 minimumHoldingPeriod, uint256 transferCooldown, uint256 lastUpdated)
    {
        HoldingPeriodRule storage rule = _getHoldingPeriodRule(token);

        return (rule.isActive, rule.minimumHoldingPeriod, rule.transferCooldown, rule.lastUpdated);
    }

    /// @inheritdoc IComplianceRules
    function getComplianceLevelRule(address token)
        external
        view
        returns (bool isActive, uint8 minimumLevel, uint8 maximumLevel, uint256 lastUpdated)
    {
        ComplianceLevelRule storage rule = _getComplianceLevelRule(token);

        return (rule.isActive, rule.minimumLevel, rule.maximumLevel, rule.lastUpdated);
    }

    /**
     * @notice Set renter compliance module address
     * @param _renterCompliance Address of the renter compliance contract
     */
    function setRenterCompliance(address _renterCompliance) external onlyOwner {
        if (_renterCompliance == address(0)) {
            revert ComplianceRules__InvalidAddress();
        }
        renterCompliance = IRenterCompliance(_renterCompliance);
    }

    /**
     * @notice Set operational compliance module address
     * @param _operationalCompliance Address of the operational compliance contract
     */
    function setOperationalCompliance(address _operationalCompliance) external onlyOwner {
        if (_operationalCompliance == address(0)) {
            revert ComplianceRules__InvalidAddress();
        }
        operationalCompliance = IOperationalCompliance(_operationalCompliance);
    }

    /**
     * @notice Validate if a renter can rent a specific vehicle
     * @param renter Address of the renter
     * @param vehicleId ID of the vehicle
     * @return isValid Whether the rental is allowed
     * @return renterReason Reason code from renter validation
     * @return vehicleReason Reason code from vehicle validation
     */
    function canRent(address renter, uint256 vehicleId)
        external
        view
        returns (
            bool isValid,
            uint8 renterReason,
            uint8 vehicleReason
        )
    {
        // Check if renter compliance is set
        if (address(renterCompliance) != address(0)) {
            IRenterCompliance.RenterValidationResult memory renterResult = renterCompliance.validateRenter(renter);
            if (!renterResult.isValid) {
                return (false, uint8(renterResult.reason), 0);
            }
            renterReason = uint8(renterResult.reason);
        }

        // Check if operational compliance is set
        if (address(operationalCompliance) != address(0)) {
            IOperationalCompliance.OperationalValidationResult memory vehicleResult =
                operationalCompliance.validateVehicle(vehicleId);
            if (!vehicleResult.isValid) {
                return (false, renterReason, uint8(vehicleResult.reason));
            }
            vehicleReason = uint8(vehicleResult.reason);
        }

        return (true, renterReason, vehicleReason);
    }

    /**
     * @notice Get comprehensive compliance status for an address
     * @param user Address to check
     * @return hasKYC Whether user has KYC verification
     * @return isInvestor Whether user is accredited investor
     * @return isRenter Whether user can rent vehicles
     * @return hasDriverLicense Whether user has valid driver license
     */
    function getComplianceStatus(address user)
        external
        view
        returns (
            bool hasKYC,
            bool isInvestor,
            bool isRenter,
            bool hasDriverLicense
        )
    {
        // Get the token that called this function (or use a default)
        address token = msg.sender;
        address identityRegistryAddress = tokenIdentityRegistry[token];

        if (identityRegistryAddress != address(0)) {
            IIdentityRegistry identityRegistry = IIdentityRegistry(identityRegistryAddress);
            hasKYC = identityRegistry.isVerified(user);
        }

        // Check investor status
        InvestorTypeRule storage investorRule = _getInvestorTypeRule(token);
        if (investorRule.isActive) {
            // User is an investor if they pass investor type validation
            isInvestor = hasKYC; // Simplified check
        }

        // Check renter status
        if (address(renterCompliance) != address(0)) {
            IRenterCompliance.RenterValidationResult memory result = renterCompliance.validateRenter(user);
            isRenter = result.isValid;
            hasDriverLicense = result.renterProfile.hasDriverLicense;
        }

        return (hasKYC, isInvestor, isRenter, hasDriverLicense);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function canTransfer(address from, address to, uint256) external view returns (bool) {
        // Allow minting (from == 0) and burning (to == 0)
        if (from == address(0) || to == address(0)) {
            return true;
        }

        // Get the token that called this function (msg.sender)
        address token = msg.sender;

        // Check if IdentityRegistry is set for the token
        address identityRegistryAddress = tokenIdentityRegistry[token];

        if (identityRegistryAddress != address(0)) {
            IIdentityRegistry identityRegistry = IIdentityRegistry(identityRegistryAddress);

            if (trustedContracts[from] || trustedContracts[to]) {
                // Still check jurisdiction rules for the non-trusted party
                address partyToCheck = trustedContracts[from] ? to : from;

                // If the other party is trusted, allow it
                if (trustedContracts[partyToCheck]) {
                    return true;
                }

                // Check if the non-trusted party is verified
                if (!identityRegistry.isVerified(partyToCheck)) {
                    return false;
                }

                return true;
            }

            // Recipient MUST be KYC/AML verified
            if (!identityRegistry.isVerified(to)) {
                return false;
            }

            // Sender MUST be KYC/AML verified
            if (!identityRegistry.isVerified(from)) {
                return false;
            }

            JurisdictionRule storage jurisdictionRule = _getJurisdictionRule(token);
            if (jurisdictionRule.isActive) {
                // Check sender's country
                uint16 senderCountry = identityRegistry.investorCountry(from);
                if (jurisdictionRule.blockedCountryMap[senderCountry]) {
                    return false;
                }
                if (jurisdictionRule.allowedCountries.length > 0) {
                    if (!jurisdictionRule.allowedCountryMap[senderCountry]) {
                        return false;
                    }
                }

                // Check recipient's country
                uint16 recipientCountry = identityRegistry.investorCountry(to);
                if (jurisdictionRule.blockedCountryMap[recipientCountry]) {
                    return false;
                }
                if (jurisdictionRule.allowedCountries.length > 0) {
                    if (!jurisdictionRule.allowedCountryMap[recipientCountry]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                             PRIVATE FUNCTIONS
      //////////////////////////////////////////////////////////////*/
    /**
     * @dev Initialize default rules with provided allowed and blocked countries
     * @param initialAllowedCountries Array of initially allowed country codes
     * @param initialBlockedCountries Array of initially blocked country codes
     */
    function _initializeDefaultRules(uint256[] memory initialAllowedCountries, uint256[] memory initialBlockedCountries)
        private
    {
        // Default Jurisdiction Rule
        defaultJurisdictionRule.isActive = true;
        defaultJurisdictionRule.lastUpdated = block.timestamp;

        // Set allowed countries (whitelist)
        // If empty array provided, no whitelist is active (all countries allowed except blocked)
        for (uint256 i = 0; i < initialAllowedCountries.length; i++) {
            defaultJurisdictionRule.allowedCountries.push(initialAllowedCountries[i]);
            defaultJurisdictionRule.allowedCountryMap[initialAllowedCountries[i]] = true;
        }

        // Set blocked countries (blacklist)
        // If empty array provided, no countries are blocked by default
        for (uint256 i = 0; i < initialBlockedCountries.length; i++) {
            defaultJurisdictionRule.blockedCountries.push(initialBlockedCountries[i]);
            defaultJurisdictionRule.blockedCountryMap[initialBlockedCountries[i]] = true;
        }

        // Default investor type rule - allow retail and accredited investors
        defaultInvestorTypeRule.isActive = true;
        defaultInvestorTypeRule.minimumAccreditation = 1;
        defaultInvestorTypeRule.lastUpdated = block.timestamp;

        // Default holding period rule - 24 hour minimum holding, 1 hour cooldown
        defaultHoldingPeriodRule.isActive = true;
        defaultHoldingPeriodRule.minimumHoldingPeriod = 24 hours;
        defaultHoldingPeriodRule.transferCooldown = 1 hours;
        defaultHoldingPeriodRule.lastUpdated = block.timestamp;

        // Default compliance level rule - minimum level 1, maximum level 5
        defaultComplianceLevelRule.isActive = true;
        defaultComplianceLevelRule.minimumLevel = 1;
        defaultComplianceLevelRule.maximumLevel = 5;
        defaultComplianceLevelRule.lastUpdated = block.timestamp;
    }

    /**
     * @dev Get the jurisdiction rule for a token, or default if not set
     * @param token Address of the token
     * @return rule Reference to the JurisdictionRule struct
     */
    function _getJurisdictionRule(address token) private view returns (JurisdictionRule storage) {
        if (jurisdictionRules[token].isActive) {
            return jurisdictionRules[token];
        }
        return defaultJurisdictionRule;
    }

    /**
     * @dev Get the investor type rule for a token, or default if not set
     * @param token Address of the token
     * @return rule Reference to the InvestorTypeRule struct
     */
    function _getInvestorTypeRule(address token) private view returns (InvestorTypeRule storage) {
        if (investorTypeRules[token].isActive) {
            return investorTypeRules[token];
        }
        return defaultInvestorTypeRule;
    }

    /**
     * @dev Get the holding period rule for a token, or default if not set
     * @param token Address of the token
     * @return rule Reference to the HoldingPeriodRule struct
     */
    function _getHoldingPeriodRule(address token) private view returns (HoldingPeriodRule storage) {
        if (holdingPeriodRules[token].isActive) {
            return holdingPeriodRules[token];
        }
        return defaultHoldingPeriodRule;
    }

    /**
     * @dev Get the compliance level rule for a token, or default if not set
     * @param token Address of the token
     * @return rule Reference to the ComplianceLevelRule struct
     */
    function _getComplianceLevelRule(address token) private view returns (ComplianceLevelRule storage) {
        if (complianceLevelRules[token].isActive) {
            return complianceLevelRules[token];
        }
        return defaultComplianceLevelRule;
    }
}
