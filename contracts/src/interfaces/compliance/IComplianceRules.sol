// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IComplianceRules
 * @dev Interface for configurable compliance rule engine
 */
interface IComplianceRules {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error ComplianceRules__InvalidAddress();
    error ComplianceRules__AlreadyTrustedContract();
    error ComplianceRules__NotTrustedContract();
    error ComplianceRules__InvalidTokenAddress();
    error ComplianceRules__InvalidIdentityRegistryAddress();
    error ComplianceRules__TooManyAllowedCountries();
    error ComplianceRules__TooManyBlockedCountries();
    error ComplianceRules__TooManyAllowedTypes();
    error ComplianceRules__TooManyBlockedTypes();
    error ComplianceRules__HoldingPeriodTooLong();
    error ComplianceRules__CooldownTooLong();
    error ComplianceRules__InvalidLevelsRange();
    error ComplianceRules__LevelTooHigh();
    error ComplianceRules__LevelMismatch();
    error ComplianceRules__InvalidAdministratorAddress();
    error ComplianceRules__NotAuthorizedAdministrator();
    error ComplianceRules__OnlyGovernanceCanUpdate();
    error ComplianceRules__TokenNotAuthorized();
    error ComplianceRules__ArrayLengthMismatch();

    /*//////////////////////////////////////////////////////////////
                                  ENUM
    //////////////////////////////////////////////////////////////*/
    enum JurisdictionReasonCode {
        NOT_ACTIVE,
        BLOCKED,
        NOT_ALLOWED,
        PASSED
    }

    enum InvestorTypeReasonCode {
        NOT_ACTIVE,
        TYPE_BLOCKED,
        TYPE_NOT_ALLOWED,
        ACCREDITATION_INSUFFICIENT,
        PASSED
    }

    enum HoldingPeriodReasonCode {
        NOT_ACTIVE,
        HOLDING_PERIOD_NOT_SATISFIED,
        COOLDOWN_NOT_SATISFIED,
        PASSED
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct for jurisdiction-based rules
     * @param isActive Whether the rule is active
     * @param allowedCountries List of allowed country codes
     * @param blockedCountries List of blocked country codes
     * @param allowedCountryMap Mapping for quick lookup of allowed countries
     * @param blockedCountryMap Mapping for quick lookup of blocked countries
     * @param lastUpdated Timestamp of the last update
     */
    struct JurisdictionRule {
        bool isActive;
        uint256[] allowedCountries;
        uint256[] blockedCountries;
        mapping(uint256 => bool) allowedCountryMap;
        mapping(uint256 => bool) blockedCountryMap;
        uint256 lastUpdated;
    }

    /**
     * @dev Struct for investor type-based rules
     * @param isActive Whether the rule is active
     * @param allowedTypes List of allowed investor types
     * @param blockedTypes List of blocked investor types
     * @param allowedTypeMap Mapping for quick lookup of allowed types
     * @param blockedTypeMap Mapping for quick lookup of blocked types
     * @param minimumAccreditation Minimum accreditation level required
     * @param lastUpdated Timestamp of the last update
     */
    struct InvestorTypeRule {
        bool isActive;
        uint8[] allowedTypes;
        uint8[] blockedTypes;
        mapping(uint8 => bool) allowedTypeMap;
        mapping(uint8 => bool) blockedTypeMap;
        uint256 minimumAccreditation;
        uint256 lastUpdated;
    }

    /**
     * @dev Struct for holding period-based rules
     * @param isActive Whether the rule is active
     * @param minimumHoldingPeriod Minimum time tokens must be held before transfer
     * @param transferCooldown Cooldown period between transfers
     * @param lastTransferTime Mapping of last transfer times per investor
     * @param tokenAcquisitionTime Mapping of token acquisition times per investor
     * @param lastUpdated Timestamp of the last update
     */
    struct HoldingPeriodRule {
        bool isActive;
        uint256 minimumHoldingPeriod;
        uint256 transferCooldown;
        mapping(address => uint256) lastTransferTime;
        mapping(address => uint256) tokenAcquisitionTime;
        uint256 lastUpdated;
    }

