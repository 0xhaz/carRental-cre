// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title ITrustedIssuerRegistry
 * @dev Interface for managing trusted claim issuers in ERC-3643 ecosystem
 */
interface ITrustedIssuerRegistry {
    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error TrustedIssuerRegistry__InvalidIssuerAddress();
    error TrustedIssuerRegistry__IssuerAlreadyTrusted();
    error TrustedIssuerRegistry__MustSpecifyClaimTopics();
    error TrustedIssuerRegistry__IssuerNotTrusted();
    error TrustedIssuerRegistry__IndexOutOfBounds();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a trusted issuer is added
    event TrustedIssuerAdded(address indexed issuer, uint256[] indexed claimTopics);

    /// @notice Emitted when a trusted issuer is removed
    event TrustedIssuerRemoved(address indexed issuer);

    /// @notice Emitted when claim topics for a trusted issuer are updated
    event ClaimTopicsUpdated(address indexed issuer, uint256[] indexed claimTopics);

    /*//////////////////////////////////////////////////////////////
                            TRUSTED ISSUER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Add a trusted issuer with associated claim topics
     * @param _trustedIssuer The address of the trusted issuer
     * @param _claimTopics The claim topics associated with the issuer
     */
    function addTrustedIssuer(address _trustedIssuer, uint256[] calldata _claimTopics) external;

    /**
     * @dev Remove a trusted issuer
     * @param _trustedIssuer The address of the trusted issuer to remove
     */
    function removeTrustedIssuer(address _trustedIssuer) external;

    /**
     * @dev Update claim topics for a trusted issuer
     * @param _trustedIssuer The address of the trusted issuer
     * @param _claimTopics The new claim topics to associate with the issuer
     */
    function updateIssuerClaimTopics(address _trustedIssuer, uint256[] calldata _claimTopics) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Check if an issuer is trusted
     * @param _issuer The address of the issuer to check
     * @return True if the issuer is trusted, false otherwise
     */
    function isTrustedIssuer(address _issuer) external view returns (bool);

    /**
     * @dev Get trusted issuer status based on claim topics
     * @return Address of the trusted issuer
     */
    function getTrustedIssuers() external view returns (address[] memory);

    /**
     * @dev Get claim topics associated with a trusted issuer
     * @param _trustedIssuer The address of the trusted issuer
     * @return An array of claim topics associated with the issuer
     */
    function getTrustedIssuerClaimTopics(address _trustedIssuer) external view returns (uint256[] memory);

    /**
     * @dev Check if a trusted issuer has a specific claim topic
     * @param _trustedIssuer The address of the trusted issuer
     * @param _claimTopic The claim topic to check
     * @return True if the issuer has the claim topic, false otherwise
     */
    function hasClaimTopic(address _trustedIssuer, uint256 _claimTopic) external view returns (bool);

    /**
     * @dev Get all trusted issuers for a specific claim topic
     * @param _claimTopic The claim topic to query
     * @return An array of trusted issuer addresses associated with the claim topic
     */
    function getTrustedIssuersForClaimTopic(uint256 _claimTopic) external view returns (address[] memory);

    /**
     * @dev Get the total number of trusted issuers
     * @return The count of trusted issuers
     */
    function getTrustedIssuersCount() external view returns (uint256);

    /**
     * @dev Get the trusted issuer address by index
     * @param _index The index of the trusted issuer
     * @return The address of the trusted issuer at the specified index
     */
    function getTrustedIssuerByIndex(uint256 _index) external view returns (address);
}
