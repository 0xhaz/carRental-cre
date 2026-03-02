/**
 * BACKUP — Original revenueSyncService.js (pre-CRE replacement)
 *
 * Created: 2026-03-02
 * Reason: Backing up before potential CRE workflow replacement
 *
 * TO REVERT:
 *   1. Copy this file to ../revenueSyncService.js
 *   2. In server.js, ensure the import is:
 *      import { startRevenueSyncScheduler } from "./services/revenueSyncService.js";
 *   3. Ensure startRevenueSyncScheduler() is called after DB connects
 *   4. Remove or disable the corresponding CRE workflow if running
 *
 * WHAT THIS SERVICE DOES:
 *   - Runs a cron job every 30 minutes
 *   - Fetches all cars with vehicleNftId from DB
 *   - Batch-fetches on-chain revenue from RevenueDistributor contract
 *   - Gets ETH/USD price via Chainlink price feed
 *   - Aggregates current-month booking revenue from Booking model
 *   - Upserts RevenueRecord for current month per vehicle
 *   - Updates Car.revenue fields and Investment.totalRevenueEarned
 *   - Also runs once on server startup (10s delay)
 *
 * DEPENDENCIES:
 *   - node-cron
 *   - models: Car, Booking, Investment, RevenueRecord
 *   - services: revenueContractService (batchGetVehicleRevenue)
 *   - services: priceFeedService (getEthPriceUsdCached)
 */

import cron from "node-cron";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";
import Investment from "../models/Investment.js";
import RevenueRecord from "../models/RevenueRecord.js";
import { batchGetVehicleRevenue } from "./revenueContractService.js";
import { getEthPriceUsdCached } from "./priceFeedService.js";

/**
 * Sync on-chain revenue data to the database for all registered vehicles.
 * - Fetches on-chain revenue via RevenueDistributor contract
 * - Aggregates booking revenue from the database
 * - Upserts RevenueRecord for current month per vehicle
 * - Updates Car.revenue and Investment.totalRevenueEarned
 */
async function syncRevenue() {
  try {
    // Find all cars with on-chain registration
    const cars = await Car.find({ vehicleNftId: { $ne: null } }).populate("owner", "_id");

    if (cars.length === 0) {
      console.log("[RevenueSyncService] No on-chain registered vehicles found, skipping");
      return;
    }

    const nftIds = cars.filter((c) => c.vehicleNftId).map((c) => c.vehicleNftId);

    // Batch fetch on-chain revenue data
    let onChainData;
    try {
      onChainData = await batchGetVehicleRevenue(nftIds);
    } catch (error) {
      console.error("[RevenueSyncService] Failed to fetch on-chain data:", error.message);
      // Continue with DB-only sync
      onChainData = new Map();
    }

    // Get ETH/USD price for conversion
    let ethPrice = 0;
    try {
      ethPrice = await getEthPriceUsdCached();
    } catch (error) {
      console.error("[RevenueSyncService] Failed to get ETH price:", error.message);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    let syncedCount = 0;

    for (const car of cars) {
      try {
        const ownerId = car.owner?._id || car.owner;
        if (!ownerId) continue;

        // Get on-chain revenue for this vehicle
        const chainRevenue = onChainData.get(car.vehicleNftId) || {
          accumulatedRevenue: 0,
          totalDistributed: 0,
          distributionCount: 0,
        };

        // Aggregate current-month booking revenue from DB
        const monthStart = new Date(currentYear, currentMonth - 1, 1);
        const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const monthBookings = await Booking.find({
          car: car._id,
          status: { $in: ["confirmed", "active", "completed"] },
          pickupDate: { $lte: monthEnd },
          returnDate: { $gte: monthStart },
        });

        const bookingCount = monthBookings.length;
        const bookingTotal = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0);

        // Upsert RevenueRecord for current month
        await RevenueRecord.findOneAndUpdate(
          { vehicle: car._id, year: currentYear, month: currentMonth },
          {
            $set: {
              rentor: ownerId,
              onChainRevenue: {
                totalWei: String(Math.round(chainRevenue.accumulatedRevenue * 1e18)),
                totalUsd: chainRevenue.accumulatedRevenue * ethPrice,
                distributedWei: String(Math.round(chainRevenue.totalDistributed * 1e18)),
                distributedUsd: chainRevenue.totalDistributed * ethPrice,
                distributionCount: chainRevenue.distributionCount || 0,
              },
              bookingRevenue: {
                count: bookingCount,
                totalAmount: bookingTotal,
              },
              syncedAt: now,
            },
          },
          { upsert: true, new: true }
        );

        // Update Car.revenue fields
        const allBookingRevenue = await Booking.aggregate([
          { $match: { car: car._id, status: { $in: ["confirmed", "active", "completed"] } } },
          { $group: { _id: null, total: { $sum: "$price" } } },
        ]);
        const totalEarned = allBookingRevenue[0]?.total || 0;
        const distributedUsd = chainRevenue.totalDistributed * ethPrice;

        await Car.findByIdAndUpdate(car._id, {
          "revenue.totalEarned": totalEarned,
          "revenue.distributed": distributedUsd,
          "revenue.pending": Math.max(0, totalEarned - distributedUsd),
          "revenue.lastDistribution": chainRevenue.lastDistribution
            ? new Date(chainRevenue.lastDistribution * 1000)
            : car.revenue?.lastDistribution,
        });

        // Update Investment.totalRevenueEarned for this vehicle's investors
        if (distributedUsd > 0) {
          const investments = await Investment.find({ vehicle: car._id, status: "active" });
          const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

          for (const inv of investments) {
            if (totalInvested > 0) {
              const share = inv.amount / totalInvested;
              await Investment.findByIdAndUpdate(inv._id, {
                totalRevenueEarned: distributedUsd * share,
                lastDistribution: now,
              });
            }
          }
        }

        syncedCount++;
      } catch (error) {
        console.error(`[RevenueSyncService] Error syncing vehicle ${car._id}:`, error.message);
      }
    }

    if (syncedCount > 0) {
      console.log(`[RevenueSyncService] Synced revenue for ${syncedCount}/${cars.length} vehicles`);
    }
  } catch (error) {
    console.error("[RevenueSyncService] Error in revenue sync:", error);
  }
}

/**
 * Start the revenue sync scheduler.
 * Runs every 30 minutes to sync on-chain revenue data to the database.
 */
export function startRevenueSyncScheduler() {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", () => {
    console.log("[RevenueSyncService] Running revenue sync...");
    syncRevenue();
  });

  // Also run once on startup (after a short delay to let DB connect)
  setTimeout(() => {
    console.log("[RevenueSyncService] Running initial revenue sync...");
    syncRevenue();
  }, 10000);

  console.log("[RevenueSyncService] Revenue sync scheduler started (runs every 30 minutes)");
}
