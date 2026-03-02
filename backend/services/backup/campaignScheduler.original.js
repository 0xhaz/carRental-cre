/**
 * BACKUP — Original campaignScheduler.js (pre-CRE replacement)
 *
 * Created: 2026-03-02
 * Reason: Backing up before replacing with CRE campaign-workflow
 *
 * TO REVERT:
 *   1. Copy this file to ../campaignScheduler.js
 *   2. In server.js, ensure the import is:
 *      import { startCampaignScheduler } from "./services/campaignScheduler.js";
 *   3. Ensure startCampaignScheduler() is called after DB connects
 *   4. Remove or disable the CRE campaign-workflow if running
 *
 * WHAT THIS SERVICE DOES:
 *   - Runs a cron job every hour (at minute 0)
 *   - Finds active campaigns past their endDate
 *   - If below minimum funding threshold: cancels campaign, refunds investors (DB + on-chain), notifies rentor
 *   - If met minimum threshold: marks as "funded", notifies rentor
 *   - Also runs once on server startup (5s delay)
 *
 * DEPENDENCIES:
 *   - node-cron, ethers
 *   - models: Campaign, Investment, Car, Notification
 *   - env: SEPOLIA_RPC_URL, SCHEDULER_PRIVATE_KEY, INVESTMENT_PAYMENT_PROTOCOL
 */

import cron from "node-cron";
import { ethers } from "ethers";
import Campaign from "../models/Campaign.js";
import Investment from "../models/Investment.js";
import Car from "../models/Car.js";
import Notification from "../models/Notification.js";

// CampaignMonitorReceiver ABI (only the function we need)
const CAMPAIGN_MONITOR_ABI = [
  "function paymentProtocol() view returns (address)",
];

const PAYMENT_PROTOCOL_ABI = [
  "function batchCancelVehiclePayments(uint256 vehicleId) external returns (uint256 refundedCount)",
  "event CampaignPaymentsBatchCancelled(uint256 indexed vehicleId, uint256 refundedCount)",
];

/**
 * Process a single expired campaign: cancel it, refund investors, notify rentor,
 * and optionally trigger on-chain batch refund via RegShieldPaymentProtocol.
 */
async function processExpiredCampaign(campaign, provider, signer, paymentProtocolAddress) {
  console.log(
    `[CampaignScheduler] Processing expired campaign ${campaign._id} ` +
    `(vehicle: ${campaign.vehicle}, funded: ${campaign.currentAmount}/${campaign.targetAmount})`
  );

  // 1. Auto-refund all active investments in the database
  let refundedCount = 0;
  if (campaign.currentAmount > 0) {
    const investments = await Investment.find({
      vehicle: campaign.vehicle,
      status: "active",
    });

    for (const investment of investments) {
      investment.status = "refunded";
      investment.refundedAt = new Date();
      await investment.save();
      refundedCount++;
    }
  }

  // 2. Update campaign status
  campaign.status = "cancelled";
  campaign.currentAmount = 0;
  await campaign.save();

  // 3. Reset vehicle fundraising data
  const vehicle = await Car.findById(campaign.vehicle);
  if (vehicle && vehicle.fundraising) {
    vehicle.fundraising.active = false;
    vehicle.fundraising.currentAmount = 0;
    vehicle.fundraising.investorCount = 0;
    vehicle.fundraising.investors = [];
    await vehicle.save();
  }

  // 4. Notify the rentor
  await Notification.create({
    userId: campaign.rentor,
    type: "campaign_failed",
    title: "Campaign Expired",
    message: refundedCount > 0
      ? `Your fundraising campaign did not meet the minimum funding threshold (${campaign.minFundingRequired}%). ${refundedCount} investment(s) have been automatically refunded.`
      : `Your fundraising campaign has expired without reaching the minimum funding threshold (${campaign.minFundingRequired}%).`,
    link: "/rentor/fundraising",
    metadata: {
      vehicleId: campaign.vehicle,
    },
  });

  // 5. Trigger on-chain batch refund via RegShieldPaymentProtocol (if configured)
  if (signer && paymentProtocolAddress && vehicle?.vehicleNftId) {
    try {
      const protocol = new ethers.Contract(paymentProtocolAddress, PAYMENT_PROTOCOL_ABI, signer);
      const tx = await protocol.batchCancelVehiclePayments(vehicle.vehicleNftId);
      const receipt = await tx.wait();
      console.log(
        `[CampaignScheduler] On-chain batch refund tx: ${receipt.hash} ` +
        `(vehicleNftId: ${vehicle.vehicleNftId})`
      );
    } catch (err) {
      // On-chain refund is best-effort; DB refund already succeeded
      console.error(`[CampaignScheduler] On-chain refund failed for campaign ${campaign._id}:`, err.message);
    }
  }

  console.log(
    `[CampaignScheduler] Campaign ${campaign._id} cancelled. ` +
    `${refundedCount} investment(s) refunded.`
  );
}

