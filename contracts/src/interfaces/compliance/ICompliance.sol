// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IComplianceValidator
 * @dev Interface for ERC-3643 Compliance Registry
 */
interface ICompliance {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error Compliance__InvalidRegistryAddress();
    error Compliance__InvalidModuleAddress();
    error Compliance__ModuleAlreadyBound();
    error Compliance__ModuleNotBound();
    error Compliance__NotALargeTransfer();
    error Compliance__InvalidExpiryTime();
    error Compliance__InvalidOfficerAddress();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a compliance module is added
    event ComplianceAdded(address indexed compliance);

    /// @notice Emitted when a compliance module is removed
    event ComplianceRemoved(address indexed compliance);

    /*//////////////////////////////////////////////////////////////
                            CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if a transfer between two addresses is allowed
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Whether the transfer is allowed
     */
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);

    /**
     * @dev Notify the compliance registry of a transfer event
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount transferred
     */
    function transferred(address from, address to, uint256 amount) external;

    /**
     * @dev Notify the compliance registry of a token creation event
     * @param to Recipient address
     * @param amount Amount created
     */
    function created(address to, uint256 amount) external;

    /**
     * @dev Notify the compliance registry of a token destruction event
     * @param from Address from which tokens are destroyed
     * @param amount Amount destroyed
     */
    function destroyed(address from, uint256 amount) external;

    /*//////////////////////////////////////////////////////////////
                           COMPLIANCE MODULES
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add a compliance module
     * @param module Address of the compliance module to add
     */
    function addModule(address module) external;

    /**
     * @dev Remove a compliance module
     * @param module Address of the compliance module to remove
     */
    function removeModule(address module) external;

    /**
     * @dev Get all compliance modules
     * @return Array of compliance module addresses
     */
    function getModules() external view returns (address[] memory);

    /**
     * @dev Check if a compliance module is bound
     * @param module Address of the compliance module
     * @return Whether the module is bound
     */
    function isModuleBound(address module) external view returns (bool);

    /**
     * @dev Check if a contract is trusted
     * @param contractAddress Address of the contract
     * @return isTrusted Whether the contract is trusted
     */
    function isTrustedContract(address contractAddress) external view returns (bool isTrusted);
}
