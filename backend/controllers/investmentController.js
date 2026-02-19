import Investment from "../models/Investment.js";
import Campaign from "../models/Campaign.js";
import Car from "../models/Car.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";

// @desc    Get active campaigns (investment marketplace)
// @route   GET /api/investments/marketplace
// @access  Public
export const getMarketplace = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: "active" })
      .populate("vehicle", "brand model year image pricePerDay location description fundraising category vehicleNftId assetTokenAddress revenueTokenAddress ownerAddress")
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
      startDate: campaign.startDate,
      endDate: campaign.endDate,
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
    const { vehicleId, campaignId, amount, txHash, amountEth } = req.body;

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // If on-chain tx already succeeded (txHash provided), skip strict USD validation
    // since the smart contract already enforced limits
    if (!txHash) {
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

      const remaining = campaign.targetAmount - campaign.currentAmount;
      if (amount > remaining) {
        return res.status(400).json({
          success: false,
          message: `Only $${remaining} needed to reach target`,
        });
      }
    }

    // Create investment
    const investment = await Investment.create({
      investor: req.user._id,
      vehicle: vehicleId,
      amount,
      amountEth: amountEth || 0,
      txHash: txHash || undefined,
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
      .populate("vehicle", "brand model image pricePerDay location vehicleNftId assetTokenAddress revenueTokenAddress ownerAddress")
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
      .populate("vehicle", "brand model image pricePerDay location vehicleNftId assetTokenAddress revenueTokenAddress ownerAddress")
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
      .populate("vehicle", "brand model year image pricePerDay location description fundraising category vehicleNftId assetTokenAddress revenueTokenAddress ownerAddress")
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

// @desc    Pause or resume a campaign
// @route   POST /api/investments/campaign/:campaignId/pause
// @access  Private
export const pauseCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    if (campaign.rentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (campaign.status !== "active" && campaign.status !== "paused") {
      return res.status(400).json({
        success: false,
        message: `Cannot pause/resume a campaign with status "${campaign.status}"`,
      });
    }

    const newStatus = campaign.status === "active" ? "paused" : "active";
    campaign.status = newStatus;
    await campaign.save();

    // Update vehicle fundraising active flag
    const vehicle = await Car.findById(campaign.vehicle);
    if (vehicle && vehicle.fundraising) {
      vehicle.fundraising.active = newStatus === "active";
      await vehicle.save();
    }

    res.json({
      success: true,
      message: newStatus === "paused" ? "Campaign paused" : "Campaign resumed",
      data: campaign,
    });
  } catch (error) {
    console.error("Pause campaign error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update campaign details
// @route   PUT /api/investments/campaign/:campaignId
// @access  Private
export const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    if (campaign.rentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Only allow editing active or paused campaigns
    if (!["active", "paused", "draft"].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a campaign with status "${campaign.status}"`,
      });
    }

    const { targetAmount, expectedROI, duration, minInvestment, minFundingRequired } = req.body;

    // Validate: targetAmount cannot be lower than currentAmount
    if (targetAmount !== undefined && targetAmount < campaign.currentAmount) {
      return res.status(400).json({
        success: false,
        message: `Target amount cannot be less than current raised amount ($${campaign.currentAmount})`,
      });
    }

    // Update allowed fields
    if (targetAmount !== undefined) {
      campaign.targetAmount = targetAmount;
      campaign.maxInvestment = targetAmount;
    }
    if (expectedROI !== undefined) campaign.expectedROI = expectedROI;
    if (duration !== undefined) {
      campaign.duration = duration;
      // Recalculate end date from start date
      if (campaign.startDate) {
        campaign.endDate = new Date(campaign.startDate.getTime() + duration * 24 * 60 * 60 * 1000);
      }
    }
    if (minInvestment !== undefined) campaign.minInvestment = minInvestment;
    if (minFundingRequired !== undefined) campaign.minFundingRequired = minFundingRequired;

    await campaign.save();

    // Sync vehicle fundraising data
    const vehicle = await Car.findById(campaign.vehicle);
    if (vehicle && vehicle.fundraising) {
      if (targetAmount !== undefined) vehicle.fundraising.targetAmount = targetAmount;
      if (expectedROI !== undefined) vehicle.fundraising.expectedROI = expectedROI;
      if (minInvestment !== undefined) vehicle.fundraising.minInvestment = minInvestment;
      if (campaign.endDate) vehicle.fundraising.endDate = campaign.endDate;
      if (campaign.startDate) vehicle.fundraising.startDate = campaign.startDate;
      await vehicle.save();
    }

    res.json({ success: true, message: "Campaign updated", data: campaign });
  } catch (error) {
    console.error("Update campaign error:", error);
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

    // Reset vehicle fundraising data and clear investment tokens
    // (VehicleNFT registration persists — the vehicle is still on-chain,
    //  but tokens must be redeployed for a new campaign with new investors)
    const vehicle = await Car.findById(campaign.vehicle);
    if (vehicle) {
      if (vehicle.fundraising) {
        vehicle.fundraising.active = false;
        vehicle.fundraising.currentAmount = 0;
        vehicle.fundraising.investorCount = 0;
        vehicle.fundraising.investors = [];
      }
      vehicle.assetTokenAddress = null;
      vehicle.revenueTokenAddress = null;
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

// @desc    Record rentor co-investment deposit (after on-chain confirmation)
// @route   POST /api/investments/campaign/:campaignId/co-invest
// @access  Private
export const recordRentorCoInvestment = async (req, res) => {
  try {
    const { amount, txHash } = req.body;

    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    // Only the rentor who owns the campaign can record their co-investment
    if (campaign.rentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (campaign.fundraisingType !== "co_invest") {
      return res.status(400).json({
        success: false,
        message: "Campaign is not a co-invest type",
      });
    }

    if (campaign.rentorDepositedOnChain) {
      return res.status(400).json({
        success: false,
        message: "Co-investment already recorded",
      });
    }

    // Update campaign
    campaign.rentorDepositedOnChain = true;
    campaign.rentorDepositTxHash = txHash;

    // Add rentor's amount to currentAmount
    campaign.currentAmount += amount;
    if (campaign.currentAmount >= campaign.targetAmount) {
      campaign.status = "funded";
    }
    await campaign.save();

    // Create an Investment record for the rentor
    const investment = await Investment.create({
      investor: req.user._id,
      vehicle: campaign.vehicle,
      amount,
      status: "active",
      investedAt: new Date(),
      txHash,
    });

    // Update vehicle fundraising data
    const vehicle = await Car.findById(campaign.vehicle);
    if (vehicle && vehicle.fundraising) {
      vehicle.fundraising.currentAmount += amount;
      if (!vehicle.fundraising.investors.includes(req.user._id)) {
        vehicle.fundraising.investors.push(req.user._id);
      }
      await vehicle.save();
    }

    res.json({
      success: true,
      message: "Rentor co-investment recorded",
      data: { campaign, investment },
    });
  } catch (error) {
    console.error("Record co-investment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record milestone completion (after on-chain tx)
// @route   POST /api/investments/vehicle/:vehicleNftId/milestone-completed
// @access  Private (admin)
export const recordMilestoneCompleted = async (req, res) => {
  try {
    const { vehicleNftId } = req.params;
    const { milestoneName, txHash } = req.body;

    const car = await Car.findOne({ vehicleNftId: parseInt(vehicleNftId) });
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Store milestone completion in campaign
    const campaign = await Campaign.findOne({
      vehicle: car._id,
      status: { $in: ["active", "funded"] },
    });

    if (campaign) {
      if (!campaign.completedMilestones) campaign.completedMilestones = [];
      if (!campaign.completedMilestones.includes(milestoneName)) {
        campaign.completedMilestones.push(milestoneName);
      }
      if (txHash) campaign.lastMilestoneTxHash = txHash;
      await campaign.save();
    }

    res.json({ success: true, message: "Milestone recorded" });
  } catch (error) {
    console.error("Record milestone error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record funds released + tokens minted (after on-chain tx)
// @route   POST /api/investments/vehicle/:vehicleNftId/funds-released
// @access  Private (admin)
export const recordFundsReleased = async (req, res) => {
  try {
    const { vehicleNftId } = req.params;
    const { txHash } = req.body;

    const car = await Car.findOne({ vehicleNftId: parseInt(vehicleNftId) });
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Update campaign status
    const campaign = await Campaign.findOne({
      vehicle: car._id,
      status: { $in: ["active", "funded"] },
    });

    if (campaign) {
      campaign.status = "funded";
      campaign.fundsReleasedAt = new Date();
      campaign.fundsReleaseTxHash = txHash;
      await campaign.save();
    }

    // Update all active investments for this vehicle
    await Investment.updateMany(
      { vehicle: car._id, status: "active" },
      { $set: { fundsReleased: true, fundsReleaseTxHash: txHash } }
    );

    // Notify all investors
    const investments = await Investment.find({ vehicle: car._id, status: "active" }).populate("investor", "name");
    for (const inv of investments) {
      await Notification.create({
        userId: inv.investor._id,
        type: "investment_update",
        title: "Funds Released & Tokens Minted",
        message: `Milestones for ${car.brand} ${car.model} are complete. Your investment funds have been released and tokens minted.`,
        link: `/investor/investment/${inv._id}`,
        metadata: { vehicleId: car._id, investmentId: inv._id },
      });
    }

    res.json({ success: true, message: "Funds release recorded, investors notified" });
  } catch (error) {
    console.error("Record funds released error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record revenue distribution (after on-chain tx)
// @route   POST /api/investments/vehicle/:vehicleNftId/revenue-distributed
// @access  Private (admin)
export const recordRevenueDistributed = async (req, res) => {
  try {
    const { vehicleNftId } = req.params;
    const { amountEth, amountUsd, txHash } = req.body;

    // Prefer amountUsd (already converted); fall back to amountEth for legacy callers
    const revenueAmount = amountUsd || amountEth || 0;

    const car = await Car.findOne({ vehicleNftId: parseInt(vehicleNftId) });
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Get active investments for this vehicle
    const investments = await Investment.find({ vehicle: car._id, status: "active" });
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Distribute proportionally to each investor
    for (const inv of investments) {
      const share = totalInvested > 0 ? inv.amount / totalInvested : 0;
      const revenueShare = revenueAmount * share;
      inv.totalRevenueEarned = (inv.totalRevenueEarned || 0) + revenueShare;
      inv.lastDistribution = new Date();
      await inv.save();
    }

    res.json({ success: true, message: "Revenue distribution recorded" });
  } catch (error) {
    console.error("Record revenue distribution error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record revenue claimed by investor (after on-chain tx)
// @route   POST /api/investments/vehicle/:vehicleNftId/revenue-claimed
// @access  Private
export const recordRevenueClaimed = async (req, res) => {
  try {
    const { vehicleNftId } = req.params;
    const { amountEth, amountUsd, txHash } = req.body;

    // Prefer amountUsd (already converted); fall back to amountEth for legacy callers
    const revenueAmount = amountUsd || amountEth || 0;

    const car = await Car.findOne({ vehicleNftId: parseInt(vehicleNftId) });
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Find this investor's investment for this vehicle
    const investment = await Investment.findOne({
      vehicle: car._id,
      investor: req.user._id,
      status: "active",
    });

    if (!investment) {
      console.warn(`recordRevenueClaimed: no active investment found for vehicle ${car._id} / investor ${req.user._id}`);
      return res.status(404).json({ success: false, message: "No active investment found for this vehicle" });
    }

    investment.totalRevenueEarned = (investment.totalRevenueEarned || 0) + revenueAmount;
    investment.lastDistribution = new Date();
    await investment.save();

    res.json({ success: true, message: "Revenue claim recorded" });
  } catch (error) {
    console.error("Record revenue claimed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record token transfer (after on-chain tx)
// @route   POST /api/investments/record-transfer
// @access  Private
export const recordTokenTransfer = async (req, res) => {
  try {
    const { tokenAddress, recipientAddress, amount, txHash } = req.body;

    // Find vehicle by token address
    const car = await Car.findOne({
      $or: [
        { assetTokenAddress: tokenAddress },
        { revenueTokenAddress: tokenAddress },
      ],
    });

    if (!car) {
      return res.json({ success: true, message: "Transfer noted (vehicle not found)" });
    }

    // Notify the sender's investment record
    const investment = await Investment.findOne({
      vehicle: car._id,
      investor: req.user._id,
      status: "active",
    });

    if (investment) {
      if (!investment.transferHistory) investment.transferHistory = [];
      investment.transferHistory.push({
        to: recipientAddress,
        amount,
        txHash,
        date: new Date(),
      });
      await investment.save();
    }

    res.json({ success: true, message: "Transfer recorded" });
  } catch (error) {
    console.error("Record transfer error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record dispute resolution (after on-chain tx)
// @route   POST /api/investments/record-dispute-resolution
// @access  Private (admin)
export const recordDisputeResolution = async (req, res) => {
  try {
    const { disputeId, paymentId, outcome, refundAmount, txHash } = req.body;

    // If outcome favors payer (refund), update investment status
    if (outcome === 1 && refundAmount > 0) {
      // Find investment by payment-related data
      // Since we don't have a direct mapping, log for now
      console.log(`Dispute #${disputeId} resolved: outcome=${outcome}, refund=${refundAmount}`);
    }

    res.json({ success: true, message: "Dispute resolution recorded" });
  } catch (error) {
    console.error("Record dispute resolution error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
