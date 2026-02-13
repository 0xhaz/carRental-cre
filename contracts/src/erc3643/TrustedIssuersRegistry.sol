// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITrustedIssuerRegistry} from "../interfaces/erc3643/ITrustedIssuerRegistry.sol";

/**
 * @title TrustedIssuersRegistry
 * @dev Implementation of ITrustedIssuerRegistry for managing trusted claim issuers
 */
contract TrustedIssuersRegistry is ITrustedIssuerRegistry, Ownable {
    /// @notice Array of trusted issuers
    address[] private _trustedIssuers;

    /// @notice Mapping to check if an issuer is trusted
    mapping(address => bool) private _isTrustedIssuer;

    /// @notice  Mapping from issuer address to their claim topics
    mapping(address => uint256[]) private _issuerClaimTopics;

    /// @notice  Mapping to check if an issuer has a specific claim topic
    mapping(address => mapping(uint256 => bool)) private _issuerHasClaimTopic;

    constructor() Ownable(msg.sender) {}

    /// @inheritdoc ITrustedIssuerRegistry
    function addTrustedIssuer(address _trustedIssuer, uint256[] calldata _claimTopics) external override onlyOwner {
        if (_trustedIssuer == address(0)) revert TrustedIssuerRegistry__InvalidIssuerAddress();
        if (_isTrustedIssuer[_trustedIssuer]) revert TrustedIssuerRegistry__IssuerAlreadyTrusted();
        if (_claimTopics.length == 0) revert TrustedIssuerRegistry__MustSpecifyClaimTopics();

        _trustedIssuers.push(_trustedIssuer);
        _isTrustedIssuer[_trustedIssuer] = true;

        // Store claim topics
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            _issuerClaimTopics[_trustedIssuer].push(_claimTopics[i]);
            _issuerHasClaimTopic[_trustedIssuer][_claimTopics[i]] = true;
        }

        emit TrustedIssuerAdded(_trustedIssuer, _claimTopics);
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function removeTrustedIssuer(address _trustedIssuer) external override onlyOwner {
        if (!_isTrustedIssuer[_trustedIssuer]) revert TrustedIssuerRegistry__IssuerNotTrusted();

        for (uint256 i = 0; i < _trustedIssuers.length; i++) {
            if (_trustedIssuers[i] == _trustedIssuer) {
                _trustedIssuers[i] = _trustedIssuers[_trustedIssuers.length - 1];
                _trustedIssuers.pop();
                break;
            }
        }

        // Clear claim topics
        uint256[] memory claimTopics = _issuerClaimTopics[_trustedIssuer];
        for (uint256 i = 0; i < claimTopics.length; i++) {
            _issuerHasClaimTopic[_trustedIssuer][claimTopics[i]] = false;
        }
        delete _issuerClaimTopics[_trustedIssuer];

        _isTrustedIssuer[_trustedIssuer] = false;

        emit TrustedIssuerRemoved(_trustedIssuer);
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function updateIssuerClaimTopics(address _trustedIssuer, uint256[] calldata _claimTopics)
        external
        override
        onlyOwner
    {
        if (!_isTrustedIssuer[_trustedIssuer]) revert TrustedIssuerRegistry__IssuerNotTrusted();
        if (_claimTopics.length == 0) revert TrustedIssuerRegistry__MustSpecifyClaimTopics();

        // Clear existing claim topics
        uint256[] memory existingTopics = _issuerClaimTopics[_trustedIssuer];
        for (uint256 i = 0; i < existingTopics.length; i++) {
            _issuerHasClaimTopic[_trustedIssuer][existingTopics[i]] = false;
        }
        delete _issuerClaimTopics[_trustedIssuer];

        // Store new claim topics
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            _issuerClaimTopics[_trustedIssuer].push(_claimTopics[i]);
            _issuerHasClaimTopic[_trustedIssuer][_claimTopics[i]] = true;
        }

        emit ClaimTopicsUpdated(_trustedIssuer, _claimTopics);
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function getTrustedIssuers() external view override returns (address[] memory) {
        return _trustedIssuers;
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function isTrustedIssuer(address _issuer) external view override returns (bool) {
        return _isTrustedIssuer[_issuer];
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function getTrustedIssuerClaimTopics(address _trustedIssuer) external view override returns (uint256[] memory) {
        if (!_isTrustedIssuer[_trustedIssuer]) revert TrustedIssuerRegistry__IssuerNotTrusted();
        return _issuerClaimTopics[_trustedIssuer];
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function hasClaimTopic(address _trustedIssuer, uint256 _claimTopic) external view override returns (bool) {
        return _issuerHasClaimTopic[_trustedIssuer][_claimTopic];
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function getTrustedIssuersForClaimTopic(uint256 _claimTopic) external view override returns (address[] memory) {
        address[] memory issuersWithTopic = new address[](_trustedIssuers.length);
        uint256 count = 0;

        for (uint256 i = 0; i < _trustedIssuers.length; i++) {
            if (_issuerHasClaimTopic[_trustedIssuers[i]][_claimTopic]) {
                issuersWithTopic[count] = _trustedIssuers[i];
                count++;
            }
        }

        // Resize array to actual count
        address[] memory result = new address[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = issuersWithTopic[j];
        }

        return result;
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function getTrustedIssuersCount() external view override returns (uint256) {
        return _trustedIssuers.length;
    }

    /// @inheritdoc ITrustedIssuerRegistry
    function getTrustedIssuerByIndex(uint256 _index) external view override returns (address) {
        if (_index >= _trustedIssuers.length) revert TrustedIssuerRegistry__IndexOutOfBounds();
        return _trustedIssuers[_index];
    }
}
