import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "booking_confirmed",
        "booking_cancelled",
        "booking_reminder",
        "payment_received",
        "payment_due",
        "review_received",
        "review_reminder",
        "investment_confirmed",
        "revenue_distributed",
        "campaign_funded",
        "campaign_expired",
        "campaign_failed",
        "vehicle_available",
        "kyc_approved",
        "kyc_rejected",
        "kyc_expired",
        "upgrade_approved",
        "upgrade_rejected",
        "upgrade_wallet_created",
        "upgrade_complete",
        "investor_downgraded",
        "system_update",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    metadata: {
      bookingId: { type: ObjectId, ref: "Booking" },
      vehicleId: { type: ObjectId, ref: "Car" },
      investmentId: { type: ObjectId, ref: "Investment" },
      amount: { type: Number },
    },
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
