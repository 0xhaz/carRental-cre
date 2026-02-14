import Investment from "../models/Investment.js";
import Campaign from "../models/Campaign.js";
import Car from "../models/Car.js";
import Review from "../models/Review.js";

// @desc    Get active campaigns (investment marketplace)
// @route   GET /api/investments/marketplace
// @access  Public
export const getMarketplace = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: "active" })
      .populate("vehicle", "brand model year image pricePerDay location description fundraising category")
      .populate("rentor", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Get marketplace error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create fundraising campaign
// @route   POST /api/investments/create-campaign
// @access  Private
export const createCampaign = async (req, res) => {
  try {
    const { vehicleId, targetAmount, expectedROI, duration, minInvestment, description, fundraisingType, rentorInvestment, minFundingRequired } = req.body;

    // Validate vehicle ownership
    const vehicle = await Car.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Check if vehicle already has an active campaign
    const existingCampaign = await Campaign.findOne({
      vehicle: vehicleId,
      status: { $in: ["draft", "active"] },
    });
    if (existingCampaign) {
      return res.status(400).json({ success: false, message: "Vehicle already has an active campaign" });
    }

    // Create campaign
    const campaign = await Campaign.create({
      vehicle: vehicleId,
      rentor: req.user._id,
      targetAmount,
      expectedROI,
      duration,
      minInvestment,
      maxInvestment: targetAmount,
      fundraisingType: fundraisingType || "full_fundraise",
      rentorInvestment: rentorInvestment || 0,
      minFundingRequired: minFundingRequired != null ? minFundingRequired : 60,
      status: "active",
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    });

    // Update vehicle fundraising data
    vehicle.fundraising = {
      active: true,
      targetAmount,
      currentAmount: 0,
      minInvestment,
      maxInvestment: targetAmount,
      expectedROI,
      investorCount: 0,
      investors: [],
    };
    await vehicle.save();

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error("Create campaign error:", error);
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

// @desc    Get rentor's own campaigns
// @route   GET /api/investments/rentor-campaigns
// @access  Private
export const getRentorCampaigns = async (req, res) => {
  try {
    // Get vehicles owned by this rentor that have campaigns
    const vehicles = await Car.find({ owner: req.user._id });
    const vehicleIds = vehicles.map((v) => v._id);

    const campaigns = await Campaign.find({ vehicle: { $in: vehicleIds } })
      .populate("vehicle", "brand model year image pricePerDay location description fundraising category")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("Get rentor campaigns error:", error);
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

// @desc    Get vehicle pitch page data (vehicle + campaign + reviews)
// @route   GET /api/investments/vehicle/:vehicleId
// @access  Public
export const getVehiclePitch = async (req, res) => {
  try {
    const vehicle = await Car.findById(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Find the active/funded campaign for this vehicle
    const campaign = await Campaign.findOne({
      vehicle: req.params.vehicleId,
      status: { $in: ["active", "funded"] },
    }).populate("rentor", "name");

    // Get reviews for this vehicle
    const reviews = await Review.find({ vehicle: req.params.vehicleId })
      .populate("renter", "name image")
      .sort({ createdAt: -1 });

    // Get investor count
    const investorCount = campaign
      ? await Investment.countDocuments({ vehicle: req.params.vehicleId, status: "active" })
      : 0;

    res.json({
      success: true,
      data: {
        vehicle,
        campaign,
        investorCount,
        reviews,
      },
    });
  } catch (error) {
    console.error("Get vehicle pitch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel/delete a campaign (auto-refunds investors)
// @route   DELETE /api/investments/campaign/:campaignId
// @access  Private
export const cancelCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Only the rentor who created the campaign can cancel it
    if (campaign.rentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Cannot cancel a fully funded campaign (milestones may have started)
    if (campaign.status === "funded") {
      return res.status(400).json({ success: false, message: "Cannot cancel a fully funded campaign" });
    }

    // Auto-refund all active investments for this campaign
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

      // Note: On-chain refunds are triggered separately via CampaignMonitorReceiver
      // which calls batchCancelVehiclePayments() on RegShieldPaymentProtocol
    }

    // Update campaign status
    campaign.status = "cancelled";
    campaign.currentAmount = 0;
    await campaign.save();

    // Reset vehicle fundraising data
    const vehicle = await Car.findById(campaign.vehicle);
    if (vehicle && vehicle.fundraising) {
      vehicle.fundraising.active = false;
      vehicle.fundraising.currentAmount = 0;
      vehicle.fundraising.investorCount = 0;
      vehicle.fundraising.investors = [];
      await vehicle.save();
    }

    res.json({
      success: true,
      message: refundedCount > 0
        ? `Campaign cancelled. ${refundedCount} investment(s) will be refunded.`
        : "Campaign cancelled successfully",
      refundedCount,
    });
  } catch (error) {
    console.error("Cancel campaign error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
