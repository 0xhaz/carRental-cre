// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IMultiSigWallet
 * @dev Interface for a multi-signature wallet
 */
interface IMultiSigWallet {
    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a tokens are locked
    event TokensLocked(address indexed user, uint256 amount, uint256 timestamp);

    /// @notice Emitted when unlock proposal is created
    event UnlockProposalCreated(bytes32 indexed proposalId, address indexed proposer, uint256 amount, string reason);

    /// @notice Emitted when a proposal is signed
    event ProposalSigned(bytes32 indexed proposalId, address indexed signer, bool isBankSignature);

    /// @notice Emitted when a tokens are unlocked
    event TokensUnlocked(bytes32 indexed proposalId, address indexed recipient, uint256 amount);

    /// @notice Emitted when a proposal is cancelled
    event ProposalCancelled(bytes32 indexed proposalId, address indexed canceller);

    /*//////////////////////////////////////////////////////////////
                        MULTI-SIG WALLET FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Lock tokens in the multi-signature wallet
     * @param amount The amount of tokens to lock
     */
    function lockTokens(uint256 amount) external;

    /**
     * @dev Propose an unlock of tokens
     * @param amount The amount of tokens to unlock
     * @param recipient The address to receive the unlocked tokens
     * @param reason The reason for unlocking the tokens
     * @return proposalId The ID of the created unlock proposal
     */
    function proposeUnlock(uint256 amount, address recipient, string calldata reason)
        external
        returns (bytes32 proposalId);

    /**
     * @dev Sign an unlock proposal
     * @param proposalId The ID of the proposal to sign
     */
    function signUnlock(bytes32 proposalId) external;

    /**
     * @dev Cancel a proposal
     * @param proposalId The ID of the proposal to cancel
     */
    function cancelProposal(bytes32 proposalId) external;

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get details of an unlock proposal
     * @param proposalId The ID of the proposal
     * @return proposalNumber The proposal number
     * @return amount The amount to unlock
     * @return recipient The recipient address
     * @return bankSigned Whether the bank has signed the proposal
     * @return userSigned Whether the user has signed the proposal
     * @return executed Whether the proposal has been executed
     * @return createdAt The timestamp when the proposal was created
     * @return reason The reason for the unlock
     */
    function getProposal(bytes32 proposalId)
        external
        view
        returns (
            uint256 proposalNumber,
            uint256 amount,
            address recipient,
            bool bankSigned,
            bool userSigned,
            bool executed,
            uint256 createdAt,
            string memory reason
        );

    /**
     * @dev Get the status of the multi-signature wallet
     * @return bankAddress The bank address
     * @return userAddress The user address
     * @return tokenAddress The token address
     * @return locked The amount of locked tokens
     * @return balance The total balance of the wallet
     */
    function getWalletStatus()
        external
        view
        returns (address bankAddress, address userAddress, address tokenAddress, uint256 locked, uint256 balance);

    /**
     * @dev Check if a proposal is fully signed
     * @param proposalId The ID of the proposal
     * @return True if the proposal is fully signed, false otherwise
     */
    function isFullySigned(bytes32 proposalId) external view returns (bool);

    /**
     * @dev Get the locked balance of tokens
     * @return The amount of locked tokens
     */
    function getLockedBalance() external view returns (uint256);

    /**
     * @dev Get the bank address
     * @return The bank address
     */
    function bank() external view returns (address);

    /**
     * @dev Get the user address
     * @return The user address
     */
    function user() external view returns (address);

    /**
     * @dev Get the token address
     * @return The token address
     */
    function token() external view returns (address);

    /**
     * @dev Get the locked amount of tokens
     * @return The amount of locked tokens
     */
    function lockedAmount() external view returns (uint256);
}
