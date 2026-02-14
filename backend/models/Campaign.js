import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const milestoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  releasePercentage: { type: Number, required: true }, // Percentage of funds to release
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const campaignSchema = new mongoose.Schema(
  {
    vehicle: { type: ObjectId, ref: "Car", required: true },
    rentor: { type: ObjectId, ref: "User", required: true },

    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    minInvestment: { type: Number, default: 1000 },
    maxInvestment: { type: Number, default: 50000 },

    investorTypeAllowed: [{ type: Number, min: 1, max: 4 }], // Which investor types can participate

    expectedROI: { type: Number, required: true },
    duration: { type: Number, required: true }, // Days

    fundraisingType: {
      type: String,
      enum: ["full_fundraise", "co_invest"],
      default: "full_fundraise",
    },
    rentorInvestment: { type: Number, default: 0 }, // Rentor's own planned co-investment amount

    minFundingRequired: { type: Number, default: 60 }, // Minimum % of targetAmount to proceed (0-100)

    status: {
      type: String,
      enum: ["draft", "active", "funded", "closed", "cancelled"],
      default: "draft",
    },

    milestones: [milestoneSchema],

    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

// Index for faster queries
campaignSchema.index({ rentor: 1, status: 1 });
campaignSchema.index({ status: 1, endDate: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
