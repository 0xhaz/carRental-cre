import mongoose from "mongoose";
import Booking from "./models/Booking.js";
import dotenv from "dotenv";

dotenv.config();

async function fixPaymentStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Update all completed bookings to have paid_crypto status
    const result = await Booking.updateMany(
      { status: "completed", paymentStatus: "pending" },
      { $set: { paymentStatus: "paid_crypto" } }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} bookings to paid_crypto status`);

    // Show updated bookings
    const updatedBookings = await Booking.find({
      status: "completed",
      paymentStatus: "paid_crypto",
    });

    console.log(`\n📊 Completed + Paid bookings:`);
    for (const booking of updatedBookings) {
      console.log(`   - ${booking._id}: $${booking.price}`);
    }

    const totalRevenue = updatedBookings.reduce(
      (sum, booking) => sum + booking.price,
      0
    );
    console.log(`\n💰 Total Revenue: $${totalRevenue}`);

    await mongoose.disconnect();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixPaymentStatus();
