import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    car: { type: ObjectId, ref: "Car", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    owner: { type: ObjectId, ref: "User", required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    price: { type: Number, required: true },

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
