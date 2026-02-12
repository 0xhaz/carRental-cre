import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const carSchema = new mongoose.Schema(
  {
    // Existing fields
    owner: { type: ObjectId, ref: "User" },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    image: { type: String, required: true },
    year: { type: Number, required: true },
    category: { type: String, required: true },
    seating_capacity: { type: Number, required: true },
    fuel_type: { type: String, required: true },
    transmission: { type: String, required: true },
    pricePerDay: { type: Number, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },

    // NEW: Additional vehicle details
    vin: { type: String, unique: true, sparse: true },
    color: { type: String },
    mileage: { type: Number },

    // NEW: Blockchain fields (will be null for now)
    vehicleNftId: { type: Number, default: null },
    assetTokenAddress: { type: String, default: null },
    revenueTokenAddress: { type: String, default: null },

    // NEW: Fundraising
    fundraising: {
      active: { type: Boolean, default: false },
      targetAmount: { type: Number, default: 0 },
      currentAmount: { type: Number, default: 0 },
      minInvestment: { type: Number, default: 1000 },
      maxInvestment: { type: Number, default: 50000 },
      expectedROI: { type: Number, default: 0 },
      investorCount: { type: Number, default: 0 },
      investors: [{ type: ObjectId, ref: "User" }],
    },

    // NEW: Revenue tracking
    revenue: {
      totalEarned: { type: Number, default: 0 },
      distributed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      lastDistribution: { type: Date },
    },

    // NEW: Status
    status: {
      type: String,
      enum: ["available", "rented", "maintenance", "retired"],
      default: "available",
    },
  },
  { timestamps: true }
);

const Car = mongoose.model("Car", carSchema);

export default Car;
