// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IInvestorTypeRegistry} from "./IInvestorTypeRegistry.sol";

/**
 * @title IIdentityRegistry
 * @dev Interface for ERC-3643 Identity Registry
 */
interface IIdentityRegistry {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error IdentityRegistry__IdentityAlreadyRegistered();
    error IdentityRegistry__IdentityNotRegistered();
    error IdentityRegistry__InvalidCountry();
    error IdentityRegistry__InvalidIdentityAddress();
    error IdentityRegistry__UnauthorizedAgent();
    error IdentityRegistry__InvalidUserAddress();
    error IdentityRegistry__CountryNotAllowed();
    error IdentityRegistry__IdentityNotFound();
    error IdentityRegistry__TokenAlreadyBound();
    error IdentityRegistry__TokenNotBound();
    error IdentityRegistry__InvalidTokenAddress();
    error IdentityRegistry__ArrayLengthMismatch();
    error IdentityRegistry__InvalidAgentAddress();
    error IdentityRegistry__InvalidInvestorTypeRegistryAddress();
    error IdentityRegistry__InvalidComplianceRulesAddress();
    error IdentityRegistry__InvestorTypeRegistryNotSet();

    /*//////////////////////////////////////////////////////////////
                                   EVENTS
      //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when an identity is stored for an investor
    event IdentityStored(address indexed investorAddress, address indexed identity);

    /// @notice Emitted when an identity is removed for an investor
    event IdentityRemoved(address indexed investorAddress, address indexed identity);

    /// @notice Emitted when the country of an investor is updated
    event CountryUpdated(address indexed investorAddress, uint16 country);

    /// @notice Emitted when an identity is unstored for an investor
    event IdentityUnstored(address indexed userAddress, address indexed identity);

    /// @notice Emitted when an identity is modified for an investor
    event IdentityModified(address indexed oldIdentity, address indexed newIdentity);

    /// @notice Emitted when an Identity Registry is bound to a token
    event IdentityRegistryBound(address indexed token);

    /// @notice Emitted when an Identity Registry is unbound from a token
    event IdentityRegistryUnbound(address indexed token);

    /// @notice Emitted when the Investor Type Registry is updated
    event InvestorTypeRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /// @notice Emitted when the Compliance Rules module is updated
    event ComplianceRulesUpdated(address indexed oldRules, address indexed newRules);

    /// @notice Emitted when an identity registration is rejected
    event IdentityRegistrationRejected(address indexed userAddress, uint16 country, uint8 reason);

    /*//////////////////////////////////////////////////////////////
                              CORE FUNCTIONS
     //////////////////////////////////////////////////////////////*/

    /**
     * @notice Registers an identity for a user with a specified country
     * @dev Associates the given identity contract with the user address
     * @param user The address of the user
     * @param identity The address of the identity contract
     * @param country The country code associated with the user
     */
    function registerIdentity(address user, address identity, uint16 country) external;

    /**
     * @notice Deletes the identity associated with a user
     * @dev Removes the identity contract linked to the user address
     * @param user The address of the user
     */
    function deleteIdentity(address user) external;

    /**
     * @notice Updates the country associated with a user
     * @dev Changes the country code for the specified user address
     * @param user The address of the user
     * @param country The new country code to be set
     */
    function updateCountry(address user, uint16 country) external;

    /**
     * @notice Binds the Identity Registry to a specific token
     * @dev Associates this Identity Registry with the given token address
     * @param _token The address of the token to bind
     */
    function bindIdentityRegistry(address _token) external;

    /**
     * @notice Unbinds the Identity Registry from a specific token
     * @dev Disassociates this Identity Registry from the given token address
     * @param _token The address of the token to unbind
     */
    function unbindIdentityRegistry(address _token) external;

    /**
     * @notice Adds an agent authorized to manage identities
     * @dev Grants agent privileges to the specified address
     * @param agent The address of the agent to add
     */
    function addAgent(address agent) external;

    /**
     * @notice Removes an agent from authorized identity management
     * @dev Revokes agent privileges from the specified address
     * @param agent The address of the agent to remove
     */
    function removeAgent(address agent) external;

