// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IClaimTopicsRegistry} from "../interfaces/erc3643/IClaimTopicsRegistry.sol";
import {ClaimTopics} from "../compliance/ClaimTopics.sol";

/**
 * @title ClaimTopicsRegistry
 * @dev Implementation of IClaimTopicsRegistry for managing required claim topics
 * @notice Integrated with ClaimTopics library for rental car platform
 */
contract ClaimTopicsRegistry is IClaimTopicsRegistry, Ownable {
    /// @notice Array of required claim topics
    uint256[] private _claimTopics;

    /// @notice Mapping to check if a claim topic is required
    mapping(uint256 => bool) private _isClaimTopicRequired;

    /// @notice Participant type for this registry (investor, renter, rentor)
    enum ParticipantType {
        INVESTOR,
        RENTER,
        RENTOR,
        CUSTOM
    }

    ParticipantType public participantType;

    constructor(ParticipantType _participantType) Ownable(msg.sender) {
        participantType = _participantType;
        _initializeDefaultClaimTopics();
    }

    /**
     * @dev Initialize default claim topics based on participant type
     */
    function _initializeDefaultClaimTopics() private {
        uint256[] memory defaultTopics;

        if (participantType == ParticipantType.INVESTOR) {
            defaultTopics = ClaimTopics.getInvestorClaims();
        } else if (participantType == ParticipantType.RENTER) {
            defaultTopics = ClaimTopics.getRenterClaims();
        } else if (participantType == ParticipantType.RENTOR) {
            defaultTopics = ClaimTopics.getRentorClaims();
        }

        for (uint256 i = 0; i < defaultTopics.length; i++) {
            if (!_isClaimTopicRequired[defaultTopics[i]]) {
                _claimTopics.push(defaultTopics[i]);
                _isClaimTopicRequired[defaultTopics[i]] = true;
            }
        }
    }

    /// @inheritdoc IClaimTopicsRegistry
    function addClaimTopic(uint256 claimTopic) external override onlyOwner {
        if (_isClaimTopicRequired[claimTopic]) revert ClaimTopicRegistry__ClaimTopicAlreadyExists();

        _claimTopics.push(claimTopic);
        _isClaimTopicRequired[claimTopic] = true;

        emit ClaimTopicAdded(claimTopic);
    }

    /// @inheritdoc IClaimTopicsRegistry
    function removeClaimTopic(uint256 claimTopic) external override onlyOwner {
        if (!_isClaimTopicRequired[claimTopic]) revert ClaimTopicRegistry__ClaimTopicNotRequired();

        // Find and remove the claim topic from the array
        uint256 length = _claimTopics.length;
        for (uint256 i = 0; i < length; i++) {
            if (_claimTopics[i] == claimTopic) {
                _claimTopics[i] = _claimTopics[length - 1];
                _claimTopics.pop();
                break;
            }
        }

        _isClaimTopicRequired[claimTopic] = false;

        emit ClaimTopicRemoved(claimTopic);
    }

    /// @inheritdoc IClaimTopicsRegistry
    function getClaimTopics() external view override returns (uint256[] memory) {
        return _claimTopics;
    }

    /// @inheritdoc IClaimTopicsRegistry
    function isClaimTopicRequired(uint256 claimTopic) external view override returns (bool) {
        return _isClaimTopicRequired[claimTopic];
    }

    function getClaimTopicsCount() external view returns (uint256) {
        return _claimTopics.length;
    }

    function getClaimTopicByIndex(uint256 index) external view returns (uint256) {
        if (index > _claimTopics.length - 1) revert ClaimTopicsRegistry__IndexOutOfBounds();
        return _claimTopics[index];
    }

    /**
     * @notice Get claim topic name for a given topic ID
     * @param claimTopic Claim topic ID
     * @return name Human-readable name
     */
    function getClaimTopicName(uint256 claimTopic) external pure returns (string memory name) {
        return ClaimTopics.getClaimTopicName(claimTopic);
    }

    /**
     * @notice Check if a claim topic is valid per ClaimTopics library
     * @param claimTopic Claim topic to validate
     * @return isValid Whether the claim topic is valid
     */
    function isValidClaimTopic(uint256 claimTopic) external pure returns (bool isValid) {
        return ClaimTopics.isValidClaimTopic(claimTopic);
    }

    /**
     * @notice Update participant type and reinitialize claim topics
     * @param _participantType New participant type
     */
    function updateParticipantType(ParticipantType _participantType) external onlyOwner {
        participantType = _participantType;

        // Clear existing topics
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            _isClaimTopicRequired[_claimTopics[i]] = false;
        }
        delete _claimTopics;

        // Reinitialize with new participant type
        _initializeDefaultClaimTopics();
    }
}
