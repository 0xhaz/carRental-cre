// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IClaimTopicsRegistry
 * @dev Interface for managing required claim topics in ERC-3643 ecosystem
 */
interface IClaimTopicsRegistry {
    /*//////////////////////////////////////////////////////////////
                                CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error ClaimTopicRegistry__ClaimTopicAlreadyExists();
    error ClaimTopicRegistry__ClaimTopicNotRequired();
    error ClaimTopicsRegistry__IndexOutOfBounds();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a claim topic is added
    event ClaimTopicAdded(uint256 indexed claimTopic);

    /// @notice Emitted when a claim topic is removed
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    /*//////////////////////////////////////////////////////////////
                            CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add a required claim topic
     * @param claimTopic The claim topic to add
     */
    function addClaimTopic(uint256 claimTopic) external;

    /**
     * @dev Remove a required claim topic
     * @param claimTopic The claim topic to remove
     */
    function removeClaimTopic(uint256 claimTopic) external;

    /**
     * @dev Get the list of required claim topics
     * @return An array of required claim topics
     */
    function getClaimTopics() external view returns (uint256[] memory);

    /**
     * @dev Check if a claim topic is required
     * @param claimTopic The claim topic to check
     * @return True if the claim topic is required, false otherwise
     */
    function isClaimTopicRequired(uint256 claimTopic) external view returns (bool);
}
