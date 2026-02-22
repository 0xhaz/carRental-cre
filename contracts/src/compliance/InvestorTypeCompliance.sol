// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IInvestorTypeRegistry} from "../interfaces/erc3643/IInvestorTypeRegistry.sol";
import {ICompliance} from "../interfaces/compliance/ICompliance.sol";

/**
 * @title InvestorTypeCompliance
 * @dev Enhanced compliance module that integrates with investor type system
 */
contract InvestorTypeCompliance is ICompliance, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IInvestorTypeRegistry private investorTypeRegistry;

    /*//////////////////////////////////////////////////////////////
                                MAPPINGS
    //////////////////////////////////////////////////////////////*/
    /// @notice Transfer cooldown tracking
    mapping(address => uint256) private _lastTransferTime;

    /// @notice Large transfer notifications
    mapping(address => bool) private _complianceOfficers;

    /// @notice Transfer approval tracking for large transfers
    mapping(bytes32 => bool) private _approvedLargeTransfers;

    /// @notice Large transfer expiry tracking
    mapping(bytes32 => uint256) private _largeTransferExpiry;

    /// @notice Emergency override
    mapping(address => bool) private _emergencyOverride;

    /// @notice Compliance modules
    address[] private _modules;
    mapping(address => bool) private _isModuleBound;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a large transfer is detected
    event LargeTransferDetected(
        address indexed from, address indexed to, uint256 amount, IInvestorTypeRegistry.InvestorType investorType
    );

    /// @notice Emitted when a large transfer is approved
    event LargeTransferApproved(address indexed from, address indexed to, uint256 amount, address indexed officer);

    /// @notice Emitted when a transfer cooldown violation occurs
    event TransferCooldownViolation(address indexed investor, uint256 remainingCooldown);

    /// @notice Emitted when an emergency override is activated
    event EmergencyOverrideActivated(address indexed investor, address indexed officer);

    /// @notice Emitted when an emergency override is deactivated
    event EmergencyOverrideDeactivated(address indexed investor, address indexed officer);

    /// @notice Emitted when a compliance officer is updated
    event ComplianceOfficerUpdated(address indexed officer, bool authorized);

    /*//////////////////////////////////////////////////////////////
                                MODIFIER
    //////////////////////////////////////////////////////////////*/
    modifier onlyComplianceOfficer() {
        if (!_complianceOfficers[msg.sender] || msg.sender == owner()) {
            revert Compliance__InvalidRegistryAddress();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _investorTypeRegistry) Ownable(msg.sender) {
        if (_investorTypeRegistry == address(0)) {
            revert Compliance__InvalidRegistryAddress();
        }
        investorTypeRegistry = IInvestorTypeRegistry(_investorTypeRegistry);
        _complianceOfficers[msg.sender] = true;
    }

    /// @inheritdoc ICompliance
    function canTransfer(address from, address to, uint256 amount) external view override returns (bool) {
        // Skip checks for minting (from == address(0)) and burning (to == address(0))
        if (from == address(0) || to == address(0)) {
            return true;
        }

        // Check for emergency override
        if (_emergencyOverride[from]) {
            return true;
        }

        // Check if investor type registry is set
        if (address(investorTypeRegistry) == address(0)) {
            return false;
        }

        // Check transfer amount limits
        if (!investorTypeRegistry.canTransferAmount(from, amount)) {
            return false;
        }

        // Check transfer cooldown
        if (!_checkTransferCooldown(from)) {
            return false;
        }

        // Check if large transfer approval is needed
        if (investorTypeRegistry.isLargeTransfer(from, amount)) {
            bytes32 transferHash = _getTransferHash(from, to, amount);
            if (!_approvedLargeTransfers[transferHash] || block.timestamp > _largeTransferExpiry[transferHash]) {
                return false;
            }
        }

        return true;
    }

    /// @inheritdoc ICompliance
    function transferred(address from, address to, uint256 amount) external override {
        // Update last transfer time for cooldown tracking
        _lastTransferTime[from] = block.timestamp;

        // Emit large transfer event if applicable
        if (investorTypeRegistry.isLargeTransfer(from, amount)) {
            IInvestorTypeRegistry.InvestorType investorType = investorTypeRegistry.getInvestorType(from);
            emit LargeTransferDetected(from, to, amount, investorType);
        }
    }

    /// @inheritdoc ICompliance
    function created(address to, uint256 amount) external override {
        // No specific action needed for creation in this compliance module
    }

    /// @inheritdoc ICompliance
    function destroyed(address from, uint256 amount) external override {
        // No specific action needed for destruction in this compliance module
    }

    /// @inheritdoc ICompliance
    function addModule(address module) external override onlyOwner {
        if (module == address(0)) {
            revert Compliance__InvalidModuleAddress();
        }
        if (_isModuleBound[module]) {
            revert Compliance__ModuleAlreadyBound();
        }

        _modules.push(module);
        _isModuleBound[module] = true;

        emit ComplianceAdded(module);
    }

    /// @inheritdoc ICompliance
    function removeModule(address module) external override onlyOwner {
        if (!_isModuleBound[module]) revert Compliance__ModuleNotBound();

        // Remove module from array
        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; i++) {
            if (_modules[i] == module) {
                _modules[i] = _modules[length - 1];
                _modules.pop();
                break;
            }
        }

        _isModuleBound[module] = false;
        emit ComplianceRemoved(module);
    }

    /// @inheritdoc ICompliance
    function getModules() external view override returns (address[] memory) {
        return _modules;
    }

    /// @inheritdoc ICompliance
    function isModuleBound(address module) external view override returns (bool) {
        return _isModuleBound[module];
    }

    /**
     * @dev Approve a large transfer
     * @dev Only callable by authorized compliance officers
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @param expiry Expiry time for the approval
     */
    function approveLargeTransfer(address from, address to, uint256 amount, uint256 expiry)
        external
        onlyComplianceOfficer
    {
        if (!investorTypeRegistry.isLargeTransfer(from, amount)) {
            revert Compliance__NotALargeTransfer();
        }
        if (expiry < block.timestamp) {
            revert Compliance__InvalidExpiryTime();
        }

        bytes32 transferHash = _getTransferHash(from, to, amount);
        _approvedLargeTransfers[transferHash] = true;
        _largeTransferExpiry[transferHash] = expiry;

        emit LargeTransferApproved(from, to, amount, msg.sender);
    }

    /**
     * @notice Activate emergency override for an investor
     * @dev Only callable by authorized compliance officers
     * @param investor Address of the investor
     */
    function activateEmergencyOverride(address investor) external onlyComplianceOfficer {
        _emergencyOverride[investor] = true;
        emit EmergencyOverrideActivated(investor, msg.sender);
    }

    /**
     * @notice Deactivate emergency override for an investor
     * @dev Only callable by authorized compliance officers
     * @param investor Address of the investor
     */
    function deactivateEmergencyOverride(address investor) external onlyComplianceOfficer {
        _emergencyOverride[investor] = false;
        emit EmergencyOverrideDeactivated(investor, msg.sender);
    }

    /**
     * @notice Set compliance officer authorization
     * @dev Only callable by the contract owner
     * @param officer Address of the compliance officer
     * @param authorized Authorization status
     */
    function setComplianceOfficer(address officer, bool authorized) external onlyOwner {
        if (officer == address(0)) revert Compliance__InvalidOfficerAddress();
        _complianceOfficers[officer] = authorized;
        emit ComplianceOfficerUpdated(officer, authorized);
    }

    /**
     * @notice Update investor type registry address
     * @dev Only callable by the contract owner
     * @param registry Address of the new investor type registry
     */
    function setInvestorTypeRegistry(address registry) external onlyOwner {
        if (registry == address(0)) {
            revert Compliance__InvalidRegistryAddress();
        }
        investorTypeRegistry = IInvestorTypeRegistry(registry);
    }

    /**
     * @notice Get investor type registry address
     * @return Address of the investor type registry
     */
    function getInvestorTypeRegistry() external view returns (address) {
        return address(investorTypeRegistry);
    }

    /**
     * @notice Check if an address is compliance officer
     * @param officer Address to check
     * @return Boolean indicating if the address is a compliance officer
     */
    function isComplianceOfficer(address officer) external view returns (bool) {
        return _complianceOfficers[officer];
    }

    /**
     * @notice Check if emergency override is active for an investor
     * @param investor Address of the investor
     * @return Boolean indicating if emergency override is active
     */
    function hasEmergencyOverride(address investor) external view returns (bool) {
        return _emergencyOverride[investor];
    }

    /**
     * @notice Get remaining trasnfer cooldown for an investor
     * @param investor Address of the investor
     * @return Remaining cooldown time in seconds
     */
    function getRemainingCooldown(address investor) external view returns (uint256) {
        uint256 cooldownMinutes = investorTypeRegistry.getTransferCooldown(investor);
        uint256 cooldownSeconds = cooldownMinutes * 60;
        uint256 lastTransfer = _lastTransferTime[investor];

        if (lastTransfer == 0 || block.timestamp >= lastTransfer + cooldownSeconds) {
            return 0;
        }

        return (lastTransfer + cooldownSeconds) - block.timestamp;
    }

    /**
     * @notice Check if large transfer is approved
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Boolean indicating if the large transfer is approved
     */
    function isLargeTransferApproved(address from, address to, uint256 amount) external view returns (bool) {
        bytes32 transferHash = _getTransferHash(from, to, amount);
        return _approvedLargeTransfers[transferHash] && block.timestamp <= _largeTransferExpiry[transferHash];
    }

    /**
     * @notice Get large transfer approval expiry time
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Expiry time as a Unix timestamp
     */
    function getLargeTransferExpiry(address from, address to, uint256 amount) external view returns (uint256) {
        bytes32 transferHash = _getTransferHash(from, to, amount);
        return _largeTransferExpiry[transferHash];
    }

    /**
     * @notice Get tranasfer cooldown violation details
     * @param investor Address of the investor
     * @return hasViolation Boolean indicating if a violation occurred
     * @return remainingCooldown Remaining cooldown time in seconds
     * @return lastTransferTime Last transfer timestamp
     */
    function getTransferCooldownViolation(address investor)
        external
        view
        returns (bool hasViolation, uint256 remainingCooldown, uint256 lastTransferTime)
    {
        uint256 remaining = this.getRemainingCooldown(investor);
        return (remaining > 0, remaining, _lastTransferTime[investor]);
    }

    /// @inheritdoc ICompliance
    function isTrustedContract(
        address /*contractAddress*/
    )
        external
        pure
        override
        returns (bool isTrusted)
    {
        // This compliance module does not maintain a trusted contracts list
        return false;
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check transfer cooldown for an investor
     * @param _investor Address of the investor
     * @return Boolean indicating if cooldown is satisfied
     */
    function _checkTransferCooldown(address _investor) private view returns (bool) {
        uint256 lastTransfer = _lastTransferTime[_investor];

        // No previous transfer recorded, cooldown satisfied
        if (lastTransfer == 0) {
            return true;
        }

        // Get cooldown period from investor type registry
        uint256 cooldownMinutes = investorTypeRegistry.getTransferCooldown(_investor);
        uint256 cooldownSeconds = cooldownMinutes * 60;

        // Check if cooldown period has passed
        return block.timestamp >= lastTransfer + cooldownSeconds;
    }

    /**
     * @dev Generate a unique hash for a transfer
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     * @return Unique hash representing the transfer
     */
    function _getTransferHash(address from, address to, uint256 amount) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to, amount));
    }
}
