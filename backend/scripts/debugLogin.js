import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const debugLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const email = "admin@regshield.com";
    const password = "Admin@123456";

    console.log("Searching for user with email:", email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ User NOT found");
      
      // Check all users to see what emails exist
      const allUsers = await User.find({}).select("email role");
      console.log("\nAll users in database:");
      allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
    } else {
      console.log("✅ User found!");
      console.log("Email in DB:", user.email);
      console.log("Role:", user.role);
      console.log("Has password:", !!user.password);
      
      // Test password comparison
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("\nPassword match:", isMatch);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

debugLogin();
