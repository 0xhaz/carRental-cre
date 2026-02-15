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
investmentRouter.delete("/campaign/:campaignId", protect, cancelCampaign);
investmentRouter.get("/:investmentId", protect, getInvestmentDetails);

export default investmentRouter;
