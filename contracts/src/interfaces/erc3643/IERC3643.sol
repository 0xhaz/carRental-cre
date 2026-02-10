// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IERC3643
 * @dev Interface for ERC-3643 Security Token Standard
 * @notice This interface defines the core functionality for compliant security tokens
 */
interface IERC3643 is IERC20 {
    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error ERC3643__UnauthorizedAgent();
    error ERC3643__AddressFrozen();
    error ERC3643__TransferNotAllowed();
    error ERC3643__IdentityNotVerified();
    error ERC3643__ComplianceCheckFailed();
    error ERC3643__InsufficientBalance();
    error ERC3643__InsufficientFreeBalance();
    error ERC3643__InsufficientBalanceToFreeze();
    error ERC3643__InsufficientFrozenTokens();
    error ERC3643__SenderFrozen();
    error ERC3643__RecipientFrozen();
    error ERC3643__SenderNotVerified();
    error ERC3643__RecipientNotVerified();
    error ERC3643__TransferAmountLimitsExceeded();
    error ERC3643__HoldingAmountLimitsExceeded();
    error ERC3643__InvalidIdentity();
    error ERC3643__NewWalletAlreadyRegistered();
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when an Identity Registry is added
    event IdentityRegistryAdded(address indexed _identityRegistry);

    /// @notice Emitted when compliance module is added
    event ComplianceAdded(address indexed _compliance);

    /// @notice Emitted when recovery process is successfully completed
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    /// @notice Emitted when an address is frozen or unfrozen
    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);

    /// @notice Emitted when tokens are frozen
    event TokensFrozen(address indexed _userAddress, uint256 _amount);

    /// @notice Emitted when tokens are unfrozen
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);

    /*//////////////////////////////////////////////////////////////
                          CORE T-REX FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get the address of the Identity Registry
     * @return Address of the Identity Registry
     */
    function identityRegistry() external view returns (address);

    /**
     * @dev Get the address of the Compliance module
     * @return Address of the Compliance module
     */
    function compliance() external view returns (address);

    /*//////////////////////////////////////////////////////////////
                        TOKEN MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Mint new tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @dev Burn tokens from a specified address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external;

    /**
     * @dev Set the frozen status of an address
     * @param userAddress Address to set frozen status for
     * @param isFrozen Boolean indicating whether the address is frozen
     */
    function setAddressFrozen(address userAddress, bool isFrozen) external;

    /**
     * @dev Freeze a specific amount of tokens for an address
     * @param userAddress Address whose tokens are to be frozen
     * @param amount Amount of tokens to freeze
     */
    function freePartialTokens(address userAddress, uint256 amount) external;

    /**
     * @dev Unfreeze a specific amount of tokens for an address
     * @param userAddress Address whose tokens are to be unfrozen
     * @param amount Amount of tokens to unfreeze
     */
    function unfreezePartialTokens(address userAddress, uint256 amount) external;

    /*//////////////////////////////////////////////////////////////
                           COMPLIANCE CHECKS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if a transfer between two addresses is allowed
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Whether the transfer is allowed
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                          RECOVERY MECHANISM
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Recover tokens from a lost wallet to a new wallet
     * @param lostWallet Address of the lost wallet
     * @param newWallet Address of the new wallet
     * @param investorOnchainId Address of the investor's on-chain ID
     * @return True if the recovery was successful, false otherwise
     */
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainId) external returns (bool);

    /*//////////////////////////////////////////////////////////////
                        PAUSE MECHANISM
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Pause all token transfers
     */
    function pause() external;

    /**
     * @dev Unpause all token transfers
     */
    function unpause() external;

    /**
     * @dev Check if the token is paused
     * @return True if the token is paused, false otherwise
     */
    function paused() external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                        QUERY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get the amount of frozen tokens for a specific address
     * @param userAddress Address to query frozen tokens for
     * @return Amount of frozen tokens
     */
    function frozenTokens(address userAddress) external view returns (uint256);

    /**
     * @dev Get the free balance of tokens for a specific address
     * @param userAddress Address to query free balance for
     * @return Amount of free tokens
     */
    function getFreeBalance(address userAddress) external view returns (uint256);

    /**
     * @dev Check if an address is frozen
     * @param userAddress Address to check frozen status for
     * @return True if the address is frozen, false otherwise
     */
    function isFrozen(address userAddress) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                      IDENTITY REGISTRY MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set the Identity Registry address
     * @param identityRegistry_ Address of the Identity Registry
     */
    function setIdentityRegistry(address identityRegistry_) external;

    /**
     * @dev Set the Compliance module address
     * @param compliance_ Address of the Compliance module
     */
    function setCompliance(address compliance_) external;

    /**
     * @dev Set the Investor Type Registry address
     * @param investorTypeRegistryAddress Address of the Investor Type Registry
     */
    function setInvestorTypeRegistry(address investorTypeRegistryAddress) external;

    /**
     * @dev Get the address of the Investor Type Registry
     * @return Address of the Investor Type Registry
     */
    function investorTypeRegistry() external view returns (address);

    /**
     * @dev Add an agent authorized to manage the token
     * @param agent Address of the agent to add
     */
    function addAgent(address agent) external;

    /**
     * @dev Remove an agent authorized to manage the token
     * @param agent Address of the agent to remove
     */
    function removeAgent(address agent) external;

    /**
     * @dev Check if an address is an authorized agent
     * @param agent Address to check
     * @return True if the address is an agent, false otherwise
     */
    function isAgent(address agent) external view returns (bool);
}
