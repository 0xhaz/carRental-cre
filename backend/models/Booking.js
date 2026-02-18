import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    car: { type: ObjectId, ref: "Car", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    owner: { type: ObjectId, ref: "User", required: true },
    renterProfile: { type: ObjectId, ref: "RenterProfile" },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupLocation: { type: String },
    days: { type: Number, required: true },
    price: { type: Number, required: true },

    // Pricing breakdown
    pricing: {
      basePrice: { type: Number },
      insuranceCost: { type: Number },
      additionalDriverCost: { type: Number, default: 0 },
      insuranceUpgradeCost: { type: Number, default: 0 },
      totalPrice: { type: Number },
    },

    // Add-ons
    addons: {
      additionalDriver: { type: Boolean, default: false },
      insuranceUpgrade: { type: Boolean, default: false },
    },

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["offline", "bank_transfer", "crypto"],
      required: true,
    },
    paymentDetails: {
      // Bank transfer details (if payment method is bank_transfer)
      bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
      },
      // Crypto payment details (if payment method is crypto)
      cryptoDetails: {
        selectedToken: {
          type: String,
          enum: ["ETH", "USDC", "USDT", "DAI"],
        },
        walletAddress: String,
        amount: Number,
        txHash: String,
      },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "paid_crypto", "refunded", "failed"],
      default: "pending",
    },

    // UPDATE: Expand status options
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled", "disputed"],
      default: "pending",
    },

    // NEW: Deposit information
    securityDeposit: { type: Number, default: 0 },
    depositReturned: { type: Boolean, default: false },

    // NEW: Blockchain fields (will be null for now)
    onchainBookingId: { type: Number, default: null },
    txHashes: {
      request: { type: String },
      approve: { type: String },
      start: { type: String },
      complete: { type: String },
    },

    // NEW: Condition reports
    preCondition: {
      mileage: { type: Number },
      fuelLevel: { type: Number },
      photos: [{ type: String }],
      damageNotes: [{ type: String }],
      timestamp: { type: Date },
    },
    postCondition: {
      mileage: { type: Number },
      fuelLevel: { type: Number },
      photos: [{ type: String }],
      damageNotes: [{ type: String }],
      timestamp: { type: Date },
    },

    // NEW: Damage assessment
    damageAssessment: {
      hasDamage: { type: Boolean, default: false },
      estimatedCost: { type: Number, default: 0 },
      deductedFromDeposit: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
