import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: ObjectId, ref: "Booking", required: true },
    vehicle: { type: ObjectId, ref: "Car", required: true },
    renter: { type: ObjectId, ref: "User", required: true },
    rentor: { type: ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    response: { type: String },
    responseDate: { type: Date },
    vehicleCondition: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    wouldRecommend: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for faster queries
reviewSchema.index({ vehicle: 1, createdAt: -1 });
reviewSchema.index({ renter: 1 });
reviewSchema.index({ booking: 1 }, { unique: true }); // One review per booking

const Review = mongoose.model("Review", reviewSchema);

export default Review;
