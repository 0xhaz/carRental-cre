import mongoose from "mongoose";
import Booking from "./models/Booking.js";
import Car from "./models/Car.js";
import dotenv from "dotenv";

dotenv.config();

async function testRevenue() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all cars
    const cars = await Car.find({});
    console.log(`\n📊 Found ${cars.length} cars in database`);

    for (const car of cars) {
      console.log(`\n🚗 Car: ${car.brand} ${car.model} (ID: ${car._id})`);

      // Find all bookings for this car
      const allBookings = await Booking.find({ car: car._id });
      console.log(`   Total bookings: ${allBookings.length}`);

      if (allBookings.length > 0) {
        console.log("\n   Booking details:");
        for (const booking of allBookings) {
          console.log(`   - ID: ${booking._id}`);
          console.log(`     Status: ${booking.status}`);
          console.log(`     Payment Status: ${booking.paymentStatus}`);
          console.log(`     Price: $${booking.price}`);
          console.log(`     Days: ${booking.days}`);
        }
      }

      // Find completed bookings with paid status (what the API looks for)
      const completedBookings = await Booking.find({
        car: car._id,
        status: { $in: ["completed", "active"] },
        paymentStatus: { $in: ["paid", "paid_crypto"] },
      });

      const totalRevenue = completedBookings.reduce(
        (sum, booking) => sum + (booking.price || 0),
        0
      );

      console.log(`\n   ✨ Revenue calculation:`);
      console.log(`      Completed + paid bookings: ${completedBookings.length}`);
      console.log(`      Total revenue: $${totalRevenue}`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Test complete");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testRevenue();