    /**
     * @dev Struct for compliance level-based rules
     * @param isActive Whether the rule is active
     * @param minimumLevel Minimum compliance level required
     * @param maximumLevel Maximum compliance level allowed
     * @param levelInheritance Mapping of compliance levels to their inheritance levels
     * @param levelRequirements Mapping of compliance levels to their requirements
     * @param lastUpdated Timestamp of the last update
     */
    struct ComplianceLevelRule {
        bool isActive;
        uint8 minimumLevel;
        uint8 maximumLevel;
        mapping(uint8 => uint8) levelInheritance;
        mapping(uint8 => uint256) levelRequirements;
        uint256 lastUpdated;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a trusted contract is added
    event TrustedContractAdded(address indexed contractAddress);

    /// @notice Emitted when a trusted contract is removed
    event TrustedContractRemoved(address indexed contractAddress);

    /// @notice Emitted when jurisdiction rules are updated
    event JurisdictionRuleUpdated(address indexed token, uint256[] allowedCountries, uint256[] blockedCountries);

    /// @notice Emitted when investor type rules are updated
    event InvestorTypeRuleUpdated(address indexed token, uint8[] allowedTypes, uint8[] blockedTypes);

    /// @notice Emitted when holding period rules are updated
    event HoldingPeriodRuleUpdated(address indexed token, uint256 minimumHoldingPeriod, uint256 transferCooldown);

    /// @notice Emitted when compliance level rules are updated
    event ComplianceLevelRuleUpdated(address indexed token, uint8 minimumLevel, uint8 maximumLevel);

    /// @notice Emitted when a token is authorized for compliance validation
    event TokenAuthorized(address indexed token, bool authorized);

    /// @notice Emitted when a rule administrator is updated
    event RuleAdministratorUpdated(address indexed administrator, bool authorized);

    /// @notice Emitted when a token's identity registry is set
    event TokenIdentityRegistrySet(address indexed token, address indexed identityRegistry);

    /*//////////////////////////////////////////////////////////////
                        CONFIGURATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Set jurisdiction-based validation rules
     * @param token Token contract address
     * @param allowedCountries Array of allowed country codes
     * @param blockedCountries Array of blocked country codes
     */
    function setJurisdictionRule(
        address token,
        uint256[] calldata allowedCountries,
        uint256[] calldata blockedCountries
    ) external;

    /**
     * @dev Set investor type validation rules
     * @param token Token contract address
     * @param allowedTypes Array of allowed investor types
     * @param blockedTypes Array of blocked investor types
     * @param minimumAccreditation Minimum accreditation level required
     */
    function setInvestorTypeRule(
        address token,
        uint8[] calldata allowedTypes,
        uint8[] calldata blockedTypes,
        uint256 minimumAccreditation
    ) external;

    /**
     * @dev Set holding period and transfer cooldown rules
     * @param token Token contract address
     * @param minimumHoldingPeriod Minimum time tokens must be held before transfer
     * @param transferCooldown Cooldown period between transfers
     */
    function setHoldingPeriodRule(address token, uint256 minimumHoldingPeriod, uint256 transferCooldown) external;

    /**
     * @dev Set compliance level aggregation and inheritance rules
     * @param token Token contract address
     * @param minimumLevel Minimum compliance level required
     * @param maximumLevel Maximum compliance level allowed
     * @param levels Array of compliance levels
     * @param inheritanceLevels Array of corresponding inheritance levels
     */
    function setComplianceLevelRule(
        address token,
        uint8 minimumLevel,
        uint8 maximumLevel,
        uint8[] calldata levels,
        uint8[] calldata inheritanceLevels
    ) external;

    /**
     * @dev Validate jurisdiction compliance
     * @param token Token contract address
     * @param countryCode Country code to validate
     * @return isValid Whether the jurisdiction is valid
     * @return reason Reason for validation result
     */
    function validateJurisdiction(address token, uint256 countryCode) external view returns (bool isValid, uint8 reason);

    /**
     * @dev Validate investor type compliance
     * @param token Token contract address
     * @param investorType Investor type to validate
     * @param accreditationLevel Accreditation level of investor
     * @return isValid Whether the investor type is valid
     * @return reason Reason for validation result
     */
    function validateInvestorType(address token, uint8 investorType, uint256 accreditationLevel)
        external
        view
        returns (bool isValid, uint8 reason);

