// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

/**
 * @title IRevenueDistributor
 * @notice Interface for revenue distribution with waterfall logic
 * @dev Distributes rental revenue to RevenueToken holders after deducting platform fees
 */
interface IRevenueDistributor {
    /*//////////////////////////////////////////////////////////////
                             STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct RevenueAllocation {
        uint256 grossRevenue; // Total revenue received
        uint256 platformFee; // 15% - Protocol treasury
        uint256 maintenanceReserve; // 10% - Per-vehicle escrow
        uint256 insuranceFee; // 5% - Coverage payments
        uint256 operatingCosts; // 10% - Gas, cleaning, parking
        uint256 netDistributable; // 60% - To RevenueToken holders
        uint256 timestamp; // Distribution timestamp
    }

    struct DistributionRecord {
        uint256 vehicleId; // Vehicle NFT token ID
        uint256 distributionId; // Distribution ID
        uint256 totalDistributed; // Total amount distributed
        uint256 recipientCount; // Number of recipients
        uint256 timestamp; // Distribution timestamp
    }

    struct VehicleRevenue {
        address revenueToken; // RevenueToken contract address
        uint256 accumulatedRevenue; // Revenue waiting to be distributed
        uint256 totalDistributed; // Lifetime distributed revenue
        uint256 lastDistribution; // Last distribution timestamp
        uint256 distributionCount; // Number of distributions
    }

    /*//////////////////////////////////////////////////////////////
                             EVENTS
    //////////////////////////////////////////////////////////////*/

    event RevenueReceived(uint256 indexed vehicleId, uint256 amount, address indexed revenueToken, uint256 timestamp);

    event RevenueDistributed(
        uint256 indexed vehicleId,
        uint256 indexed distributionId,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 timestamp
    );

    event IndividualDistribution(
        uint256 indexed vehicleId, address indexed recipient, uint256 amount, uint256 tokenBalance, uint256 timestamp
    );

    event WaterfallApplied(
        uint256 indexed vehicleId,
        uint256 grossRevenue,
        uint256 platformFee,
        uint256 maintenanceReserve,
        uint256 insuranceFee,
        uint256 operatingCosts,
        uint256 netDistributable
    );

    event VehicleRegistered(uint256 indexed vehicleId, address indexed revenueToken);

    event FeesWithdrawn(address indexed recipient, uint256 platformFee, uint256 maintenanceReserve);

    /*//////////////////////////////////////////////////////////////
                             ERRORS
    //////////////////////////////////////////////////////////////*/

    error RevenueDistributor__VehicleNotRegistered();
    error RevenueDistributor__InvalidRevenueToken();
    error RevenueDistributor__NoRevenueToDistribute();
    error RevenueDistributor__Unauthorized();
    error RevenueDistributor__InvalidFeePercentage();
    error RevenueDistributor__DistributionFailed();
    error RevenueDistributor__WithdrawalFailed();

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a vehicle for revenue distribution
     * @param vehicleId Vehicle NFT token ID
     * @param revenueToken RevenueToken contract address
     */
    function registerVehicle(uint256 vehicleId, address revenueToken) external;

    /**
     * @notice Add revenue for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @param amount Revenue amount
     */
    function addRevenue(uint256 vehicleId, uint256 amount) external payable;

    /**
     * @notice Distribute accumulated revenue for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return distributionId Distribution record ID
     */
    function distributeRevenue(uint256 vehicleId) external returns (uint256 distributionId);

    /**
     * @notice Batch distribute revenue for multiple vehicles
     * @param vehicleIds Array of vehicle IDs
     */
    function batchDistribute(uint256[] memory vehicleIds) external;

    /**
     * @notice Withdraw accumulated platform fees
     * @param recipient Recipient address
     */
    function withdrawPlatformFees(address recipient) external;

    /**
     * @notice Withdraw maintenance reserve for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawMaintenanceReserve(uint256 vehicleId, address recipient, uint256 amount) external;

    /**
     * @notice Update fee percentages
     * @param platformFeePercent Platform fee percentage (basis points)
     * @param maintenancePercent Maintenance reserve percentage (basis points)
     * @param insurancePercent Insurance fee percentage (basis points)
     * @param operatingPercent Operating costs percentage (basis points)
     */
    function updateFeePercentages(
        uint256 platformFeePercent,
        uint256 maintenancePercent,
        uint256 insurancePercent,
        uint256 operatingPercent
    ) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get vehicle revenue information
     * @param vehicleId Vehicle NFT token ID
     * @return info Vehicle revenue info
     */
    function getVehicleRevenue(uint256 vehicleId) external view returns (VehicleRevenue memory info);

    /**
     * @notice Get distribution record
     * @param vehicleId Vehicle NFT token ID
     * @param distributionId Distribution ID
     * @return record Distribution record
     */
    function getDistributionRecord(uint256 vehicleId, uint256 distributionId)
        external
        view
        returns (DistributionRecord memory record);

    /**
     * @notice Get all distribution records for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return records Array of distribution records
     */
    function getVehicleDistributions(uint256 vehicleId) external view returns (DistributionRecord[] memory records);

    /**
     * @notice Calculate distribution amounts using waterfall
     * @param grossRevenue Total revenue to distribute
     * @return allocation Revenue allocation breakdown
     */
    function calculateWaterfall(uint256 grossRevenue) external view returns (RevenueAllocation memory allocation);

    /**
     * @notice Get accumulated platform fees
     * @return totalFees Total platform fees accumulated
     */
    function getPlatformFees() external view returns (uint256 totalFees);

    /**
     * @notice Get maintenance reserve for a vehicle
     * @param vehicleId Vehicle NFT token ID
     * @return reserve Maintenance reserve amount
     */
    function getMaintenanceReserve(uint256 vehicleId) external view returns (uint256 reserve);

    /**
     * @notice Get total revenue distributed across all vehicles
     * @return total Total revenue distributed
     */
    function getTotalDistributed() external view returns (uint256 total);

    /**
     * @notice Check if vehicle is registered
     * @param vehicleId Vehicle NFT token ID
     * @return registered Whether vehicle is registered
     */
    function isVehicleRegistered(uint256 vehicleId) external view returns (bool registered);
}
