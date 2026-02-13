import mongoose from "mongoose";
import "dotenv/config";
import User from "../models/User.js";

const checkUsers = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`);
    console.log("Connected to MongoDB");

    const users = await User.find({}).select("name email role walletAddress");

    console.log("\n=== All Users in Database ===");
    console.log(`Total users: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Wallet: ${user.walletAddress || 'None'}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log("Connection closed");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkUsers();
