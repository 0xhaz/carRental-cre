import express from "express";
import {
  getMarketplace,
  createInvestment,
  getPortfolio,
  getInvestmentDetails,
  getCampaignDetails,
  getRentorCampaigns,
} from "../controllers/investmentController.js";
import { protect } from "../middleware/auth.js";

const investmentRouter = express.Router();

investmentRouter.get("/marketplace", getMarketplace);
investmentRouter.post("/create", protect, createInvestment);
investmentRouter.get("/portfolio", protect, getPortfolio);
investmentRouter.get("/rentor-campaigns", protect, getRentorCampaigns);
investmentRouter.get("/:investmentId", protect, getInvestmentDetails);
investmentRouter.get("/campaign/:campaignId", getCampaignDetails);

export default investmentRouter;
