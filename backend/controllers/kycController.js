/**
 * KYC Controller
 * Handles KYC document submission, review, and approval
 */

import KYC from "../models/kycModel.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import RenterProfile from "../models/RenterProfile.js";

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
      "user status investorInfo upgradeRequest"
    ).lean();

    const kycMap = {};
    for (const doc of kycDocs) {
      kycMap[doc.user.toString()] = {
        kycId: doc._id,
        kycStatus: doc.status,
        investorType: doc.investorInfo?.investorType || doc.investorInfo?.accreditationType || null,
        upgradeRequest: doc.upgradeRequest?.isUpgrade ? doc.upgradeRequest : null,
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
    const { roleType } = req.body;

    // FormData fields arrive as JSON strings from multer — parse them
    const personalInfo = req.body.personalInfo ? JSON.parse(req.body.personalInfo) : undefined;
    const investorInfo = req.body.investorInfo ? JSON.parse(req.body.investorInfo) : undefined;
    const businessInfo = req.body.businessInfo ? JSON.parse(req.body.businessInfo) : undefined;
    const renterInfo = req.body.renterInfo ? JSON.parse(req.body.renterInfo) : undefined;

    // Check if user already has a KYC submission
    let kyc = await KYC.findOne({ user: userId });

    // Allow resubmission even for the same approved role (e.g., wallet rebind).
    // The update path below resets status to "pending" for admin re-review.
    // Also reset blockchain status and compliance flag since they no longer apply.
    if (kyc && kyc.status === "approved" && kyc.roleType === roleType) {
      kyc.blockchainStatus = {
        isRegisteredOnChain: false,
        walletAddress: null,
        identityRegistryTxHash: null,
      };
      kyc.markModified("blockchainStatus");

      await User.findByIdAndUpdate(userId, {
        "compliance.kycVerified": false,
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
      if (renterInfo) kyc.renterInfo = renterInfo;
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
        renterInfo,
        status: "pending",
        submittedAt: new Date(),
      });
    }

    // Notify all admin users about the new KYC submission
    const adminUsers = await User.find({ role: "admin" }, "_id");
    const roleLabel = roleType === "renter" ? "Renter" : roleType === "investor" ? "Investor" : "Rentor";
    for (const admin of adminUsers) {
      await Notification.create({
        userId: admin._id,
        type: "kyc_submitted",
        title: `New KYC Submission`,
        message: `${req.user.name || "A user"} has submitted KYC verification as a ${roleLabel}. Please review their documents.`,
        link: "/admin/kyc",
        metadata: {},
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

    // Map accreditationType string to numeric investorType for on-chain use
    const accType = kyc.investorInfo?.accreditationType;
    const investorTypeMap = { retail: 1, accredited: 2, institutional: 3 };
    const investorType = kyc.investorInfo?.investorType
      || (accType ? investorTypeMap[accType] : null)
      || null;

    res.status(200).json({
      success: true,
      data: {
        hasKYC: true,
        status: kyc.status,
        roleType: kyc.roleType,
        investorType,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        expiresAt: kyc.expiresAt,
        isExpired,
        blockchainStatus: kyc.blockchainStatus,
        rejectionReason: kyc.rejectionReason,
        upgradeRequest: kyc.upgradeRequest?.isUpgrade ? kyc.upgradeRequest : null,
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

    // If renter, create or update RenterProfile from KYC data
    if (kyc.roleType === "renter") {
      const profileData = {
        user: kyc.user._id,
        personalInfo: {
          fullName: kyc.personalInfo?.fullName || "",
          email: kyc.renterInfo?.email || kyc.user.email || "",
          phone: kyc.renterInfo?.phone || "",
          dateOfBirth: kyc.personalInfo?.dateOfBirth || null,
        },
        address: {
          street: kyc.personalInfo?.address?.street || "",
          city: kyc.personalInfo?.address?.city || "",
          state: kyc.personalInfo?.address?.state || "",
          zipCode: kyc.personalInfo?.address?.postalCode || "",
          country: kyc.personalInfo?.address?.country || "USA",
        },
        driverLicense: {
          number: kyc.renterInfo?.driverLicenseNumber || "",
          expiryDate: kyc.renterInfo?.driverLicenseExpiry || null,
          issuingState: kyc.renterInfo?.driverLicenseIssuingState || "",
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: reviewerId,
        },
        insurance: {
          provider: kyc.renterInfo?.insuranceProvider || "",
          policyNumber: kyc.renterInfo?.insurancePolicyNumber || "",
          expiryDate: kyc.renterInfo?.insuranceExpiry || null,
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: reviewerId,
        },
        isVerified: true,
      };

      await RenterProfile.findOneAndUpdate(
        { user: kyc.user._id },
        profileData,
        { upsert: true, new: true }
      );
    }

    // Determine redirect link based on role
    const redirectLink = kyc.roleType === "renter"
      ? "/renter/browse"
      : `/${kyc.roleType}/dashboard`;

    // Create notification for user
    await Notification.create({
      userId: kyc.user._id,
      type: "kyc_approved",
      title: "KYC Approved ✅",
      message: `Your KYC verification has been approved! You can now access all ${kyc.roleType} features on the platform.`,
      link: redirectLink,
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
 * @desc    Request investor type upgrade (Investor only)
 * @route   POST /api/kyc/request-upgrade
 * @access  Private
 */
export const requestUpgrade = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;
    const targetType = Number(req.body.targetType);

    if (!targetType || ![2, 3].includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target type. Must be 2 (Accredited) or 3 (Institutional).",
      });
    }

    const kyc = await KYC.findOne({ user: userId });

    if (!kyc || kyc.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "You must have an approved KYC before requesting an upgrade.",
      });
    }

    // Determine current numeric type
    const accType = kyc.investorInfo?.accreditationType;
    const investorTypeMap = { retail: 1, accredited: 2, institutional: 3 };
    const currentType = kyc.investorInfo?.investorType
      || (accType ? investorTypeMap[accType] : 1)
      || 1;

    if (targetType <= currentType) {
      return res.status(400).json({
        success: false,
        message: "Target type must be higher than your current type.",
      });
    }

    if (kyc.upgradeRequest?.isUpgrade && kyc.upgradeRequest?.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "You already have a pending upgrade request.",
      });
    }

    // Handle optional additional documents
    const additionalDocs = [];
    if (req.files && req.files.additionalDocuments) {
      for (const file of req.files.additionalDocuments) {
        additionalDocs.push({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          url: `/uploads/kyc/${file.filename}`,
          description: "Upgrade supporting document",
        });
      }
    }

    // Update KYC record with upgrade request
    kyc.upgradeRequest = {
      isUpgrade: true,
      currentType,
      targetType,
      reason: reason || "",
      requestedAt: new Date(),
      status: "pending",
    };

    if (additionalDocs.length > 0) {
      kyc.documents.additionalDocuments = [
        ...(kyc.documents.additionalDocuments || []),
        ...additionalDocs,
      ];
      kyc.markModified('documents.additionalDocuments');
    }

    kyc.markModified('upgradeRequest');
    await kyc.save();

    res.status(200).json({
      success: true,
      message: "Upgrade request submitted successfully.",
      data: { upgradeRequest: kyc.upgradeRequest },
    });
  } catch (error) {
    console.error("Request upgrade error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit upgrade request",
      error: error.message,
    });
  }
};

/**
 * @desc    Approve investor type upgrade (Admin only)
 * @route   POST /api/kyc/:id/approve-upgrade
 * @access  Private/Admin
 */
export const approveUpgrade = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user._id;

    const kyc = await KYC.findById(id).populate("user");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    // Use toObject() to read raw data — Mongoose may not hydrate inline nested paths correctly
    const kycObj = kyc.toObject();
    if (!kycObj.upgradeRequest?.isUpgrade || kycObj.upgradeRequest?.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending upgrade request found",
      });
    }

    const targetType = kycObj.upgradeRequest.targetType;
    const typeNames = { 1: "retail", 2: "accredited", 3: "institutional" };

    // Replace entire investorInfo subdocument (property-level edits don't persist in Mongoose)
    kyc.investorInfo = {
      ...kycObj.investorInfo,
      accreditationType: typeNames[targetType],
      investorType: targetType,
    };
    kyc.upgradeRequest = {
      ...kycObj.upgradeRequest,
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    kyc.markModified('upgradeRequest');
    kyc.markModified('investorInfo');
    await kyc.save();

    // Update User model
    const userId = kycObj.user?._id || kycObj.user;
    await User.findByIdAndUpdate(userId, {
      investorType: targetType,
    });

    // Create notification
    await Notification.create({
      userId: kyc.user._id,
      type: "upgrade_approved",
      title: "Upgrade Approved",
      message: `Your investor type has been upgraded to ${typeNames[targetType]}. An admin will complete the on-chain upgrade shortly.`,
      link: "/investor/dashboard",
      metadata: { targetType },
    });

    res.status(200).json({
      success: true,
      message: `Upgrade to ${typeNames[targetType]} approved. Proceed with on-chain upgrade.`,
      data: {
        id: kyc._id,
        walletAddress: kyc.user.walletAddress,
        targetType,
        upgradeRequest: kyc.upgradeRequest,
      },
    });
  } catch (error) {
    console.error("Approve upgrade error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve upgrade",
      error: error.message,
    });
  }
};

