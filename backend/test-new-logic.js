import mongoose from "mongoose";
import Booking from "./models/Booking.js";
import Car from "./models/Car.js";
import dotenv from "dotenv";

dotenv.config();

async function testNewLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const cars = await Car.find({});

    for (const car of cars) {
      // NEW LOGIC: No payment status check
      const completedBookings = await Booking.find({
        car: car._id,
        status: { $in: ["completed", "active"] },
      });

      const totalRevenue = completedBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );

      console.log(`🚗 ${car.brand} ${car.model}:`);
      console.log(`   - Completed/Active bookings: ${completedBookings.length}`);
      console.log(`   - Total Revenue: $${totalRevenue}\n`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testNewLogic();
