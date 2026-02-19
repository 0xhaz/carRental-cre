// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRevenueDistributor} from "../interfaces/revenue/IRevenueDistributor.sol";
import {IRevenueToken} from "../interfaces/erc3643/IRevenueToken.sol";

/**
 * @title RevenueDistributor
 * @notice Distributes rental revenue using waterfall logic to RevenueToken holders
 * @dev Implements platform fees, reserves, and proportional distribution
 *
 * Revenue Waterfall:
 * - 15% Platform Fee → Protocol treasury
 * - 10% Maintenance Reserve → Per-vehicle escrow (admin-managed)
 * - 5% Insurance → Vehicle operator (rentor responsibility)
 * - 10% Operating Costs → Vehicle operator (rentor responsibility)
 * - 10% Operator Fee → Vehicle operator (rentor)
 * - 50% Net Distributable → RevenueToken holders (proportional)
 *
 * Insurance + Operating + Operator = 25% total withdrawable by the rentor via withdrawOperatorFees().
 */
contract RevenueDistributor is IRevenueDistributor, Ownable, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Mapping from vehicle ID to revenue information
    mapping(uint256 => VehicleRevenue) private _vehicleRevenue;

    /// @notice Mapping from vehicle ID to distribution records
    mapping(uint256 => DistributionRecord[]) private _distributionHistory;

    /// @notice Mapping from vehicle ID to maintenance reserve
    mapping(uint256 => uint256) private _maintenanceReserves;

    /// @notice Total platform fees accumulated
    uint256 private _platformFeesAccumulated;

    /// @notice Total revenue distributed across all vehicles
    uint256 private _totalDistributed;

    /// @notice Platform fee percentage (basis points, 1500 = 15%)
    uint256 public platformFeePercent;

    /// @notice Maintenance reserve percentage (basis points, 1000 = 10%)
    uint256 public maintenancePercent;

    /// @notice Insurance fee percentage (basis points, 500 = 5%)
    uint256 public insurancePercent;

    /// @notice Operating costs percentage (basis points, 1000 = 10%)
    uint256 public operatingPercent;

    /// @notice Operator fee percentage (basis points, 1000 = 10%)
    uint256 public operatorPercent;

    /// @notice Mapping from vehicle ID to operator (rentor) address
    mapping(uint256 => address) private _vehicleOperators;

    /// @notice Accumulated operator fees per vehicle
    mapping(uint256 => uint256) private _operatorFeesAccumulated;

    /// @notice Authorized revenue sources (RentalOperations, PaymentProtocol)
    mapping(address => bool) public authorizedSources;

    /// @notice Cumulative revenue per token (scaled by PRECISION) per vehicle
    mapping(uint256 => uint256) private _revenuePerTokenAccumulated;

    /// @notice Snapshot of revenuePerToken at the time a holder last claimed
    mapping(uint256 => mapping(address => uint256)) private _holderRevenueCheckpoint;

    /// @notice Total claimed by each holder per vehicle
    mapping(uint256 => mapping(address => uint256)) private _holderTotalClaimed;

    /// @notice Unclaimed revenue pool per vehicle (held for pull claims)
    mapping(uint256 => uint256) private _unclaimedPool;

    /// @notice Precision multiplier for revenue-per-token calculations
    uint256 private constant PRECISION = 1e18;

    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BASIS_POINTS = 10000;

    /*//////////////////////////////////////////////////////////////
                             MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedSource() {
        if (!authorizedSources[msg.sender] && msg.sender != owner()) {
            revert RevenueDistributor__Unauthorized();
        }
        _;
    }

    modifier vehicleRegistered(uint256 vehicleId) {
        if (_vehicleRevenue[vehicleId].revenueToken == address(0)) {
            revert RevenueDistributor__VehicleNotRegistered();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {
        // Set default percentages (total = 100%)
        platformFeePercent = 1500; // 15%
        maintenancePercent = 1000; // 10%
        insurancePercent = 500; // 5%
        operatingPercent = 1000; // 10%
        operatorPercent = 1000; // 10%
        // Remaining 50% goes to token holders
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setAuthorizedSource(address source, bool status) external onlyOwner {
        authorizedSources[source] = status;
    }

    function updateFeePercentages(
        uint256 platformFeePercent_,
        uint256 maintenancePercent_,
        uint256 insurancePercent_,
        uint256 operatingPercent_,
        uint256 operatorPercent_
    ) external override onlyOwner {
        // Total must not exceed 100%
        uint256 total =
            platformFeePercent_ + maintenancePercent_ + insurancePercent_ + operatingPercent_ + operatorPercent_;

        if (total >= BASIS_POINTS) {
            revert RevenueDistributor__InvalidFeePercentage();
        }

        platformFeePercent = platformFeePercent_;
        maintenancePercent = maintenancePercent_;
        insurancePercent = insurancePercent_;
        operatingPercent = operatingPercent_;
        operatorPercent = operatorPercent_;
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a vehicle for revenue distribution
     */
    function registerVehicle(uint256 vehicleId, address revenueToken) external override onlyOwner {
        if (revenueToken == address(0)) {
            revert RevenueDistributor__InvalidRevenueToken();
        }

        if (_vehicleRevenue[vehicleId].revenueToken != address(0)) {
            // Already registered, just update
            _vehicleRevenue[vehicleId].revenueToken = revenueToken;
        } else {
            _vehicleRevenue[vehicleId] = VehicleRevenue({
                revenueToken: revenueToken,
                accumulatedRevenue: 0,
                totalDistributed: 0,
                lastDistribution: 0,
                distributionCount: 0
            });
        }

        emit VehicleRegistered(vehicleId, revenueToken);
    }

    /**
     * @notice Set or update the operator (rentor) address for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @param operator Address of the vehicle operator who receives the operator fee
     */
    function setVehicleOperator(uint256 vehicleId, address operator) external onlyOwner {
        _vehicleOperators[vehicleId] = operator;
    }

    /**
     * @notice Add revenue for a vehicle
     */
    function addRevenue(uint256 vehicleId, uint256 amount)
        external
        payable
        override
        onlyAuthorizedSource
        vehicleRegistered(vehicleId)
    {
        if (msg.value > 0) {
            amount = msg.value;
        }

        _vehicleRevenue[vehicleId].accumulatedRevenue += amount;

        emit RevenueReceived(vehicleId, amount, _vehicleRevenue[vehicleId].revenueToken, block.timestamp);
    }

    /**
     * @notice Distribute accumulated revenue for a vehicle
     */
    function distributeRevenue(uint256 vehicleId)
        external
        override
        nonReentrant
        vehicleRegistered(vehicleId)
        returns (uint256 distributionId)
    {
        VehicleRevenue storage vehicleRev = _vehicleRevenue[vehicleId];

        if (vehicleRev.accumulatedRevenue == 0) {
            revert RevenueDistributor__NoRevenueToDistribute();
        }

        uint256 grossRevenue = vehicleRev.accumulatedRevenue;

        // Apply waterfall
        RevenueAllocation memory allocation = calculateWaterfall(grossRevenue);

        // Store platform fees
        _platformFeesAccumulated += allocation.platformFee;

        // Store maintenance reserve for this vehicle
        _maintenanceReserves[vehicleId] += allocation.maintenanceReserve;

        // Store operator fees for this vehicle (includes insurance + operating costs — rentor responsibility)
        _operatorFeesAccumulated[vehicleId] += allocation.operatorFee + allocation.insuranceFee + allocation.operatingCosts;

        // Emit waterfall event
        emit WaterfallApplied(
            vehicleId,
            allocation.grossRevenue,
            allocation.platformFee,
            allocation.maintenanceReserve,
            allocation.insuranceFee,
            allocation.operatingCosts,
            allocation.operatorFee,
            allocation.netDistributable
        );

        // Get RevenueToken holders and distribute
        IRevenueToken revenueToken = IRevenueToken(vehicleRev.revenueToken);
        uint256 totalSupply = revenueToken.totalSupply();

        if (totalSupply == 0) {
            // No token holders, accumulate as platform fees
            _platformFeesAccumulated += allocation.netDistributable;
        } else {
            // Distribute to token holders proportionally
            uint256 recipientCount = _distributeToHolders(vehicleId, revenueToken, allocation.netDistributable);

            // Create distribution record
            distributionId = vehicleRev.distributionCount++;

            _distributionHistory[vehicleId].push(
                DistributionRecord({
                    vehicleId: vehicleId,
                    distributionId: distributionId,
                    totalDistributed: allocation.netDistributable,
                    recipientCount: recipientCount,
                    timestamp: block.timestamp
                })
            );

            emit RevenueDistributed(
                vehicleId, distributionId, allocation.netDistributable, recipientCount, block.timestamp
            );
        }

        // Update vehicle revenue tracking
        vehicleRev.accumulatedRevenue = 0;
        vehicleRev.totalDistributed += allocation.netDistributable;
        vehicleRev.lastDistribution = block.timestamp;

        _totalDistributed += allocation.netDistributable;
    }

    /**
     * @notice Batch distribute revenue for multiple vehicles
     */
    function batchDistribute(uint256[] memory vehicleIds) external override nonReentrant {
        for (uint256 i = 0; i < vehicleIds.length; i++) {
            if (_vehicleRevenue[vehicleIds[i]].accumulatedRevenue > 0) {
                this.distributeRevenue(vehicleIds[i]);
            }
        }
    }

    /**
     * @notice Withdraw accumulated platform fees
     */
    function withdrawPlatformFees(address recipient) external override onlyOwner nonReentrant {
        uint256 amount = _platformFeesAccumulated;

        if (amount == 0) {
            revert RevenueDistributor__NoRevenueToDistribute();
        }

        _platformFeesAccumulated = 0;

        // payable(recipient).transfer(amount);
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert RevenueDistributor__WithdrawalFailed();
        }

        emit FeesWithdrawn(recipient, amount, 0);
    }

    /**
     * @notice Withdraw maintenance reserve for a vehicle
     */
    function withdrawMaintenanceReserve(uint256 vehicleId, address recipient, uint256 amount)
        external
        override
        onlyOwner
        nonReentrant
        vehicleRegistered(vehicleId)
    {
        if (amount > _maintenanceReserves[vehicleId]) {
            revert RevenueDistributor__NoRevenueToDistribute();
        }

        _maintenanceReserves[vehicleId] -= amount;

        // payable(recipient).transfer(amount);
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert RevenueDistributor__WithdrawalFailed();
        }

        emit FeesWithdrawn(recipient, 0, amount);
    }

    /**
     * @notice Withdraw accumulated operator fees for a vehicle
     * @dev Only the vehicle operator or contract owner can withdraw.
     *      Includes operator fee (10%) + insurance (5%) + operating costs (10%) = 25% total.
     * @param vehicleId Vehicle NFT token ID
     */
    function withdrawOperatorFees(uint256 vehicleId)
        external
        nonReentrant
        vehicleRegistered(vehicleId)
    {
        address operator = _vehicleOperators[vehicleId];
        if (msg.sender != operator && msg.sender != owner()) {
            revert RevenueDistributor__Unauthorized();
        }

        uint256 amount = _operatorFeesAccumulated[vehicleId];
        if (amount == 0) {
            revert RevenueDistributor__NoRevenueToDistribute();
        }

        _operatorFeesAccumulated[vehicleId] = 0;

        address recipient = operator != address(0) ? operator : msg.sender;
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) {
            revert RevenueDistributor__WithdrawalFailed();
        }
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getVehicleRevenue(uint256 vehicleId) external view override returns (VehicleRevenue memory info) {
        return _vehicleRevenue[vehicleId];
    }

    function getDistributionRecord(uint256 vehicleId, uint256 distributionId)
        external
        view
        override
        returns (DistributionRecord memory record)
    {
        return _distributionHistory[vehicleId][distributionId];
    }

    function getVehicleDistributions(uint256 vehicleId)
        external
        view
        override
        returns (DistributionRecord[] memory records)
    {
        return _distributionHistory[vehicleId];
    }

    function calculateWaterfall(uint256 grossRevenue)
        public
        view
        override
        returns (RevenueAllocation memory allocation)
    {
        allocation.grossRevenue = grossRevenue;

        // Calculate each component
        allocation.platformFee = (grossRevenue * platformFeePercent) / BASIS_POINTS;
        allocation.maintenanceReserve = (grossRevenue * maintenancePercent) / BASIS_POINTS;
        allocation.insuranceFee = (grossRevenue * insurancePercent) / BASIS_POINTS;
        allocation.operatingCosts = (grossRevenue * operatingPercent) / BASIS_POINTS;
        allocation.operatorFee = (grossRevenue * operatorPercent) / BASIS_POINTS;

        // Net distributable is remainder
        allocation.netDistributable = grossRevenue - allocation.platformFee - allocation.maintenanceReserve
            - allocation.insuranceFee - allocation.operatingCosts - allocation.operatorFee;

        allocation.timestamp = block.timestamp;
    }

    function getPlatformFees() external view override returns (uint256 totalFees) {
        return _platformFeesAccumulated;
    }

    function getMaintenanceReserve(uint256 vehicleId) external view override returns (uint256 reserve) {
        return _maintenanceReserves[vehicleId];
    }

    function getOperatorFees(uint256 vehicleId) external view returns (uint256 fees) {
        return _operatorFeesAccumulated[vehicleId];
    }

    function getVehicleOperator(uint256 vehicleId) external view returns (address operator) {
        return _vehicleOperators[vehicleId];
    }

    function getTotalDistributed() external view override returns (uint256 total) {
        return _totalDistributed;
    }

    function isVehicleRegistered(uint256 vehicleId) external view override returns (bool registered) {
        return _vehicleRevenue[vehicleId].revenueToken != address(0);
    }

    /// @inheritdoc IRevenueDistributor
    function getClaimableRevenue(uint256 vehicleId, address holder) external view override returns (uint256 claimable) {
        return _calculateClaimable(vehicleId, holder);
    }

    /*//////////////////////////////////////////////////////////////
                        CLAIM FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRevenueDistributor
    function claimRevenue(uint256 vehicleId)
        external
        override
        nonReentrant
        vehicleRegistered(vehicleId)
        returns (uint256 amount)
    {
        amount = _processClaimForHolder(vehicleId, msg.sender);
        if (amount == 0) {
            revert RevenueDistributor__NothingToClaim();
        }
    }

    /// @inheritdoc IRevenueDistributor
    function batchClaimRevenue(uint256[] memory vehicleIds)
        external
        override
        nonReentrant
        returns (uint256 totalClaimed)
    {
        for (uint256 i = 0; i < vehicleIds.length; i++) {
            if (_vehicleRevenue[vehicleIds[i]].revenueToken != address(0)) {
                totalClaimed += _processClaimForHolder(vehicleIds[i], msg.sender);
            }
        }

        if (totalClaimed == 0) {
            revert RevenueDistributor__NothingToClaim();
        }
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Record revenue distribution using revenue-per-token accumulator
     * @dev Uses the "dividend per share" pattern — no iteration over holders needed.
     *      Each call increases _revenuePerTokenAccumulated. Holders claim their
     *      proportional share later via claimRevenue().
     */
    function _distributeToHolders(uint256 vehicleId, IRevenueToken revenueToken, uint256 totalAmount)
        internal
        returns (uint256 recipientCount)
    {
        uint256 totalSupply = revenueToken.totalSupply();

        // Increase cumulative revenue-per-token
        _revenuePerTokenAccumulated[vehicleId] += (totalAmount * PRECISION) / totalSupply;

        // Track unclaimed pool
        _unclaimedPool[vehicleId] += totalAmount;

        // recipientCount is total holders — we don't know exact count on-chain,
        // but totalSupply > 0 guarantees at least 1
        recipientCount = 1;

        emit IndividualDistribution(vehicleId, address(revenueToken), totalAmount, totalSupply, block.timestamp);
    }

    /**
     * @notice Calculate claimable revenue for a holder
     */
    function _calculateClaimable(uint256 vehicleId, address holder) internal view returns (uint256) {
        address revenueTokenAddr = _vehicleRevenue[vehicleId].revenueToken;
        if (revenueTokenAddr == address(0)) return 0;

        IRevenueToken revenueToken = IRevenueToken(revenueTokenAddr);
        uint256 holderBalance = revenueToken.balanceOf(holder);
        if (holderBalance == 0) return 0;

        uint256 revenuePerToken = _revenuePerTokenAccumulated[vehicleId];
        uint256 checkpoint = _holderRevenueCheckpoint[vehicleId][holder];

        if (revenuePerToken <= checkpoint) return 0;

        return (holderBalance * (revenuePerToken - checkpoint)) / PRECISION;
    }

    /**
     * @notice Process claim for a specific holder and vehicle
     */
    function _processClaimForHolder(uint256 vehicleId, address holder) internal returns (uint256 amount) {
        amount = _calculateClaimable(vehicleId, holder);
        if (amount == 0) return 0;

        // Update checkpoint to current accumulator
        _holderRevenueCheckpoint[vehicleId][holder] = _revenuePerTokenAccumulated[vehicleId];
        _holderTotalClaimed[vehicleId][holder] += amount;

        // Decrease unclaimed pool
        _unclaimedPool[vehicleId] -= amount;

        // Record distribution in RevenueToken for tracking
        IRevenueToken revenueToken = IRevenueToken(_vehicleRevenue[vehicleId].revenueToken);
        revenueToken.recordRevenueDistribution(holder, amount);

        emit RevenueClaimed(vehicleId, holder, amount, block.timestamp);
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}
