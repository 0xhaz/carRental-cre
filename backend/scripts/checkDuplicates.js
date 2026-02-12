import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const checkDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all users with email renter@test.com
    const renters = await User.find({ email: "renter@test.com" });
    console.log(`Found ${renters.length} users with email renter@test.com:`);
    renters.forEach(u => {
      console.log(`  - ID: ${u._id}, Name: ${u.name}, Created: ${u.createdAt}`);
    });

    // Find all users
    const allUsers = await User.find({});
    console.log(`\nTotal users in database: ${allUsers.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

checkDuplicates();
