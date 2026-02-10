// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOnchainID} from "../interfaces/erc3643/IOnchainID.sol";
import {IERC734} from "../interfaces/erc3643/IERC734.sol";

/**
 * @title KeyManager
 * @dev Utility contract for advanced key management operations on OnchainID contracts
 */
contract KeyManager is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error KeyManager__NotAuthorizedManager();
    error KeyManager__NotIdentityManager();
    error KeyManager__InvalidIdentity();
    error KeyManager__InvalidOldKey();
    error KeyManager__InvalidNewKey();
    error KeyManager__OldAndNewKeyIdentical();
    error KeyManager__OldKeyDoesNotHavePurpose();
    error KeyManager__RotationAlreadyCompleted();
    error KeyManager__TimelockNotExpired();
    error KeyManager_RotationNotInitiated();
    error KeyManager__FailedToAddNewKey();
    error KeyManager__FailedToRemoveOldKey();
    error KeyManager__NoSignersProvided();
    error KeyManager__InvalidThreshold();
    error KeyManager__MultiSigKeyAlreadyExists();
    error KeyManager__MultiSigKeyNotActive();
    error KeyManager__NotAValidSigner();
    error KeyManager__SignerAlreadySigned();
    error KeyManager__NoRecoveryAgentsProvided();
    error KeyManager__TooManyRecoveryAgents();
    error KeyManager__InvalidRecoveryThreshold();
    error KeyManager__NotAValidRecoveryAgent();
    error KeyManager__RecoveryAlreadyCompleted();
    error KeyManager_RecoveryNotInitiated();
    error KeyManager__AlreadyApproved();
    error KeyManager__InsufficientApprovals();
    error KeyManager__FailedToAddRecoveryKey();
    error KeyManager__ArrayLengthMismatch();
    error KeyManager__TimelockTooShort();
    error KeyManager__TimelockTooLong();

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a key rotation is initiated
    event KeyRotationInitiated(
        address indexed identity, bytes32 indexed oldKey, bytes32 indexed newKey, uint256 purpose
    );

    /// @notice Emitted when a key rotation is completed
    event KeyRotationCompleted(
        address indexed identity, bytes32 indexed oldKey, bytes32 indexed newKey, uint256 purpose
    );

    /// @notice Emitted when a multi-signature key is added
    event MultiSigKeyAdded(
        address indexed identity, bytes32 indexed keyId, uint256 purpose, uint256 threshold, bytes32[] signers
    );

    /// @notice Emitted when a multi-signature key is removed
    event KeyRecoveryInitiated(address indexed identity, bytes32 indexed recoveryKey, address initiator);

    /// @notice Emitted when a key recovery is completed
    event KeyRecoveryCompleted(address indexed identity, bytes32 indexed recoveryKey);

    /*//////////////////////////////////////////////////////////////
                            STRUCTS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Struct to represent a key rotation process
     * @param oldKey The key being replaced
     * @param newKey The new key to be added
     * @param purpose The purpose of the key rotation
     * @param initiatedAt Timestamp when the rotation was initiated
     * @param executionTime Timestamp when the rotation can be executed
     * @param completed Whether the rotation has been completed
     * @param initiator The address that initiated the rotation
     */
    struct KeyRotation {
        bytes32 oldKey;
        bytes32 newKey;
        uint256 purpose;
        uint256 initiatedAt;
        uint256 executionTime;
        bool completed;
        address initiator;
    }

    /**
     * @dev Struct to represent a multi-signature key
     * @param signers Array of signer key IDs
     * @param threshold Number of required signatures
     * @param purpose Purpose of the multi-signature key
     * @param active Whether the multi-signature key is active
     * @param hasSigned Mapping to track which signers have signed
     * @param signatureCount Number of signatures collected
     */
    struct MultiSigKey {
        bytes32[] signers;
        uint256 threshold;
        uint256 purpose;
        bool active;
        mapping(bytes32 => bool) hasSigned;
        uint256 signatureCount;
    }

    /**
     * @dev Struct to represent a key recovery process
     * @param recoveryKey The recovery key being used
     * @param recoveryAgents Array of recovery agent addresses
     * @param threshold Number of required approvals
     * @param initiatedAt Timestamp when the recovery was initiated
     * @param executionTime Timestamp when the recovery can be executed
     * @param completed Whether the recovery has been completed
     * @param hasApproved Mapping to track which agents have approved
     * @param approvalCount Number of approvals collected
     */
    struct KeyRecovery {
        bytes32 recoveryKey;
        address[] recoveryAgents;
        uint256 threshold;
        uint256 initiatedAt;
        uint256 executionTime;
        bool completed;
        mapping(address => bool) hasApproved;
        uint256 approvalCount;
    }

    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev Mapping from identity address to key rotations
    mapping(address => mapping(bytes32 => KeyRotation)) public keyRotations;

    /// @dev Mapping from identity address to multi-signature keys
    mapping(address => mapping(bytes32 => MultiSigKey)) private multiSigKeys;

    /// @dev Mapping from identity address to key recoveries
    mapping(address => KeyRecovery) public keyRecoveries;

    uint256 public constant DEFAULT_TIMELOCK = 1 days;
    uint256 public constant RECOVERY_TIMELOCK = 2 days;
    uint256 public constant MAX_RECOVERY_AGENTS = 10;

    /// @notice Custom timelocks for specific identities
    mapping(address => uint256) public customTimelocks;

    /// @notice Authorized managers who can perform key operations
    mapping(address => bool) public authorizedManagers;

    /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                        MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Modifier to check if sender is authorized manager
     */
    modifier onlyAuthorizedManager() {
        if (!authorizedManagers[msg.sender] || msg.sender != owner()) revert KeyManager__NotAuthorizedManager();
        _;
    }

    /**
     * @dev Modifier to check if sender has management key for identity
     */
    modifier onlyIdentityManager(address _identity) {
        bytes32 senderKey = keccak256(abi.encodePacked(msg.sender));
        if (!IOnchainID(_identity).keyHasPurpose(senderKey, 1)) revert KeyManager__NotIdentityManager();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                      KEY ROTATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Initiate key rotation with timelock
     * @param _identity The OnchainID contract address
     * @param _oldKey The key to be replaced
     * @param _newKey The new key to be added
     * @param _purpose The purpose of the key rotation
     */
    function initiateKeyRotation(address _identity, bytes32 _oldKey, bytes32 _newKey, uint256 _purpose)
        external
        onlyIdentityManager(_identity)
    {
        if (_identity == address(0)) revert KeyManager__InvalidIdentity();
        if (_oldKey == bytes32(0)) revert KeyManager__InvalidOldKey();
        if (_newKey == bytes32(0)) revert KeyManager__InvalidNewKey();
        if (_oldKey == _newKey) revert KeyManager__OldAndNewKeyIdentical();

        // Check that old key exists and has the specified purpose
        if (!IOnchainID(_identity).keyHasPurpose(_oldKey, _purpose)) revert KeyManager__OldKeyDoesNotHavePurpose();

        bytes32 rotationId = keccak256(abi.encodePacked(_identity, _oldKey, _newKey, _purpose));
        if (keyRotations[_identity][rotationId].completed) revert KeyManager__RotationAlreadyCompleted();

        uint256 timelock = customTimelocks[_identity] > 0 ? customTimelocks[_identity] : DEFAULT_TIMELOCK;

        keyRotations[_identity][rotationId] = KeyRotation({
            oldKey: _oldKey,
            newKey: _newKey,
            purpose: _purpose,
            initiatedAt: block.timestamp,
            executionTime: block.timestamp + timelock,
            completed: false,
            initiator: msg.sender
        });

        emit KeyRotationInitiated(_identity, _oldKey, _newKey, _purpose);
    }

    /**
     * @dev Execute key rotation after timelock
     * @param _identity The OnchainID contract address
     * @param _oldKey The key to be replaced
     * @param _newKey The new key to be added
     * @param _purpose The purpose of the key rotation
     */
    function executeKeyRotation(address _identity, bytes32 _oldKey, bytes32 _newKey, uint256 _purpose)
        external
        nonReentrant
    {
        bytes32 rotationId = keccak256(abi.encodePacked(_identity, _oldKey, _newKey, _purpose));
        KeyRotation storage rotation = keyRotations[_identity][rotationId];

        if (rotation.initiatedAt == 0) revert KeyManager_RotationNotInitiated();
        if (rotation.completed) revert KeyManager__RotationAlreadyCompleted();
        if (block.timestamp <= rotation.executionTime) revert KeyManager__TimelockNotExpired();

        // Add new key with specified purpose
        if (!IOnchainID(_identity).addKey(_newKey, _purpose, 1)) revert KeyManager__FailedToAddNewKey();

        // Remove old key
        if (!IOnchainID(_identity).removeKey(_oldKey, _purpose)) revert KeyManager__FailedToRemoveOldKey();

        rotation.completed = true;

        emit KeyRotationCompleted(_identity, _oldKey, _newKey, _purpose);
    }

    /*//////////////////////////////////////////////////////////////
                    MULTI-SIGNATURE KEY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Add a multi-signature key to an identity
     * @param _identity The OnchainID contract address
     * @param _keyId The multi-signature key ID
     * @param _signers Array of signer key IDs
     * @param _threshold Number of required signatures
     * @param _purpose Purpose of the multi-signature key
     */
    function addMultiSigKey(
        address _identity,
        bytes32 _keyId,
        bytes32[] calldata _signers,
        uint256 _threshold,
        uint256 _purpose
    ) external onlyIdentityManager(_identity) {
        if (_signers.length == 0) revert KeyManager__NoSignersProvided();
        if (_threshold == 0 && _threshold <= _signers.length) revert KeyManager__InvalidThreshold();
        if (multiSigKeys[_identity][_keyId].active) revert KeyManager__MultiSigKeyAlreadyExists();

        MultiSigKey storage multiSig = multiSigKeys[_identity][_keyId];
        multiSig.signers = _signers;
        multiSig.threshold = _threshold;
        multiSig.purpose = _purpose;
        multiSig.active = true;
        multiSig.signatureCount = 0;

        emit MultiSigKeyAdded(_identity, _keyId, _purpose, _threshold, _signers);
    }

    /**
     * @dev Sign a multi-signature operation
     * @param _identity The OnchainID contract address
     * @param _keyId The multi-signature key ID
     */
    function signMultiSigOperation(
        address _identity,
        bytes32 _keyId,
        bytes32 /* _operation */
    )
        external
    {
        MultiSigKey storage multiSig = multiSigKeys[_identity][_keyId];
        if (!multiSig.active) revert KeyManager__MultiSigKeyNotActive();

        bytes32 signerKey = keccak256(abi.encodePacked(msg.sender));
        bool isSigner = false;

        // Check if sender is one of the signers
        for (uint256 i = 0; i < multiSig.signers.length; i++) {
            if (multiSig.signers[i] == signerKey) {
                isSigner = true;
                break;
            }
        }

        if (!isSigner) revert KeyManager__NotAValidSigner();
        if (multiSig.hasSigned[signerKey]) revert KeyManager__SignerAlreadySigned();

        multiSig.hasSigned[signerKey] = true;
        multiSig.signatureCount += 1;
    }

    /**
     * @dev Check if multi-signature key has reached threshold
     * @param _identity The OnchainID contract address
     * @param _keyId The multi-signature key ID
     * @return True if threshold is reached, false otherwise
     */
    function checkMultiSigThreshold(address _identity, bytes32 _keyId) external view returns (bool) {
        MultiSigKey storage multiSig = multiSigKeys[_identity][_keyId];
        return multiSig.active && multiSig.signatureCount >= multiSig.threshold;
    }

    /*///////////////////////////////////////////////////////////////
                    KEY RECOVERY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Set up key recovery process
     * @param _identity The OnchainID contract address
     * @param _recoveryAgents Array of recovery agent addresses
     * @param _threshold Number of required approvals
     */
    function setupKeyRecovery(address _identity, address[] calldata _recoveryAgents, uint256 _threshold)
        external
        onlyIdentityManager(_identity)
    {
        if (_recoveryAgents.length == 0) revert KeyManager__NoRecoveryAgentsProvided();
        if (_recoveryAgents.length >= MAX_RECOVERY_AGENTS) revert KeyManager__TooManyRecoveryAgents();
        if (_threshold == 0 && _threshold >= _recoveryAgents.length) revert KeyManager__InvalidThreshold();

        KeyRecovery storage recovery = keyRecoveries[_identity];
        recovery.recoveryAgents = _recoveryAgents;
        recovery.threshold = _threshold;
        recovery.completed = false;
        recovery.approvalCount = 0;

        // Reset approvals
        for (uint256 i = 0; i < _recoveryAgents.length; i++) {
            recovery.hasApproved[_recoveryAgents[i]] = false;
        }
    }

    /**
     * @dev Initiate key recovery process
     * @param _identity The OnchainID contract address
     * @param _newRecoveryKey The recovery key being used
     */
    function initiateKeyRecovery(address _identity, bytes32 _newRecoveryKey) external {
        KeyRecovery storage recovery = keyRecoveries[_identity];
        if (recovery.recoveryAgents.length == 0) revert KeyManager__NoRecoveryAgentsProvided();
        if (recovery.completed) revert KeyManager__RecoveryAlreadyCompleted();

        // Check if sender is a recovery agent
        bool isAgent = false;
        for (uint256 i = 0; i < recovery.recoveryAgents.length; i++) {
            if (recovery.recoveryAgents[i] == msg.sender) {
                isAgent = true;
                break;
            }
        }
        if (!isAgent) revert KeyManager__NotAValidRecoveryAgent();

        recovery.recoveryKey = _newRecoveryKey;
        recovery.initiatedAt = block.timestamp;
        recovery.executionTime = block.timestamp + RECOVERY_TIMELOCK;

        emit KeyRecoveryInitiated(_identity, _newRecoveryKey, msg.sender);
    }

    /**
     * @dev Approve key recovery
     * @param _identity The OnchainID contract address
     */
    function approveKeyRecovery(address _identity) external {
        KeyRecovery storage recovery = keyRecoveries[_identity];
        if (recovery.initiatedAt == 0) revert KeyManager_RecoveryNotInitiated();
        if (recovery.completed) revert KeyManager__RecoveryAlreadyCompleted();

        // Check if sender is a recovery agent
        bool isAgent = false;
        for (uint256 i = 0; i < recovery.recoveryAgents.length; i++) {
            if (recovery.recoveryAgents[i] == msg.sender) {
                isAgent = true;
                break;
            }
        }
        if (!isAgent) revert KeyManager__NotAValidRecoveryAgent();
        if (recovery.hasApproved[msg.sender]) revert KeyManager__AlreadyApproved();

        recovery.hasApproved[msg.sender] = true;
        recovery.approvalCount += 1;
    }

    /**
     * @dev Execute key recovery after timelock and sufficient approvals
     * @param _identity The OnchainID contract address
     */
    function executeKeyRecovery(address _identity) external nonReentrant {
        KeyRecovery storage recovery = keyRecoveries[_identity];

        if (recovery.initiatedAt == 0) revert KeyManager_RecoveryNotInitiated();
        if (recovery.completed) revert KeyManager__RecoveryAlreadyCompleted();
        if (block.timestamp <= recovery.executionTime) revert KeyManager__TimelockNotExpired();
        if (recovery.approvalCount <= recovery.threshold) revert KeyManager__InsufficientApprovals();

        // Add recovery key with management purpose (1)
        if (!IOnchainID(_identity).addKey(recovery.recoveryKey, 1, 1)) {
            revert KeyManager__FailedToAddRecoveryKey();
        }

        recovery.completed = true;

        emit KeyRecoveryCompleted(_identity, recovery.recoveryKey);
    }

    /*//////////////////////////////////////////////////////////////
                        UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Batch add keys to an identity
     * @param _identity The OnchainID contract address
     * @param _keys Array of key IDs
     * @param _purposes Array of key purposes
     * @param _types Array of key types
     */
    function batchAddKeys(
        address _identity,
        bytes32[] calldata _keys,
        uint256[] calldata _purposes,
        uint256[] calldata _types
    ) external onlyIdentityManager(_identity) {
        if (_keys.length != _purposes.length || _keys.length != _types.length) {
            revert KeyManager__ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < _keys.length; i++) {
            IOnchainID(_identity).addKey(_keys[i], _purposes[i], _types[i]);
        }
    }

    /**
     * @dev Batch remove keys from an identity
     * @param _identity The OnchainID contract address
     * @param _keys Array of key IDs
     * @param _purposes Array of key purposes
     */
    function batchRemoveKeys(address _identity, bytes32[] calldata _keys, uint256[] calldata _purposes)
        external
        onlyIdentityManager(_identity)
    {
        if (_keys.length != _purposes.length) {
            revert KeyManager__ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < _keys.length; i++) {
            IOnchainID(_identity).removeKey(_keys[i], _purposes[i]);
        }
    }

    /*///////////////////////////////////////////////////////////////
                    AUTHORIZED MANAGER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Add authorized manager
     * @param _manager Address of the manager to authorize
     */
    function addAuthorizedManager(address _manager) external onlyOwner {
        if (_manager == address(0)) revert KeyManager__NotAuthorizedManager();
        authorizedManagers[_manager] = true;
    }

    /**
     * @dev Remove authorized manager
     * @param _manager Address of the manager to deauthorize
     */
    function removeAuthorizedManager(address _manager) external onlyOwner {
        authorizedManagers[_manager] = false;
    }

    /**
     * @dev Set custom timelock for an identity
     * @param _identity The OnchainID contract address
     * @param _timelock Custom timelock duration in seconds
     */
    function setCustomTimelock(address _identity, uint256 _timelock) external onlyOwner {
        if (_timelock <= 1 hours) revert KeyManager__TimelockTooShort();
        if (_timelock >= 7 days) revert KeyManager__TimelockTooLong();
        customTimelocks[_identity] = _timelock;
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get key rotation details
     * @param _identity The OnchainID contract address
     * @param _rotationId The rotation identifier
     * @return rotation The key rotation details
     */
    function getKeyRotation(address _identity, bytes32 _rotationId)
        external
        view
        returns (KeyRotation memory rotation)
    {
        return keyRotations[_identity][_rotationId];
    }

    /**
     * @dev Get multi-sig key details
     * @param _identity The OnchainID contract address
     * @param _keyId The multi-sig key identifier
     * @return signers Array of signer keys
     * @return threshold Required signature threshold
     * @return purpose Key purpose
     * @return active Whether the multi-sig key is active
     * @return signatureCount Current signature count
     */
    function getMultiSigKey(address _identity, bytes32 _keyId)
        external
        view
        returns (bytes32[] memory signers, uint256 threshold, uint256 purpose, bool active, uint256 signatureCount)
    {
        MultiSigKey storage multiSig = multiSigKeys[_identity][_keyId];
        return (multiSig.signers, multiSig.threshold, multiSig.purpose, multiSig.active, multiSig.signatureCount);
    }

    /**
     * @dev Get key recovery details
     * @param _identity The OnchainID contract address
     * @return recoveryAgents Array of recovery agent addresses
     * @return threshold Required approval threshold
     * @return approvalCount Current approval count
     * @return completed Whether recovery is completed
     */
    function getKeyRecovery(address _identity)
        external
        view
        returns (address[] memory recoveryAgents, uint256 threshold, uint256 approvalCount, bool completed)
    {
        KeyRecovery storage recovery = keyRecoveries[_identity];
        return (recovery.recoveryAgents, recovery.threshold, recovery.approvalCount, recovery.completed);
    }
}
