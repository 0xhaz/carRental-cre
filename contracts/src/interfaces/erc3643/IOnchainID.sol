// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IOnchainID
 * @dev Interface for OnchainID contract (ERC-734/ ERC-735)
 */
interface IOnchainID {
    /*//////////////////////////////////////////////////////////////
                         ERC-734 KEY MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a key is added
    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);

    /// @notice Emitted when a key is removed
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);

    /// @notice Emitted when an execution is requested
    event ExecutionRequested(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);

    /// @notice Emitted when an execution is approved
    event Executed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);

    /// @notice Emitted when an execution fails
    event ExecutionFailed(uint256 indexed executionId, address indexed to, uint256 indexed value, bytes data);

    /*//////////////////////////////////////////////////////////////
                        ERC-735 CLAIM MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a claim is requested
    event ClaimRequested(
        uint256 indexed claimRequestId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    /// @notice Emitted when a claim is added, removed, or changed
    event ClaimAdded(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    /// @notice Emitted when a claim is removed
    event ClaimRemoved(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    /// @notice Emitted when a claim is changed
    event ClaimChanged(
        bytes32 indexed claimId,
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    /*//////////////////////////////////////////////////////////////
                        KEY MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get key details by key identifier
     * @param key The key identifier
     * @return purpose The purpose of the key
     * @return keyType The type of the key
     * @return key_ The key identifier
     * @return revokedAt The timestamp when the key was revoked (0 if not revoked)
     */
    function getKey(bytes32 key)
        external
        view
        returns (uint256 purpose, uint256 keyType, bytes32 key_, uint256 revokedAt);

    /**
     * @dev Check if a key has a specific purpose
     * @param key The key identifier
     * @param purpose The purpose to check
     * @return exists True if the key has the specified purpose, false otherwise
     */
    function keyHasPurpose(bytes32 key, uint256 purpose) external view returns (bool exists);

    /**
     * @dev Get all keys for a specific purpose
     * @param purpose The purpose to filter keys by
     * @return keys Array of key identifiers with the specified purpose
     */
    function getKeysByPurpose(uint256 purpose) external view returns (bytes32[] memory keys);

    /**
     * @dev Add a new key
     * @param key The key identifier
     * @param purpose The purpose of the key
     * @param keyType The type of the key
     * @return success True if the key was added successfully, false otherwise
     */
    function addKey(bytes32 key, uint256 purpose, uint256 keyType) external returns (bool success);

    /**
     * @dev Remove a key
     * @param key The key identifier
     * @param purpose The purpose of the key
     * @return success True if the key was removed successfully, false otherwise
     */
    function removeKey(bytes32 key, uint256 purpose) external returns (bool success);

    /*//////////////////////////////////////////////////////////////
                        EXECUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Execute a transaction
     * @param to The destination address
     * @param value The amount of Ether to send
     * @param data The transaction data
     * @return executionId The identifier of the execution request
     */
    function execute(address to, uint256 value, bytes calldata data) external returns (uint256 executionId);

    /**
     * @dev Approve or reject a transaction execution
     * @param executionId The identifier of the execution request
     * @param approve True to approve, false to reject
     * @return success True if the approval was successful, false otherwise
     */
    function approve(uint256 executionId, bool approve) external returns (bool success);

    /*//////////////////////////////////////////////////////////////
                        CLAIM MANAGEMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Get claim details by claim identifier
     * @param claimId The claim identifier
     * @return topic The topic of the claim
     * @return scheme The scheme of the claim
     * @return issuer The issuer address of the claim
     * @return signature The signature of the claim
     * @return data The data of the claim
     * @return uri The URI of the claim
     */
    function getClaim(bytes32 claimId)
        external
        view
        returns (
            uint256 topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory uri
        );

    /**
     * @dev Get all claim IDs for a specific topic
     * @param topic The topic to filter claims by
     * @return claimIds Array of claim identifiers with the specified topic
     */
    function getClaimIdsByTopic(uint256 topic) external view returns (bytes32[] memory claimIds);

    /**
     * @dev Add a new claim
     * @param topic The topic of the claim
     * @param scheme The scheme of the claim
     * @param issuer The issuer address of the claim
     * @param signature The signature of the claim
     * @param data The data of the claim
     * @param uri The URI of the claim
     * @return claimId The identifier of the added claim
     */
    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external returns (bytes32 claimId);

    /**
     * @dev Remove a claim
     * @param claimId The identifier of the claim to remove
     * @return success True if the claim was removed successfully, false otherwise
     */
    function removeClaim(bytes32 claimId) external returns (bool success);
}
