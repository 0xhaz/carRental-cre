// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ClaimTopics
 * @dev Centralized claim topic constants for OnchainID system (ERC-734/735)
 * @notice These claim topics are used across the rental car tokenization platform
 *
 * Claim Structure as per ARCHITECTURE.md:
 * - 1: KYC Verified
 * - 2: Accredited Investor
 * - 3: Regional Eligibility (per jurisdiction)
 * - 4: Driver License Valid
 * - 5: Insurance Verified
 * - 6: Credit Score Range
 * - 7: Business Registered
 * - 8: Vehicle Ownership Proof
 */
library ClaimTopics {
    /*//////////////////////////////////////////////////////////////
                        IDENTITY & KYC CLAIMS
    //////////////////////////////////////////////////////////////*/

    /// @notice KYC verification claim - Required for all participants
    uint256 public constant KYC_VERIFIED = 1;

    /*//////////////////////////////////////////////////////////////
                        INVESTOR CLAIMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Accredited investor status - Required for investment activities
    uint256 public constant ACCREDITED_INVESTOR = 2;

    /// @notice Regional eligibility claim - Jurisdiction-specific investment rights
    uint256 public constant REGIONAL_ELIGIBILITY = 3;

    /*//////////////////////////////////////////////////////////////
                        RENTER CLAIMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Driver license validity - Required for renters
    uint256 public constant DRIVER_LICENSE_VALID = 4;

    /// @notice Insurance verification - Required for renters
    uint256 public constant INSURANCE_VERIFIED = 5;

    /// @notice Credit score range - Used for renter risk assessment
    uint256 public constant CREDIT_SCORE_RANGE = 6;

    /*//////////////////////////////////////////////////////////////
                        RENTOR (BUSINESS) CLAIMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Business registration - Required for rentors (vehicle owners)
    uint256 public constant BUSINESS_REGISTERED = 7;

    /// @notice Vehicle ownership proof - Links physical vehicle to digital asset
    uint256 public constant VEHICLE_OWNERSHIP_PROOF = 8;

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get all investor-required claim topics
     * @return claims Array of claim topics required for investors
     */
    function getInvestorClaims() internal pure returns (uint256[] memory claims) {
        claims = new uint256[](3);
        claims[0] = KYC_VERIFIED;
        claims[1] = ACCREDITED_INVESTOR;
        claims[2] = REGIONAL_ELIGIBILITY;
        return claims;
    }

    /**
     * @dev Get all renter-required claim topics
     * @return claims Array of claim topics required for renters
     */
    function getRenterClaims() internal pure returns (uint256[] memory claims) {
        claims = new uint256[](4);
        claims[0] = KYC_VERIFIED;
        claims[1] = DRIVER_LICENSE_VALID;
        claims[2] = INSURANCE_VERIFIED;
        claims[3] = CREDIT_SCORE_RANGE;
        return claims;
    }

    /**
     * @dev Get all rentor (business) required claim topics
     * @return claims Array of claim topics required for rentors
     */
    function getRentorClaims() internal pure returns (uint256[] memory claims) {
        claims = new uint256[](3);
        claims[0] = KYC_VERIFIED;
        claims[1] = BUSINESS_REGISTERED;
        claims[2] = VEHICLE_OWNERSHIP_PROOF;
        return claims;
    }

    /**
     * @dev Check if a claim topic is valid
     * @param claimTopic Claim topic to validate
     * @return isValid Whether the claim topic is within valid range
     */
    function isValidClaimTopic(uint256 claimTopic) internal pure returns (bool isValid) {
        return claimTopic >= 1 && claimTopic <= 8;
    }

    /**
     * @dev Get claim topic name for debugging/logging
     * @param claimTopic Claim topic
     * @return name Human-readable claim topic name
     */
    function getClaimTopicName(uint256 claimTopic) internal pure returns (string memory name) {
        if (claimTopic == KYC_VERIFIED) return "KYC_VERIFIED";
        if (claimTopic == ACCREDITED_INVESTOR) return "ACCREDITED_INVESTOR";
        if (claimTopic == REGIONAL_ELIGIBILITY) return "REGIONAL_ELIGIBILITY";
        if (claimTopic == DRIVER_LICENSE_VALID) return "DRIVER_LICENSE_VALID";
        if (claimTopic == INSURANCE_VERIFIED) return "INSURANCE_VERIFIED";
        if (claimTopic == CREDIT_SCORE_RANGE) return "CREDIT_SCORE_RANGE";
        if (claimTopic == BUSINESS_REGISTERED) return "BUSINESS_REGISTERED";
        if (claimTopic == VEHICLE_OWNERSHIP_PROOF) return "VEHICLE_OWNERSHIP_PROOF";
        return "UNKNOWN";
    }
}