/**
 * @desc    Reject investor type upgrade (Admin only)
 * @route   POST /api/kyc/:id/reject-upgrade
 * @access  Private/Admin
 */
export const rejectUpgrade = async (req, res) => {
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

    // Use toObject() to read raw data — Mongoose may not hydrate inline nested paths correctly
    const kycObj = kyc.toObject();
    if (!kycObj.upgradeRequest?.isUpgrade || kycObj.upgradeRequest?.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending upgrade request found",
      });
    }

    kyc.upgradeRequest = {
      ...kycObj.upgradeRequest,
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    kyc.markModified('upgradeRequest');
    await kyc.save();

    // Create notification
    await Notification.create({
      userId: kyc.user._id,
      type: "upgrade_rejected",
      title: "Upgrade Rejected",
      message: `Your investor type upgrade was rejected. Reason: ${reason}`,
      link: "/investor/dashboard",
      metadata: { reason },
    });

    res.status(200).json({
      success: true,
      message: "Upgrade request rejected",
      data: {
        id: kyc._id,
        upgradeRequest: kyc.upgradeRequest,
      },
    });
  } catch (error) {
    console.error("Reject upgrade error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject upgrade",
      error: error.message,
    });
  }
};

/**
 * @desc    Notify investor that upgrade MultiSig wallet was created (Admin only)
 * @route   POST /api/kyc/:id/notify-upgrade-wallet
 * @access  Private/Admin
 */
