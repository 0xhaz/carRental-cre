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
 * - 10% Maintenance Reserve → Per-vehicle escrow
 * - 5% Insurance → Coverage payments
 * - 10% Operating Costs → Gas, cleaning, parking
 * - 60% Net Distributable → RevenueToken holders (proportional)
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

    /// @notice Authorized revenue sources (RentalOperations, PaymentProtocol)
    mapping(address => bool) public authorizedSources;

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
        // Remaining 60% goes to token holders
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
        uint256 operatingPercent_
    ) external override onlyOwner {
        // Total must not exceed 100%
        uint256 total = platformFeePercent_ + maintenancePercent_ + insurancePercent_ + operatingPercent_;

        if (total >= BASIS_POINTS) {
            revert RevenueDistributor__InvalidFeePercentage();
        }

        platformFeePercent = platformFeePercent_;
        maintenancePercent = maintenancePercent_;
        insurancePercent = insurancePercent_;
        operatingPercent = operatingPercent_;
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

        // Emit waterfall event
        emit WaterfallApplied(
            vehicleId,
            allocation.grossRevenue,
            allocation.platformFee,
            allocation.maintenanceReserve,
            allocation.insuranceFee,
            allocation.operatingCosts,
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

        // Net distributable is remainder
        allocation.netDistributable = grossRevenue - allocation.platformFee - allocation.maintenanceReserve
            - allocation.insuranceFee - allocation.operatingCosts;

        allocation.timestamp = block.timestamp;
    }

    function getPlatformFees() external view override returns (uint256 totalFees) {
        return _platformFeesAccumulated;
    }

    function getMaintenanceReserve(uint256 vehicleId) external view override returns (uint256 reserve) {
        return _maintenanceReserves[vehicleId];
    }

    function getTotalDistributed() external view override returns (uint256 total) {
        return _totalDistributed;
    }

    function isVehicleRegistered(uint256 vehicleId) external view override returns (bool registered) {
        return _vehicleRevenue[vehicleId].revenueToken != address(0);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Distribute revenue to token holders proportionally
     * @dev This is a simplified version - in production, use pull pattern or batching
     */
    function _distributeToHolders(uint256 vehicleId, IRevenueToken revenueToken, uint256 totalAmount)
        internal
        returns (uint256 recipientCount)
    {
        // Get total supply
        uint256 totalSupply = revenueToken.totalSupply();

        // In a real implementation, you would:
        // 1. Get all token holders (from events or indexer)
        // 2. Calculate each holder's share
        // 3. Either push payments or allow holders to pull their share

        // For this PoC, we'll record the distribution in the RevenueToken
        // and allow holders to claim later (pull pattern)

        // Record distribution in RevenueToken contract
        // Note: This assumes RevenueToken has a function to record distributions
        // For now, we'll just emit events

        // This is a placeholder - actual implementation would iterate through holders
        // and either push payments or allow pull claims

        // For demonstration, return 1 (would be actual holder count)
        recipientCount = 1;

        // Emit event for tracking
        emit IndividualDistribution(vehicleId, address(revenueToken), totalAmount, totalSupply, block.timestamp);
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}
