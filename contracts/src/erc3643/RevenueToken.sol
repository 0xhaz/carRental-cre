// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Token} from "./Token.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIdentityRegistry} from "../interfaces/erc3643/IIdentityRegistry.sol";
import {ICompliance} from "../interfaces/compliance/ICompliance.sol";

/**
 * @title RevenueToken
 * @notice ERC-3643 compliant token representing rights to rental income from a specific vehicle
 * @dev Extends base Token with revenue distribution and transfer restriction functionality
 *
 * Key Features:
 * - Represents rental income rights (not ownership)
 * - Non-transferable or restricted transfer (securities compliance)
 * - Receives proportional revenue distributions
 * - Lock-up periods enforced
 * - Tracks accumulated revenue per token holder
 * - Can be redeemed after vehicle lifecycle ends
 */
contract RevenueToken is Token {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Vehicle Identification Number (VIN) this revenue token is linked to
    string public vehicleVIN;

    /// @notice Vehicle NFT token ID this revenue token is linked to
    uint256 public vehicleTokenId;

    /// @notice Address of the VehicleNFT contract
    address public vehicleNFTContract;

    /// @notice Address of the corresponding AssetToken
    address public assetToken;

    /// @notice Total supply cap (represents full investment amount)
    uint256 public immutable supplyCap;

    /// @notice Whether transfers are permanently locked
    bool public transfersLocked;

    /// @notice Minimum holding period before transfers allowed (seconds)
    uint256 public minimumHoldingPeriod;

    /// @notice Timestamp when transfers can be unlocked
    uint256 public transferUnlockTime;

    /// @notice Total revenue distributed to token holders
    uint256 public totalRevenueDistributed;

    /// @notice Mapping from holder to timestamp of their last token receipt
    mapping(address => uint256) public lastTokenReceiptTime;

    /// @notice Mapping from holder to accumulated revenue received
    mapping(address => uint256) public accumulatedRevenue;

    /// @notice Revenue distributor contract address
    address public revenueDistributor;

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when revenue is distributed to holders
    event RevenueDistributed(
        address indexed holder,
        uint256 amount,
        uint256 totalDistributed,
        uint256 timestamp
    );

    /// @notice Emitted when transfers are locked/unlocked
    event TransferLockUpdated(bool locked, uint256 unlockTime);

    /// @notice Emitted when revenue distributor is updated
    event RevenueDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    /// @notice Emitted when vehicle information is linked
    event VehicleLinked(
        string indexed vin,
        uint256 indexed tokenId,
        address vehicleNFTContract,
        address assetToken
    );

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error RevenueToken__TransfersLocked();
    error RevenueToken__HoldingPeriodNotMet();
    error RevenueToken__SupplyCapExceeded();
    error RevenueToken__InvalidVIN();
    error RevenueToken__VehicleAlreadyLinked();
    error RevenueToken__OnlyRevenueDistributor();
    error RevenueToken__InvalidDistributor();

    /*//////////////////////////////////////////////////////////////
                           MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyRevenueDistributor() {
        if (msg.sender != revenueDistributor && msg.sender != owner()) {
            revert RevenueToken__OnlyRevenueDistributor();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor for RevenueToken
     * @param _name Token name (e.g., "Tesla Model 3 2024 Revenue Token")
     * @param _symbol Token symbol (e.g., "TSLA-M3-2024-R")
     * @param _identityRegistryAddress Identity registry contract address
     * @param _complianceAddress Compliance contract address
     * @param _supplyCap Maximum token supply (represents full investment amount)
     * @param _vehicleVIN Vehicle Identification Number
     * @param _minimumHoldingPeriod Minimum time before transfers allowed (e.g., 6 months)
     * @param _transfersLocked Whether transfers are permanently locked
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _identityRegistryAddress,
        address _complianceAddress,
        uint256 _supplyCap,
        string memory _vehicleVIN,
        uint256 _minimumHoldingPeriod,
        bool _transfersLocked
    ) Token(_name, _symbol, _identityRegistryAddress, _complianceAddress) {
        if (bytes(_vehicleVIN).length == 0) {
            revert RevenueToken__InvalidVIN();
        }
        if (_supplyCap == 0) {
            revert RevenueToken__SupplyCapExceeded();
        }

        supplyCap = _supplyCap;
        vehicleVIN = _vehicleVIN;
        minimumHoldingPeriod = _minimumHoldingPeriod;
        transfersLocked = _transfersLocked;
        transferUnlockTime = block.timestamp + _minimumHoldingPeriod;
    }

    /*//////////////////////////////////////////////////////////////
                     REVENUE DISTRIBUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set the revenue distributor contract address
     * @param _revenueDistributor Address of revenue distributor contract
     */
    function setRevenueDistributor(address _revenueDistributor) external onlyOwner {
        if (_revenueDistributor == address(0)) {
            revert RevenueToken__InvalidDistributor();
        }

        address oldDistributor = revenueDistributor;
        revenueDistributor = _revenueDistributor;

        emit RevenueDistributorUpdated(oldDistributor, _revenueDistributor);
    }

    /**
     * @notice Record revenue distribution to a holder
     * @param holder Address receiving revenue
     * @param amount Amount of revenue distributed
     * @dev Only callable by revenue distributor contract
     */
    function recordRevenueDistribution(address holder, uint256 amount)
        external
        onlyRevenueDistributor
    {
        accumulatedRevenue[holder] += amount;
        totalRevenueDistributed += amount;

        emit RevenueDistributed(holder, amount, totalRevenueDistributed, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                     VEHICLE-SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Link this revenue token to vehicle and asset token
     * @param _vehicleTokenId Token ID of the vehicle NFT
     * @param _vehicleNFTContract Address of the VehicleNFT contract
     * @param _assetToken Address of the corresponding AssetToken
     * @dev Can only be called once by owner
     */
    function linkToVehicle(
        uint256 _vehicleTokenId,
        address _vehicleNFTContract,
        address _assetToken
    ) external onlyOwner {
        if (vehicleNFTContract != address(0)) {
            revert RevenueToken__VehicleAlreadyLinked();
        }
        if (_vehicleNFTContract == address(0) || _assetToken == address(0)) {
            revert RevenueToken__InvalidVIN();
        }

        vehicleTokenId = _vehicleTokenId;
        vehicleNFTContract = _vehicleNFTContract;
        assetToken = _assetToken;

        emit VehicleLinked(vehicleVIN, _vehicleTokenId, _vehicleNFTContract, _assetToken);
    }

    /**
     * @notice Update transfer lock status
     * @param _locked Whether transfers should be locked
     * @param _unlockTime Timestamp when transfers can be unlocked (0 for immediate)
     * @dev Owner can relax restrictions but not make them stricter without good reason
     */
    function updateTransferLock(bool _locked, uint256 _unlockTime) external onlyOwner {
        transfersLocked = _locked;
        if (_unlockTime > 0) {
            transferUnlockTime = _unlockTime;
        }

        emit TransferLockUpdated(_locked, _unlockTime);
    }

    /*//////////////////////////////////////////////////////////////
                     OVERRIDDEN TRANSFER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Override transfer to enforce restrictions
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success boolean
     */
    function transfer(address to, uint256 amount)
        public
        override
        returns (bool)
    {
        _checkTransferRestrictions(msg.sender);
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to enforce restrictions
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Success boolean
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        returns (bool)
    {
        _checkTransferRestrictions(from);
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Check if transfer restrictions are met
     * @param from Address attempting to transfer
     */
    function _checkTransferRestrictions(address from) internal view {
        // Check if transfers are permanently locked
        if (transfersLocked) {
            revert RevenueToken__TransfersLocked();
        }

        // Check if minimum holding period has passed
        uint256 receiptTime = lastTokenReceiptTime[from];
        if (receiptTime > 0 && block.timestamp < receiptTime + minimumHoldingPeriod) {
            revert RevenueToken__HoldingPeriodNotMet();
        }

        // Check if global unlock time has passed
        if (block.timestamp < transferUnlockTime) {
            revert RevenueToken__HoldingPeriodNotMet();
        }
    }

    /**
     * @notice Update last token receipt time after transfers
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount transferred
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);

        // Update receipt time for recipient (for holding period tracking)
        if (to != address(0)) {
            lastTokenReceiptTime[to] = block.timestamp;
        }
    }

    /*//////////////////////////////////////////////////////////////
                     OVERRIDDEN MINT FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint revenue tokens with supply cap check
     * @param to Recipient address
     * @param amount Amount to mint
     * @dev Overrides base Token mint to enforce supply cap and update receipt time
     */
    function mint(address to, uint256 amount) external override onlyAgent whenNotPaused {
        if (totalSupply() + amount > supplyCap) {
            revert RevenueToken__SupplyCapExceeded();
        }

        // Perform identity and compliance checks (from parent)
        if (!_identityRegistry.isVerified(to)) {
            revert ERC3643__IdentityNotVerified();
        }
        if (!_compliance.canTransfer(address(0), to, amount)) {
            revert ERC3643__ComplianceCheckFailed();
        }

        _mint(to, amount);
        _compliance.created(to, amount);

        // Update last token receipt time for holding period
        lastTokenReceiptTime[to] = block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get revenue information for a holder
     * @param holder Address to check
     * @return balance Token balance
     * @return accumulated Total revenue accumulated
     * @return receiptTime Last time tokens were received
     * @return canTransfer Whether holder can currently transfer
     */
    function getRevenueInfo(address holder)
        external
        view
        returns (
            uint256 balance,
            uint256 accumulated,
            uint256 receiptTime,
            bool canTransfer
        )
    {
        balance = balanceOf(holder);
        accumulated = accumulatedRevenue[holder];
        receiptTime = lastTokenReceiptTime[holder];

        // Check if can transfer
        canTransfer = !transfersLocked
            && block.timestamp >= transferUnlockTime
            && (receiptTime == 0 || block.timestamp >= receiptTime + minimumHoldingPeriod);
    }

    /**
     * @notice Get complete vehicle and token information
     * @return vin Vehicle Identification Number
     * @return tokenId Vehicle NFT token ID
     * @return nftContract VehicleNFT contract address
     * @return asset AssetToken contract address
     * @return cap Maximum token supply
     * @return distributed Total revenue distributed
     */
    function getVehicleInfo()
        external
        view
        returns (
            string memory vin,
            uint256 tokenId,
            address nftContract,
            address asset,
            uint256 cap,
            uint256 distributed
        )
    {
        return (
            vehicleVIN,
            vehicleTokenId,
            vehicleNFTContract,
            assetToken,
            supplyCap,
            totalRevenueDistributed
        );
    }

    /**
     * @notice Check if supply cap has been reached
     * @return True if fully minted
     */
    function isFullyMinted() external view returns (bool) {
        return totalSupply() == supplyCap;
    }

    /**
     * @notice Get remaining tokens that can be minted
     * @return Remaining mintable tokens
     */
    function remainingSupply() external view returns (uint256) {
        return supplyCap - totalSupply();
    }

    /**
     * @notice Calculate revenue share percentage for a holder
     * @param holder Address to check
     * @return percentage Revenue share in basis points (10000 = 100%)
     */
    function revenueSharePercentage(address holder) external view returns (uint256 percentage) {
        if (totalSupply() == 0) return 0;
        return (balanceOf(holder) * 10000) / totalSupply();
    }
}
