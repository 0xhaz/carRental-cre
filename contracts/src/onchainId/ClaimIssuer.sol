// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOnchainID} from "../interfaces/erc3643/IOnchainID.sol";
import {ClaimTopics} from "../compliance/ClaimTopics.sol";

/**
 * @title ClaimIssuer
 * @notice Contract for issuing and verifying claims on OnchainID identities
 */
contract ClaimIssuer is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    /*//////////////////////////////////////////////////////////////
                        CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error ClaimIssuer__InvalidKey();
    error ClaimIssuer__KeyAlreadyExists();
    error ClaimIssuer__SenderDoesNotHaveManagementKey();
    error ClaimIssuer__SenderDoesNotHaveClaimSignerKey();
    error ClaimIssuer__IssuerInactive();
    error ClaimIssuer__InvalidIdentity();
    error ClaimIssuer__EmptyClaimData();
    error ClaimIssuer__FailedToAddClaimToOnchainID();
    error ClaimIssuer__ArrayLengthMismatch();
    error ClaimIssuer__ClaimDoesNotExist();
    error ClaimIssuer__ClaimAlreadyRevoked();
    error ClaimIssuer__KeyDoesNotExist();
    error ClaimIssuer__KeyAlreadyRevoked();
    error ClaimIssuer__InvalidIssuer();

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a claim is issued
    event ClaimIssued(
        address indexed identity,
        uint256 indexed topic,
        bytes32 indexed claimId,
        address issuer,
        bytes signature,
        bytes data
    );

    /// @notice Emitted when a claim is revoked
    event ClaimRevoked(address indexed identity, bytes32 indexed claimId, uint256 indexed topic);

    /// @notice Emitted when an issuer key is added
    event IssuerKeyAdded(bytes32 indexed key, uint256 indexed purpose);

    /// @notice Emitted when an issuer key is revoked
    event IssuerKeyRevoked(bytes32 indexed key, uint256 indexed purpose);

    /// @notice Emitted when a trusted issuer is added
    event TrustedIssuerAdded(address indexed issuer, uint256[] topics);

    /// @notice Emitted when a trusted issuer is removed
    event TrustedIssuerRemoved(address indexed issuer);

    /*//////////////////////////////////////////////////////////////
                         STRUCTS
    //////////////////////////////////////////////////////////////*/
    struct IssuerKey {
        bytes32 key;
        uint256 purpose;
        uint256 keyType;
        bool revoked;
        uint256 revokedAt;
    }

    struct IssuedClaim {
        address identity;
        uint256 topic;
        uint256 scheme;
        bytes signature;
        bytes data;
        string uri;
        uint256 issuedAt;
        uint256 validTo;
        bool revoked;
        uint256 revokedAt;
    }

    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice Mapping of issuer keys by their hash
    mapping(bytes32 keyHash => IssuerKey issuer) public issuerKeys;

    /// @notice Mapping of issuer keys by their purpose
    mapping(uint256 purpose => bytes32[] keyHashes) public keysByPurpose;

    /// @notice Mapping of issued claims by their ID
    mapping(bytes32 claimId => IssuedClaim claim) public issuedClaims;

    /// @notice Mapping to track claims by identity and topic
    mapping(address identity => bytes32[] claimIds) public claimsByIdentity;

    /// @notice Mapping to track claims by topic
    mapping(uint256 topic => bytes32[] claimIds) public claimsByTopic;

    bytes32[] public allKeys;
    bytes32[] public allClaims;
    uint256 private claimRequestNonce;

    /// @notice Mapping of trusted issuers and their claim topics
    mapping(address issuer => uint256[] topics) public trustedIssuers;
    address[] public trustedIssuersList;

    // Issuer configuration
    string public issuerName;
    string public issuerDescription;
    string public issuerWebsite;
    bool public isActive;

    // Key purposes
    uint256 public constant MANAGEMENT_KEY = 1;
    uint256 public constant CLAIM_SIGNER_KEY = 3;

    // Key types
    uint256 public constant ECDSA_TYPE = 1;

    /*/////////////////////////////////////////////////////////
                        MODIFIERS
    //////////////////////////////////////////////////////////*/

    /**
     * @dev Modifier to check if the sender has a management key
     */
    modifier onlyManagementKey() {
        if (!_hasKeyPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY) || msg.sender == owner()) {
            revert ClaimIssuer__SenderDoesNotHaveManagementKey();
        }
        _;
    }

    /**
     * @dev Modifier to check if the sender has claim signer key
     */
    modifier onlyClaimSigner() {
        if (
            !_hasKeyPurpose(keccak256(abi.encodePacked(msg.sender)), CLAIM_SIGNER_KEY)
                || !_hasKeyPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)
        ) {
            revert ClaimIssuer__SenderDoesNotHaveClaimSignerKey();
        }
        _;
    }

    /**
     * @dev Modifier to check if issuer is active
     */
    modifier whenActive() {
        if (!isActive) revert ClaimIssuer__IssuerInactive();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Initializes the ClaimIssuer contract
     * @param _owner Owner of the contract
     * @param _name Name of the issuer
     * @param _description Description of the issuer
     */
    constructor(address _owner, string memory _name, string memory _description) Ownable(_owner) {
        issuerName = _name;
        issuerDescription = _description;
        isActive = true;

        // Add owner's address as management key
        bytes32 ownerKey = keccak256(abi.encodePacked(_owner));
        _addIssuerKey(ownerKey, MANAGEMENT_KEY, ECDSA_TYPE);
    }

    /*//////////////////////////////////////////////////////////////
                        CLAIMS FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Issue a claim to an identity
     * @param _identity Address of the OnchainID identity
     * @param _topic Claim topic
     * @param _scheme Scheme of the claim
     * @param _data Claim data
     * @param _uri URI associated with the claim
     * @param _validTo Timestamp until which the claim is valid
     * @return claimId ID of the issued claim
     */
    function issueClaim(
        address _identity,
        uint256 _topic,
        uint256 _scheme,
        bytes calldata _data,
        string calldata _uri,
        uint256 _validTo
    ) external onlyClaimSigner whenActive nonReentrant returns (bytes32 claimId) {
        if (_identity == address(0)) revert ClaimIssuer__InvalidIdentity();
        if (_data.length == 0) revert ClaimIssuer__EmptyClaimData();

        // Generate claim signature
        bytes32 dataHash = keccak256(abi.encodePacked(_identity, _topic, _data));
        bytes memory signature = _signClaim(dataHash);

        // Generate unique claim ID
        claimId = keccak256(abi.encodePacked(address(this), _identity, _topic, _data));

        // Store issued claim
        issuedClaims[claimId] = IssuedClaim({
            identity: _identity,
            topic: _topic,
            scheme: _scheme,
            signature: signature,
            data: _data,
            uri: _uri,
            issuedAt: block.timestamp,
            validTo: _validTo,
            revoked: false,
            revokedAt: 0
        });

        // Update indexes
        claimsByIdentity[_identity].push(claimId);
        claimsByTopic[_topic].push(claimId);
        allClaims.push(claimId);

        // Add claim to the identity's OnchainID
        try IOnchainID(_identity).addClaim(_topic, _scheme, address(this), signature, _data, _uri) {
            emit ClaimIssued(_identity, _topic, claimId, address(this), signature, _data);
        } catch {
            // Revert the storage changes if adding to OnchainID fails
            delete issuedClaims[claimId];
            claimsByIdentity[_identity].pop();
            claimsByTopic[_topic].pop();
            allClaims.pop();
            revert ClaimIssuer__FailedToAddClaimToOnchainID();
        }
    }

    /**
     * @dev Batch issue multiple claims to identities
     * @param _identities Array of OnchainID identity addresses
     * @param _topics Array of claim topics
     * @param _schemes Array of claim schemes
     * @param _datas Array of claim data
     * @param _uris Array of URIs associated with the claims
     * @param _validTos Array of timestamps until which the claims are valid
     * @return claimIds Array of issued claim IDs
     */
    function batchIssueClaims(
        address[] calldata _identities,
        uint256[] calldata _topics,
        uint256[] calldata _schemes,
        bytes[] calldata _datas,
        string[] calldata _uris,
        uint256[] calldata _validTos
    ) external onlyClaimSigner whenActive nonReentrant returns (bytes32[] memory claimIds) {
        if (
            _identities.length != _topics.length && _identities.length != _schemes.length
                && _identities.length != _datas.length && _identities.length != _uris.length
                && _identities.length != _validTos.length
        ) {
            revert ClaimIssuer__ArrayLengthMismatch();
        }

        claimIds = new bytes32[](_identities.length);

        for (uint256 i = 0; i < _identities.length; i++) {
            claimRequestNonce++;
            claimIds[i] =
                _batchIssueClaimAtIndex(_identities[i], _topics[i], _schemes[i], _datas[i], _uris[i], _validTos[i]);
        }

        return claimIds;
    }

    /**
     * @dev Revoke a claim by its ID
     * @param _claimId ID of the claim to revoke
     */
    function revokeClaim(bytes32 _claimId) external onlyClaimSigner {
        if (issuedClaims[_claimId].identity == address(0)) {
            revert ClaimIssuer__ClaimDoesNotExist();
        }
        if (issuedClaims[_claimId].revoked) {
            revert ClaimIssuer__ClaimAlreadyRevoked();
        }

        IssuedClaim storage claim = issuedClaims[_claimId];
        claim.revoked = true;
        claim.revokedAt = block.timestamp;

        // Try to remove the claim from the identity's OnchainID
        try IOnchainID(claim.identity).removeClaim(_claimId) {
        // Successfully removed claim from OnchainID
        }
            catch {
            // If removal fails, we still consider the claim revoked in our records
        }

        emit ClaimRevoked(claim.identity, _claimId, claim.topic);
    }

    /**
     * @dev Verify a claim signature
     * @param _identity Address of the OnchainID identity
     * @param _topic Claim topic
     * @param _data Claim data
     * @param _signature Signature to verify
     * @return isValid True if the signature is valid, false otherwise
     */
    function verifyClaim(address _identity, uint256 _topic, bytes calldata _data, bytes calldata _signature)
        external
        view
        returns (bool isValid)
    {
        bytes32 dataHash = keccak256(abi.encodePacked(_identity, _topic, _data));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(dataHash);

        address signer = ECDSA.recover(ethSignedMessageHash, _signature);
        bytes32 signerKey = keccak256(abi.encodePacked(signer));

        return _hasKeyPurpose(signerKey, CLAIM_SIGNER_KEY) || _hasKeyPurpose(signerKey, MANAGEMENT_KEY);
    }

    /**
     * @dev Get claim details by claim ID
     * @param _claimId ID of the claim
     * @return claim IssuedClaim struct containing claim details
     */
    function getClaimById(bytes32 _claimId) external view returns (IssuedClaim memory claim) {
        return issuedClaims[_claimId];
    }

    /**
     * @dev Get claim details
     * @param _claimId The claim ID
     * @return claim The claim details
     */
    function getClaim(bytes32 _claimId) external view returns (IssuedClaim memory claim) {
        return issuedClaims[_claimId];
    }

    /**
     * @dev Get claims by identity
     * @param _identity The OnchainID address
     * @return claimIds Array of claim IDs
     */
    function getClaimsByIdentity(address _identity) external view returns (bytes32[] memory claimIds) {
        return claimsByIdentity[_identity];
    }

    /**
     * @dev Get claims by topic
     * @param _topic The claim topic
     * @return claimIds Array of claim IDs
     */
    function getClaimsByTopic(uint256 _topic) external view returns (bytes32[] memory claimIds) {
        return claimsByTopic[_topic];
    }

    /**
     * @dev Check if a claim is valid (not revoked and not expired)
     * @param _claimId The claim ID
     * @return valid True if the claim is valid
     */
    function isClaimValid(bytes32 _claimId) external view returns (bool valid) {
        IssuedClaim memory claim = issuedClaims[_claimId];

        if (claim.identity == address(0) || claim.revoked) {
            return false;
        }

        if (claim.validTo != 0 && claim.validTo <= block.timestamp) {
            return false;
        }

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                    KEYS MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Add an issuer key
     * @param _key Key to add
     * @param _purpose Purpose of the key
     * @param _keyType Type of the key
     */
    function addIssuerKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external onlyManagementKey {
        _addIssuerKey(_key, _purpose, _keyType);
    }

    /**
     * @dev Revoke an issuer key
     * @param _key Key to revoke
     */
    function revokeIssuerKey(bytes32 _key) external onlyManagementKey {
        if (issuerKeys[_key].key == bytes32(0)) {
            revert ClaimIssuer__KeyDoesNotExist();
        }
        if (issuerKeys[_key].revoked) {
            revert ClaimIssuer__KeyAlreadyRevoked();
        }

        issuerKeys[_key].revoked = true;
        issuerKeys[_key].revokedAt = block.timestamp;

        emit IssuerKeyRevoked(_key, issuerKeys[_key].purpose);
    }

    /**
     * @dev Get keys by purpose
     * @param _purpose Purpose to filter keys
     * @return keys Array of keys with the specified purpose
     */
    function getKeysByPurpose(uint256 _purpose) external view returns (bytes32[] memory keys) {
        return keysByPurpose[_purpose];
    }

    /*//////////////////////////////////////////////////////////////
                    TRUSTED ISSUERS MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Add a trusted issuer for delegation
     * @param _issuer Address of the trusted issuer
     * @param _topics Array of claim topics the issuer can issue
     */
    function addTrustedIssuer(address _issuer, uint256[] calldata _topics) external onlyManagementKey {
        if (_issuer == address(0)) {
            revert ClaimIssuer__InvalidIssuer();
        }

        bool exists = false;
        for (uint256 i = 0; i < trustedIssuersList.length; i++) {
            if (trustedIssuersList[i] == _issuer) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            trustedIssuersList.push(_issuer);
        }

        trustedIssuers[_issuer] = _topics;

        emit TrustedIssuerAdded(_issuer, _topics);
    }

    /**
     * @dev Remove a trusted issuer
     * @param _issuer Address of the trusted issuer to remove
     */
    function removeTrustedIssuer(address _issuer) external onlyManagementKey {
        delete trustedIssuers[_issuer];

        for (uint256 i = 0; i < trustedIssuersList.length; i++) {
            if (trustedIssuersList[i] == _issuer) {
                trustedIssuersList[i] = trustedIssuersList[trustedIssuersList.length - 1];
                trustedIssuersList.pop();
                break;
            }
        }

        emit TrustedIssuerRemoved(_issuer);
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set issuer information
     * @param _name New issuer name
     * @param _description New issuer description
     * @param _website New issuer website
     */
    function setIssuerInfo(string calldata _name, string calldata _description, string calldata _website)
        external
        onlyOwner
    {
        issuerName = _name;
        issuerDescription = _description;
        issuerWebsite = _website;
    }

    /**
     * @dev Set issuer active status
     * @param _active Whether the issuer is active
     */
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }

    /**
     * @dev Get issuer statistics
     * @return totalClaims Total number of issued claims
     * @return activeClaims Number of active (non-revoked) claims
     * @return totalKeys Total number of keys
     * @return active Whether the issuer is active
     */
    function getIssuerStats()
        external
        view
        returns (uint256 totalClaims, uint256 activeClaims, uint256 totalKeys, bool active)
    {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allClaims.length; i++) {
            if (!issuedClaims[allClaims[i]].revoked) {
                activeCount++;
            }
        }

        return (allClaims.length, activeCount, allKeys.length, isActive);
    }

    /*//////////////////////////////////////////////////////////////
            RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Issue investor claims to an identity
     * @param _identity Address of the OnchainID identity
     * @param _scheme Scheme of the claims
     * @param _claimDatas Array of claim data [kycData, accreditedData, regionalData]
     * @param _validTo Timestamp until which the claims are valid
     * @return claimIds Array of issued claim IDs
     */
    function issueInvestorClaims(address _identity, uint256 _scheme, bytes[] calldata _claimDatas, uint256 _validTo)
        external
        onlyClaimSigner
        whenActive
        nonReentrant
        returns (bytes32[] memory claimIds)
    {
        if (_identity == address(0)) revert ClaimIssuer__InvalidIdentity();

        uint256[] memory topics = ClaimTopics.getInvestorClaims();
        if (_claimDatas.length != topics.length) revert ClaimIssuer__ArrayLengthMismatch();

        claimIds = _issueClaimsLoop(_identity, _scheme, topics, _claimDatas, _validTo);
    }

    /**
     * @notice Issue renter claims to an identity
     * @param _identity Address of the OnchainID identity
     * @param _scheme Scheme of the claims
     * @param _claimDatas Array of claim data [kycData, driverLicenseData, insuranceData, creditScoreData, regionalData]
     * @param _validTo Timestamp until which the claims are valid
     * @return claimIds Array of issued claim IDs
     */
    function issueRenterClaims(address _identity, uint256 _scheme, bytes[] calldata _claimDatas, uint256 _validTo)
        external
        onlyClaimSigner
        whenActive
        nonReentrant
        returns (bytes32[] memory claimIds)
    {
        if (_identity == address(0)) revert ClaimIssuer__InvalidIdentity();

        uint256[] memory topics = ClaimTopics.getRenterClaims();
        if (_claimDatas.length != topics.length) revert ClaimIssuer__ArrayLengthMismatch();

        claimIds = _issueClaimsLoop(_identity, _scheme, topics, _claimDatas, _validTo);
    }

    /**
     * @notice Issue rentor (vehicle owner) claims to an identity
     * @param _identity Address of the OnchainID identity
     * @param _scheme Scheme of the claims
     * @param _claimDatas Array of claim data [kycData, businessData, vehicleOwnershipData, insuranceData, regionalData]
     * @param _validTo Timestamp until which the claims are valid
     * @return claimIds Array of issued claim IDs
     */
    function issueRentorClaims(address _identity, uint256 _scheme, bytes[] calldata _claimDatas, uint256 _validTo)
        external
        onlyClaimSigner
        whenActive
        nonReentrant
        returns (bytes32[] memory claimIds)
    {
        if (_identity == address(0)) revert ClaimIssuer__InvalidIdentity();

        uint256[] memory topics = ClaimTopics.getRentorClaims();
        if (_claimDatas.length != topics.length) revert ClaimIssuer__ArrayLengthMismatch();

        claimIds = _issueClaimsLoop(_identity, _scheme, topics, _claimDatas, _validTo);
    }

    /**
     * @notice Get claim topic name for a given topic ID
     * @param _topic Claim topic ID
     * @return name Human-readable name
     */
    function getClaimTopicName(uint256 _topic) external pure returns (string memory name) {
        return ClaimTopics.getClaimTopicName(_topic);
    }

    /**
     * @notice Check if a claim topic is valid
     * @param _topic Claim topic to validate
     * @return isValid Whether the claim topic is valid
     */
    function isValidClaimTopic(uint256 _topic) external pure returns (bool isValid) {
        return ClaimTopics.isValidClaimTopic(_topic);
    }

    /**
     * @notice Verify if an identity has all investor claims
     * @param _identity Address of the OnchainID identity
     * @return hasAllClaims Whether the identity has all required investor claims
     */
    function verifyInvestorClaims(address _identity) external view returns (bool hasAllClaims) {
        uint256[] memory topics = ClaimTopics.getInvestorClaims();

        for (uint256 i = 0; i < topics.length; i++) {
            bytes32[] memory identityClaims = claimsByIdentity[_identity];
            bool hasTopic = false;

            for (uint256 j = 0; j < identityClaims.length; j++) {
                IssuedClaim memory claim = issuedClaims[identityClaims[j]];
                if (
                    claim.topic == topics[i] && !claim.revoked
                        && (claim.validTo == 0 || claim.validTo > block.timestamp)
                ) {
                    hasTopic = true;
                    break;
                }
            }

            if (!hasTopic) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Verify if an identity has all renter claims
     * @param _identity Address of the OnchainID identity
     * @return hasAllClaims Whether the identity has all required renter claims
     */
    function verifyRenterClaims(address _identity) external view returns (bool hasAllClaims) {
        uint256[] memory topics = ClaimTopics.getRenterClaims();

        for (uint256 i = 0; i < topics.length; i++) {
            bytes32[] memory identityClaims = claimsByIdentity[_identity];
            bool hasTopic = false;

            for (uint256 j = 0; j < identityClaims.length; j++) {
                IssuedClaim memory claim = issuedClaims[identityClaims[j]];
                if (
                    claim.topic == topics[i] && !claim.revoked
                        && (claim.validTo == 0 || claim.validTo > block.timestamp)
                ) {
                    hasTopic = true;
                    break;
                }
            }

            if (!hasTopic) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Verify if an identity has all rentor claims
     * @param _identity Address of the OnchainID identity
     * @return hasAllClaims Whether the identity has all required rentor claims
     */
    function verifyRentorClaims(address _identity) external view returns (bool hasAllClaims) {
        uint256[] memory topics = ClaimTopics.getRentorClaims();

        for (uint256 i = 0; i < topics.length; i++) {
            bytes32[] memory identityClaims = claimsByIdentity[_identity];
            bool hasTopic = false;

            for (uint256 j = 0; j < identityClaims.length; j++) {
                IssuedClaim memory claim = issuedClaims[identityClaims[j]];
                if (
                    claim.topic == topics[i] && !claim.revoked
                        && (claim.validTo == 0 || claim.validTo > block.timestamp)
                ) {
                    hasTopic = true;
                    break;
                }
            }

            if (!hasTopic) {
                return false;
            }
        }

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _issueClaimsLoop(
        address _identity,
        uint256 _scheme,
        uint256[] memory _topics,
        bytes[] calldata _claimDatas,
        uint256 _validTo
    ) internal returns (bytes32[] memory claimIds) {
        claimIds = new bytes32[](_topics.length);
        for (uint256 i = 0; i < _topics.length; i++) {
            claimIds[i] = _issueClaimInternal(_identity, _topics[i], _scheme, _claimDatas[i], "", _validTo);
        }
    }

    function _batchIssueClaimAtIndex(
        address _identity,
        uint256 _topic,
        uint256 _scheme,
        bytes calldata _data,
        string calldata _uri,
        uint256 _validTo
    ) internal returns (bytes32 claimId) {
        if (_identity == address(0)) revert ClaimIssuer__InvalidIdentity();
        if (_data.length == 0) revert ClaimIssuer__EmptyClaimData();

        bytes32 dataHash = keccak256(abi.encodePacked(_identity, _topic, _data));
        bytes memory signature = _signClaim(dataHash);

        claimId = keccak256(abi.encodePacked(address(this), _identity, _topic, _data));

        issuedClaims[claimId] = IssuedClaim({
            identity: _identity,
            topic: _topic,
            scheme: _scheme,
            signature: signature,
            data: _data,
            uri: _uri,
            issuedAt: block.timestamp,
            validTo: _validTo,
            revoked: false,
            revokedAt: 0
        });

        claimsByIdentity[_identity].push(claimId);
        claimsByTopic[_topic].push(claimId);
        allClaims.push(claimId);

        emit ClaimIssued(_identity, _topic, claimId, address(this), signature, _data);
    }

    function _issueClaimInternal(
        address _identity,
        uint256 _topic,
        uint256 _scheme,
        bytes calldata _data,
        string memory _uri,
        uint256 _validTo
    ) internal returns (bytes32 claimId) {
        if (_data.length == 0) revert ClaimIssuer__EmptyClaimData();

        // Generate claim signature
        bytes32 dataHash = keccak256(abi.encodePacked(_identity, _topic, _data));
        bytes memory signature = _signClaim(dataHash);

        // Generate unique claim ID
        claimId = keccak256(abi.encodePacked(address(this), _identity, _topic, _data));

        // Store issued claim
        issuedClaims[claimId] = IssuedClaim({
            identity: _identity,
            topic: _topic,
            scheme: _scheme,
            signature: signature,
            data: _data,
            uri: _uri,
            issuedAt: block.timestamp,
            validTo: _validTo,
            revoked: false,
            revokedAt: 0
        });

        // Update indexes
        claimsByIdentity[_identity].push(claimId);
        claimsByTopic[_topic].push(claimId);
        allClaims.push(claimId);

        // Add claim to the identity's OnchainID
        try IOnchainID(_identity).addClaim(_topic, _scheme, address(this), signature, _data, _uri) {
            emit ClaimIssued(_identity, _topic, claimId, address(this), signature, _data);
        } catch {
            // Revert the storage changes if adding to OnchainID fails
            delete issuedClaims[claimId];
            claimsByIdentity[_identity].pop();
            claimsByTopic[_topic].pop();
            allClaims.pop();
            revert ClaimIssuer__FailedToAddClaimToOnchainID();
        }

        return claimId;
    }

    function _addIssuerKey(bytes32 _key, uint256 _purpose, uint256 _keyType) internal {
        if (_key == bytes32(0)) revert ClaimIssuer__InvalidKey();
        if (issuerKeys[_key].key != bytes32(0)) revert ClaimIssuer__KeyAlreadyExists();

        issuerKeys[_key] = IssuerKey({key: _key, purpose: _purpose, keyType: _keyType, revoked: false, revokedAt: 0});

        keysByPurpose[_purpose].push(_key);
        allKeys.push(_key);

        emit IssuerKeyAdded(_key, _purpose);
    }

    /**
     * @dev Checks if a key has a specific purpose
     * @param _key Key to check
     * @param _purpose Purpose to check against
     * @return True if the key has the specified purpose, false otherwise
     */
    function _hasKeyPurpose(bytes32 _key, uint256 _purpose) internal view returns (bool) {
        IssuerKey memory issuerKey = issuerKeys[_key];
        return issuerKey.key != bytes32(0) && issuerKey.purpose == _purpose && !issuerKey.revoked;
    }

    /**
     * @dev Signs a claim data hash
     * @param _dataHash Hash of the claim data
     * @return signature Signature of the claim
     */
    function _signClaim(bytes32 _dataHash) internal view returns (bytes memory signature) {
        // In a real implementation, this would use a secure signing mechanism
        // For this POC, we'll create a mock signature
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(_dataHash);

        // This is a simplified signature - in practice, use a secure method to sign
        signature = abi.encodePacked(ethSignedMessageHash, address(this));
    }
}
