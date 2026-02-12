import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// @desc    Create a new review
// @route   POST /api/reviews/create
// @access  Private
export const createReview = async (req, res) => {
  try {
    const {
      bookingId,
      vehicleId,
      rating,
      comment,
      vehicleCondition,
      cleanliness,
      communication,
      wouldRecommend,
    } = req.body;

    // Check if booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only review completed bookings",
      });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Review already exists for this booking",
      });
    }

    // Create review
    const review = await Review.create({
      booking: bookingId,
      vehicle: vehicleId,
      renter: req.user._id,
      rentor: booking.owner,
      rating,
      comment,
      vehicleCondition,
      cleanliness,
      communication,
      wouldRecommend,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews for a vehicle
// @route   GET /api/reviews/vehicle/:vehicleId
// @access  Public
export const getVehicleReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ vehicle: req.params.vehicleId })
      .populate("renter", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Get vehicle reviews error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews by user (renter)
// @route   GET /api/reviews/user
// @access  Private
export const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ renter: req.user._id })
      .populate("vehicle", "brand model image")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to a review (rentor only)
// @route   POST /api/reviews/respond/:reviewId
// @access  Private
export const respondToReview = async (req, res) => {
  try {
    const { response } = req.body;
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Check if user is the rentor
    if (review.rentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    review.response = response;
    review.responseDate = new Date();
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    console.error("Respond to review error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if user can review a booking
// @route   GET /api/reviews/can-review/:bookingId
// @access  Private
export const canReviewBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const existingReview = await Review.findOne({ booking: req.params.bookingId });
    const canReview = booking.status === "completed" && !existingReview;

    res.json({
      success: true,
      data: {
        canReview,
        reason: !canReview
          ? existingReview
            ? "Already reviewed"
            : "Booking not completed"
          : null,
      },
    });
  } catch (error) {
    console.error("Can review booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
