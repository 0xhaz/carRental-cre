import Investment from "../models/Investment.js";
import Campaign from "../models/Campaign.js";
import Car from "../models/Car.js";

// @desc    Get active campaigns (investment marketplace)
// @route   GET /api/investments/marketplace
// @access  Public
export const getMarketplace = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: "active" })
      .populate("vehicle", "brand model year image pricePerDay location description")
      .populate("rentor", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Get marketplace error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create investment
// @route   POST /api/investments/create
// @access  Private
export const createInvestment = async (req, res) => {
  try {
    const { vehicleId, campaignId, amount } = req.body;

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Validate investment amount
    if (amount < campaign.minInvestment) {
      return res.status(400).json({
        success: false,
        message: `Minimum investment is $${campaign.minInvestment}`,
      });
    }

    if (amount > campaign.maxInvestment) {
      return res.status(400).json({
        success: false,
        message: `Maximum investment is $${campaign.maxInvestment}`,
      });
    }

    // Check if campaign can accept more funds
    const remaining = campaign.targetAmount - campaign.currentAmount;
    if (amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Only $${remaining} needed to reach target`,
      });
    }

    // Create investment
    const investment = await Investment.create({
      investor: req.user._id,
      vehicle: vehicleId,
      amount,
      status: "active",
      investedAt: new Date(),
    });

    // Update campaign
    campaign.currentAmount += amount;
    campaign.investorCount = await Investment.countDocuments({ vehicle: vehicleId });
    if (campaign.currentAmount >= campaign.targetAmount) {
      campaign.status = "funded";
    }
    await campaign.save();

    // Update vehicle fundraising
    const vehicle = await Car.findById(vehicleId);
    if (vehicle && vehicle.fundraising) {
      vehicle.fundraising.currentAmount += amount;
      vehicle.fundraising.investorCount = campaign.investorCount;
      if (!vehicle.fundraising.investors.includes(req.user._id)) {
        vehicle.fundraising.investors.push(req.user._id);
      }
      await vehicle.save();
    }

    res.status(201).json({ success: true, data: investment });
  } catch (error) {
    console.error("Create investment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user investments (portfolio)
// @route   GET /api/investments/portfolio
// @access  Private
export const getPortfolio = async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user._id })
      .populate("vehicle", "brand model image pricePerDay location")
      .sort({ investedAt: -1 });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalRevenue = investments.reduce((sum, inv) => sum + inv.totalRevenueEarned, 0);

    res.json({
      success: true,
      data: {
        investments,
        totalInvested,
        totalRevenue,
        roi: totalInvested > 0 ? ((totalRevenue / totalInvested) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get investment details
// @route   GET /api/investments/:investmentId
// @access  Private
export const getInvestmentDetails = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investmentId)
      .populate("vehicle", "brand model image pricePerDay location")
      .populate("investor", "name email");

    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    // Check authorization
    if (
      investment.investor._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: investment });
  } catch (error) {
    console.error("Get investment details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get campaign details
// @route   GET /api/investments/campaign/:campaignId
// @access  Public
export const getCampaignDetails = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId)
      .populate("vehicle")
      .populate("rentor", "name");

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error("Get campaign details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
