import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

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
    const { car, pickupDate, returnDate } = req.body;
    const { _id } = req.user;

    // Check if the car is available for the given dates
    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Car is not available" });
    }

    const carData = await Car.findById(car);

    // Calculate price based on pickup and return dates
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24));
    const price = carData.pricePerDay * noOfDays;

    await Booking.create({
      car,
      owner: carData.owner,
      user: _id,
      pickupDate,
      returnDate,
      price,
    });

    res.json({ success: true, message: "Booking Created" });
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

    if (booking.owner.toString() !== _id.toString()) {
      return res.json({
        success: false,
        message: "Not authorized to update this booking",
      });
    }

    booking.status = status;
    await booking.save();

    res.json({ success: true, message: "Booking status updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
