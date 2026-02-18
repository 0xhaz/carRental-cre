// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {OnchainID} from "./OnchainID.sol";
import {IOnchainID} from "../interfaces/erc3643/IOnchainID.sol";

/**
 * @title OnchainIDFactory
 * @dev Factory contract for deploying OnchainID instances with deterministic addresses
 */
contract OnchainIDFactory is Ownable {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error OnchainIDFactory__DeploymentPaused();
    error OnchainIDFactory__InvalidOwnerAddress();
    error OnchainIDFactory__InsufficientDeploymentFee();
    error OnchainIDFactory__SaltAlreadyUsed();
    error OnchainIDFactory__InvalidManagementKey();
    error OnchainIDFactory__ArrayLengthMismatch();
    error OnchainIDFactory__EmptyArray();
    error OnchainIDFactory__OffsetOutOfBounds();
    error OnchainIDFactory__NoBalanceToWithdraw();

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    /// @notice Emitted when a new OnchainID contract is deployed
    event OnchainIDDeployed(address indexed identity, address indexed owner, bytes32 indexed salt, address deployer);
    /// @notice Emitted when ownership of the factory is transferred
    event FactoryOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice Mapping to track deployed OnchainID contracts
    mapping(address => bool) public isOnchainID;

    /// @notice Mappings for owner to identity address
    mapping(address => address) public ownerToIdentity;

    /// @notice Mappings for salt to identity address
    mapping(bytes32 => address) public saltToIdentity;

    address[] public deployedIdentities;
    uint256 public totalIdentities;

    // Factory configuration
    bool public deploymentPaused;
    uint256 public deploymentFee;
    address public feeRecipient;

    /*//////////////////////////////////////////////////////////////
                         CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) Ownable(_owner) {
        feeRecipient = _owner;
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Modifier to check if deployment is not paused
     */
    modifier whenNotPaused() {
        if (deploymentPaused) revert OnchainIDFactory__DeploymentPaused();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                       EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Deploy a new OnchainID contract with a deterministic address
     * @param _owner The owner of the new OnchainID contract
     * @param _salt The salt used for deterministic deployment
     * @return identity The address of the deployed OnchainID contract
     */
    function deployOnchainID(address _owner, bytes32 _salt) external payable whenNotPaused returns (address identity) {
        if (_owner == address(0)) revert OnchainIDFactory__InvalidOwnerAddress();
        if (msg.value <= deploymentFee) revert OnchainIDFactory__InsufficientDeploymentFee();
        if (saltToIdentity[_salt] != address(0)) revert OnchainIDFactory__SaltAlreadyUsed();

        // Deploy OnchainID contract using Create2 (no admin key)
        bytes memory bytecode = abi.encodePacked(type(OnchainID).creationCode, abi.encode(_owner, address(0)));

        identity = Create2.deploy(0, _salt, bytecode);

        // Register the deployed contract
        isOnchainID[identity] = true;
        ownerToIdentity[_owner] = identity;
        saltToIdentity[_salt] = identity;
        deployedIdentities.push(identity);
        totalIdentities += 1;

        // Transfer deployment fee to fee recipient
        if (msg.value > 0 && feeRecipient != address(0)) {
            (bool sent,) = feeRecipient.call{value: msg.value}("");
            require(sent, "Failed to send deployment fee");
        }

        emit OnchainIDDeployed(identity, _owner, _salt, msg.sender);

        return identity;
    }

    /**
     * @dev Deploy OnchainID with management key
     * @param _owner The owner of the new OnchainID contract
     * @param _managementKey Initial management key to be added
     * @param _salt The salt used for deterministic deployment
     * @return identity The address of the deployed OnchainID contract
     */
    function deployOnchainIDWithKey(address _owner, address _managementKey, bytes32 _salt)
        external
        payable
        whenNotPaused
        returns (address identity)
    {
        if (_owner == address(0)) revert OnchainIDFactory__InvalidOwnerAddress();
        if (_managementKey == address(0)) revert OnchainIDFactory__InvalidManagementKey();
        if (msg.value <= deploymentFee) revert OnchainIDFactory__InsufficientDeploymentFee();
        if (saltToIdentity[_salt] != address(0)) revert OnchainIDFactory__SaltAlreadyUsed();

        // Deploy OnchainID contract using Create2 (owner + admin management key)
        bytes memory bytecode = abi.encodePacked(type(OnchainID).creationCode, abi.encode(_owner, _managementKey));

        identity = Create2.deploy(0, _salt, bytecode);

        // Register the deployed contract
        isOnchainID[identity] = true;
        ownerToIdentity[_owner] = identity;
        saltToIdentity[_salt] = identity;
        deployedIdentities.push(identity);
        totalIdentities += 1;

        // Transfer excess fee to fee recipient
        if (msg.value > 0 && feeRecipient != address(0)) {
            (bool sent,) = feeRecipient.call{value: msg.value}("");
            require(sent, "Failed to send deployment fee");
        }

        emit OnchainIDDeployed(identity, _owner, _salt, msg.sender);

        return identity;
    }

    /**
     * @dev Compute the address of an OnchainID contract before deployment
     * @param _owner The owner of the identity
     * @param _salt Salt for deterministic address generation
     * @return identity The computed address
     */
    function computeOnchainIDAddress(address _owner, address _admin, bytes32 _salt) external view returns (address identity) {
        bytes memory bytecode = abi.encodePacked(type(OnchainID).creationCode, abi.encode(_owner, _admin));

        return Create2.computeAddress(_salt, keccak256(bytecode));
    }

    /**
     * @dev Batch deploy multiple OnchainID contracts
     * @param _owners Array of owners for the new OnchainID contracts
     * @param _salts Array of salts for deterministic deployment
     * @return identities Array of deployed OnchainID contract addresses
     */
    function batchDeployOnchainID(address[] calldata _owners, bytes32[] calldata _salts)
        external
        payable
        whenNotPaused
        returns (address[] memory identities)
    {
        if (_owners.length != _salts.length) revert OnchainIDFactory__ArrayLengthMismatch();
        if (_owners.length == 0) revert OnchainIDFactory__EmptyArray();
        if (msg.value <= deploymentFee * _owners.length) revert OnchainIDFactory__InsufficientDeploymentFee();

        identities = new address[](_owners.length);

        for (uint256 i = 0; i < _owners.length; i++) {
            if (_owners[i] == address(0)) revert OnchainIDFactory__InvalidOwnerAddress();
            if (saltToIdentity[_salts[i]] != address(0)) revert OnchainIDFactory__SaltAlreadyUsed();

            // Deploy OnchainID contract using Create2 (no admin key for batch)
            bytes memory bytecode = abi.encodePacked(type(OnchainID).creationCode, abi.encode(_owners[i], address(0)));

            address identity = Create2.deploy(0, _salts[i], bytecode);

            // Register the deployed contract
            isOnchainID[identity] = true;
            ownerToIdentity[_owners[i]] = identity;
            saltToIdentity[_salts[i]] = identity;
            deployedIdentities.push(identity);
            totalIdentities += 1;

            identities[i] = identity;

            emit OnchainIDDeployed(identity, _owners[i], _salts[i], msg.sender);
        }

        // Transfer deployment fees to fee recipient
        uint256 totalFee = deploymentFee * _owners.length;
        if (totalFee > 0 && feeRecipient != address(0)) {
            (bool sent,) = feeRecipient.call{value: totalFee}("");
            require(sent, "Failed to send deployment fees");
        }

        return identities;
    }

    /**
     * @dev Get identity by owner
     * @param _owner The owner address
     * @return identity The OnchainID contract address
     */
    function getIdentityByOwner(address _owner) external view returns (address identity) {
        return ownerToIdentity[_owner];
    }

    /**
     * @dev Get identity by salt
     * @param _salt The salt used for deployment
     * @return identity The OnchainID contract address
     */
    function getIdentityBySalt(bytes32 _salt) external view returns (address identity) {
        return saltToIdentity[_salt];
    }

    /**
     * @dev Get all deployed identities
     * @return identities Array of all deployed identity addresses
     */
    function getAllIdentities() external view returns (address[] memory identities) {
        return deployedIdentities;
    }

    /**
     * @dev Get deployed identities with pagination
     * @param _offset Starting index
     * @param _limit Number of identities to retrieve
     * @return identities Array of deployed identity addresses
     */
    function getIdentitiesPaginated(uint256 _offset, uint256 _limit)
        external
        view
        returns (address[] memory identities)
    {
        if (_offset > deployedIdentities.length) {
            revert OnchainIDFactory__OffsetOutOfBounds();
        }

        uint256 end = _offset + _limit;
        if (end > deployedIdentities.length) {
            end = deployedIdentities.length;
        }

        identities = new address[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            identities[i - _offset] = deployedIdentities[i];
        }

        return identities;
    }

    /**
     * @dev Check if an address is a valid OnchainID deployed by this factory
     * @param _identity The address to check
     * @return valid True if the address is a valid OnchainID, false otherwise
     */
    function isValidOnchainID(address _identity) external view returns (bool valid) {
        return isOnchainID[_identity];
    }

    /**
     * @dev Get factory statistics
     * @return totalDeployed Total number of deployed OnchainID contracts
     * @return currentFee Current deployment fee
     * @return isPaused Whether deployments are paused
     */
    function getFactoryStats() external view returns (uint256 totalDeployed, uint256 currentFee, bool isPaused) {
        return (totalIdentities, deploymentFee, deploymentPaused);
    }

    /*//////////////////////////////////////////////////////////////
                      ADMINISTRATIVE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set deployment fee
     * @param _fee New deployment fee
     */
    function setDeploymentFee(uint256 _fee) external onlyOwner {
        deploymentFee = _fee;
    }

    /**
     * @dev Set fee recipient address
     * @param _recipient New fee recipient address
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) {
            revert OnchainIDFactory__InvalidOwnerAddress();
        }
        feeRecipient = _recipient;
    }

    /**
     * @dev Pause or unpause deployments
     * @param _paused True to pause, false to unpause
     */
    function setDeploymentPaused(bool _paused) external onlyOwner {
        deploymentPaused = _paused;
    }

    /**
     * @dev Emergency withdraw function to transfer contract balance to owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert OnchainIDFactory__NoBalanceToWithdraw();
        (bool sent,) = owner().call{value: balance}("");
        require(sent, "Failed to withdraw balance");
    }

    /**
     * @dev Transfer ownership of the factory
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0)) {
            revert OnchainIDFactory__InvalidOwnerAddress();
        }
        address oldOwner = owner();
        _transferOwnership(newOwner);

        emit FactoryOwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
