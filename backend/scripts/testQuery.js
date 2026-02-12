import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testQuery = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all users
    const users = await User.find({});
    console.log(`Users found: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.name} (${u.role}): ${u._id}`));

    // Get all bookings
    const bookings = await Booking.find({});
    console.log(`\nBookings found: ${bookings.length}`);
    bookings.forEach(b => console.log(`  - ID: ${b._id}, User: ${b.user}, Status: ${b.status}`));

    // Get all reviews
    const reviews = await Review.find({});
    console.log(`\nReviews found: ${reviews.length}`);
    reviews.forEach(r => console.log(`  - ID: ${r._id}, Rating: ${r.rating}`));

    // Get all notifications
    const notifications = await Notification.find({});
    console.log(`\nNotifications found: ${notifications.length}`);
    notifications.forEach(n => console.log(`  - User: ${n.userId}, Type: ${n.type}, Read: ${n.isRead}`));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

testQuery();
