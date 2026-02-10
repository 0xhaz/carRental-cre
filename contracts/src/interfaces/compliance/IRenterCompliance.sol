// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRenterCompliance
 * @dev Interface for renter compliance validation in rental car platform
 * @notice Validates renters based on age, driver license, insurance, credit score, and incident history
 */
interface IRenterCompliance {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error RenterCompliance__InvalidAddress();
    error RenterCompliance__InvalidIdentityRegistry();
    error RenterCompliance__InvalidOracleManager();
    error RenterCompliance__RenterNotVerified();
    error RenterCompliance__AgeRequirementNotMet();
    error RenterCompliance__DriverLicenseInvalid();
    error RenterCompliance__InsuranceNotVerified();
    error RenterCompliance__CreditScoreTooLow();
    error RenterCompliance__TooManyIncidents();
    error RenterCompliance__RenterBlacklisted();

    /*//////////////////////////////////////////////////////////////
                                  ENUM
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validation result reasons for renter compliance
     */
    enum RenterValidationReason {
        VALID,
        AGE_TOO_LOW,
        DRIVER_LICENSE_EXPIRED,
        DRIVER_LICENSE_SUSPENDED,
        NO_DRIVER_LICENSE,
        INSURANCE_NOT_VERIFIED,
        INSURANCE_EXPIRED,
        CREDIT_SCORE_INSUFFICIENT,
        TOO_MANY_RECENT_INCIDENTS,
        BLACKLISTED,
        IDENTITY_NOT_VERIFIED
    }

    /**
     * @dev Credit score tiers
     */
    enum CreditScoreTier {
        NONE,           // No score available
        POOR,           // <580
        FAIR,           // 580-669
        GOOD,           // 670-739
        VERY_GOOD,      // 740-799
        EXCELLENT       // 800+
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Renter validation result
     * @param isValid Whether the renter passes all checks
     * @param reason Reason code for the validation result
     * @param renterProfile Profile data used for validation
     */
    struct RenterValidationResult {
        bool isValid;
        RenterValidationReason reason;
        RenterProfile renterProfile;
    }

    /**
     * @dev Renter profile data
     * @param hasValidIdentity Whether OnchainID is verified
     * @param age Age of the renter
     * @param hasDriverLicense Whether driver license claim exists
     * @param driverLicenseExpiry Driver license expiration timestamp
     * @param hasInsurance Whether insurance claim exists
     * @param insuranceExpiry Insurance expiration timestamp
     * @param creditScoreTier Credit score tier
     * @param incidentCount Number of incidents in the last 12 months
     * @param isBlacklisted Whether the renter is blacklisted
     */
    struct RenterProfile {
        bool hasValidIdentity;
        uint8 age;
        bool hasDriverLicense;
        uint256 driverLicenseExpiry;
        bool hasInsurance;
        uint256 insuranceExpiry;
        CreditScoreTier creditScoreTier;
        uint256 incidentCount;
        bool isBlacklisted;
    }

    /**
     * @dev Renter compliance requirements
     * @param minimumAge Minimum age requirement (default: 21)
     * @param minimumCreditScoreTier Minimum credit score tier required
     * @param maxIncidentCount Maximum allowed incidents in 12 months
     * @param requireInsurance Whether insurance verification is required
     * @param requireDriverLicense Whether driver license verification is required
     */
    struct RenterRequirements {
        uint8 minimumAge;
        CreditScoreTier minimumCreditScoreTier;
        uint256 maxIncidentCount;
        bool requireInsurance;
        bool requireDriverLicense;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a renter is validated
    event RenterValidated(
        address indexed renter,
        bool isValid,
        RenterValidationReason reason,
        uint256 timestamp
    );

    /// @notice Emitted when renter requirements are updated
    event RenterRequirementsUpdated(
        uint8 minimumAge,
        CreditScoreTier minimumCreditScoreTier,
        uint256 maxIncidentCount
    );

    /// @notice Emitted when a renter is blacklisted
    event RenterBlacklisted(
        address indexed renter,
        string reason,
        uint256 timestamp
    );

    /// @notice Emitted when a renter is removed from blacklist
    event RenterRemovedFromBlacklist(
        address indexed renter,
        uint256 timestamp
    );

    /// @notice Emitted when an incident is recorded
    event IncidentRecorded(
        address indexed renter,
        uint256 vehicleId,
        string incidentType,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                        VALIDATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Validate if a renter meets all compliance requirements
     * @param renter Address of the renter
     * @return result Complete validation result with profile data
     */
    function validateRenter(address renter) external view returns (RenterValidationResult memory result);

    /**
     * @dev Check if renter meets age requirement
     * @param renter Address of the renter
     * @return isValid Whether age requirement is met
     * @return age Current age of the renter
     */
    function validateAge(address renter) external view returns (bool isValid, uint8 age);

    /**
     * @dev Check if renter has valid driver license
     * @param renter Address of the renter
     * @return isValid Whether driver license is valid
     * @return expiryTime License expiration timestamp
     */
    function validateDriverLicense(address renter) external view returns (bool isValid, uint256 expiryTime);

    /**
     * @dev Check if renter has valid insurance
     * @param renter Address of the renter
     * @return isValid Whether insurance is valid
     * @return expiryTime Insurance expiration timestamp
     */
    function validateInsurance(address renter) external view returns (bool isValid, uint256 expiryTime);

    /**
     * @dev Check if renter meets credit score requirement
     * @param renter Address of the renter
     * @return isValid Whether credit score requirement is met
     * @return creditTier Current credit score tier
     */
    function validateCreditScore(address renter) external view returns (bool isValid, CreditScoreTier creditTier);

    /**
     * @dev Check if renter's incident history is acceptable
     * @param renter Address of the renter
     * @return isValid Whether incident history is acceptable
     * @return incidentCount Number of incidents in the last 12 months
     */
    function validateIncidentHistory(address renter) external view returns (bool isValid, uint256 incidentCount);

    /*//////////////////////////////////////////////////////////////
                        MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Update renter compliance requirements
     * @param requirements New requirements to set
     */
    function setRenterRequirements(RenterRequirements calldata requirements) external;

    /**
     * @dev Record an incident for a renter
     * @param renter Address of the renter
     * @param vehicleId ID of the vehicle involved
     * @param incidentType Type of incident (e.g., "accident", "damage", "late_return")
     */
    function recordIncident(address renter, uint256 vehicleId, string calldata incidentType) external;

    /**
     * @dev Add renter to blacklist
     * @param renter Address of the renter
     * @param reason Reason for blacklisting
     */
    function blacklistRenter(address renter, string calldata reason) external;

    /**
     * @dev Remove renter from blacklist
     * @param renter Address of the renter
     */
    function removeRenterFromBlacklist(address renter) external;

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get current renter requirements
     * @return requirements Current renter requirements
     */
    function getRenterRequirements() external view returns (RenterRequirements memory requirements);

    /**
     * @dev Get renter profile
     * @param renter Address of the renter
     * @return profile Complete renter profile
     */
    function getRenterProfile(address renter) external view returns (RenterProfile memory profile);

    /**
     * @dev Check if renter is blacklisted
     * @param renter Address of the renter
     * @return isBlacklisted Whether the renter is blacklisted
     */
    function isRenterBlacklisted(address renter) external view returns (bool isBlacklisted);

    /**
     * @dev Get incident count for a renter in the last N months
     * @param renter Address of the renter
     * @param months Number of months to look back
     * @return count Number of incidents
     */
    function getIncidentCount(address renter, uint256 months) external view returns (uint256 count);
}
