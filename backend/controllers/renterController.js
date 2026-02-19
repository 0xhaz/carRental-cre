/**
 * Renter Controller
 * Handles renter profile management and booking submissions
 */

import RenterProfile from "../models/RenterProfile.js";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * @desc    Create or update renter profile
 * @route   POST /api/renter/profile
 * @access  Private
 */
export const createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      city,
      state,
      zipCode,
      country,
      driverLicense,
      preferredPaymentMethod,
      savedBankDetails,
      savedWalletAddress,
    } = req.body;

    // Handle driver's license images from multer
    const licenseImages = {};
    if (req.files) {
      if (req.files.licenseFront && req.files.licenseFront[0]) {
        const file = req.files.licenseFront[0];
        licenseImages.frontImage = {
          filename: file.filename,
          url: `/uploads/licenses/${file.filename}`,
          uploadedAt: new Date(),
        };
      }
      if (req.files.licenseBack && req.files.licenseBack[0]) {
        const file = req.files.licenseBack[0];
        licenseImages.backImage = {
          filename: file.filename,
          url: `/uploads/licenses/${file.filename}`,
          uploadedAt: new Date(),
        };
      }
    }

    // Check if profile exists
    let profile = await RenterProfile.findOne({ user: userId });

    if (profile) {
      // Update existing profile
      profile.personalInfo = {
        fullName: fullName || profile.personalInfo.fullName,
        email: email || profile.personalInfo.email,
        phone: phone || profile.personalInfo.phone,
        dateOfBirth: dateOfBirth || profile.personalInfo.dateOfBirth,
      };

      profile.address = {
        street: address || profile.address.street,
        city: city || profile.address.city,
        state: state || profile.address.state,
        zipCode: zipCode || profile.address.zipCode,
        country: country || profile.address.country || "USA",
      };

      if (driverLicense) {
        profile.driverLicense = {
          number: driverLicense.number || profile.driverLicense.number,
          expiryDate: driverLicense.expiryDate || profile.driverLicense.expiryDate,
          issuingState: driverLicense.issuingState || profile.driverLicense.issuingState,
          frontImage: licenseImages.frontImage || profile.driverLicense.frontImage,
          backImage: licenseImages.backImage || profile.driverLicense.backImage,
          isVerified: profile.driverLicense.isVerified || false,
        };
      }

      if (preferredPaymentMethod) profile.preferredPaymentMethod = preferredPaymentMethod;
      if (savedBankDetails) profile.savedBankDetails = savedBankDetails;
      if (savedWalletAddress) profile.savedWalletAddress = savedWalletAddress;

      await profile.save();

      return res.status(200).json({
        success: true,
        message: "Renter profile updated successfully",
        profile,
      });
    }

    // Create new profile
    profile = await RenterProfile.create({
      user: userId,
      personalInfo: { fullName, email, phone, dateOfBirth },
      address: { street: address, city, state, zipCode, country: country || "USA" },
      driverLicense: {
        number: driverLicense?.number,
        expiryDate: driverLicense?.expiryDate,
        issuingState: driverLicense?.issuingState,
        frontImage: licenseImages.frontImage,
        backImage: licenseImages.backImage,
        isVerified: false,
      },
      preferredPaymentMethod,
      savedBankDetails,
      savedWalletAddress,
    });

    res.status(201).json({
      success: true,
      message: "Renter profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create/Update Renter Profile Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create/update renter profile",
    });
  }
};

/**
 * @desc    Get renter profile
 * @route   GET /api/renter/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await RenterProfile.getByUser(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Renter profile not found",
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get Renter Profile Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve renter profile",
    });
  }
};

/**
 * @desc    Submit booking request
 * @route   POST /api/renter/booking
 * @access  Private
 */
