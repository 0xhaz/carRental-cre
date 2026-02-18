// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IOnchainID} from "../interfaces/erc3643/IOnchainID.sol";
import {ClaimTopics} from "../compliance/ClaimTopics.sol";

/**
 * @title OnChainID
 * @dev Implementation of OnChainID with ERC-734 and ERC-735 standards
 * @notice Enhanced for rental car tokenization platform - supports investor, renter, and rentor claims
 */
contract OnchainID is IOnchainID, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /*////////////////////////////////////////////////////////////////
                        CUSTOM ERRORS
    ////////////////////////////////////////////////////////////////*/
    error OnChainID__SenderDoesNotHaveManagementKey();
    error OnChainID__SenderDoesNotHaveActionKey();
    error OnChainID__InvalidKey();
    error OnChainID__KeyAlreadyExists();
    error OnchainID__AlreadyInitialized();
    error OnChainID__KeyDoesNotExist();
    error OnChainID__KeyPurposeMismatch();
    error OnChainID__OnlyECDSAKeysSupported();
    error OnChainID__SignatureDoesNotProveOwnership();
    error OnChainID__AlreadyExecuted();
    error OnChainID__ExecutionRequestDoesNotExist();
    error OnChainID__InvalidUser();
    error OnChainID__NotAuthorizedToAddClaim();
    error OnChainID__ClaimDoesNotExist();
    error OnChainID__EmptyTopicsArray();
    error OnChainID__TooManyTopics();
    error OnChainID__ClaimRequestDoesNotExist();
    error OnChainID__NotAuthorizedToRequestClaim();
    error OnChainID__BatchSizeExceedsLimit();
    error OnChainID__ArrayLengthMismatch();
    error OnChainID__OnlyOwnerCanAuthorizeManagers();
    error OnChainID__InvalidManagerAddress();

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Key purpose constants
    uint256 public constant MANAGEMENT_KEY = 1;
    uint256 public constant ACTION_KEY = 2;
    uint256 public constant CLAIM_SIGNER_KEY = 3;
    uint256 public constant ENCRYPTION_KEY = 4;

    // Key types
    uint256 public constant ECDSA_TYPE = 1;
    uint256 public constant RSA_TYPE = 2;

    // Claim topics - Aligned with ClaimTopics library for rental car platform
    // Using ClaimTopics constants:
    // 1: KYC_VERIFIED - All participants
    // 2: ACCREDITED_INVESTOR - Investors only
    // 3: REGIONAL_ELIGIBILITY - Jurisdiction-specific
    // 4: DRIVER_LICENSE_VALID - Renters only
    // 5: INSURANCE_VERIFIED - Renters only
    // 6: CREDIT_SCORE_RANGE - Renters only
    // 7: BUSINESS_REGISTERED - Rentors only
    // 8: VEHICLE_OWNERSHIP_PROOF - Rentors only

    // Legacy compatibility mappings
    uint256 public constant IDENTITY_TOPIC = 1; // Maps to KYC_VERIFIED
    uint256 public constant BIOMETRIC_TOPIC = 2;
    uint256 public constant RESIDENCY_TOPIC = 3; // Maps to REGIONAL_ELIGIBILITY
    uint256 public constant REGISTRY_TOPIC = 4;
    uint256 public constant ACCREDITATION_TOPIC = 5;
    uint256 public constant KYC_TOPIC = 1; // Maps to KYC_VERIFIED
    uint256 public constant AML_TOPIC = 1; // Maps to KYC_VERIFIED
    uint256 public constant INVESTOR_TYPE_TOPIC = 2; // Maps to ACCREDITED_INVESTOR

    // Signature schemes
    uint256 public constant ECDSA_SCHEME = 1;
    uint256 public constant RSA_SCHEME = 2;
    uint256 public constant CONTRACT_SCHEME = 3;

    /*//////////////////////////////////////////////////////////////
                       STRUCTS & MAPPINGS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Key structure as per ERC-734
     * @param purpose The purpose of the key
     * @param keyType The type of the key
     * @param key The key data
     * @param revokedAt Timestamp when the key was revoked (0 if active)
     */
    struct Key {
        uint256 purpose;
        uint256 keyType;
        bytes32 key;
        uint256 revokedAt;
    }

    /**
     * @dev Claim structure as per ERC-735
     * @param topic The claim topic
     * @param scheme The signature scheme used
     * @param issuer The address of the claim issuer
     * @param signature The signature of the claim
     * @param data The claim data
     * @param uri URI pointing to additional claim information
     * @param validTo Timestamp until which the claim is valid
     * @param validFrom Timestamp from which the claim is valid
     */
    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
        uint256 validTo;
        uint256 validFrom;
    }

    /**
     * @dev Execution request structure for multi-signature execution
     * @param to The target address for execution
     * @param value The amount of Ether to send
     * @param data The data payload for the execution
     * @param executed Whether the execution has been completed
     * @param approvals Number of approvals received
     */
    struct ExecutionRequest {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvals;
    }

    mapping(bytes32 key => Key) private keys;
    mapping(bytes32 key => mapping(uint256 purpose => bool)) private keyPurposes;
    mapping(uint256 purpose => bytes32[]) private keysByPurpose;
    mapping(bytes32 claimId => Claim) private claims;
    mapping(uint256 topic => bytes32[]) private claimByTopics;
    mapping(address issuer => uint256[]) private trustedIssuers;
    mapping(uint256 topic => bool) private requiredTopics;

    bytes32[] private allKeys;
    bytes32[] private allClaims;
    address[] private trustedIssuersList;
    uint256[] private requiredTopicsList;

    uint256 private executionNonce;
    uint256 private claimRequestNonce;
    uint256 private creationTime;

    // DOS protection for execute function
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MAX_ARRAY_LENGTH = 100;

    mapping(uint256 executionId => ExecutionRequest) private executionRequests;
    mapping(uint256 executionId => bool) private executionApprovals;
    mapping(address manager => bool) public authorizedManagers;

    /*//////////////////////////////////////////////////////////////
                        EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a new identity is created
    event IdentityCreated(address indexed identity, address indexed owner, bytes32 managementKey);

    /// @notice Emitted when a execution Id is approved
    event Approved(uint256 indexed executionId, bool approved);

    /// @notice Emitted when a trusted issuer is added
    event TrustedIssuerAdded(address indexed issuer, uint256[] topics);

    /// @notice Emitted when a trusted issuer is removed
    event TrustedIssuerRemoved(address indexed issuer);

    /// @notice Emitted when a claim topic is added as required
    event ClaimTopicAdded(uint256 indexed topic, bool required);

    /// @notice Emitted when a claim topic is removed from required
    event ClaimTopicRemoved(uint256 indexed topic);

    /*//////////////////////////////////////////////////////////////
                      MODIFIER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Modifier to check if sender has management key
     */
    modifier onlyManagementKey() {
        if (
            !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)
                && msg.sender != owner()
                && !authorizedManagers[msg.sender]
        ) revert OnChainID__SenderDoesNotHaveManagementKey();
        _;
    }

    /**
     * @dev Modifier to check if sender has action key
     */
    modifier onlyActionKey() {
        if (
            !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), ACTION_KEY)
                && !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)
                && msg.sender != owner()
        ) revert OnChainID__SenderDoesNotHaveActionKey();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner, address _admin) Ownable(_owner == address(0) ? address(this) : _owner) {
        creationTime = block.timestamp;

        // Add owner's address as management + claim signer key
        if (_owner != address(0)) {
            bytes32 ownerKey = keccak256(abi.encodePacked(_owner));
            _addKey(ownerKey, MANAGEMENT_KEY, ECDSA_TYPE);
            _addKey(ownerKey, CLAIM_SIGNER_KEY, ECDSA_TYPE);
        }

        // Add admin's key for delegated claim management
        if (_admin != address(0) && _admin != _owner) {
            bytes32 adminKey = keccak256(abi.encodePacked(_admin));
            _addKey(adminKey, MANAGEMENT_KEY, ECDSA_TYPE);
            _addKey(adminKey, CLAIM_SIGNER_KEY, ECDSA_TYPE);
            authorizedManagers[_admin] = true;
        }

        emit IdentityCreated(address(this), _owner, bytes32(0));
    }

    /*//////////////////////////////////////////////////////////////
                      EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Override owner function to satisfy both interfaces
     */
    function owner() public view override(Ownable) returns (address) {
        return Ownable.owner();
    }

    /**
     * @dev Allow authorized contracts to manage keys
     * @param _contract The contract address to authorize
     */
    function authorizeContract(address _contract) external onlyOwner {
        bytes32 contractKey = keccak256(abi.encodePacked(_contract));
        _addKey(contractKey, MANAGEMENT_KEY, ECDSA_TYPE);
    }

    /**
     * @dev Initialize function (for factory deployment)
     */
    function initialize(address _owner, bytes32 _managementKey) external {
        if (owner() != address(0)) revert OnchainID__AlreadyInitialized();
        _transferOwnership(_owner);
        creationTime = block.timestamp;

        _addKey(_managementKey, MANAGEMENT_KEY, ECDSA_TYPE);

        emit IdentityCreated(address(this), _owner, _managementKey);
    }

    /*///////////////////////////////////////////////////////////////
                      KEY MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOnchainID
    function getKey(bytes32 _key)
        external
        view
        override
        returns (uint256 purpose, uint256 keyType, bytes32 key_, uint256 revokedAt)
    {
        Key memory keyStruct = keys[_key];
        return (keyStruct.purpose, keyStruct.keyType, keyStruct.key, keyStruct.revokedAt);
    }

    /// @inheritdoc IOnchainID
    function keyHasPurpose(bytes32 _key, uint256 _purpose) public view override returns (bool exists) {
        Key memory key = keys[_key];
        return key.key != bytes32(0) && keyPurposes[_key][_purpose] && key.revokedAt == 0;
    }

    /// @inheritdoc IOnchainID
    function getKeysByPurpose(uint256 _purpose) external view override returns (bytes32[] memory) {
        return keysByPurpose[_purpose];
    }

    /// @inheritdoc IOnchainID
    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) external override returns (bool success) {
        return _addKey(_key, _purpose, _keyType);
    }

    /**
     * @dev Remove key (legacy - no ownership proof required)
     * @notice DEPRECATED: Use removeKeyWithProof for better security
     */
    function removeKey(bytes32 _key, uint256 _purpose) external override returns (bool success) {
        if (keys[_key].key == bytes32(0)) revert OnChainID__KeyDoesNotExist();
        if (!keyPurposes[_key][_purpose]) revert OnChainID__KeyPurposeMismatch();

        keyPurposes[_key][_purpose] = false;

        // Remove from keysByPurpose mapping
        bytes32[] storage purposeKeys = keysByPurpose[_purpose];
        for (uint256 i = 0; i < purposeKeys.length; i++) {
            if (purposeKeys[i] == _key) {
                purposeKeys[i] = purposeKeys[purposeKeys.length - 1];
                purposeKeys.pop();
                break;
            }
        }

        emit KeyRemoved(_key, _purpose, keys[_key].keyType);
        return true;
    }

    /**
     * @dev Remove key with ownership proof
     * @param _key The key to remove
     * @param _purpose The purpose of the key
     * @param _signature The signature proving ownership of the key
     * @return success True if key removal is successful
     *
     * @notice This function requires cryptographic proof that the caller owns the key being removed.
     * For address-based keys: Sign the messge with private keys of the address
     * For string-based keys: This function cannot be used (use removeKey with caution)
     *
     * Security: Prevents unauthorized key removal by requiring signature verification
     */
    function removeKeyWithProof(bytes32 _key, uint256 _purpose, bytes calldata _signature)
        external
        onlyManagementKey
        returns (bool success)
    {
        if (keys[_key].key == bytes32(0)) revert OnChainID__KeyDoesNotExist();
        if (!keyPurposes[_key][_purpose]) revert OnChainID__KeyPurposeMismatch();
        if (keys[_key].keyType != ECDSA_TYPE) revert OnChainID__OnlyECDSAKeysSupported();

        // Construct the message that should have been signed
        bytes32 message =
            keccak256(abi.encodePacked("Remove key from OnchainID", address(this), _key, _purpose, block.chainid));

        // Recover the signer from the signature
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(message);
        address signer = ECDSA.recover(ethSignedMessageHash, _signature);

        // Verify the signer owns the key being removed
        // For address-based keys: keccak256(abi.encode(address))
        bytes32 signerKeyHash = keccak256(abi.encode(signer));
        if (signerKeyHash != _key) revert OnChainID__SignatureDoesNotProveOwnership();

        // Remove this purpose
        keyPurposes[_key][_purpose] = false;

        // Remove from keysByPurpose mapping
        bytes32[] storage purposeKeys = keysByPurpose[_purpose];
        for (uint256 i = 0; i < purposeKeys.length; i++) {
            if (purposeKeys[i] == _key) {
                purposeKeys[i] = purposeKeys[purposeKeys.length - 1];
                purposeKeys.pop();
                break;
            }
        }
        emit KeyRemoved(_key, _purpose, keys[_key].keyType);
        return true;
    }

    /**
     * @dev Get the message hash that needs to be signed for removeKeyWithProof
     * @param _key The key to be removed
     * @param _purpose The purpose of the key
     * @return messageHash The hash of the message to be signed
     *
     * @notice Helper function to generate the correct message for signing
     * Users should sign this message with the private key of the address being removed.
     *
     * Example:
     * 1. Call getRemoveKeyMessage(keyHash, purpose) to get the message hash
     * 2. Sign the returned hash with the private key of the address
     * 3. Call removeKeyWithProof(keyHash, purpose, signature) to remove the key
     */
    function getRemoveKeyMessage(bytes32 _key, uint256 _purpose) external view returns (bytes32 messageHash) {
        bytes32 message =
            keccak256(abi.encodePacked("Remove key from OnchainID", address(this), _key, _purpose, block.chainid));

        return MessageHashUtils.toEthSignedMessageHash(message);
    }

    /// @inheritdoc IOnchainID
    function execute(address to, uint256 value, bytes calldata data)
        external
        override
        onlyActionKey
        returns (uint256 executionId)
    {
        executionId = executionNonce++;

        executionRequests[executionId] =
            ExecutionRequest({to: to, value: value, data: data, executed: false, approvals: 1});

        emit ExecutionRequested(executionId, to, value, data);

        // Auto-execute if sender is owner or has management key
        if (msg.sender == owner() || keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)) {
            _executeRequest(executionId);
        }

        return executionId;
    }

    /// @inheritdoc IOnchainID
    function approve(uint256 _executionId, bool _approve) external override onlyActionKey returns (bool success) {
        if (executionRequests[_executionId].to == address(0)) revert OnChainID__ExecutionRequestDoesNotExist();
        if (executionRequests[_executionId].executed) revert OnChainID__AlreadyExecuted();

        if (_approve) {
            executionRequests[_executionId].approvals += 1;
            emit Approved(_executionId, true);

            // Execute if enough approvals. Simplified for this example: execute if approvals = 1
            _executeRequest(_executionId);
        } else {
            emit Approved(_executionId, false);
        }
        return true;
    }

    /// @inheritdoc IOnchainID
    function getClaim(bytes32 claimId)
        external
        view
        override
        returns (
            uint256 topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory uri
        )
    {
        Claim memory claim = claims[claimId];
        return (claim.topic, claim.scheme, claim.issuer, claim.signature, claim.data, claim.uri);
    }

    /// @inheritdoc IOnchainID
    function getClaimIdsByTopic(uint256 topic) external view override returns (bytes32[] memory claimIds) {
        return claimByTopics[topic];
    }

    /// @inheritdoc IOnchainID
    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external override returns (bytes32 claimId) {
        if (issuer == address(0)) revert OnChainID__InvalidUser();

        // check if sender is authorized to add claim (must have management OR claim signer key OR be owner)
        if (
            !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)
                && !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), CLAIM_SIGNER_KEY)
                && msg.sender != owner()
        ) {
            revert OnChainID__NotAuthorizedToAddClaim();
        }

        bytes32 newClaimId = keccak256(abi.encodePacked(issuer, topic, data));
        claimId = newClaimId;

        claims[claimId] = Claim({
            topic: topic,
            scheme: scheme,
            issuer: issuer,
            signature: signature,
            data: data,
            uri: uri,
            validTo: 0, // no expiration
            validFrom: block.timestamp
        });

        claimByTopics[topic].push(claimId);
        allClaims.push(claimId);

        emit ClaimAdded(claimId, topic, scheme, issuer, signature, data, uri);

        return claimId;
    }

    /// @inheritdoc IOnchainID
    function removeClaim(bytes32 claimId) external override onlyManagementKey returns (bool success) {
        if (claims[claimId].issuer == address(0)) revert OnChainID__ClaimDoesNotExist();

        Claim memory claim = claims[claimId];

        // Remove claim from mapping
        bytes32[] storage topicClaims = claimByTopics[claim.topic];
        for (uint256 i = 0; i < topicClaims.length; i++) {
            if (topicClaims[i] == claimId) {
                topicClaims[i] = topicClaims[topicClaims.length - 1];
                topicClaims.pop();
                break;
            }
        }

        // Remove from allClaims array
        for (uint256 i = 0; i < allClaims.length; i++) {
            if (allClaims[i] == claimId) {
                allClaims[i] = allClaims[allClaims.length - 1];
                allClaims.pop();
                break;
            }
        }

        emit ClaimRemoved(claimId, claim.topic, claim.scheme, claim.issuer, claim.signature, claim.data, claim.uri);

        delete claims[claimId];
        return true;
    }

    /**
     * @dev Check if has valid claim for topic
     * @param topic The claim topic to check
     * @param issuer The issuer address to check
     * @return exists True if a valid claim exists, false otherwise
     */
    function hasValidClaim(uint256 topic, address issuer) external view returns (bool exists) {
        bytes32[] memory topicClaims = claimByTopics[topic];

        for (uint256 i = 0; i < topicClaims.length; i++) {
            Claim memory claim = claims[topicClaims[i]];
            if (claim.issuer == issuer && (claim.validTo == 0 || claim.validTo > block.timestamp)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get all claims
     */
    function getAllClaims() external view returns (bytes32[] memory) {
        return allClaims;
    }

    /**
     * @dev Check if has topic
     */
    function hasTopic(uint256 topic) external view returns (bool) {
        return claimByTopics[topic].length > 0;
    }

    /*//////////////////////////////////////////////////////////////
                      OnchainID FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if trusted issuer
     * @param issuer The issuer address to check
     * @param topic The claim topic to check
     * @return isTrusted True if issuer is trusted for the topic, false otherwise
     */
    function isTrustedIssuer(address issuer, uint256 topic) external view returns (bool isTrusted) {
        uint256[] memory topics = trustedIssuers[issuer];
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == topic) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Add trusted issuer
     * @param issuer The issuer address to add
     * @param topics The claim topics associated with the issuer
     */
    function addTrustedIssuer(address issuer, uint256[] calldata topics) external onlyManagementKey {
        if (issuer == address(0)) revert OnChainID__InvalidUser();
        if (topics.length == 0) revert OnChainID__EmptyTopicsArray();
        if (topics.length >= MAX_ARRAY_LENGTH) revert OnChainID__TooManyTopics();

        // Add topics to issuer
        bool exists = false;
        for (uint256 i = 0; i < trustedIssuersList.length; i++) {
            if (trustedIssuersList[i] == issuer) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            trustedIssuersList.push(issuer);
        }

        trustedIssuers[issuer] = topics;

        emit TrustedIssuerAdded(issuer, topics);
    }

    /**
     * @dev Remove trusted issuer
     * @param issuer The issuer address to remove
     */
    function removeTrustedIssuer(address issuer) external onlyManagementKey {
        delete trustedIssuers[issuer];

        // Remove from trustedIssuersList
        for (uint256 i = 0; i < trustedIssuersList.length; i++) {
            if (trustedIssuersList[i] == issuer) {
                trustedIssuersList[i] = trustedIssuersList[trustedIssuersList.length - 1];
                trustedIssuersList.pop();
                break;
            }
        }

        emit TrustedIssuerRemoved(issuer);
    }

    /**
     * @dev Get all trusted issuers
     * @return issuers Array of trusted issuer addresses
     */
    function getTrustedIssuers() external view returns (address[] memory issuers) {
        return trustedIssuersList;
    }

    /**
     * @dev Add claim topic
     * @param topic The claim topic to add
     * @param required Whether the topic is required
     */
    function addClaimTopic(uint256 topic, bool required) external onlyManagementKey {
        if (required && !requiredTopics[topic]) {
            requiredTopics[topic] = true;
            requiredTopicsList.push(topic);
        }
        emit ClaimTopicAdded(topic, required);
    }

    /**
     * @dev Remove claim topic
     */
    function removeClaimTopic(uint256 _topic) external onlyManagementKey {
        requiredTopics[_topic] = false;

        // Remove from list
        for (uint256 i = 0; i < requiredTopicsList.length; i++) {
            if (requiredTopicsList[i] == _topic) {
                requiredTopicsList[i] = requiredTopicsList[requiredTopicsList.length - 1];
                requiredTopicsList.pop();
                break;
            }
        }

        emit ClaimTopicRemoved(_topic);
    }

    /**
     * @dev Check if required topic
     */
    function isRequiredTopic(uint256 _topic) external view returns (bool required) {
        return requiredTopics[_topic];
    }

    /**
     * @dev Get required topics
     */
    function getRequiredTopics() external view returns (uint256[] memory) {
        return requiredTopicsList;
    }

    /**
     * @dev Check compliance
     */
    function isCompliant() external view returns (bool valid) {
        for (uint256 i = 0; i < requiredTopicsList.length; i++) {
            uint256 topic = requiredTopicsList[i];
            bool hasValidClaimForTopic = false;

            bytes32[] memory topicClaims = claimByTopics[topic];
            for (uint256 j = 0; j < topicClaims.length; j++) {
                Claim memory claim = claims[topicClaims[j]];
                if ((claim.validTo == 0 || claim.validTo > block.timestamp)) {
                    // Check if issuer is trusted
                    uint256[] memory issuerTopics = trustedIssuers[claim.issuer];
                    for (uint256 k = 0; k < issuerTopics.length; k++) {
                        if (issuerTopics[k] == topic) {
                            hasValidClaimForTopic = true;
                            break;
                        }
                    }
                    if (hasValidClaimForTopic) break;
                }
            }
            if (!hasValidClaimForTopic) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev Get compliance status
     */
    function getCopmlianceStatus()
        external
        view
        returns (bool valid, uint256[] memory missingTopics, bytes32[] memory expiredClaims)
    {
        uint256[] memory missing = new uint256[](requiredTopicsList.length);
        bytes32[] memory expired = new bytes32[](allClaims.length);
        uint256 missingCount = 0;
        uint256 expiredCount = 0;

        // Check for missing topics
        for (uint256 i = 0; i < requiredTopicsList.length; i++) {
            uint256 topic = requiredTopicsList[i];
            bool hasValidClaimForTopic = false;

            bytes32[] memory topicClaims = claimByTopics[topic];
            for (uint256 j = 0; j < topicClaims.length; j++) {
                Claim memory claim = claims[topicClaims[j]];
                if ((claim.validTo == 0 || claim.validTo > block.timestamp)) {
                    hasValidClaimForTopic = true;
                    break;
                }
            }

            if (!hasValidClaimForTopic) {
                missing[missingCount++] = topic;
            }
        }

        // Check for expired claims
        for (uint256 i = 0; i < allClaims.length; i++) {
            Claim memory claim = claims[allClaims[i]];
            if (claim.validTo != 0 && claim.validTo <= block.timestamp) {
                expired[expiredCount++] = allClaims[i];
            }
        }

        // Resize arrays to actual counts
        uint256[] memory finalMissing = new uint256[](missingCount);
        for (uint256 i = 0; i < missingCount; i++) {
            finalMissing[i] = missing[i];
        }

        bytes32[] memory finalExpired = new bytes32[](expiredCount);
        for (uint256 i = 0; i < expiredCount; i++) {
            finalExpired[i] = expired[i];
        }

        return (missingCount == 0, finalMissing, finalExpired);
    }

    /**
     * @dev Batch add claims
     * @param topics Array of claim topics
     * @param schemes Array of signature schemes
     * @param issuers Array of issuer addresses
     * @param signatures Array of claim signatures
     * @param datas Array of claim data
     * @param uris Array of claim URIs
     * @return claimRequestIds Array of newly added claim IDs
     */
    function batchAddClaims(
        uint256[] calldata topics,
        uint256[] calldata schemes,
        address[] calldata issuers,
        bytes[] calldata signatures,
        bytes[] calldata datas,
        string[] calldata uris
    ) external returns (uint256[] memory claimRequestIds) {
        if (topics.length == 0) revert OnChainID__EmptyTopicsArray();
        if (topics.length >= MAX_BATCH_SIZE) revert OnChainID__BatchSizeExceedsLimit();

        if (
            topics.length != schemes.length && topics.length != issuers.length && topics.length != signatures.length
                && topics.length != datas.length && topics.length != uris.length
        ) {
            revert OnChainID__ArrayLengthMismatch();
        }

        claimRequestIds = new uint256[](topics.length);

        for (uint256 i = 0; i < topics.length; i++) {
            if (
                msg.sender != owner() || !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), MANAGEMENT_KEY)
                    || !keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), CLAIM_SIGNER_KEY)
                    || msg.sender != issuers[i] || !authorizedManagers[msg.sender]
            ) {
                revert OnChainID__NotAuthorizedToAddClaim();
            }

            claimRequestIds[i] = claimRequestNonce++;
            bytes32 claimId = keccak256(abi.encodePacked(issuers[i], topics[i], datas[i]));

            claims[claimId] = Claim({
                topic: topics[i],
                scheme: schemes[i],
                issuer: issuers[i],
                signature: signatures[i],
                data: datas[i],
                uri: uris[i],
                validFrom: block.timestamp,
                validTo: 0
            });

            claimByTopics[topics[i]].push(claimId);
            allClaims.push(claimId);

            emit ClaimAdded(claimId, topics[i], schemes[i], issuers[i], signatures[i], datas[i], uris[i]);
        }
        return claimRequestIds;
    }

    /**
     * @dev Get creation time
     */
    function getCreationTime() external view returns (uint256) {
        return creationTime;
    }

    /**
     * @dev Get identity statistics
     */
    function getIdentityStats()
        external
        view
        returns (uint256 keyCount, uint256 claimCount, uint256 trustedIssuerCount, uint256 requiredTopicCount)
    {
        return (allKeys.length, allClaims.length, trustedIssuersList.length, requiredTopicsList.length);
    }

    /*//////////////////////////////////////////////////////////////
          RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if identity has investor claims
     * @return hasAllClaims Whether all investor claims are present
     */
    function hasInvestorClaims() external view returns (bool hasAllClaims) {
        uint256[] memory investorTopics = ClaimTopics.getInvestorClaims();
        for (uint256 i = 0; i < investorTopics.length; i++) {
            if (claimByTopics[investorTopics[i]].length == 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Check if identity has renter claims
     * @return hasAllClaims Whether all renter claims are present
     */
    function hasRenterClaims() external view returns (bool hasAllClaims) {
        uint256[] memory renterTopics = ClaimTopics.getRenterClaims();
        for (uint256 i = 0; i < renterTopics.length; i++) {
            if (claimByTopics[renterTopics[i]].length == 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Check if identity has rentor (business) claims
     * @return hasAllClaims Whether all rentor claims are present
     */
    function hasRentorClaims() external view returns (bool hasAllClaims) {
        uint256[] memory rentorTopics = ClaimTopics.getRentorClaims();
        for (uint256 i = 0; i < rentorTopics.length; i++) {
            if (claimByTopics[rentorTopics[i]].length == 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @notice Get claim topic name
     * @param topic Claim topic ID
     * @return name Human-readable topic name
     */
    function getClaimTopicName(uint256 topic) external pure returns (string memory name) {
        return ClaimTopics.getClaimTopicName(topic);
    }

    /**
     * @notice Check if claim topic is valid
     * @param topic Claim topic to validate
     * @return isValid Whether the topic is valid per ClaimTopics library
     */
    function isValidClaimTopic(uint256 topic) external pure returns (bool isValid) {
        return ClaimTopics.isValidClaimTopic(topic);
    }

    /**
     * @notice Get comprehensive participant type based on claims
     * @return isInvestor Whether has investor claims
     * @return isRenter Whether has renter claims
     * @return isRentor Whether has rentor claims
     */
    function getParticipantType()
        external
        view
        returns (
            bool isInvestor,
            bool isRenter,
            bool isRentor
        )
    {
        uint256[] memory investorTopics = ClaimTopics.getInvestorClaims();
        uint256[] memory renterTopics = ClaimTopics.getRenterClaims();
        uint256[] memory rentorTopics = ClaimTopics.getRentorClaims();

        // Check investor claims
        bool hasAllInvestorClaims = true;
        for (uint256 i = 0; i < investorTopics.length; i++) {
            if (claimByTopics[investorTopics[i]].length == 0) {
                hasAllInvestorClaims = false;
                break;
            }
        }

        // Check renter claims
        bool hasAllRenterClaims = true;
        for (uint256 i = 0; i < renterTopics.length; i++) {
            if (claimByTopics[renterTopics[i]].length == 0) {
                hasAllRenterClaims = false;
                break;
            }
        }

        // Check rentor claims
        bool hasAllRentorClaims = true;
        for (uint256 i = 0; i < rentorTopics.length; i++) {
            if (claimByTopics[rentorTopics[i]].length == 0) {
                hasAllRentorClaims = false;
                break;
            }
        }

        return (hasAllInvestorClaims, hasAllRenterClaims, hasAllRentorClaims);
    }

    /**
     * @dev Authorize a manager to perform management operations
     * @param _manager The manager address to authorize
     */
    function authorizeManager(address _manager) external {
        if (msg.sender != owner()) revert OnChainID__OnlyOwnerCanAuthorizeManagers();
        if (_manager == address(0)) revert OnChainID__InvalidManagerAddress();
        authorizedManagers[_manager] = true;
    }

    /**
     * @dev Remove authorization from a manager
     * @param _manager The manager address to deauthorize
     */
    function deauthorizeManager(address _manager) external {
        if (msg.sender != owner()) revert OnChainID__OnlyOwnerCanAuthorizeManagers();
        authorizedManagers[_manager] = false;
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Internal function to add a key
     */
    function _addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) internal returns (bool) {
        if (_key == bytes32(0)) revert OnChainID__InvalidKey();
        if (keyPurposes[_key][_purpose]) revert OnChainID__KeyAlreadyExists();

        // Create base key entry if it doesn't exist yet
        if (keys[_key].key == bytes32(0)) {
            keys[_key] = Key({purpose: _purpose, keyType: _keyType, key: _key, revokedAt: 0});
            allKeys.push(_key);
        }

        // Track this specific purpose
        keyPurposes[_key][_purpose] = true;
        keysByPurpose[_purpose].push(_key);

        emit KeyAdded(_key, _purpose, _keyType);
        return true;
    }

    /**
     * @dev Internal function to execute a request
     */
    function _executeRequest(uint256 _executionId) internal {
        ExecutionRequest storage request = executionRequests[_executionId];
        if (request.executed) revert OnChainID__AlreadyExecuted();

        request.executed = true;

        (bool success,) = request.to.call{value: request.value}(request.data);

        if (success) {
            emit Executed(_executionId, request.to, request.value, request.data);
        } else {
            emit ExecutionFailed(_executionId, request.to, request.value, request.data);
        }
    }
}
