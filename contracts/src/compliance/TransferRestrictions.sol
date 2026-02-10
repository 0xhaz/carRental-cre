// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TransferRestrictions
 * @dev Manages transfer restrictions for ERC-3643 tokens based on investor types
 */
contract TransferRestrictions is Ownable {
    /*//////////////////////////////////////////////////////////////
                             ENUMS
    //////////////////////////////////////////////////////////////*/
    enum RestrictionReason {
        NONE,
        HOLDING_PERIOD_VIOLATION,
        MAX_TRANSFER_AMOUNT_EXCEEDED,
        DAILY_LIMIT_EXCEEDED,
        MONTHLY_LIMIT_EXCEEDED,
        JURISDICTION_NOT_ALLOWED,
        INVESTOR_TYPE_NOT_ALLOWED,
        APPROVAL_REQUIRED
    }

    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Structure defining restriction rules for transfers
     * @param isActive Whether the restriction rule is active
     * @param holdingPeriod Minimum holding period before transfer
     * @param maxTransferAmount Maximum amount allowed per transfer
     * @param dailyLimit Maximum amount allowed to transfer daily
     * @param monthlyLimit Maximum amount allowed to transfer monthly
     * @param allowedJurisdictions List of allowed jurisdictions for transfer
     * @param allowedInvestorTypes List of allowed investor types for transfer
     * @param requiresApproval Whether the transfer requires prior approval
     */
    struct RestrictionRule {
        bool isActive;
        uint256 holdingPeriod;
        uint256 maxTransferAmount;
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint16[] allowedJurisdictions;
        uint8[] allowedInvestorTypes;
        bool requiresApproval;
    }

    /*//////////////////////////////////////////////////////////////
                           MAPPINGS
    //////////////////////////////////////////////////////////////*/
    /// @notice Mapping from token address to its transfer restriction rules
    mapping(address => RestrictionRule) private _tokenRestrictions;

    /// @notice Mapping to track last transfer times for enforcing holding periods
    mapping(address => mapping(address => uint256)) private _lastTransferTime;

    /// @notice Mappings to track daily transferred amounts
    mapping(address => mapping(address => uint256)) private _dailyTransferred;

    /// @notice Mappings to track monthly transferred amounts
    mapping(address => mapping(address => uint256)) private _monthlyTransferred;

    /// @notice Mappings to track the last reset times for daily  transfer limits
    mapping(address => mapping(address => uint256)) private _lastDailyReset;

    /// @notice Mappings to track the last reset times for monthly transfer limits
    mapping(address => mapping(address => uint256)) private _lastMonthlyReset;

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when restriction rules are updated for a token
    event RestrictionRuleUpdated(
        address indexed token,
        uint256 holdingPeriod,
        uint256 maxTransferAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit
    );

    /// @notice Emitted when a transfer is approved or restricted
    event TransferApproved(address indexed token, address indexed from, address indexed to, uint256 amount);

    /// @notice Emitted when a transfer is restricted
    event TransferRestricted(address indexed token, address indexed from, RestrictionReason reason);

    constructor(address _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set restriction rules for a specific token
     * @param token Address of the token
     * @param holdingPeriod Minimum holding period before transfer
     * @param maxTransferAmount Maximum amount allowed per transfer
     * @param dailyLimit Maximum amount allowed to transfer daily
     * @param monthlyLimit Maximum amount allowed to transfer monthly
     * @param allowedJurisdictions List of allowed jurisdictions for transfer
     * @param allowedInvestorTypes List of allowed investor types for transfer
     * @param requiresApproval Whether the transfer requires prior approval
     */
    function setRestrictionRule(
        address token,
        uint256 holdingPeriod,
        uint256 maxTransferAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint16[] calldata allowedJurisdictions,
        uint8[] calldata allowedInvestorTypes,
        bool requiresApproval
    ) external onlyOwner {
        // Create new arrays for storage
        uint16[] memory jurisdictions = new uint16[](allowedJurisdictions.length);
        uint8[] memory investorTypes = new uint8[](allowedInvestorTypes.length);

        // Copy arrays
        for (uint256 i = 0; i < allowedJurisdictions.length; i++) {
            jurisdictions[i] = allowedJurisdictions[i];
        }
        for (uint256 i = 0; i < allowedInvestorTypes.length; i++) {
            investorTypes[i] = allowedInvestorTypes[i];
        }

        _tokenRestrictions[token] = RestrictionRule({
            isActive: true,
            holdingPeriod: holdingPeriod,
            maxTransferAmount: maxTransferAmount,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            allowedJurisdictions: jurisdictions,
            allowedInvestorTypes: investorTypes,
            requiresApproval: requiresApproval
        });

        emit RestrictionRuleUpdated(token, holdingPeriod, maxTransferAmount, dailyLimit, monthlyLimit);
    }

    /**
     * @dev Get restriction rules for a specific token
     * @param token Address of the token
     * @return RestrictionRule struct containing the token's restriction rules
     */
    function getRestrictionRule(address token) external view returns (RestrictionRule memory) {
        return _tokenRestrictions[token];
    }

    /**
     * @dev Check if a transfer is allowed based on restriction rules
     * @param token Address of the token
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Boolean indicating if the transfer is allowed
     * @return RestrictionReason reason if the transfer is restricted
     */
    function canTransfer(address token, address from, address to, uint256 amount)
        external
        view
        returns (bool, RestrictionReason)
    {
        RestrictionRule memory rule = _tokenRestrictions[token];

        if (!rule.isActive) {
            return (true, RestrictionReason.NONE);
        }

        // Check holding period
        if (rule.holdingPeriod > 0) {
            uint256 lastTransfer = _lastTransferTime[token][from];
            if (lastTransfer > 0 && block.timestamp < lastTransfer + rule.holdingPeriod) {
                return (false, RestrictionReason.HOLDING_PERIOD_VIOLATION);
            }
        }

        // Check max transfer amount
        if (rule.maxTransferAmount > 0 && amount > rule.maxTransferAmount) {
            return (false, RestrictionReason.MAX_TRANSFER_AMOUNT_EXCEEDED);
        }

        // Check daily limit
        if (rule.dailyLimit > 0) {
            uint256 dailyTransferred = _getDailyTransferred(token, from);
            if (dailyTransferred + amount > rule.dailyLimit) {
                return (false, RestrictionReason.DAILY_LIMIT_EXCEEDED);
            }
        }

        // Check monthly limit
        if (rule.monthlyLimit > 0) {
            uint256 monthlyTransferred = _getMonthlyTransferred(token, from);
            if (monthlyTransferred + amount > rule.monthlyLimit) {
                return (false, RestrictionReason.MONTHLY_LIMIT_EXCEEDED);
            }
        }

        return (true, RestrictionReason.NONE);
    }

    /**
     * @dev Record a transfer
     * @dev Callable from the token contract after a successful transfer
     * @param token Address of the token
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount transferred
     */
    function recordTransfer(address token, address from, address to, uint256 amount) external {
        _lastTransferTime[token][from] = block.timestamp;

        // Update daily transferred amount
        _updateDailyTransferred(token, from, amount);

        // Update monthly transferred amount
        _updateMonthlyTransferred(token, from, amount);

        emit TransferApproved(token, from, to, amount);
    }

    /**
     * @notice Get transfer statistics for an investor
     * @param token Address of the token
     * @param from Sender address
     * @return dailyTransferred Amount transferred in the current day
     * @return monthlyTransferred Amount transferred in the current month
     * @return lastTransferTime Timestamp of the last transfer
     */
    function getTransferStats(address token, address from)
        external
        view
        returns (uint256 dailyTransferred, uint256 monthlyTransferred, uint256 lastTransferTime)
    {
        return (_getDailyTransferred(token, from), _getMonthlyTransferred(token, from), _lastTransferTime[token][from]);
    }

    /**
     * @dev Check if jurisdiction is allowed for transfer
     * @param token Address of the token
     * @param jurisdiction Jurisdiction code to check
     * @return Boolean indicating if the jurisdiction is allowed
     */
    function isJurisdictionAllowed(address token, uint16 jurisdiction) external view returns (bool) {
        RestrictionRule memory rule = _tokenRestrictions[token];

        if (rule.allowedJurisdictions.length == 0) {
            return true; // No restrictions on jurisdictions
        }

        for (uint256 i = 0; i < rule.allowedJurisdictions.length; i++) {
            if (rule.allowedJurisdictions[i] == jurisdiction) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Check if investor type is allowed for transfer
     * @param token Address of the token
     * @param investorType Investor type to check
     * @return Boolean indicating if the investor type is allowed
     */
    function isInvestorTypeAllowed(address token, uint8 investorType) external view returns (bool) {
        RestrictionRule memory rule = _tokenRestrictions[token];

        if (rule.allowedInvestorTypes.length == 0) {
            return true; // No restrictions on investor types
        }

        for (uint256 i = 0; i < rule.allowedInvestorTypes.length; i++) {
            if (rule.allowedInvestorTypes[i] == investorType) {
                return true;
            }
        }

        return false;
    }

    /*///////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get daily transferred amount (with reset logic)
     * @param token Address of the token
     * @param from Sender address
     * @return Daily transferred amount
     */
    function _getDailyTransferred(address token, address from) internal view returns (uint256) {
        uint256 lastReset = _lastDailyReset[token][from];
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastReset / 1 days;

        if (currentDay > lastResetDay) {
            return 0;
        }

        return _dailyTransferred[token][from];
    }

    /**
     * @dev Get monthly transferred amount (with reset logic)
     * @param token Address of the token
     * @param from Sender address
     * @return Monthly transferred amount
     */
    function _getMonthlyTransferred(address token, address from) internal view returns (uint256) {
        uint256 lastReset = _lastMonthlyReset[token][from];
        uint256 currentMonth = block.timestamp / 30 days;
        uint256 lastResetMonth = lastReset / 30 days;

        if (currentMonth > lastResetMonth) {
            return 0;
        }

        return _monthlyTransferred[token][from];
    }

    /**
     * @dev Update daily transferred amount
     * @param token Address of the token
     * @param from Sender address
     * @param amount Amount transferred
     */
    function _updateDailyTransferred(address token, address from, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = _lastDailyReset[token][from] / 1 days;

        if (currentDay > lastResetDay) {
            _dailyTransferred[token][from] = amount;
            _lastDailyReset[token][from] = block.timestamp;
        } else {
            _dailyTransferred[token][from] += amount;
        }
    }

    /**
     * @dev Update monthly transferred amount
     * @param token Address of the token
     * @param from Sender address
     * @param amount Amount transferred
     */
    function _updateMonthlyTransferred(address token, address from, uint256 amount) internal {
        uint256 currentMonth = block.timestamp / 30 days;
        uint256 lastResetMonth = _lastMonthlyReset[token][from] / 30 days;

        if (currentMonth > lastResetMonth) {
            _monthlyTransferred[token][from] = amount;
            _lastMonthlyReset[token][from] = block.timestamp;
        } else {
            _monthlyTransferred[token][from] += amount;
        }
    }
}