    /**
     * @notice Sets the Investor Type Registry contract address
     * @dev Updates the reference to the Investor Type Registry
     * @param investorTypeRegistry The address of the new Investor Type Registry
     */
    function setInvestorTypeRegistry(address investorTypeRegistry) external;

    /**
     * @notice Sets the Compliance Rules module contract address
     * @dev Updates the reference to the Compliance Rules module
     * @param complianceRules The address of the new Compliance Rules module
     */
    function setComplianceRules(address complianceRules, address token) external;

    /*//////////////////////////////////////////////////////////////
                            QUERY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the identity contract address for a given user
     * @dev Returns the address of the identity contract linked to the user
     * @param user The address of the user
     * @return address The address of the identity contract
     */
    function identity(address user) external view returns (address);

    /**
     * @notice Retrieves the country code associated with a given user
     * @dev Returns the country code for the specified user address
     * @param user The address of the user
     * @return uint16 The country code of the user
     */
    function investorCountry(address user) external view returns (uint16);

    /**
     * @notice Checks if a user is verified in the identity registry
     * @dev A user is considered verified if they have an associated identity contract
     * @param user The address of the user
     * @return bool True if the user is verified, false otherwise
     */
    function isVerified(address user) external view returns (bool);

    /**
     * @notice Checks if an address is an authorized agent
     * @dev Returns true if the address has agent privileges
     * @param agent The address to check
     * @return bool True if the address is an agent, false otherwise
     */
    function isAgent(address agent) external view returns (bool);

    /**
     * @notice Retrieves all token addresses bound to this Identity Registry
     * @dev Returns an array of token addresses
     * @return address[] An array of bound token addresses
     */
    function getTokensBound() external view returns (address[] memory);

    /**
     * @notice Checks if a specific token is bound to this Identity Registry
     * @dev Returns true if the token is bound, false otherwise
     * @param token The address of the token to check
     * @return bool True if the token is bound, false otherwise
     */
    function isTokenBound(address token) external view returns (bool);

    /**
     * @notice Retrieves the address of the Investor Type Registry
     * @dev Returns the current Investor Type Registry address
     * @return address The address of the Investor Type Registry
     */
    function getInvestorTypeRegistry() external view returns (address);

    /**
     * @notice Retrieves the address of the Compliance Rules module
     * @dev Returns the current Compliance Rules module address
     * @return address The address of the Compliance Rules module
     */
    function getComplianceRules() external view returns (address);

    /**
     * @notice Retrieves the investor type for a given user
     * @dev Queries the Investor Type Registry for the user's investor type
     * @param user The address of the user
     * @return IInvestorTypeRegistry.InvestorType The investor type of the user
     */
    function getInvestorType(address user) external view returns (IInvestorTypeRegistry.InvestorType);

    /**
     * @notice Checks if a user can transfer a specific amount
     * @dev Consults the Investor Type Registry to determine transfer eligibility
     * @param from  Address of the sender
     * @param amount  Amount to be transferred
     * @return bool True if the transfer is allowed, false otherwise
     */
    function canTransferAmount(address from, uint256 amount) external view returns (bool);

    /**
     * @notice Checks if a user can hold a specific amount
     * @dev Consults the Investor Type Registry to determine holding eligibility
     * @param to Address of the recipient
     * @param amount Amount to be held
     * @return bool True if the holding is allowed, false otherwise
     */
    function canHoldAmount(address to, uint256 amount) external view returns (bool);

    /**
     * @notice Retrieves the required whitelist tier for a given user
     * @dev Determines the minimum whitelist tier needed for the user to hold tokens
     * @param user The address of the user
     * @return uint8 The required whitelist tier
     */
    function getRequiredWhitelistTier(address user) external view returns (uint8);

    /*//////////////////////////////////////////////////////////////
                            BATCH FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Registers identities for multiple users with specified countries
     * @dev Associates the given identity contracts with the user addresses in batch
     * @param users An array of user addresses
     * @param identities An array of identity contract addresses
     * @param countries An array of country codes associated with the users
     */
    function batchRegisterIdentity(address[] calldata users, address[] calldata identities, uint16[] calldata countries)
        external;
}
