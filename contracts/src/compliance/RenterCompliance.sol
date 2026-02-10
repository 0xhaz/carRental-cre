// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {IOnchainID} from "../interfaces/erc3643/IOnchainID.sol";
import {ClaimTopics} from "./ClaimTopics.sol";

/**
 * @title RenterCompliance
 * @dev Implementation of renter compliance validation for rental car platform
 * @notice Validates renters based on age, driver license, insurance, credit score, and incident history
 */
contract RenterCompliance is IRenterCompliance, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Identity registry for OnchainID lookups
    IIdentityRegistry public identityRegistry;

    /// @notice Current renter requirements
    RenterRequirements private _requirements;

    /*//////////////////////////////////////////////////////////////
                                MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /// @notice Blacklist mapping
    mapping(address => bool) private _blacklistedRenters;

    /// @notice Blacklist reasons
    mapping(address => string) private _blacklistReasons;

    /// @notice Incident records per renter
    mapping(address => IncidentRecord[]) private _incidents;

    /// @notice Authorized operators (e.g., rental platform contracts)
    mapping(address => bool) private _authorizedOperators;

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Internal incident record structure
    struct IncidentRecord {
        uint256 vehicleId;
        uint256 timestamp;
        string incidentType;
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedOperator() {
        if (!_authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert RenterCompliance__InvalidAddress();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _identityRegistry, address _owner) Ownable(_owner) {
        if (_identityRegistry == address(0)) {
            revert RenterCompliance__InvalidIdentityRegistry();
        }

        identityRegistry = IIdentityRegistry(_identityRegistry);

        // Set default requirements per ARCHITECTURE.md
        _requirements = RenterRequirements({
            minimumAge: 21,
            minimumCreditScoreTier: CreditScoreTier.FAIR,
            maxIncidentCount: 3,
            requireInsurance: true,
            requireDriverLicense: true
        });

        // Owner is authorized by default
        _authorizedOperators[_owner] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        VALIDATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRenterCompliance
    function validateRenter(address renter) external view override returns (RenterValidationResult memory result) {
        // Build renter profile
        RenterProfile memory profile = _buildRenterProfile(renter);
        result.renterProfile = profile;

        // Check blacklist first
        if (profile.isBlacklisted) {
            result.isValid = false;
            result.reason = RenterValidationReason.BLACKLISTED;
            return result;
        }

        // Check identity verification
        if (!profile.hasValidIdentity) {
            result.isValid = false;
            result.reason = RenterValidationReason.IDENTITY_NOT_VERIFIED;
            return result;
        }

        // Check age requirement
        if (profile.age < _requirements.minimumAge) {
            result.isValid = false;
            result.reason = RenterValidationReason.AGE_TOO_LOW;
            return result;
        }

        // Check driver license
        if (_requirements.requireDriverLicense) {
            if (!profile.hasDriverLicense) {
                result.isValid = false;
                result.reason = RenterValidationReason.NO_DRIVER_LICENSE;
                return result;
            }
            if (profile.driverLicenseExpiry < block.timestamp) {
                result.isValid = false;
                result.reason = RenterValidationReason.DRIVER_LICENSE_EXPIRED;
                return result;
            }
        }

        // Check insurance
        if (_requirements.requireInsurance) {
            if (!profile.hasInsurance) {
                result.isValid = false;
                result.reason = RenterValidationReason.INSURANCE_NOT_VERIFIED;
                return result;
            }
            if (profile.insuranceExpiry < block.timestamp) {
                result.isValid = false;
                result.reason = RenterValidationReason.INSURANCE_EXPIRED;
                return result;
            }
        }

        // Check credit score
        if (profile.creditScoreTier < _requirements.minimumCreditScoreTier) {
            result.isValid = false;
            result.reason = RenterValidationReason.CREDIT_SCORE_INSUFFICIENT;
            return result;
        }

        // Check incident history
        if (profile.incidentCount > _requirements.maxIncidentCount) {
            result.isValid = false;
            result.reason = RenterValidationReason.TOO_MANY_RECENT_INCIDENTS;
            return result;
        }

        // All checks passed
        result.isValid = true;
        result.reason = RenterValidationReason.VALID;
        return result;
    }

    /// @inheritdoc IRenterCompliance
    function validateAge(address renter) external view override returns (bool isValid, uint8 age) {
        age = _getAge(renter);
        isValid = age >= _requirements.minimumAge;
    }

    /// @inheritdoc IRenterCompliance
    function validateDriverLicense(address renter) external view override returns (bool isValid, uint256 expiryTime) {
        (bool hasLicense, uint256 expiry) = _getDriverLicenseInfo(renter);
        expiryTime = expiry;
        isValid = hasLicense && expiry >= block.timestamp;
    }

    /// @inheritdoc IRenterCompliance
    function validateInsurance(address renter) external view override returns (bool isValid, uint256 expiryTime) {
        (bool hasInsurance, uint256 expiry) = _getInsuranceInfo(renter);
        expiryTime = expiry;
        isValid = hasInsurance && expiry >= block.timestamp;
    }

    /// @inheritdoc IRenterCompliance
    function validateCreditScore(address renter)
        external
        view
        override
        returns (bool isValid, CreditScoreTier creditTier)
    {
        creditTier = _getCreditScoreTier(renter);
        isValid = creditTier >= _requirements.minimumCreditScoreTier;
    }

    /// @inheritdoc IRenterCompliance
    function validateIncidentHistory(address renter)
        external
        view
        override
        returns (bool isValid, uint256 incidentCount)
    {
        incidentCount = _getRecentIncidentCount(renter, 12); // Last 12 months
        isValid = incidentCount <= _requirements.maxIncidentCount;
    }

    /*//////////////////////////////////////////////////////////////
                        MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRenterCompliance
    function setRenterRequirements(RenterRequirements calldata requirements) external override onlyOwner {
        _requirements = requirements;

        emit RenterRequirementsUpdated(
            requirements.minimumAge, requirements.minimumCreditScoreTier, requirements.maxIncidentCount
        );
    }

    /// @inheritdoc IRenterCompliance
    function recordIncident(address renter, uint256 vehicleId, string calldata incidentType)
        external
        override
        onlyAuthorizedOperator
    {
        _incidents[renter].push(
            IncidentRecord({vehicleId: vehicleId, timestamp: block.timestamp, incidentType: incidentType})
        );

        emit IncidentRecorded(renter, vehicleId, incidentType, block.timestamp);
    }

    /// @inheritdoc IRenterCompliance
    function blacklistRenter(address renter, string calldata reason) external override onlyOwner {
        if (renter == address(0)) revert RenterCompliance__InvalidAddress();

        _blacklistedRenters[renter] = true;
        _blacklistReasons[renter] = reason;

        emit RenterBlacklisted(renter, reason, block.timestamp);
    }

    /// @inheritdoc IRenterCompliance
    function removeRenterFromBlacklist(address renter) external override onlyOwner {
        _blacklistedRenters[renter] = false;
        delete _blacklistReasons[renter];

        emit RenterRemovedFromBlacklist(renter, block.timestamp);
    }

    /**
     * @notice Set authorized operator status
     * @param operator Address of the operator
     * @param authorized Whether the operator is authorized
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert RenterCompliance__InvalidAddress();
        _authorizedOperators[operator] = authorized;
    }

    /**
     * @notice Update identity registry address
     * @param _identityRegistry New identity registry address
     */
    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        if (_identityRegistry == address(0)) {
            revert RenterCompliance__InvalidIdentityRegistry();
        }
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRenterCompliance
    function getRenterRequirements() external view override returns (RenterRequirements memory requirements) {
        return _requirements;
    }

    /// @inheritdoc IRenterCompliance
    function getRenterProfile(address renter) external view override returns (RenterProfile memory profile) {
        return _buildRenterProfile(renter);
    }

    /// @inheritdoc IRenterCompliance
    function isRenterBlacklisted(address renter) external view override returns (bool isBlacklisted) {
        return _blacklistedRenters[renter];
    }

    /// @inheritdoc IRenterCompliance
    function getIncidentCount(address renter, uint256 months) external view override returns (uint256 count) {
        return _getRecentIncidentCount(renter, months);
    }

    /**
     * @notice Get blacklist reason for a renter
     * @param renter Address of the renter
     * @return reason Blacklist reason
     */
    function getBlacklistReason(address renter) external view returns (string memory reason) {
        return _blacklistReasons[renter];
    }

    /**
     * @notice Check if address is authorized operator
     * @param operator Address to check
     * @return authorized Whether the address is authorized
     */
    function isAuthorizedOperator(address operator) external view returns (bool authorized) {
        return _authorizedOperators[operator];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Build complete renter profile
     * @param renter Address of the renter
     * @return profile Complete renter profile
     */
    function _buildRenterProfile(address renter) internal view returns (RenterProfile memory profile) {
        // Check identity verification
        address onchainId = identityRegistry.identity(renter);
        profile.hasValidIdentity = identityRegistry.isVerified(renter);

        if (!profile.hasValidIdentity) {
            return profile;
        }

        // Get age
        profile.age = _getAge(renter);

        // Get driver license info
        (profile.hasDriverLicense, profile.driverLicenseExpiry) = _getDriverLicenseInfo(renter);

        // Get insurance info
        (profile.hasInsurance, profile.insuranceExpiry) = _getInsuranceInfo(renter);

        // Get credit score
        profile.creditScoreTier = _getCreditScoreTier(renter);

        // Get incident count (last 12 months)
        profile.incidentCount = _getRecentIncidentCount(renter, 12);

        // Check blacklist
        profile.isBlacklisted = _blacklistedRenters[renter];

        return profile;
    }

    /**
     * @dev Get age from OnchainID claims
     * @param renter Address of the renter
     * @return age Age of the renter
     */
    function _getAge(address renter) internal view returns (uint8 age) {
        address onchainId = identityRegistry.identity(renter);
        if (onchainId == address(0)) return 0;

        // In a real implementation, this would parse the KYC claim data
        // For now, we'll assume the age is stored in the identity registry
        // or can be calculated from OnchainID claims

        // Placeholder: Return age based on Oracle data or OnchainID claims
        // This would integrate with Chainlink CRE in production
        return 25; // Placeholder
    }

    /**
     * @dev Get driver license information from OnchainID
     * @param renter Address of the renter
     * @return hasLicense Whether renter has driver license claim
     * @return expiry License expiration timestamp
     */
    function _getDriverLicenseInfo(address renter) internal view returns (bool hasLicense, uint256 expiry) {
        address onchainId = identityRegistry.identity(renter);
        if (onchainId == address(0)) return (false, 0);

        IOnchainID identity = IOnchainID(onchainId);

        try identity.getClaimIdsByTopic(ClaimTopics.DRIVER_LICENSE_VALID) returns (bytes32[] memory claimIds) {
            if (claimIds.length > 0) {
                hasLicense = true;
                // In production, would parse claim data for expiry date
                // For now, assume 2 years validity from now
                expiry = block.timestamp + 730 days;
            }
        } catch {
            return (false, 0);
        }
    }

    /**
     * @dev Get insurance information from OnchainID
     * @param renter Address of the renter
     * @return hasInsurance Whether renter has insurance claim
     * @return expiry Insurance expiration timestamp
     */
    function _getInsuranceInfo(address renter) internal view returns (bool hasInsurance, uint256 expiry) {
        address onchainId = identityRegistry.identity(renter);
        if (onchainId == address(0)) return (false, 0);

        IOnchainID identity = IOnchainID(onchainId);

        try identity.getClaimIdsByTopic(ClaimTopics.INSURANCE_VERIFIED) returns (bytes32[] memory claimIds) {
            if (claimIds.length > 0) {
                hasInsurance = true;
                // In production, would parse claim data for expiry date
                // For now, assume 1 year validity from now
                expiry = block.timestamp + 365 days;
            }
        } catch {
            return (false, 0);
        }
    }

    /**
     * @dev Get credit score tier from OnchainID
     * @param renter Address of the renter
     * @return tier Credit score tier
     */
    function _getCreditScoreTier(address renter) internal view returns (CreditScoreTier tier) {
        address onchainId = identityRegistry.identity(renter);
        if (onchainId == address(0)) return CreditScoreTier.NONE;

        IOnchainID identity = IOnchainID(onchainId);

        try identity.getClaimIdsByTopic(ClaimTopics.CREDIT_SCORE_RANGE) returns (bytes32[] memory claimIds) {
            if (claimIds.length > 0) {
                // In production, would parse claim data for actual score
                // and map to tier. For now, return GOOD as placeholder
                return CreditScoreTier.GOOD;
            }
        } catch {
            return CreditScoreTier.NONE;
        }

        return CreditScoreTier.NONE;
    }

    /**
     * @dev Get recent incident count for a renter
     * @param renter Address of the renter
     * @param months Number of months to look back
     * @return count Incident count
     */
    function _getRecentIncidentCount(address renter, uint256 months) internal view returns (uint256 count) {
        uint256 cutoffTime = block.timestamp - (months * 30 days);
        IncidentRecord[] storage incidents = _incidents[renter];

        for (uint256 i = 0; i < incidents.length; i++) {
            if (incidents[i].timestamp >= cutoffTime) {
                count++;
            }
        }

        return count;
    }
}
