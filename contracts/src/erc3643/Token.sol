// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC3643} from "../interfaces/erc3643/IERC3643.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {ICompliance} from "../interfaces/compliance/ICompliance.sol";
import {IInvestorTypeRegistry} from "../interfaces/erc3643/IInvestorTypeRegistry.sol";

/**
 * @title Token
 * @dev Implementation of ERC-3643 Security Token Standard
 */
contract Token is IERC3643, ERC20, Ownable, Pausable {
    /*///////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IIdentityRegistry internal _identityRegistry;
    ICompliance internal _compliance;
    IInvestorTypeRegistry internal _investorTypeRegistry;

    mapping(address => bool) internal _frozenAddresses;

    mapping(address => uint256) internal _frozenTokens;

    mapping(address => bool) internal _recoveryAgents;

    /*///////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAgent() {
        if (!_recoveryAgents[msg.sender] || msg.sender == owner()) {
            revert ERC3643__UnauthorizedAgent();
        }
        _;
    }

    modifier whenNotFrozen(address account) {
        if (_frozenAddresses[account]) {
            revert ERC3643__AddressFrozen();
        }
        _;
    }

    modifier whenTransferAllowed(address from, address to, uint256 amount) {
        bool allowed = _compliance.canTransfer(from, to, amount);
        if (!allowed) {
            revert ERC3643__TransferNotAllowed();
        }
        _;
    }

    /*///////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        string memory _name,
        string memory _symbol,
        address _identityRegistryAddress,
        address _complianceAddress
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        _identityRegistry = IIdentityRegistry(_identityRegistryAddress);
        _compliance = ICompliance(_complianceAddress);
        _recoveryAgents[msg.sender] = true;

        emit IdentityRegistryAdded(_identityRegistryAddress);
        emit ComplianceAdded(_complianceAddress);
    }

    /*///////////////////////////////////////////////////////////////
                        ERC-3643 FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IERC3643
    function identityRegistry() external view override returns (address) {
        return address(_identityRegistry);
    }

    /// @inheritdoc IERC3643
    function compliance() external view override returns (address) {
        return address(_compliance);
    }

    /// @inheritdoc IERC3643
    function mint(address to, uint256 amount) external virtual override onlyAgent whenNotPaused {
        if (!_identityRegistry.isVerified(to)) {
            revert ERC3643__IdentityNotVerified();
        }
        if (!_compliance.canTransfer(address(0), to, amount)) {
            revert ERC3643__ComplianceCheckFailed();
        }

        _mint(to, amount);
        _compliance.created(to, amount);
    }

    /// @inheritdoc IERC3643
    function burn(address from, uint256 amount) external override onlyAgent whenNotPaused {
        if (balanceOf(from) <= amount) revert ERC3643__InsufficientBalance();
        if (getFreeBalance(from) <= amount) {
            revert ERC3643__InsufficientFreeBalance();
        }

        _burn(from, amount);
        _compliance.destroyed(from, amount);
    }

    /// @inheritdoc IERC3643
    function setAddressFrozen(address userAddress, bool _isFrozen) external override onlyAgent {
        _frozenAddresses[userAddress] = _isFrozen;
        emit AddressFrozen(userAddress, _isFrozen, msg.sender);
    }

    /// @inheritdoc IERC3643
    function freePartialTokens(address userAddress, uint256 amount) external override onlyAgent {
        if (balanceOf(userAddress) <= _frozenTokens[userAddress] + amount) {
            revert ERC3643__InsufficientBalanceToFreeze();
        }
        _frozenTokens[userAddress] += amount;
        emit TokensFrozen(userAddress, amount);
    }

    /// @inheritdoc IERC3643
    function unfreezePartialTokens(address userAddress, uint256 amount) external override onlyAgent {
        if (_frozenTokens[userAddress] <= amount) {
            revert ERC3643__InsufficientFrozenTokens();
        }
        _frozenTokens[userAddress] -= amount;
        emit TokensUnfrozen(userAddress, amount);
    }

    /// @inheritdoc IERC3643
    function canTransfer(address from, address to, uint256 amount) external view override returns (bool) {
        if (from == address(0)) {
            bool identityValid = _identityRegistry.isVerified(to);
            bool complianceValid = _compliance.canTransfer(from, to, amount);
            bool holdingLimitValid = true;

            if (address(_investorTypeRegistry) != address(0)) {
                uint256 newBalance = balanceOf(to) + amount;
                holdingLimitValid = _investorTypeRegistry.canHoldAmount(to, newBalance);
            }
            return identityValid && complianceValid && holdingLimitValid;
        }

        if (to == address(0)) {
            return getFreeBalance(from) >= amount;
        }

        // Regular transfer - check transfer limits and holding limits
        // ENFORCE: All transfers require KYC/AML verification
        // EXCEPTION: Trusted contracts (escrow wallets) bypass identity verification
        //            because they are verified through ComplianceRules instead

        // Check if either party is a trusted contract
        bool isTrustedTransfer = _compliance.isTrustedContract(from) || _compliance.isTrustedContract(to);

        bool basicChecks;
        if (isTrustedTransfer) {
            // For trusted contracts: only check non-frozen and compliance
            // Identity verification is handled by ComplianceRules
            if (_frozenAddresses[from]) revert ERC3643__SenderFrozen();
            if (_frozenAddresses[to]) revert ERC3643__RecipientFrozen();
            if (getFreeBalance(from) <= amount) {
                revert ERC3643__InsufficientBalance();
            }
            if (!_compliance.canTransfer(from, to, amount)) {
                revert ERC3643__ComplianceCheckFailed();
            }

            basicChecks = true;
        } else {
            // For regular transfers: check identity, non-frozen, compliance, and limits
            if (_frozenAddresses[from]) revert ERC3643__SenderFrozen();
            if (_frozenAddresses[to]) revert ERC3643__RecipientFrozen();
            if (!_identityRegistry.isVerified(from)) {
                revert ERC3643__SenderNotVerified();
            }
            if (!_identityRegistry.isVerified(to)) {
                revert ERC3643__RecipientNotVerified();
            }
            if (getFreeBalance(from) <= amount) {
                revert ERC3643__InsufficientBalance();
            }
            if (!_compliance.canTransfer(from, to, amount)) {
                revert ERC3643__ComplianceCheckFailed();
            }

            basicChecks = true;
        }

        if (!basicChecks) {
            return false;
        }

        // Check investor type limits if registry is set
        // SKIP for trusted contracts (escrow wallets don't have investor types)
        if (address(_investorTypeRegistry) != address(0) && !isTrustedTransfer) {
            // Check transfer amount limit for sender
            if (!_investorTypeRegistry.canTransferAmount(from, amount)) {
                revert ERC3643__TransferAmountLimitsExceeded();
            }

            // Check holding amount limit for recipient
            uint256 newBalance = balanceOf(to) + amount;
            if (!_investorTypeRegistry.canHoldAmount(to, newBalance)) {
                revert ERC3643__HoldingAmountLimitsExceeded();
            }
        }
        return true;
    }

    /// @inheritdoc IERC3643
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainId)
        external
        override
        onlyAgent
        returns (bool)
    {
        if (_identityRegistry.identity(lostWallet) != investorOnchainId) {
            revert ERC3643__InvalidIdentity();
        }
        if (_identityRegistry.identity(newWallet) != address(0)) {
            revert ERC3643__NewWalletAlreadyRegistered();
        }

        uint256 balance = balanceOf(lostWallet);
        uint256 frozenBalance = _frozenTokens[lostWallet];

        // Transfer balance
        _transfer(lostWallet, newWallet, balance);

        // Transfer frozen tokens
        _frozenTokens[newWallet] = frozenBalance;
        _frozenTokens[lostWallet] = 0;

        // Update identity registry
        // Simplified for demo
        _identityRegistry.deleteIdentity(lostWallet);

        emit RecoverySuccess(lostWallet, newWallet, investorOnchainId);
        return true;
    }

    /// @inheritdoc IERC3643
    function pause() external override onlyOwner {
        _pause();
        emit Paused(msg.sender);
    }

    /// @inheritdoc IERC3643
    function unpause() external override onlyOwner {
        _unpause();
        emit Unpaused(msg.sender);
    }

    /// @inheritdoc IERC3643
    function paused() public view override(IERC3643, Pausable) returns (bool) {
        return super.paused();
    }

    /// @inheritdoc IERC3643
    function frozenTokens(address userAddress) external view override returns (uint256) {
        return _frozenTokens[userAddress];
    }

    /// @inheritdoc IERC3643
    function getFreeBalance(address userAddress) public view override returns (uint256) {
        return balanceOf(userAddress) - _frozenTokens[userAddress];
    }

    /// @inheritdoc IERC3643
    function isFrozen(address userAddress) external view override returns (bool) {
        return _frozenAddresses[userAddress];
    }

    /// @inheritdoc IERC3643
    function setIdentityRegistry(address identityRegistry_) external override onlyOwner {
        _identityRegistry = IIdentityRegistry(identityRegistry_);
        emit IdentityRegistryAdded(identityRegistry_);
    }

    /// @inheritdoc IERC3643
    function setCompliance(address compliance_) external override onlyOwner {
        _compliance = ICompliance(compliance_);
        emit ComplianceAdded(compliance_);
    }

    /// @inheritdoc IERC3643
    function setInvestorTypeRegistry(address investorTypeRegistry_) external override onlyOwner {
        _investorTypeRegistry = IInvestorTypeRegistry(investorTypeRegistry_);
    }

    /// @inheritdoc IERC3643
    function investorTypeRegistry() external view override returns (address) {
        return address(_investorTypeRegistry);
    }

    /*///////////////////////////////////////////////////////////////
                      AGENT MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    /// @inheritdoc IERC3643
    function addAgent(address agent) external override onlyOwner {
        _recoveryAgents[agent] = true;
    }

    /// @inheritdoc IERC3643
    function removeAgent(address agent) external override onlyOwner {
        _recoveryAgents[agent] = false;
    }

    /// @inheritdoc IERC3643
    function isAgent(address agent) external view override returns (bool) {
        return _recoveryAgents[agent];
    }

    /*///////////////////////////////////////////////////////////////
                        ERC20 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IERC20
    function transfer(address to, uint256 value)
        public
        virtual
        override(ERC20, IERC20)
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenTransferAllowed(msg.sender, to, value)
        returns (bool)
    {
        bool success = super.transfer(to, value);
        if (success) {
            _compliance.transferred(msg.sender, to, value);
        }
        return success;
    }

    /// @inheritdoc IERC20
    function transferFrom(address from, address to, uint256 value)
        public
        virtual
        override(ERC20, IERC20)
        whenNotPaused
        whenNotFrozen(from)
        whenTransferAllowed(from, to, value)
        returns (bool)
    {
        bool success = super.transferFrom(from, to, value);
        if (success) {
            _compliance.transferred(from, to, value);
        }
        return success;
    }

    function totalSupply() public view override(ERC20, IERC20) returns (uint256) {
        return super.totalSupply();
    }

    function balanceOf(address account) public view override(ERC20, IERC20) returns (uint256) {
        return super.balanceOf(account);
    }

    function allowance(address owner, address spender) public view override(ERC20, IERC20) returns (uint256) {
        return super.allowance(owner, spender);
    }

    function approve(address spender, uint256 value) public override(ERC20, IERC20) returns (bool) {
        return super.approve(spender, value);
    }
}