/**
 * Main check: find all active campaigns past their endDate that haven't met
 * the minimum funding threshold and process them.
 */
async function checkExpiredCampaigns() {
  try {
    const now = new Date();

    // Find active campaigns whose deadline has passed
    const expiredCampaigns = await Campaign.find({
      status: "active",
      endDate: { $lte: now },
    });

    if (expiredCampaigns.length === 0) return;

    console.log(`[CampaignScheduler] Found ${expiredCampaigns.length} expired campaign(s)`);

    // Setup optional on-chain provider
    let provider = null;
    let signer = null;
    const paymentProtocolAddress = process.env.INVESTMENT_PAYMENT_PROTOCOL;
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.SCHEDULER_PRIVATE_KEY;

    if (rpcUrl && privateKey && paymentProtocolAddress) {
      provider = new ethers.JsonRpcProvider(rpcUrl);
      signer = new ethers.Wallet(privateKey, provider);
      console.log("[CampaignScheduler] On-chain refunds enabled");
    }

    for (const campaign of expiredCampaigns) {
      const minFundingPct = campaign.minFundingRequired ?? 60;
      const minFundingAmount = campaign.targetAmount * (minFundingPct / 100);

      if (campaign.currentAmount < minFundingAmount) {
        // Below minimum threshold -> cancel and refund
        await processExpiredCampaign(campaign, provider, signer, paymentProtocolAddress);
      } else {
        // Met minimum threshold -> mark as funded (stretch goal not met but viable)
        campaign.status = "funded";
        await campaign.save();

        await Notification.create({
          userId: campaign.rentor,
          type: "campaign_funded",
          title: "Campaign Funded",
          message: `Your fundraising campaign has met the minimum funding threshold and is now funded with $${campaign.currentAmount.toLocaleString()}.`,
          link: "/rentor/fundraising",
          metadata: {
            vehicleId: campaign.vehicle,
          },
        });

        console.log(
          `[CampaignScheduler] Campaign ${campaign._id} met minimum threshold ` +
          `(${campaign.currentAmount}/${minFundingAmount}). Marked as funded.`
        );
      }
    }
  } catch (error) {
    console.error("[CampaignScheduler] Error checking expired campaigns:", error);
  }
}

/**
 * Start the campaign monitoring scheduler.
 * Runs every hour to check for expired campaigns.
 */
export function startCampaignScheduler() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", () => {
    console.log("[CampaignScheduler] Running hourly campaign expiry check...");
    checkExpiredCampaigns();
  });

  // Also run once on startup (after a short delay to let DB connect)
  setTimeout(() => {
    console.log("[CampaignScheduler] Running initial campaign expiry check...");
    checkExpiredCampaigns();
  }, 5000);

  console.log("[CampaignScheduler] Campaign monitoring scheduler started (runs every hour)");
}
