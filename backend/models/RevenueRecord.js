import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const revenueRecordSchema = new mongoose.Schema(
  {
    vehicle: { type: ObjectId, ref: "Car", required: true },
    rentor: { type: ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },

    // On-chain revenue data (from RevenueDistributor contract)
    onChainRevenue: {
      totalWei: { type: String, default: "0" }, // Store as string to avoid precision loss
      totalUsd: { type: Number, default: 0 },
      distributedWei: { type: String, default: "0" },
      distributedUsd: { type: Number, default: 0 },
      distributionCount: { type: Number, default: 0 },
    },

    // Booking revenue data (from database)
    bookingRevenue: {
      count: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },

    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index: one record per vehicle per month
revenueRecordSchema.index({ vehicle: 1, year: 1, month: 1 }, { unique: true });
revenueRecordSchema.index({ rentor: 1, year: 1, month: 1 });

const RevenueRecord = mongoose.model("RevenueRecord", revenueRecordSchema);

export default RevenueRecord;
