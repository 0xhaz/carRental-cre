// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IParticipantTypeRegistry
 * @dev Interface for managing participant types in rental car tokenization platform
 * @notice Handles investors, renters, and rentors with their specific roles and permissions
 */
interface IParticipantTypeRegistry {
    /*//////////////////////////////////////////////////////////////
                             CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
    error ParticipantTypeRegistry__InvalidParticipantAddress();
    error ParticipantTypeRegistry__InvalidParticipantType();
    error ParticipantTypeRegistry__UnauthorizedOperator();
    error ParticipantTypeRegistry__ParticipantNotRegistered();
    error ParticipantTypeRegistry__ParticipantAlreadyRegistered();

    /*//////////////////////////////////////////////////////////////
                                  ENUM
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Participant types in the rental car platform
     */
    enum ParticipantType {
        NONE,               // Not registered
        INVESTOR_RETAIL,    // Retail accredited investor
        INVESTOR_INSTITUTIONAL, // Institutional investor
        INVESTOR_STRATEGIC, // Strategic partner (rental companies)
        RENTER,            // Car renter
        RENTOR,            // Vehicle owner/operator
        MULTI_ROLE         // Participant with multiple roles
    }

    /**
     * @dev Role flags for multi-role participants
     */
    struct ParticipantRoles {
        bool isInvestor;
        bool isRenter;
        bool isRentor;
    }

    /**
     * @dev Participant profile
     */
    struct ParticipantProfile {
        ParticipantType primaryType;
        ParticipantRoles roles;
        uint256 registeredAt;
        bool isActive;
        bool isBlacklisted;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a participant is registered
    event ParticipantRegistered(
        address indexed participant,
        ParticipantType participantType,
        uint256 timestamp
    );

    /// @notice Emitted when a participant type is updated
    event ParticipantTypeUpdated(
        address indexed participant,
        ParticipantType oldType,
        ParticipantType newType
    );

    /// @notice Emitted when a role is added to a participant
    event RoleAdded(
        address indexed participant,
        string role
    );

    /// @notice Emitted when a role is removed from a participant
    event RoleRemoved(
        address indexed participant,
        string role
    );

    /// @notice Emitted when a participant is blacklisted
    event ParticipantBlacklisted(
        address indexed participant,
        string reason
    );

    /// @notice Emitted when a participant is removed from blacklist
    event ParticipantRemovedFromBlacklist(
        address indexed participant
    );

    /*//////////////////////////////////////////////////////////////
                        REGISTRATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a new participant
     * @param participant Address of the participant
     * @param participantType Type of participant
     */
    function registerParticipant(address participant, ParticipantType participantType) external;

    /**
     * @notice Update participant type
     * @param participant Address of the participant
     * @param newType New participant type
     */
    function updateParticipantType(address participant, ParticipantType newType) external;

    /**
     * @notice Add investor role to a participant
     * @param participant Address of the participant
     */
    function addInvestorRole(address participant) external;

    /**
     * @notice Add renter role to a participant
     * @param participant Address of the participant
     */
    function addRenterRole(address participant) external;

    /**
     * @notice Add rentor role to a participant
     * @param participant Address of the participant
     */
    function addRentorRole(address participant) external;

    /**
     * @notice Remove investor role from a participant
     * @param participant Address of the participant
     */
    function removeInvestorRole(address participant) external;

    /**
     * @notice Remove renter role from a participant
     * @param participant Address of the participant
     */
    function removeRenterRole(address participant) external;

    /**
     * @notice Remove rentor role from a participant
     * @param participant Address of the participant
     */
    function removeRentorRole(address participant) external;

    /**
     * @notice Blacklist a participant
     * @param participant Address of the participant
     * @param reason Reason for blacklisting
     */
    function blacklistParticipant(address participant, string calldata reason) external;

    /**
     * @notice Remove participant from blacklist
     * @param participant Address of the participant
     */
    function removeParticipantFromBlacklist(address participant) external;

    /*//////////////////////////////////////////////////////////////
                            QUERY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get participant type
     * @param participant Address of the participant
     * @return participantType Type of the participant
     */
    function getParticipantType(address participant) external view returns (ParticipantType participantType);

    /**
     * @notice Get participant profile
     * @param participant Address of the participant
     * @return profile Complete participant profile
     */
    function getParticipantProfile(address participant) external view returns (ParticipantProfile memory profile);

    /**
     * @notice Check if participant is registered
     * @param participant Address of the participant
     * @return isRegistered Whether the participant is registered
     */
    function isParticipantRegistered(address participant) external view returns (bool isRegistered);

    /**
     * @notice Check if participant has investor role
     * @param participant Address of the participant
     * @return hasRole Whether the participant has investor role
     */
    function isInvestor(address participant) external view returns (bool hasRole);

    /**
     * @notice Check if participant has renter role
     * @param participant Address of the participant
     * @return hasRole Whether the participant has renter role
     */
    function isRenter(address participant) external view returns (bool hasRole);

    /**
     * @notice Check if participant has rentor role
     * @param participant Address of the participant
     * @return hasRole Whether the participant has rentor role
     */
    function isRentor(address participant) external view returns (bool hasRole);

    /**
     * @notice Check if participant is blacklisted
     * @param participant Address of the participant
     * @return isBlacklisted Whether the participant is blacklisted
     */
    function isParticipantBlacklisted(address participant) external view returns (bool isBlacklisted);

    /**
     * @notice Check if participant is active
     * @param participant Address of the participant
     * @return isActive Whether the participant is active
     */
    function isParticipantActive(address participant) external view returns (bool isActive);
}
