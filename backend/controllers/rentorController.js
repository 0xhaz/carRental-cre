import Car from "../models/Car.js";
import User from "../models/User.js";
import Campaign from "../models/Campaign.js";
import Investment from "../models/Investment.js";
import Notification from "../models/Notification.js";
import imageKit from "../configs/imageKit.js";
import fs from "fs";
import Booking from "../models/Booking.js";

// Change Role to Rentor
export const changeRoleToRentor = async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: false, message: "User not authenticated" });
    }

    const { _id } = req.user;

    await User.findByIdAndUpdate(_id, { role: "rentor" });
    res.json({ success: true, message: "Now you can list cars" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to list cars

export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;
    let car = JSON.parse(req.body.carData);

    if (!car.image) {
      return res.json({ success: false, message: "Image URL is required" });
    }

    await Car.create({ ...car, owner: _id });

    res.json({ success: true, message: "Car Added" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to list Rentor Cars
export const getRentorCars = async (req, res) => {
  try {
    const { _id } = req.user;
    const cars = await Car.find({ owner: _id });

    res.json({ success: true, cars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to update a car
export const updateCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.params;
    const car = await Car.findById(carId);

    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }

    if (car.owner.toString() !== _id.toString()) {
      return res.json({
        success: false,
        message: "Not authorized to update this car",
      });
    }

    const updates = JSON.parse(req.body.carData);

    // Only allow updating editable fields
    const allowedFields = [
      "brand", "model", "year", "category", "seating_capacity",
      "fuel_type", "transmission", "pricePerDay", "location",
      "description", "image", "isAvailable",
    ];

    const sanitized = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    const updated = await Car.findByIdAndUpdate(carId, sanitized, { new: true });

    res.json({ success: true, message: "Car updated", car: updated });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to Toggle Car Availability
export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    // Check if the car belongs to the rentor
    if (car.owner.toString() !== _id.toString()) {
      return res.json({
        success: false,
        message: "Not authorized to update this car",
      });
    }

    car.isAvailable = !car.isAvailable;
    await car.save();

    res.json({ success: true, message: "Availability toggled" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API for rentor to delete a car
export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (!car) {
      return res.json({ success: false, message: "Car not found" });
    }

    // Check if the car belongs to the rentor
    if (car.owner.toString() !== _id.toString()) {
      return res.json({
        success: false,
        message: "Not authorized to delete this car",
      });
    }

    // Block deletion if vehicle has any non-cancelled campaign
    const activeCampaign = await Campaign.findOne({
      vehicle: carId,
      status: { $in: ["draft", "active", "funded"] },
    });
    if (activeCampaign) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a vehicle with an active fundraising campaign. Cancel the campaign first.",
      });
    }

    car.owner = null;
    car.isAvailable = false;
    await car.save();

    res.json({ success: true, message: "Car removed successfully" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API for rentor to get Dashboard Data
export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "rentor") {
      return res.json({ success: false, message: "Not authorized" });
    }

    const cars = await Car.find({ owner: _id });
    const bookings = await Booking.find({ owner: _id })
      .populate("car")
      .sort({ createdAt: -1 });

    const pendingBookings = await Booking.find({
      owner: _id,
      status: "pending",
    });

    const completedBookings = await Booking.find({
      owner: _id,
      status: "confirmed",
    });

    // Calculate monthly earnings from completed bookings
    const monthlyRevenue = bookings
      .slice()
      .filter(booking => booking.status === "confirmed")
      .reduce((acc, booking) => acc + booking.price, 0);

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pendingBookings.length,
      completedBookings: completedBookings.length,
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single vehicle with campaign and investment data
export const getVehicleById = async (req, res) => {
  try {
    const { _id } = req.user;
    const { vehicleId } = req.params;

    const vehicle = await Car.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    if (!vehicle.owner || vehicle.owner.toString() !== _id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Fetch active campaign for this vehicle (if any)
    const campaign = await Campaign.findOne({
      vehicle: vehicleId,
      status: { $in: ["draft", "active", "funded"] },
    });

    // Fetch investments for this vehicle
    const investments = await Investment.find({ vehicle: vehicleId, status: "active" })
      .populate("investor", "name walletAddress")
      .sort({ investedAt: -1 });

    res.json({
      success: true,
      data: {
        vehicle,
        campaign,
        investments,
      },
    });
  } catch (error) {
    console.error("Get vehicle by ID error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to save on-chain vehicle NFT ID after minting
export const setVehicleNftId = async (req, res) => {
  try {
    const { _id } = req.user;
    const { vehicleId } = req.params;
    const { vehicleNftId, ownerAddress } = req.body;

    if (vehicleNftId === undefined || vehicleNftId === null) {
      return res.status(400).json({ success: false, message: "vehicleNftId is required" });
    }

    const car = await Car.findById(vehicleId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    if (!car.owner || car.owner.toString() !== _id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    car.vehicleNftId = Number(vehicleNftId);
    if (ownerAddress) {
      car.ownerAddress = ownerAddress;
    }
    await car.save();

    res.json({ success: true, message: "Vehicle registered on-chain", data: car });
  } catch (error) {
    console.error("Set vehicle NFT ID error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to save deployed token addresses after on-chain deployment
export const setVehicleTokens = async (req, res) => {
  try {
    const { _id } = req.user;
    const { vehicleId } = req.params;
    const { assetTokenAddress, revenueTokenAddress } = req.body;

    if (!assetTokenAddress || !revenueTokenAddress) {
      return res.status(400).json({
        success: false,
        message: "Both assetTokenAddress and revenueTokenAddress are required",
      });
    }

    const car = await Car.findById(vehicleId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    if (!car.owner || car.owner.toString() !== _id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    car.assetTokenAddress = assetTokenAddress;
    car.revenueTokenAddress = revenueTokenAddress;
    await car.save();

    // Notify admin users about pending token registration
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type: "token_registration_pending",
          title: "Token Registration Needed",
          message: `Vehicle "${car.brand} ${car.model}" (NFT #${car.vehicleNftId}) has tokens deployed and needs on-chain registration.`,
          link: "/admin/milestones",
          metadata: { vehicleId: car._id },
        });
      }
    } catch (notifError) {
      console.error("Failed to send admin notification:", notifError.message);
    }

    res.json({ success: true, message: "Token addresses saved", data: car });
  } catch (error) {
    console.error("Set vehicle tokens error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to update user profile
export const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;
    const imageFile = req.file;

    const fileBuffer = fs.readFileSync(imageFile.path);

    // Upload image to ImageKit
    const response = await imageKit.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/users",
    });

    const image = response.url;

    await User.findByIdAndUpdate(_id, { image });

    res.json({ success: true, message: "Profile Image Updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get vehicles that have tokens deployed and need admin registration
export const getVehiclesPendingRegistration = async (req, res) => {
  try {
    const cars = await Car.find({
      vehicleNftId: { $ne: null },
      assetTokenAddress: { $ne: null },
      revenueTokenAddress: { $ne: null },
      tokenRegistrationComplete: { $ne: true },
    }).populate("owner", "name walletAddress");
    res.json({ success: true, data: cars });
  } catch (error) {
    console.error("Get pending registrations error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark token registration as complete and notify the rentor
export const completeTokenRegistration = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const car = await Car.findById(vehicleId).populate("owner");
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Mark registration as complete on the vehicle
    car.tokenRegistrationComplete = true;
    await car.save();

    await Notification.create({
      userId: car.owner._id,
      type: "token_registration_complete",
      title: "Token Registration Complete",
      message: `Your vehicle "${car.brand} ${car.model}" tokens have been registered on-chain. Investors can now participate.`,
      link: `/rentor/vehicle/${car._id}`,
      metadata: { vehicleId: car._id },
    });

    res.json({ success: true, message: "Registration complete notification sent" });
  } catch (error) {
    console.error("Complete token registration error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload milestone documents for a vehicle
export const uploadMilestoneDocuments = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const car = await Car.findById(vehicleId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Verify ownership
    if (car.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    // Process each uploaded file
    for (const file of req.files) {
      const milestoneName = file.fieldname; // fieldname is the milestone name

      // Remove existing document for this milestone (replace)
      car.milestoneDocuments = car.milestoneDocuments.filter(
        (doc) => doc.milestoneName !== milestoneName
      );

      // Add new document
      car.milestoneDocuments.push({
        milestoneName,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/milestones/${file.filename}`,
        uploadedAt: new Date(),
      });
    }

    await car.save();
    res.json({ success: true, data: car.milestoneDocuments });
  } catch (error) {
    console.error("Upload milestone documents error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get milestone documents for a vehicle
export const getMilestoneDocuments = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const car = await Car.findById(vehicleId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }
    res.json({ success: true, data: car.milestoneDocuments || [] });
  } catch (error) {
    console.error("Get milestone documents error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Look up a vehicle by on-chain NFT ID
export const getVehicleByNftId = async (req, res) => {
  try {
    const { nftId } = req.params;
    const car = await Car.findOne({ vehicleNftId: parseInt(nftId) });
    if (!car) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }
    res.json({ success: true, data: car });
  } catch (error) {
    console.error("Get vehicle by NFT ID error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
