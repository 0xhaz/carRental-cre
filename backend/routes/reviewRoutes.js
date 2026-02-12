import express from "express";
import {
  createReview,
  getVehicleReviews,
  getUserReviews,
  respondToReview,
  canReviewBooking,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const reviewRouter = express.Router();

reviewRouter.post("/create", protect, createReview);
reviewRouter.get("/vehicle/:vehicleId", getVehicleReviews);
reviewRouter.get("/user", protect, getUserReviews);
reviewRouter.post("/respond/:reviewId", protect, respondToReview);
reviewRouter.get("/can-review/:bookingId", protect, canReviewBooking);

export default reviewRouter;
