/**
 * Script to create an admin user
 * Run with: node backend/scripts/createAdmin.js
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../models/User.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Admin user details
    const adminData = {
      name: "RegShield Admin",
      email: "admin@regshield.com",
      password: "Admin@123456", // Change this password after first login!
      role: "admin",
      compliance: {
        kycVerified: true,
        accreditedInvestor: true,
        driverLicenseVerified: true,
        insuranceVerified: true,
      },
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });

    if (existingAdmin) {
      console.log("\n⚠️  Admin user already exists!");
      console.log("Email:", existingAdmin.email);
      console.log("Role:", existingAdmin.role);

      // Update to admin role if not already
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        existingAdmin.compliance = adminData.compliance;
        await existingAdmin.save();
        console.log("✓ Updated existing user to admin role");
      }
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);

      // Create admin user with unique placeholder wallet address
      // This avoids duplicate key error on walletAddress: null
      const admin = await User.create({
        ...adminData,
        password: hashedPassword,
        walletAddress: "0xADMIN000000000000000000000000000000000000",
      });

      console.log("\n✅ Admin user created successfully!");
      console.log("━".repeat(50));
      console.log("Email:", admin.email);
      console.log("Password:", adminData.password);
      console.log("Role:", admin.role);
      console.log("━".repeat(50));
      console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    }

    // Display login instructions
    console.log("\n📋 How to access admin panel:");
    console.log("1. Go to the website and click 'Login'");
    console.log("2. Enter email: admin@regshield.com");
    console.log("3. Enter password: Admin@123456");
    console.log("4. Navigate to: /admin");
    console.log("\n");

    // Close connection
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
};

// Run the script
createAdminUser();
