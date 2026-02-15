/**
 * KYC (Know Your Customer) Model
 * Stores KYC verification documents and status
 */

import mongoose from "mongoose";

const kycSchema = new mongoose.Schema(
  {
    // User reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One KYC record per user
    },

    // Role-specific verification
    roleType: {
      type: String,
      enum: ["investor", "rentor"],
      required: true,
    },

    // KYC Documents
    documents: {
      // For investors: Government ID
      // For rentors: Business registration
      primaryDocument: {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date,
        url: String, // Image/PDF URL or path
      },

      // Proof of address (utility bill, bank statement)
      proofOfAddress: {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date,
        url: String,
      },

      // Additional documents (optional)
      additionalDocuments: [
        {
          filename: String,
          originalName: String,
          mimeType: String,
          size: Number,
          uploadedAt: Date,
          url: String,
          description: String,
        },
      ],
    },

    // Personal Information
    personalInfo: {
      fullName: String,
      dateOfBirth: Date,
      nationality: String,
      occupation: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
    },

    // For Investors - Accreditation Status
    investorInfo: {
      accreditationType: {
        type: String,
        enum: ["retail", "accredited", "institutional"],
      },
      investorType: Number, // 1=Retail, 2=Accredited, 3=Institutional
      annualIncome: Number,
      netWorth: Number,
      investmentExperience: String,
    },

    // For Rentors - Business Information
    businessInfo: {
      businessName: String,
      businessType: String,
      registrationNumber: String,
      taxId: String,
      yearsInBusiness: Number,
    },

    // Verification Status
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "expired"],
      default: "pending",
    },

    // Review Information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
    rejectionReason: String,

    // Blockchain Integration
    blockchainStatus: {
      isRegisteredOnChain: {
        type: Boolean,
        default: false,
      },
      walletAddress: String,
      identityRegistryTxHash: String,
      registeredAt: Date,
    },

    // Compliance Flags
    complianceChecks: {
      sanctionsScreening: {
        passed: Boolean,
        checkedAt: Date,
        provider: String,
      },
      pep: {
        // Politically Exposed Person
        isPEP: Boolean,
        checkedAt: Date,
      },
      amlCheck: {
        // Anti-Money Laundering
        passed: Boolean,
        checkedAt: Date,
        riskScore: Number,
      },
    },

    // Investor Type Upgrade Request
    upgradeRequest: {
      isUpgrade: {
        type: Boolean,
        default: false,
      },
      currentType: Number, // 1=Retail, 2=Accredited, 3=Institutional
      targetType: Number,
      reason: String,
      requestedAt: Date,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      rejectionReason: String,
    },

    // Expiration (KYC typically expires after 1 year)
    expiresAt: Date,

    // Audit trail
    submittedAt: Date,
    lastUpdatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
kycSchema.index({ user: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ "blockchainStatus.walletAddress": 1 });

// Methods

/**
 * Mark KYC as approved and update blockchain status
 */
kycSchema.methods.approve = async function (reviewerId, notes) {
  this.status = "approved";
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

  return this.save();
};

/**
 * Mark KYC as rejected
 */
kycSchema.methods.reject = async function (reviewerId, reason) {
  this.status = "rejected";
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;

  return this.save();
};

/**
 * Update blockchain registration status
 */
kycSchema.methods.updateBlockchainStatus = async function (
  walletAddress,
  txHash
) {
  this.blockchainStatus.isRegisteredOnChain = true;
  this.blockchainStatus.walletAddress = walletAddress;
  this.blockchainStatus.identityRegistryTxHash = txHash;
  this.blockchainStatus.registeredAt = new Date();

  return this.save();
};

/**
 * Check if KYC is expired
 */
kycSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static methods

/**
 * Get KYC by user ID
 */
kycSchema.statics.getByUser = function (userId) {
  return this.findOne({ user: userId }).populate("user", "name email");
};

/**
 * Get pending KYC submissions
 */
kycSchema.statics.getPendingSubmissions = function () {
  return this.find({ status: { $in: ["pending", "under_review"] } })
    .populate("user", "name email walletAddress")
    .sort({ submittedAt: 1 });
};

const KYC = mongoose.model("KYC", kycSchema);

export default KYC;
