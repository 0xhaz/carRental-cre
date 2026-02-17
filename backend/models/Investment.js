import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const investmentSchema = new mongoose.Schema(
  {
    investor: { type: ObjectId, ref: "User", required: true },
    vehicle: { type: ObjectId, ref: "Car", required: true },
    amount: { type: Number, required: true }, // USD equivalent
    amountEth: { type: Number, default: 0 }, // ETH amount invested on-chain

    // Token holdings (will be populated when blockchain integration happens)
    assetTokens: { type: Number, default: 0 },
    revenueTokens: { type: Number, default: 0 },

    // Revenue tracking
    totalRevenueEarned: { type: Number, default: 0 },
    lastDistribution: { type: Date },

    // Investment details
    investedAt: { type: Date, default: Date.now },
    lockupPeriod: { type: Number }, // Days
    lockupEnds: { type: Date },

    // Status
    status: {
      type: String,
      enum: ["pending", "active", "locked", "completed", "refunded", "cancelled"],
      default: "pending",
    },

    // Blockchain transaction hash (for future)
    txHash: { type: String },
  },
  { timestamps: true }
);

// Index for faster queries
investmentSchema.index({ investor: 1, status: 1 });
investmentSchema.index({ vehicle: 1 });

const Investment = mongoose.model("Investment", investmentSchema);

export default Investment;
