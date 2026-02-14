/**
 * KYC Controller
 * Handles KYC document submission, review, and approval
 */

import KYC from "../models/kycModel.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

/**
 * @desc    Get all investor users with wallet + KYC status (for admin investor management)
 * @route   GET /api/kyc/investors
 * @access  Admin
 */
export const getInvestorUsers = async (req, res) => {
  try {
    const investors = await User.find(
      { role: "investor", walletAddress: { $exists: true, $ne: null } },
      "name email walletAddress role createdAt"
    ).lean();

    // Enrich with KYC status
    const investorIds = investors.map((i) => i._id);
    const kycDocs = await KYC.find(
      { user: { $in: investorIds } },
      "user status investorInfo"
    ).lean();

    const kycMap = {};
    for (const doc of kycDocs) {
      kycMap[doc.user.toString()] = {
        kycStatus: doc.status,
        investorType: doc.investorInfo?.investorType || doc.investorInfo?.accreditationType || null,
      };
    }

    const enriched = investors.map((inv) => ({
      ...inv,
      kyc: kycMap[inv._id.toString()] || { kycStatus: "none", investorType: null },
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Get investor users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Submit KYC documents
 * @route   POST /api/kyc/submit
 * @access  Private
 */
export const submitKYC = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roleType, personalInfo, investorInfo, businessInfo } = req.body;

    // Check if user already has a KYC submission
    let kyc = await KYC.findOne({ user: userId });

    if (kyc && kyc.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "You already have an approved KYC. Contact support to update.",
      });
    }

    // Handle uploaded files (req.files from multer)
    const documents = {};

    if (req.files) {
      if (req.files.primaryDocument && req.files.primaryDocument[0]) {
        const file = req.files.primaryDocument[0];
        documents.primaryDocument = {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          url: `/uploads/kyc/${file.filename}`, // Adjust based on your file storage
        };
      }

      if (req.files.proofOfAddress && req.files.proofOfAddress[0]) {
        const file = req.files.proofOfAddress[0];
        documents.proofOfAddress = {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          url: `/uploads/kyc/${file.filename}`,
        };
      }
    }

    // Create or update KYC record
    if (kyc) {
      // Update existing KYC
      kyc.roleType = roleType;
      kyc.documents = { ...kyc.documents, ...documents };
      if (personalInfo) kyc.personalInfo = personalInfo;
      if (investorInfo) kyc.investorInfo = investorInfo;
      if (businessInfo) kyc.businessInfo = businessInfo;
      kyc.status = "pending";
      kyc.submittedAt = new Date();

      await kyc.save();
    } else {
      // Create new KYC
      kyc = await KYC.create({
        user: userId,
        roleType,
        documents,
        personalInfo,
        investorInfo,
        businessInfo,
        status: "pending",
        submittedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: "KYC documents submitted successfully. Under review.",
      data: {
        id: kyc._id,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
      },
    });
  } catch (error) {
    console.error("KYC submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit KYC documents",
      error: error.message,
    });
  }
};

/**
 * @desc    Get KYC status for current user
 * @route   GET /api/kyc/status
 * @access  Private
 */
export const getKYCStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const kyc = await KYC.getByUser(userId);

    if (!kyc) {
      return res.status(200).json({
        success: true,
        data: {
          hasKYC: false,
          status: "not_submitted",
          message: "No KYC submission found",
        },
      });
    }

    // Check if expired
    const isExpired = kyc.isExpired();
    if (isExpired && kyc.status === "approved") {
      kyc.status = "expired";
      await kyc.save();
    }

    res.status(200).json({
      success: true,
      data: {
        hasKYC: true,
        status: kyc.status,
        roleType: kyc.roleType,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        expiresAt: kyc.expiresAt,
        isExpired,
        blockchainStatus: kyc.blockchainStatus,
        rejectionReason: kyc.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Get KYC status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve KYC status",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all pending KYC submissions (Admin only)
 * @route   GET /api/kyc/pending
 * @access  Private/Admin
 */
export const getPendingKYC = async (req, res) => {
  try {
    const pendingKYCs = await KYC.getPendingSubmissions();

    res.status(200).json({
      success: true,
      count: pendingKYCs.length,
      data: pendingKYCs.map((kyc) => ({
        _id: kyc._id,
        user: {
          _id: kyc.user._id,
          name: kyc.user.name,
          email: kyc.user.email,
          walletAddress: kyc.user.walletAddress,
        },
        roleType: kyc.roleType,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        personalInfo: kyc.personalInfo,
        documents: {
          hasPrimaryDocument: !!kyc.documents?.primaryDocument,
          hasProofOfAddress: !!kyc.documents?.proofOfAddress,
        },
      })),
    });
  } catch (error) {
    console.error("Get pending KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending KYC submissions",
      error: error.message,
    });
  }
};

/**
 * @desc    Get KYC details by ID (Admin only)
 * @route   GET /api/kyc/:id
 * @access  Private/Admin
 */
export const getKYCById = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await KYC.findById(id).populate("user", "name email walletAddress role");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: kyc,
    });
  } catch (error) {
    console.error("Get KYC by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve KYC record",
      error: error.message,
    });
  }
};

