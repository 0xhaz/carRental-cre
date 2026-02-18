import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Functoin to check availability of a car for given dates
export const checkAvailability = async (car, pickupDate, returnDate) => {
  const bookings = await Booking.find({
    car,
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  });

  return bookings.length === 0;
};

// API to check availability of cars for given dates
export const checkAvailabilityOfCar = async (req, res) => {
  try {
    const { location, pickupDate, returnDate } = req.body;

    // fetch all available cars in the location
    const cars = await Car.find({ location, isAvailable: true });

    // Check availability for each car for the given dates
    const availableCarsPromises = cars.map(async car => {
      const isAvailable = await checkAvailability(
        car._id,
        pickupDate,
        returnDate,
      );

      return { ...car._doc, isAvailable: isAvailable };
    });

    let availableCars = await Promise.all(availableCarsPromises);
    availableCars = availableCars.filter(car => car.isAvailable === true);

    res.json({ success: true, cars: availableCars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to book a car
export const createBooking = async (req, res) => {
  try {
    // Accept both "car" and "carId" from frontend
    const { car, carId, pickupDate, returnDate, paymentMethod, securityDeposit } = req.body;
    const vehicleId = car || carId;
    const { _id } = req.user;

    if (!vehicleId || !pickupDate || !returnDate) {
      return res.json({ success: false, message: "Car ID, pickup date, and return date are required" });
    }

    // Check if the car is available for the given dates
    const isAvailable = await checkAvailability(vehicleId, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Car is not available" });
    }

    const carData = await Car.findById(vehicleId);
    if (!carData) {
      return res.json({ success: false, message: "Car not found" });
    }

    // Calculate price based on pickup and return dates
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24));
    const price = carData.pricePerDay * noOfDays;

    const booking = await Booking.create({
      car: vehicleId,
      owner: carData.owner,
      user: _id,
      pickupDate,
      returnDate,
      days: noOfDays,
      price,
      paymentMethod: paymentMethod || "offline",
      securityDeposit: securityDeposit || 0,
    });

    // Notify the car owner about the new booking request
    try {
      const renter = await User.findById(_id).select("name");
      await Notification.create({
        userId: carData.owner,
        type: "booking_new",
        title: "New Booking Request",
        message: `${renter?.name || "A renter"} has requested to book your ${carData.brand} ${carData.model} for ${noOfDays} day(s).`,
        link: `/rentor/booking/${booking._id}`,
        metadata: { bookingId: booking._id, vehicleId: carData._id, amount: price },
      });
    } catch (notifError) {
      console.error("Failed to send booking notification:", notifError.message);
    }

    res.json({ success: true, message: "Booking Created", data: booking });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    const booking = await Booking.findById(id)
      .populate("car")
      .populate("user", "name email walletAddress")
      .populate("owner", "name email walletAddress")
      .populate("renterProfile");

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // Only the renter or the car owner can view the booking
    const isOwner = booking.owner._id.toString() === _id.toString();
    const isRenter = booking.user._id.toString() === _id.toString();

    if (!isOwner && !isRenter) {
      return res.json({ success: false, message: "Not authorized to view this booking" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to list user bookings
export const getUserBookings = async (req, res) => {
  try {
    const { _id } = req.user;
    const bookings = await Booking.find({ user: _id })
      .populate("car")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to list rentor bookings
export const getRentorBookings = async (req, res) => {
  try {
    if (req.user.role !== "rentor") {
      return res.json({ success: false, message: "Not authorized" });
    }

    const bookings = await Booking.find({ owner: req.user._id })
      .populate("car user")
      .select("-user.password")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to update booking status
export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // Allow both the car owner and the renter to update booking status
    const isOwner = booking.owner.toString() === _id.toString();
    const isRenter = booking.user.toString() === _id.toString();

    if (!isOwner && !isRenter) {
      return res.json({
        success: false,
        message: "Not authorized to update this booking",
      });
    }

    booking.status = status;
    await booking.save();

    // Send notifications based on the status change
    try {
      const car = await Car.findById(booking.car);
      const vehicleName = car ? `${car.brand} ${car.model}` : "vehicle";

      if (status === "confirmed" && isOwner) {
        // Owner approved → notify renter
        await Notification.create({
          userId: booking.user,
          type: "booking_confirmed",
          title: "Booking Confirmed",
          message: `Your booking for ${vehicleName} has been approved! Get ready for pickup.`,
          link: `/renter/booking/${booking._id}`,
          metadata: { bookingId: booking._id, vehicleId: booking.car },
        });
      } else if (status === "cancelled") {
        if (isOwner) {
          // Owner rejected → notify renter
          await Notification.create({
            userId: booking.user,
            type: "booking_cancelled",
            title: "Booking Rejected",
            message: `Your booking for ${vehicleName} has been rejected by the owner.`,
            link: `/renter/booking/${booking._id}`,
            metadata: { bookingId: booking._id, vehicleId: booking.car },
          });
        } else if (isRenter) {
          // Renter cancelled → notify owner
          const renter = await User.findById(_id).select("name");
          await Notification.create({
            userId: booking.owner,
            type: "booking_cancelled",
            title: "Booking Cancelled",
            message: `${renter?.name || "The renter"} has cancelled their booking for ${vehicleName}.`,
            link: `/rentor/booking/${booking._id}`,
            metadata: { bookingId: booking._id, vehicleId: booking.car },
          });
        }
      } else if (status === "completed" && isOwner) {
        // Owner marked complete → notify renter
        await Notification.create({
          userId: booking.user,
          type: "booking_completed",
          title: "Booking Completed",
          message: `Your rental of ${vehicleName} has been marked as completed. Thank you!`,
          link: `/renter/booking/${booking._id}`,
          metadata: { bookingId: booking._id, vehicleId: booking.car, amount: booking.price },
        });
      }
    } catch (notifError) {
      console.error("Failed to send status notification:", notifError.message);
    }

    res.json({ success: true, message: "Booking status updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Update booking with on-chain payment data
export const updateOnChainStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ success: false, message: "txHash is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (!booking.txHashes) {
      booking.txHashes = {};
    }
    booking.txHashes.request = txHash;
    booking.paymentStatus = "paid_crypto";
    await booking.save();

    res.json({ success: true, message: "On-chain status updated", data: booking });
  } catch (error) {
    console.error("Update on-chain status error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
