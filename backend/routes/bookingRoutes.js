import express from "express";
import {
  changeBookingStatus,
  checkAvailabilityOfCar,
  createBooking,
  getBookingById,
  getRentorBookings,
  getUserBookings,
  updateOnChainStatus,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.post("/check-availability", checkAvailabilityOfCar);
bookingRouter.post("/create", protect, createBooking);
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.get("/rentor", protect, getRentorBookings);
bookingRouter.get("/:id", protect, getBookingById);
bookingRouter.post("/change-status", protect, changeBookingStatus);
bookingRouter.patch("/:id/onchain", protect, updateOnChainStatus);

export default bookingRouter;