export const notifyUpgradeWalletCreated = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await KYC.findById(id).populate("user");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    const kycObj = kyc.toObject();
    const typeNames = { 1: "Retail", 2: "Accredited", 3: "Institutional" };
    const targetType = kycObj.upgradeRequest?.targetType || 2;

    // Create notification about wallet creation
    await Notification.create({
      userId: kyc.user._id,
      type: "upgrade_wallet_created",
      title: "MultiSig Wallet Created",
      message: `Your MultiSig wallet has been created as part of your upgrade to ${typeNames[targetType]}. You can now use this wallet for higher-tier investments with enhanced security.`,
      link: "/investor/dashboard",
      metadata: { targetType },
    });

    // Create notification about next steps
    await Notification.create({
      userId: kyc.user._id,
      type: "upgrade_complete",
      title: "Upgrade Complete - Next Steps",
      message: `Your investor upgrade to ${typeNames[targetType]} is now complete! Here's what you can do next: 1) Lock funds in your MultiSig wallet for higher investment limits. 2) Browse the marketplace for ${typeNames[targetType]}-tier investment opportunities. 3) Review your updated investment limits on your dashboard.`,
      link: "/investor/dashboard",
      metadata: { targetType },
    });

    res.status(200).json({
      success: true,
      message: "Investor notified about wallet creation and next steps",
    });
  } catch (error) {
    console.error("Notify upgrade wallet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to notify investor",
      error: error.message,
    });
  }
};

/**
 * @desc    Downgrade investor type (Admin only)
 * @route   POST /api/kyc/:id/downgrade
 * @access  Private/Admin
 */
export const downgradeInvestor = async (req, res) => {
  try {
    const { id } = req.params;
    const targetType = Number(req.body.targetType);
    const reviewerId = req.user._id;

    if (!targetType || ![1, 2].includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target type. Must be 1 (Retail) or 2 (Accredited).",
      });
    }

    const kyc = await KYC.findById(id).populate("user");

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    const kycObj = kyc.toObject();
    const accType = kycObj.investorInfo?.accreditationType;
    const investorTypeMap = { retail: 1, accredited: 2, institutional: 3 };
    // Check KYC investorType, then accreditationType mapping, then User model as fallback
    const currentType = kycObj.investorInfo?.investorType
      || (accType ? investorTypeMap[accType] : null)
      || kyc.user?.investorType
      || 1;

    if (targetType >= currentType) {
      return res.status(400).json({
        success: false,
        message: "Target type must be lower than the current type for a downgrade.",
      });
    }

    const typeNames = { 1: "retail", 2: "accredited", 3: "institutional" };

    // Replace entire investorInfo subdocument (property-level edits don't persist in Mongoose)
    kyc.investorInfo = {
      ...kycObj.investorInfo,
      accreditationType: typeNames[targetType],
      investorType: targetType,
    };

    // Clear any pending upgrade request
    if (kycObj.upgradeRequest?.isUpgrade && kycObj.upgradeRequest?.status === "pending") {
      kyc.upgradeRequest = {
        ...kycObj.upgradeRequest,
        status: "rejected",
        rejectionReason: "Investor was downgraded by admin",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };
      kyc.markModified("upgradeRequest");
    }

    kyc.markModified("investorInfo");
    await kyc.save();

    // Update User model
    const userId = kycObj.user?._id || kycObj.user;
    await User.findByIdAndUpdate(userId, {
      investorType: targetType,
    });

    // Create notification
    await Notification.create({
      userId,
      type: "investor_downgraded",
      title: "Investor Type Changed",
      message: `Your investor type has been changed to ${typeNames[targetType]}. Your investment limits have been updated accordingly.`,
      link: "/investor/dashboard",
      metadata: { previousType: currentType, newType: targetType },
    });

    res.status(200).json({
      success: true,
      message: `Investor downgraded to ${typeNames[targetType]}. Proceed with on-chain downgrade.`,
      data: {
        id: kyc._id,
        walletAddress: kyc.user.walletAddress,
        targetType,
        previousType: currentType,
      },
    });
  } catch (error) {
    console.error("Downgrade investor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to downgrade investor",
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