/**
 * @desc    Approve KYC submission (Admin only)
 * @route   POST /api/kyc/:id/approve
 * @access  Private/Admin
 */
export const approveKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, registerOnChain } = req.body;
    const reviewerId = req.user._id;

    const kyc = await KYC.findById(id).populate("user");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    if (kyc.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "KYC already approved",
      });
    }

    // Approve KYC
    await kyc.approve(reviewerId, notes);

    // Update user's compliance status in the User model
    await User.findByIdAndUpdate(kyc.user._id, {
      "compliance.kycVerified": true,
    });

    // Create notification for user
    await Notification.create({
      userId: kyc.user._id,
      type: "kyc_approved",
      title: "KYC Approved ✅",
      message: `Your KYC verification has been approved! You can now access all ${kyc.roleType} features on the platform.`,
      link: `/${kyc.roleType}/dashboard`,
      metadata: {},
    });

    // TODO: If registerOnChain is true, call smart contract to register user
    // This would typically be done via a blockchain service
    // Example:
    // if (registerOnChain && kyc.user.walletAddress) {
    //   const txHash = await blockchainService.registerIdentity(kyc.user.walletAddress);
    //   await kyc.updateBlockchainStatus(kyc.user.walletAddress, txHash);
    // }

    res.status(200).json({
      success: true,
      message: "KYC approved successfully",
      data: {
        id: kyc._id,
        status: kyc.status,
        user: {
          id: kyc.user._id,
          name: kyc.user.name,
          email: kyc.user.email,
        },
        reviewedAt: kyc.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Approve KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve KYC",
      error: error.message,
    });
  }
};

/**
 * @desc    Reject KYC submission (Admin only)
 * @route   POST /api/kyc/:id/reject
 * @access  Private/Admin
 */
export const rejectKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reviewerId = req.user._id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const kyc = await KYC.findById(id).populate("user");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    // Reject KYC
    await kyc.reject(reviewerId, reason);

    // Reset user's compliance status
    await User.findByIdAndUpdate(kyc.user._id, {
      "compliance.kycVerified": false,
    });

    // Create notification for user
    await Notification.create({
      userId: kyc.user._id,
      type: "kyc_rejected",
      title: "KYC Rejected ❌",
      message: `Your KYC verification was rejected. Reason: ${reason}. Please resubmit with correct documents.`,
      link: `/verification?role=${kyc.roleType}`,
      metadata: {
        rejectionReason: reason,
      },
    });

    res.status(200).json({
      success: true,
      message: "KYC rejected",
      data: {
        id: kyc._id,
        status: kyc.status,
        user: {
          id: kyc.user._id,
          name: kyc.user.name,
          email: kyc.user.email,
        },
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Reject KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject KYC",
      error: error.message,
    });
  }
};

/**
 * @desc    Update blockchain registration status (Admin/System only)
 * @route   POST /api/kyc/:id/blockchain
 * @access  Private/Admin
 */
export const updateBlockchainStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress, txHash } = req.body;

    const kyc = await KYC.findById(id);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    if (kyc.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "KYC must be approved before blockchain registration",
      });
    }

    await kyc.updateBlockchainStatus(walletAddress, txHash);

    res.status(200).json({
      success: true,
      message: "Blockchain status updated successfully",
      data: {
        id: kyc._id,
        blockchainStatus: kyc.blockchainStatus,
      },
    });
  } catch (error) {
    console.error("Update blockchain status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update blockchain status",
      error: error.message,
    });
  }
};