export const submitBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      vehicleId,
      dates,
      renterDetails,
      bookingDetails,
      payment,
      pricing,
    } = req.body;

    // Validate vehicle exists
    const vehicle = await Car.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Check if vehicle is available
    if (vehicle.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Vehicle is not available for booking",
      });
    }

    // Create or update renter profile
    let renterProfile = await RenterProfile.findOne({ user: userId });

    if (!renterProfile) {
      // Create new profile from booking details
      renterProfile = await RenterProfile.create({
        user: userId,
        personalInfo: {
          fullName: renterDetails.fullName,
          email: renterDetails.email,
          phone: renterDetails.phone,
          dateOfBirth: renterDetails.dateOfBirth,
        },
        address: {
          street: renterDetails.address,
          city: renterDetails.city,
          state: renterDetails.state,
          zipCode: renterDetails.zipCode,
        },
        driverLicense: {
          number: renterDetails.driverLicense.number,
          expiryDate: renterDetails.driverLicense.expiryDate,
          issuingState: renterDetails.driverLicense.issuingState,
          isVerified: false,
        },
        preferredPaymentMethod: payment.method,
      });
    }

    // Check age requirement (21+)
    if (!renterProfile.meetsAgeRequirement) {
      return res.status(400).json({
        success: false,
        message: "Renter must be at least 21 years old",
      });
    }

    // Check license expiry
    if (renterProfile.isLicenseExpired()) {
      return res.status(400).json({
        success: false,
        message: "Driver's license has expired",
      });
    }

    // Prevent duplicate bookings (same user, vehicle, and dates within 30 seconds)
    const duplicateWindow = new Date(Date.now() - 30 * 1000);
    const existingBooking = await Booking.findOne({
      car: vehicleId,
      user: userId,
      pickupDate: dates.pickupDate,
      returnDate: dates.returnDate,
      status: "pending",
      createdAt: { $gte: duplicateWindow },
    });

    if (existingBooking) {
      // Return the existing booking instead of creating a duplicate
      await existingBooking.populate([
        { path: "car", select: "brand model year image pricePerDay" },
        { path: "owner", select: "name email" },
        { path: "renterProfile" },
      ]);
      return res.status(200).json({
        success: true,
        message: "Booking already submitted",
        booking: existingBooking,
      });
    }

    // Create booking
    const booking = await Booking.create({
      car: vehicleId,
      user: userId,
      owner: vehicle.owner,
      renterProfile: renterProfile._id,
      pickupDate: dates.pickupDate,
      returnDate: dates.returnDate,
      pickupLocation: bookingDetails.pickupLocation,
      days: dates.days,
      price: pricing.totalPrice,
      pricing: {
        basePrice: pricing.basePrice,
        insuranceCost: pricing.insuranceCost,
        additionalDriverCost: pricing.additionalDriverCost || 0,
        insuranceUpgradeCost: pricing.insuranceUpgradeCost || 0,
        totalPrice: pricing.totalPrice,
      },
      addons: {
        additionalDriver: bookingDetails.additionalDriver || false,
        insuranceUpgrade: bookingDetails.insuranceUpgrade || false,
      },
      paymentMethod: payment.method,
      paymentDetails: {
        bankDetails: payment.bankDetails || {},
        cryptoDetails: payment.cryptoDetails || {},
      },
      paymentStatus: "pending",
      status: "pending",
    });

    // Update renter profile booking counts
    renterProfile.totalBookings += 1;
    await renterProfile.save();

    // Notify the car owner about the new booking request
    try {
      const renter = await User.findById(userId).select("name");
      await Notification.create({
        userId: vehicle.owner,
        type: "booking_new",
        title: "New Booking Request",
        message: `${renter?.name || "A renter"} has requested to book your ${vehicle.brand} ${vehicle.model} for ${dates.days} day(s).`,
        link: `/rentor/booking/${booking._id}`,
        metadata: { bookingId: booking._id, vehicleId: vehicle._id, amount: pricing.totalPrice },
      });
    } catch (notifError) {
      console.error("Failed to send booking notification:", notifError.message);
    }

    // Populate booking with vehicle and owner details
    await booking.populate([
      { path: "car", select: "brand model year image pricePerDay" },
      { path: "owner", select: "name email" },
      { path: "renterProfile" },
    ]);

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully",
      booking,
    });
  } catch (error) {
    console.error("Submit Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit booking",
    });
  }
};

/**
 * @desc    Get renter's bookings
 * @route   GET /api/renter/bookings
 * @access  Private
 */
export const getBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { user: userId };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate("car", "brand model year image pricePerDay")
      .populate("owner", "name email")
      .populate("renterProfile")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve bookings",
    });
  }
};

/**
 * @desc    Get single booking details
 * @route   GET /api/renter/booking/:id
 * @access  Private
 */
export const getBookingById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, user: userId })
      .populate("car")
      .populate("owner", "name email phone")
      .populate("renterProfile");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Get Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve booking",
    });
  }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/renter/booking/:id/cancel
 * @access  Private
 */
export const cancelBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, user: userId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Can only cancel pending or confirmed bookings
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel this booking",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    // Update renter profile
    const renterProfile = await RenterProfile.findById(booking.renterProfile);
    if (renterProfile) {
      renterProfile.cancelledBookings += 1;
      await renterProfile.save();
    }

    // Notify the car owner about the cancellation
    try {
      const vehicle = await Car.findById(booking.car);
      const renter = await User.findById(userId).select("name");
      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : "vehicle";
      await Notification.create({
        userId: booking.owner,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `${renter?.name || "The renter"} has cancelled their booking for ${vehicleName}.`,
        link: `/rentor/booking/${booking._id}`,
        metadata: { bookingId: booking._id, vehicleId: booking.car },
      });
    } catch (notifError) {
      console.error("Failed to send cancellation notification:", notifError.message);
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel booking",
    });
  }
};
