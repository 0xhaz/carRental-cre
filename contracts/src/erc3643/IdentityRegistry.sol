// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {IInvestorTypeRegistry} from "../interfaces/erc3643/IInvestorTypeRegistry.sol";
import {IComplianceRules} from "../interfaces/compliance/IComplianceRules.sol";
import {IParticipantTypeRegistry} from "../interfaces/erc3643/IParticipantTypeRegistry.sol";
import {IRenterCompliance} from "../interfaces/compliance/IRenterCompliance.sol";

/**
 * @title IdentityRegistry
 * @dev Implementation of IIdentityRegistry for ERC-3643 ecosystem
 * @notice Enhanced for rental car tokenization platform - supports investors, renters, and rentors
 */
contract IdentityRegistry is IIdentityRegistry, Ownable {
    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice Mapping from wallet address to OnchainID identity
    mapping(address => address) private _identities;

    /// @notice Mapping from wallet address to country code
    mapping(address => uint16) private _countries;

    /// @notice Mapping of authorized agents
    mapping(address => bool) private _agents;

    // Array of bound tokens
    address[] private _tokenBounds;

    /// @notice Mapping to check if a token is bound
    mapping(address => bool) private _isTokenBound;

    /// @notice Investor Type Registry integration (legacy)
    IInvestorTypeRegistry private _investorTypeRegistry;

    /// @notice Participant Type Registry integration (new)
    IParticipantTypeRegistry private _participantTypeRegistry;

    /// @notice Renter Compliance module
    IRenterCompliance private _renterCompliance;

    /// @notice Compliance Rules integration
    IComplianceRules private _complianceRules;

    /// @notice Token address for jurisdiction validation
    address private _tokenForJurisdiction;

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAgent() {
        if (!_agents[msg.sender] && msg.sender != owner()) {
            revert IdentityRegistry__UnauthorizedAgent();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {}

    /// @inheritdoc IIdentityRegistry
    function registerIdentity(address _user, address _identity, uint16 _country) external override onlyAgent {
        if (_user == address(0)) revert IdentityRegistry__InvalidUserAddress();
        if (_identity == address(0)) {
            revert IdentityRegistry__InvalidIdentityAddress();
        }
        if (_identities[_user] != address(0)) {
            revert IdentityRegistry__IdentityAlreadyRegistered();
        }

        // Jurisdiction rules at identity registration
        if (address(_complianceRules) != address(0) && _tokenForJurisdiction != address(0)) {
            (bool isValid, uint8 reason) = _complianceRules.validateJurisdiction(_tokenForJurisdiction, _country);

            if (!isValid) {
                emit IdentityRegistrationRejected(_user, _country, reason);
                revert IdentityRegistry__CountryNotAllowed();
            }
        }

        _identities[_user] = _identity;
        _countries[_user] = _country;

        emit IdentityStored(_user, _identity);
        emit CountryUpdated(_user, _country);
    }

    /// @inheritdoc IIdentityRegistry
    function deleteIdentity(address user) external override onlyAgent {
        if (_identities[user] == address(0)) {
            revert IdentityRegistry__IdentityNotFound();
        }

        address identityAddr = _identities[user];
        delete _identities[user];
        delete _countries[user];

        emit IdentityUnstored(user, identityAddr);
    }

    /// @inheritdoc IIdentityRegistry
    function updateCountry(address user, uint16 country) external override onlyAgent {
        if (_identities[user] == address(0)) {
            revert IdentityRegistry__IdentityNotFound();
        }

        _countries[user] = country;

        emit CountryUpdated(_identities[user], country);
    }

    /// @inheritdoc IIdentityRegistry
    function identity(address user) external view override returns (address) {
        return _identities[user];
    }

    /// @inheritdoc IIdentityRegistry
    function investorCountry(address user) external view override returns (uint16) {
        return _countries[user];
    }

    /// @inheritdoc IIdentityRegistry
    function isVerified(address user) external view override returns (bool) {
        return _identities[user] != address(0);
    }

    /// @inheritdoc IIdentityRegistry
    function bindIdentityRegistry(address _token) external override onlyAgent {
        if (_token == address(0)) revert IdentityRegistry__InvalidTokenAddress();
        if (_isTokenBound[_token]) revert IdentityRegistry__TokenAlreadyBound();

        _tokenBounds.push(_token);
        _isTokenBound[_token] = true;

        emit IdentityRegistryBound(_token);
    }

    /// @inheritdoc IIdentityRegistry
    function unbindIdentityRegistry(address _token) external override onlyAgent {
        if (!_isTokenBound[_token]) revert IdentityRegistry__TokenNotBound();

        for (uint256 i = 0; i < _tokenBounds.length; i++) {
            if (_tokenBounds[i] == _token) {
                _tokenBounds[i] = _tokenBounds[_tokenBounds.length - 1];
                _tokenBounds.pop();
                break;
            }
        }

        _isTokenBound[_token] = false;

        emit IdentityRegistryUnbound(_token);
    }

    /// @inheritdoc IIdentityRegistry
    function batchRegisterIdentity(address[] calldata users, address[] calldata identities, uint16[] calldata countries)
        external
        override
        onlyAgent
    {
        if (users.length != identities.length && users.length != countries.length) {
            revert IdentityRegistry__ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert IdentityRegistry__InvalidUserAddress();
            if (identities[i] == address(0)) revert IdentityRegistry__InvalidIdentityAddress();
            if (_identities[users[i]] != address(0)) revert IdentityRegistry__IdentityAlreadyRegistered();

            _identities[users[i]] = identities[i];
            _countries[users[i]] = countries[i];

            emit IdentityStored(users[i], identities[i]);
            emit CountryUpdated(users[i], countries[i]);
        }
    }

    /// @inheritdoc IIdentityRegistry
    function isAgent(address agent) external view override returns (bool) {
        return _agents[agent];
    }

    /// @inheritdoc IIdentityRegistry
    function addAgent(address agent) external override onlyOwner {
        if (agent == address(0)) revert IdentityRegistry__InvalidAgentAddress();

        _agents[agent] = true;
    }

    /// @inheritdoc IIdentityRegistry
    function removeAgent(address agent) external override onlyOwner {
        _agents[agent] = false;
    }

    /// @inheritdoc IIdentityRegistry
    function getTokensBound() external view override returns (address[] memory) {
        return _tokenBounds;
    }

    /// @inheritdoc IIdentityRegistry
    function isTokenBound(address token) external view override returns (bool) {
        return _isTokenBound[token];
    }

    /// @inheritdoc IIdentityRegistry
    function setInvestorTypeRegistry(address investorTypeRegistry) external override onlyOwner {
        if (investorTypeRegistry == address(0)) {
            revert IdentityRegistry__InvalidInvestorTypeRegistryAddress();
        }

        address previousRegistry = address(_investorTypeRegistry);
        _investorTypeRegistry = IInvestorTypeRegistry(investorTypeRegistry);

        emit InvestorTypeRegistryUpdated(previousRegistry, investorTypeRegistry);
    }

    /// @inheritdoc IIdentityRegistry
    function getInvestorTypeRegistry() external view override returns (address) {
        return address(_investorTypeRegistry);
    }

    /// @inheritdoc IIdentityRegistry
    function setComplianceRules(address complianceRules, address token) external override onlyOwner {
        if (complianceRules == address(0)) {
            revert IdentityRegistry__InvalidComplianceRulesAddress();
        }
        if (token == address(0)) {
            revert IdentityRegistry__InvalidTokenAddress();
        }

        address previousRules = address(_complianceRules);
        _complianceRules = IComplianceRules(complianceRules);
        _tokenForJurisdiction = token;

        emit ComplianceRulesUpdated(previousRules, complianceRules);
    }

    /// @inheritdoc IIdentityRegistry
    function getComplianceRules() external view override returns (address) {
        return address(_complianceRules);
    }

    /// @inheritdoc IIdentityRegistry
    function getInvestorType(address user) external view override returns (IInvestorTypeRegistry.InvestorType) {
        if (address(_investorTypeRegistry) == address(0)) {
            revert IdentityRegistry__InvestorTypeRegistryNotSet();
        }
        return _investorTypeRegistry.getInvestorType(user);
    }

    /// @inheritdoc IIdentityRegistry
    function canTransferAmount(address from, uint256 amount) external view override returns (bool) {
        if (address(_investorTypeRegistry) == address(0)) {
            revert IdentityRegistry__InvestorTypeRegistryNotSet();
        }
        return _investorTypeRegistry.canTransferAmount(from, amount);
    }

    function canHoldAmount(address to, uint256 amount) external view override returns (bool) {
        if (address(_investorTypeRegistry) == address(0)) {
            revert IdentityRegistry__InvestorTypeRegistryNotSet();
        }
        return _investorTypeRegistry.canHoldAmount(to, amount);
    }

    /// @inheritdoc IIdentityRegistry
    function getRequiredWhitelistTier(address user) external view override returns (uint8) {
        if (address(_investorTypeRegistry) == address(0)) {
            revert IdentityRegistry__InvestorTypeRegistryNotSet();
        }
        return _investorTypeRegistry.getRequiredWhitelistTier(user);
    }

    /*//////////////////////////////////////////////////////////////
              RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set participant type registry
     * @param participantTypeRegistry Address of the participant type registry
     */
    function setParticipantTypeRegistry(address participantTypeRegistry) external onlyOwner {
        if (participantTypeRegistry == address(0)) {
            revert IdentityRegistry__InvalidInvestorTypeRegistryAddress();
        }

        _participantTypeRegistry = IParticipantTypeRegistry(participantTypeRegistry);
    }

    /**
     * @notice Get participant type registry address
     * @return Address of the participant type registry
     */
    function getParticipantTypeRegistry() external view returns (address) {
        return address(_participantTypeRegistry);
    }

    /**
     * @notice Set renter compliance module
     * @param renterCompliance Address of the renter compliance contract
     */
    function setRenterCompliance(address renterCompliance) external onlyOwner {
        if (renterCompliance == address(0)) {
            revert IdentityRegistry__InvalidInvestorTypeRegistryAddress();
        }

        _renterCompliance = IRenterCompliance(renterCompliance);
    }

    /**
     * @notice Get renter compliance module address
     * @return Address of the renter compliance module
     */
    function getRenterCompliance() external view returns (address) {
        return address(_renterCompliance);
    }

    /**
     * @notice Check if user is a renter
     * @param user Address to check
     * @return hasRenterRole Whether the user is registered as a renter
     */
    function isRenter(address user) external view returns (bool hasRenterRole) {
        if (address(_participantTypeRegistry) == address(0)) {
            return false;
        }
        return _participantTypeRegistry.isRenter(user);
    }

    /**
     * @notice Check if user is a rentor (vehicle owner)
     * @param user Address to check
     * @return hasRentorRole Whether the user is registered as a rentor
     */
    function isRentor(address user) external view returns (bool hasRentorRole) {
        if (address(_participantTypeRegistry) == address(0)) {
            return false;
        }
        return _participantTypeRegistry.isRentor(user);
    }

    /**
     * @notice Check if user is an investor
     * @param user Address to check
     * @return hasInvestorRole Whether the user is registered as an investor
     */
    function isInvestor(address user) external view returns (bool hasInvestorRole) {
        if (address(_participantTypeRegistry) == address(0)) {
            return false;
        }
        return _participantTypeRegistry.isInvestor(user);
    }

    /**
     * @notice Validate if a user can rent a vehicle
     * @param user Address to check
     * @return isAllowed Whether the user can rent
     * @return reason Reason code if cannot rent
     */
    function canRent(address user) external view returns (bool isAllowed, uint8 reason) {
        // Check if identity is verified
        if (_identities[user] == address(0)) {
            return (false, 0);
        }

        // Check if user has renter role
        if (address(_participantTypeRegistry) != address(0)) {
            if (!_participantTypeRegistry.isRenter(user)) {
                return (false, 1);
            }
        }

        // Check renter compliance if set
        if (address(_renterCompliance) != address(0)) {
            IRenterCompliance.RenterValidationResult memory result = _renterCompliance.validateRenter(user);
            return (result.isValid, uint8(result.reason));
        }

        return (true, 0);
    }

    /**
     * @notice Get comprehensive participant information
     * @param user Address to check
     * @return hasIdentity Whether user has verified identity
     * @return hasInvestorRole Whether user is an investor
     * @return hasRenterRole Whether user is a renter
     * @return hasRentorRole Whether user is a rentor
     */
    function getParticipantInfo(address user)
        external
        view
        returns (
            bool hasIdentity,
            bool hasInvestorRole,
            bool hasRenterRole,
            bool hasRentorRole
        )
    {
        hasIdentity = _identities[user] != address(0);

        if (address(_participantTypeRegistry) != address(0)) {
            hasInvestorRole = _participantTypeRegistry.isInvestor(user);
            hasRenterRole = _participantTypeRegistry.isRenter(user);
            hasRentorRole = _participantTypeRegistry.isRentor(user);
        }

        return (hasIdentity, hasInvestorRole, hasRenterRole, hasRentorRole);
    }
}
