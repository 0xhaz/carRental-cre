import { ethers } from "ethers";
import { getEthPriceUsdCached } from "./priceFeedService.js";

// RevenueDistributor ABI (only the view functions we need)
const REVENUE_DISTRIBUTOR_ABI = [
  "function getVehicleRevenue(uint256 vehicleId) view returns (tuple(address revenueToken, uint256 accumulatedRevenue, uint256 totalDistributed, uint256 lastDistribution, uint256 distributionCount))",
  "function getClaimableRevenue(uint256 vehicleId, address holder) view returns (uint256 claimable)",
  "function isVehicleRegistered(uint256 vehicleId) view returns (bool registered)",
];

// Contract address and network config
const REVENUE_DISTRIBUTOR_ADDRESS = "0xd08bc548f31557bb897ed91476d0c8d48297538d";
const RPC_URL = process.env.SEPOLIA_RPC_URL;

/**
 * Get or create ethers provider singleton
 */
let provider = null;
function getProvider() {
  if (!provider && RPC_URL) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

/**
 * Get RevenueDistributor contract instance
 */
function getRevenueDistributor() {
  const prov = getProvider();
  if (!prov) {
    throw new Error("RPC provider not configured");
  }
  return new ethers.Contract(REVENUE_DISTRIBUTOR_ADDRESS, REVENUE_DISTRIBUTOR_ABI, prov);
}

/**
 * Fetch on-chain revenue data for a vehicle
 * @param {number} vehicleNftId - The vehicle's NFT token ID
 * @returns {Promise<{accumulatedRevenue: number, totalDistributed: number, lastDistribution: number, distributionCount: number}>}
 */
export async function getVehicleRevenueOnChain(vehicleNftId) {
  try {
    const contract = getRevenueDistributor();
    const revenue = await contract.getVehicleRevenue(vehicleNftId);

    // Convert BigInt to Number (wei to ETH, then assume 1 ETH = $3000 for display, or use oracle)
    return {
      revenueToken: revenue[0],
      accumulatedRevenue: Number(ethers.formatEther(revenue[1])), // ETH
      totalDistributed: Number(ethers.formatEther(revenue[2])),   // ETH
      lastDistribution: Number(revenue[3]),
      distributionCount: Number(revenue[4]),
    };
  } catch (error) {
    console.error(`Error fetching on-chain revenue for vehicle ${vehicleNftId}:`, error.message);
    // If not registered on-chain, return zeros
    return {
      revenueToken: ethers.ZeroAddress,
      accumulatedRevenue: 0,
      totalDistributed: 0,
      lastDistribution: 0,
      distributionCount: 0,
    };
  }
}

/**
 * Check if a vehicle is registered on-chain
 * @param {number} vehicleNftId - The vehicle's NFT token ID
 * @returns {Promise<boolean>}
 */
export async function isVehicleRegisteredOnChain(vehicleNftId) {
  try {
    const contract = getRevenueDistributor();
    return await contract.isVehicleRegistered(vehicleNftId);
  } catch (error) {
    console.error(`Error checking vehicle registration for ${vehicleNftId}:`, error.message);
    return false;
  }
}

/**
 * Get claimable revenue for a specific holder
 * @param {number} vehicleNftId - The vehicle's NFT token ID
 * @param {string} holderAddress - Investor/rentor wallet address
 * @returns {Promise<number>} Claimable amount in ETH
 */
export async function getClaimableRevenueOnChain(vehicleNftId, holderAddress) {
  try {
    const contract = getRevenueDistributor();
    const claimable = await contract.getClaimableRevenue(vehicleNftId, holderAddress);
    return Number(ethers.formatEther(claimable));
  } catch (error) {
    console.error(`Error fetching claimable revenue for ${holderAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch on-chain revenue data for a vehicle and convert to USD using Chainlink price feed
 * @param {number} vehicleNftId - The vehicle's NFT token ID
 * @returns {Promise<{accumulatedRevenueUsd: number, totalDistributedUsd: number, lastDistribution: number, distributionCount: number}>}
 */
export async function getVehicleRevenueUsd(vehicleNftId) {
  const revenueData = await getVehicleRevenueOnChain(vehicleNftId);
  const ethPrice = await getEthPriceUsdCached();

  return {
    revenueToken: revenueData.revenueToken,
    accumulatedRevenueUsd: revenueData.accumulatedRevenue * ethPrice,
    totalDistributedUsd: revenueData.totalDistributed * ethPrice,
    lastDistribution: revenueData.lastDistribution,
    distributionCount: revenueData.distributionCount,
    // Also include raw ETH values
    accumulatedRevenueEth: revenueData.accumulatedRevenue,
    totalDistributedEth: revenueData.totalDistributed,
    ethPrice,
  };
}

/**
 * Batch fetch revenue for multiple vehicles
 * @param {number[]} vehicleNftIds - Array of vehicle NFT IDs
 * @returns {Promise<Map<number, object>>} Map of vehicleNftId -> revenue data
 */
export async function batchGetVehicleRevenue(vehicleNftIds) {
  const results = new Map();

  await Promise.all(
    vehicleNftIds.map(async (nftId) => {
      const data = await getVehicleRevenueOnChain(nftId);
      results.set(nftId, data);
    })
  );

  return results;
}
