import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Existing fields
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },

    // Role options: renter (books vehicles), rentor (owns vehicles), investor (invests in campaigns)
    role: {
      type: String,
      enum: ["renter", "rentor", "investor", "admin"],
      default: "renter"
    },

    // Blockchain fields — no default so sparse index skips users without a wallet
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
    },
    onchainIdAddress: {
      type: String,
      default: null
    },

    // NEW: Investor-specific fields
    investorType: {
      type: Number,
      min: 1,
      max: 4,
      default: null
    },
    whitelistTier: {
      type: Number,
      min: 1,
      max: 4,
      default: null
    },
    maxInvestment: {
      type: Number,
      default: null
    },

    // NEW: Compliance status
    compliance: {
      kycVerified: { type: Boolean, default: false },
      accreditedInvestor: { type: Boolean, default: false },
      driverLicenseVerified: { type: Boolean, default: false },
      insuranceVerified: { type: Boolean, default: false },
    },

    // NEW: User preferences
    preferences: {
      language: { type: String, default: "en" },
      currency: { type: String, default: "USD" },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