    /**
     * @dev Validate holding period compliance
     * @param token Token contract address
     * @param investor Investor address
     * @param acquisitionTime Time when tokens were acquired
     * @return isValid Whether the holding period is satisfied
     * @return reason Reason for validation result
     */
    function validateHoldingPeriod(address token, address investor, uint256 acquisitionTime)
        external
        view
        returns (bool isValid, uint8 reason);

    /**
     * @dev Aggregate compliance levels from multiple inputs
     * @param token Token contract address
     * @param inputLevels Array of input compliance levels
     * @return aggregatedLevel Resulting aggregated compliance level
     * @return isValid Whether the aggregated level is valid
     */
    function aggregateComplianceLevels(address token, uint8[] calldata inputLevels)
        external
        view
        returns (uint8 aggregatedLevel, bool isValid);

    /**
     * @dev Record transfer for holding period tracking
     * @param token Token contract address
     * @param from Sender address
     * @param to Recipient address
     * @param acquisitionTime Time when recipient acquired tokens
     */
    function recordTransfer(address token, address from, address to, uint256 acquisitionTime) external;

    /**
     * @dev Add a trusted contract (e.g., escrow wallet) that can bypass KYC/AML
     * @param contractAddress Address of the trusted contract
     */
    function addTrustedContract(address contractAddress) external;

    /**
     * @dev Remove a trusted contract
     * @param contractAddress Address of the contract to remove
     */
    function removeTrustedContract(address contractAddress) external;

    /**
     * @dev Check if an address is a trusted contract
     * @param contractAddress Address to check
     * @return isTrusted Whether the address is a trusted contract
     */
    function isTrustedContract(address contractAddress) external view returns (bool isTrusted);

    /**
     * @dev Check if a transfer between two addresses is allowed
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Whether the transfer is allowed
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);

    /**
     * @dev Authorize or deauthorize a token for compliance validation
     * @param token Token contract address
     * @param authorized Whether to authorize or deauthorize
     */
    function authorizeToken(address token, bool authorized) external;

    /**
     * @dev Set or unset a rule administrator
     * @param administrator Address of the administrator
     * @param authorized Whether to set or unset as administrator
     */
    function setRuleAdministrator(address administrator, bool authorized) external;

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get jurisdiction-based rules for a token
     * @param token Token contract address
     * @return isActive Whether the rule is active
     * @return allowedCountries List of allowed country codes
     * @return blockedCountries List of blocked country codes
     * @return lastUpdated Timestamp of the last update
     */
    function getJurisdictionRule(address token)
        external
        view
        returns (
            bool isActive,
            uint256[] memory allowedCountries,
            uint256[] memory blockedCountries,
            uint256 lastUpdated
        );

    /**
     * @dev Get investor type-based rules for a token
     * @param token Token contract address
     * @return isActive Whether the rule is active
     * @return allowedTypes List of allowed investor types
     * @return blockedTypes List of blocked investor types
     * @return minimumAccreditation Minimum accreditation level required
     * @return lastUpdated Timestamp of the last update
     */
    function getInvestorTypeRule(address token)
        external
        view
        returns (
            bool isActive,
            uint8[] memory allowedTypes,
            uint8[] memory blockedTypes,
            uint256 minimumAccreditation,
            uint256 lastUpdated
        );

    /**
     * @dev Get holding period-based rules for a token
     * @param token Token contract address
     * @return isActive Whether the rule is active
     * @return minimumHoldingPeriod Minimum time tokens must be held before transfer
     * @return transferCooldown Cooldown period between transfers
     * @return lastUpdated Timestamp of the last update
     */
    function getHoldingPeriodRule(address token)
        external
        view
        returns (bool isActive, uint256 minimumHoldingPeriod, uint256 transferCooldown, uint256 lastUpdated);

    /**
     * @dev Get compliance level-based rules for a token
     * @param token Token contract address
     * @return isActive Whether the rule is active
     * @return minimumLevel Minimum compliance level required
     * @return maximumLevel Maximum compliance level allowed
     * @return lastUpdated Timestamp of the last update
     */
    function getComplianceLevelRule(address token)
        external
        view
        returns (bool isActive, uint8 minimumLevel, uint8 maximumLevel, uint256 lastUpdated);
}
