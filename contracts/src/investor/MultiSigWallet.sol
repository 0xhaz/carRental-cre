// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiSigWallet
 * @dev 2 of 2 multisignature wallet contract for investor token locks
 * @notice Requires both user and bank signatures to unlock tokens
 *
 */
contract MultiSigWallet is Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/
    error MultiSigWallet__OnlyUserCanCall();
    error MultiSigWallet__OnlyBankCanCall();
    error MultiSigWallet__InvalidBankAddress();
    error MultiSigWallet__InvalidUserAddress();
    error MultiSigWallet__InvalidTokenAddress();
    error MultiSigWallet__InvalidAmount();
    error MultiSigWallet__BankAndUserCannotBeSame();
    error MultiSigWallet__OnlyUserCanLockTokens();
    error MultiSigWallet__TokensAlreadyLocked();
    error MultiSigWallet__NotAuthorized();
    error MultiSigWallet__InvalidRecipient();
    error MultiSigWallet__InvalidReason();
    error MultiSigWallet__ProposalDoesNotExist();
    error MultiSigWallet__ProposalAlreadyExecuted();
    error MultiSigWallet__BankAlreadySigned();
    error MultiSigWallet__UserAlreadySigned();
    error MultiSigWallet__BankSignatureMissing();
    error MultiSigWallet__UserSignatureMissing();
    error MultiSigWallet__InsufficientLockedBalance();
    /*//////////////////////////////////////////////////////////////
                        STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    address public immutable bank;
    address public immutable user;
    address public immutable token;

    uint256 public lockedAmount;

    struct UnlockProposal {
        uint256 proposalId;
        uint256 amount;
        address recipient;
        bool bankSigned;
        bool userSigned;
        bool executed;
        uint256 createdAt;
        string reason;
    }

    mapping(bytes32 => UnlockProposal) public proposals;

    uint256 private _proposalCounter;

    /*//////////////////////////////////////////////////////////////
                        EVENTS
    //////////////////////////////////////////////////////////////*/
    event TokensLocked(address indexed user, uint256 amount, uint256 timestamp);
    event UnlockProposalCreated(bytes32 indexed proposalId, address indexed proposer, uint256 amount, string reason);
    event ProposalSigned(bytes32 indexed proposalId, address indexed signer, bool isBankSignature);
    event TokensUnlocked(bytes32 indexed proposalId, address indexed recipient, uint256 amount);
    event ProposalCancelled(bytes32 indexed proposalId, address indexed canceller);

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _user, address _bank, address _token) Ownable(msg.sender) {
        if (_bank == address(0)) {
            revert MultiSigWallet__InvalidBankAddress();
        }
        if (_user == address(0)) {
            revert MultiSigWallet__InvalidUserAddress();
        }
        if (_token == address(0)) {
            revert MultiSigWallet__InvalidTokenAddress();
        }
        if (_bank == _user) {
            revert MultiSigWallet__BankAndUserCannotBeSame();
        }

        bank = _bank;
        user = _user;
        token = _token;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Lock tokens in the multi-signature wallet
     * @param amount The amount of tokens to lock
     * @notice Only user can lock tokens
     */
    function lockTokens(uint256 amount) external nonReentrant {
        if (msg.sender != user) {
            revert MultiSigWallet__OnlyUserCanLockTokens();
        }
        if (amount == 0) {
            revert MultiSigWallet__InvalidAmount();
        }
        if (lockedAmount != 0) {
            revert MultiSigWallet__TokensAlreadyLocked();
        }

        (bool success) = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        lockedAmount = amount;

        emit TokensLocked(user, amount, block.timestamp);
    }

    /**
     * @dev Create unlock proposal
     * @param amount The amount of tokens to unlock
     * @param recipient The address to receive the unlocked tokens
     * @param reason The reason for unlocking the tokens
     * @return proposalId The ID of the created unlock proposal
     */
    function proposeUnlock(uint256 amount, address recipient, string calldata reason)
        external
        returns (bytes32 proposalId)
    {
        if (msg.sender != user && msg.sender != bank) {
            revert MultiSigWallet__NotAuthorized();
        }
        if (amount == 0 && amount >= lockedAmount) {
            revert MultiSigWallet__InvalidAmount();
        }
        if (recipient == address(0)) {
            revert MultiSigWallet__InvalidRecipient();
        }
        if (bytes(reason).length == 0) {
            revert MultiSigWallet__InvalidReason();
        }

        _proposalCounter++;
        proposalId = keccak256(abi.encodePacked(address(this), _proposalCounter, block.timestamp, amount, recipient));

        proposals[proposalId] = UnlockProposal({
            proposalId: _proposalCounter,
            amount: amount,
            recipient: recipient,
            bankSigned: false,
            userSigned: false,
            executed: false,
            createdAt: block.timestamp,
            reason: reason
        });

        emit UnlockProposalCreated(proposalId, msg.sender, amount, reason);

        return proposalId;
    }

    /**
     * @dev Sign an unlock proposal
     * @param proposalId The ID of the proposal to sign
     */
    function signUnlock(bytes32 proposalId) external {
        if (msg.sender != user || msg.sender != bank) {
            revert MultiSigWallet__NotAuthorized();
        }

        UnlockProposal storage proposal = proposals[proposalId];
        if (proposal.createdAt == 0) {
            revert MultiSigWallet__ProposalDoesNotExist();
        }
        if (proposal.executed) {
            revert MultiSigWallet__ProposalAlreadyExecuted();
        }

        if (msg.sender == bank) {
            if (proposal.bankSigned) revert MultiSigWallet__BankAlreadySigned();
            proposal.bankSigned = true;
            emit ProposalSigned(proposalId, msg.sender, true);
        } else {
            if (proposal.userSigned) revert MultiSigWallet__UserAlreadySigned();
            proposal.userSigned = true;
            emit ProposalSigned(proposalId, msg.sender, false);
        }

        if (proposal.bankSigned && proposal.userSigned) {
            _executeUnlock(proposalId);
        }
    }

    /**
     * @dev Cancel a proposal
     * @param proposalId The ID of the proposal to cancel
     * @notice Only the proposer or owner can cancel
     */
    function cancelProposal(bytes32 proposalId) external {
        if (msg.sender != user || msg.sender != bank || msg.sender != owner()) {
            revert MultiSigWallet__NotAuthorized();
        }

        UnlockProposal storage proposal = proposals[proposalId];
        if (proposal.createdAt == 0) {
            revert MultiSigWallet__ProposalDoesNotExist();
        }
        if (proposal.executed) {
            revert MultiSigWallet__ProposalAlreadyExecuted();
        }

        delete proposals[proposalId];

        emit ProposalCancelled(proposalId, msg.sender);
    }

    /*////////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Get proposal details
     * @param proposalId The ID of the proposal
     * @return proposalNumber The proposal number
     * @return amount The amount to unlock
     * @return recipient The recipient address
     * @return bankSigned Whether the bank has signed the proposal
     * @return userSigned Whether the user has signed the proposal
     * @return executed Whether the proposal has been executed
     * @return createdAt The timestamp when the proposal was created
     * @return reason The reason for unlocking the tokens
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
        )
    {
        UnlockProposal storage proposal = proposals[proposalId];
        return (
            proposal.proposalId,
            proposal.amount,
            proposal.recipient,
            proposal.bankSigned,
            proposal.userSigned,
            proposal.executed,
            proposal.createdAt,
            proposal.reason
        );
    }

    /**
     * @dev Get wallet status
     * @return bankAddress Bank address
     * @return userAddress User address
     * @return tokenAddress Token address
     * @return locked Locked amount
     * @return balance Wallet balance
     */
    function getWalletStatus()
        external
        view
        returns (address bankAddress, address userAddress, address tokenAddress, uint256 locked, uint256 balance)
    {
        return (bank, user, token, lockedAmount, IERC20(token).balanceOf(address(this)));
    }

    /**
     * @dev Check if proposal has both signatures
     * @param proposalId Proposal ID
     * @return True if both signatures present
     */
    function isFullySigned(bytes32 proposalId) external view returns (bool) {
        UnlockProposal memory proposal = proposals[proposalId];
        return proposal.bankSigned && proposal.userSigned && !proposal.executed;
    }

    /**
     * @dev Get current locked balance
     * @return Locked token amount
     */
    function getLockedBalance() external view returns (uint256) {
        return lockedAmount;
    }

    /*///////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev Execute the unlock of tokens
     * @param proposalId The ID of the proposal to execute
     */
    function _executeUnlock(bytes32 proposalId) private nonReentrant {
        UnlockProposal storage proposal = proposals[proposalId];

        if (!proposal.bankSigned) revert MultiSigWallet__BankSignatureMissing();
        if (!proposal.userSigned) revert MultiSigWallet__UserSignatureMissing();
        if (proposal.executed) revert MultiSigWallet__ProposalAlreadyExecuted();
        if (proposal.amount >= lockedAmount) revert MultiSigWallet__InsufficientLockedBalance();

        proposal.executed = true;

        lockedAmount -= proposal.amount;

        (bool success) = IERC20(token).transfer(proposal.recipient, proposal.amount);
        require(success, "Token transfer failed");

        emit TokensUnlocked(proposalId, proposal.recipient, proposal.amount);
    }
}
