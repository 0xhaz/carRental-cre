import express from "express";
import {
  getMarketplace,
  createCampaign,
  createInvestment,
  getPortfolio,
  getInvestmentDetails,
  getCampaignDetails,
  getVehiclePitch,
  getRentorCampaigns,
  cancelCampaign,
  pauseCampaign,
  updateCampaign,
  recordRentorCoInvestment,
  recordMilestoneCompleted,
  recordFundsReleased,
  recordRevenueDistributed,
  recordRevenueClaimed,
  recordTokenTransfer,
  recordDisputeResolution,
} from "../controllers/investmentController.js";
import { protect } from "../middleware/auth.js";

const investmentRouter = express.Router();

investmentRouter.get("/marketplace", getMarketplace);
investmentRouter.post("/create-campaign", protect, createCampaign);
investmentRouter.post("/create", protect, createInvestment);
investmentRouter.get("/portfolio", protect, getPortfolio);
investmentRouter.get("/rentor-campaigns", protect, getRentorCampaigns);
investmentRouter.get("/vehicle/:vehicleId", getVehiclePitch);
investmentRouter.get("/campaign/:campaignId", getCampaignDetails);
investmentRouter.put("/campaign/:campaignId", protect, updateCampaign);
investmentRouter.post("/campaign/:campaignId/pause", protect, pauseCampaign);
investmentRouter.post("/campaign/:campaignId/co-invest", protect, recordRentorCoInvestment);
investmentRouter.delete("/campaign/:campaignId", protect, cancelCampaign);

// On-chain sync endpoints
investmentRouter.post("/vehicle/:vehicleNftId/milestone-completed", protect, recordMilestoneCompleted);
investmentRouter.post("/vehicle/:vehicleNftId/funds-released", protect, recordFundsReleased);
investmentRouter.post("/vehicle/:vehicleNftId/revenue-distributed", protect, recordRevenueDistributed);
investmentRouter.post("/vehicle/:vehicleNftId/revenue-claimed", protect, recordRevenueClaimed);
investmentRouter.post("/record-transfer", protect, recordTokenTransfer);
investmentRouter.post("/record-dispute-resolution", protect, recordDisputeResolution);

investmentRouter.get("/:investmentId", protect, getInvestmentDetails);

export default investmentRouter;
