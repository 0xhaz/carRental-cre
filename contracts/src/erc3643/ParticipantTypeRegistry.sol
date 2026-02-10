// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IParticipantTypeRegistry} from "../interfaces/erc3643/IParticipantTypeRegistry.sol";

/**
 * @title ParticipantTypeRegistry
 * @dev Registry for managing all participant types in the rental car tokenization platform
 * @notice Handles investors, renters, and rentors with role-based access control
 */
contract ParticipantTypeRegistry is IParticipantTypeRegistry, Ownable {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Mapping from participant address to their profile
    mapping(address => ParticipantProfile) private _participants;

    /// @notice Blacklist reasons
    mapping(address => string) private _blacklistReasons;

    /// @notice Authorized operators (e.g., compliance officers, rental platform)
    mapping(address => bool) private _authorizedOperators;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedOperator() {
        if (!_authorizedOperators[msg.sender] && msg.sender != owner()) {
            revert ParticipantTypeRegistry__UnauthorizedOperator();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _owner) Ownable(_owner) {
        _authorizedOperators[_owner] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        REGISTRATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IParticipantTypeRegistry
    function registerParticipant(address participant, ParticipantType participantType)
        external
        override
        onlyAuthorizedOperator
    {
        if (participant == address(0)) {
            revert ParticipantTypeRegistry__InvalidParticipantAddress();
        }
        if (participantType == ParticipantType.NONE) {
            revert ParticipantTypeRegistry__InvalidParticipantType();
        }
        if (_participants[participant].registeredAt != 0) {
            revert ParticipantTypeRegistry__ParticipantAlreadyRegistered();
        }

        ParticipantRoles memory roles;

        // Set roles based on participant type
        if (
            participantType == ParticipantType.INVESTOR_RETAIL
                || participantType == ParticipantType.INVESTOR_INSTITUTIONAL
                || participantType == ParticipantType.INVESTOR_STRATEGIC
        ) {
            roles.isInvestor = true;
        } else if (participantType == ParticipantType.RENTER) {
            roles.isRenter = true;
        } else if (participantType == ParticipantType.RENTOR) {
            roles.isRentor = true;
        }

        _participants[participant] = ParticipantProfile({
            primaryType: participantType,
            roles: roles,
            registeredAt: block.timestamp,
            isActive: true,
            isBlacklisted: false
        });

        emit ParticipantRegistered(participant, participantType, block.timestamp);
    }

    /// @inheritdoc IParticipantTypeRegistry
    function updateParticipantType(address participant, ParticipantType newType)
        external
        override
        onlyAuthorizedOperator
    {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        ParticipantType oldType = _participants[participant].primaryType;
        _participants[participant].primaryType = newType;

        emit ParticipantTypeUpdated(participant, oldType, newType);
    }

    /// @inheritdoc IParticipantTypeRegistry
    function addInvestorRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isInvestor = true;

        // If participant has multiple roles, update to MULTI_ROLE
        if (_hasMultipleRoles(participant)) {
            _participants[participant].primaryType = ParticipantType.MULTI_ROLE;
        }

        emit RoleAdded(participant, "INVESTOR");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function addRenterRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isRenter = true;

        // If participant has multiple roles, update to MULTI_ROLE
        if (_hasMultipleRoles(participant)) {
            _participants[participant].primaryType = ParticipantType.MULTI_ROLE;
        }

        emit RoleAdded(participant, "RENTER");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function addRentorRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isRentor = true;

        // If participant has multiple roles, update to MULTI_ROLE
        if (_hasMultipleRoles(participant)) {
            _participants[participant].primaryType = ParticipantType.MULTI_ROLE;
        }

        emit RoleAdded(participant, "RENTOR");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function removeInvestorRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isInvestor = false;
        emit RoleRemoved(participant, "INVESTOR");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function removeRenterRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isRenter = false;
        emit RoleRemoved(participant, "RENTER");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function removeRentorRole(address participant) external override onlyAuthorizedOperator {
        if (_participants[participant].registeredAt == 0) {
            revert ParticipantTypeRegistry__ParticipantNotRegistered();
        }

        _participants[participant].roles.isRentor = false;
        emit RoleRemoved(participant, "RENTOR");
    }

    /// @inheritdoc IParticipantTypeRegistry
    function blacklistParticipant(address participant, string calldata reason)
        external
        override
        onlyAuthorizedOperator
    {
        _participants[participant].isBlacklisted = true;
        _participants[participant].isActive = false;
        _blacklistReasons[participant] = reason;

        emit ParticipantBlacklisted(participant, reason);
    }

    /// @inheritdoc IParticipantTypeRegistry
    function removeParticipantFromBlacklist(address participant)
        external
        override
        onlyAuthorizedOperator
    {
        _participants[participant].isBlacklisted = false;
        _participants[participant].isActive = true;
        delete _blacklistReasons[participant];

        emit ParticipantRemovedFromBlacklist(participant);
    }

    /*//////////////////////////////////////////////////////////////
                            QUERY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IParticipantTypeRegistry
    function getParticipantType(address participant)
        external
        view
        override
        returns (ParticipantType participantType)
    {
        return _participants[participant].primaryType;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function getParticipantProfile(address participant)
        external
        view
        override
        returns (ParticipantProfile memory profile)
    {
        return _participants[participant];
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isParticipantRegistered(address participant)
        external
        view
        override
        returns (bool isRegistered)
    {
        return _participants[participant].registeredAt != 0;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isInvestor(address participant) external view override returns (bool hasRole) {
        return _participants[participant].roles.isInvestor;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isRenter(address participant) external view override returns (bool hasRole) {
        return _participants[participant].roles.isRenter;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isRentor(address participant) external view override returns (bool hasRole) {
        return _participants[participant].roles.isRentor;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isParticipantBlacklisted(address participant)
        external
        view
        override
        returns (bool isBlacklisted)
    {
        return _participants[participant].isBlacklisted;
    }

    /// @inheritdoc IParticipantTypeRegistry
    function isParticipantActive(address participant)
        external
        view
        override
        returns (bool isActive)
    {
        return _participants[participant].isActive;
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set authorized operator status
     * @param operator Address of the operator
     * @param authorized Whether the operator is authorized
     */
    function setAuthorizedOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) {
            revert ParticipantTypeRegistry__InvalidParticipantAddress();
        }
        _authorizedOperators[operator] = authorized;
    }

    /**
     * @notice Check if address is authorized operator
     * @param operator Address to check
     * @return authorized Whether the address is authorized
     */
    function isAuthorizedOperator(address operator) external view returns (bool authorized) {
        return _authorizedOperators[operator];
    }

    /**
     * @notice Get blacklist reason for a participant
     * @param participant Address of the participant
     * @return reason Blacklist reason
     */
    function getBlacklistReason(address participant) external view returns (string memory reason) {
        return _blacklistReasons[participant];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if participant has multiple roles
     * @param participant Address of the participant
     * @return hasMultiple Whether participant has multiple roles
     */
    function _hasMultipleRoles(address participant) internal view returns (bool hasMultiple) {
        ParticipantRoles storage roles = _participants[participant].roles;
        uint8 roleCount = 0;

        if (roles.isInvestor) roleCount++;
        if (roles.isRenter) roleCount++;
        if (roles.isRentor) roleCount++;

        return roleCount > 1;
    }
}
