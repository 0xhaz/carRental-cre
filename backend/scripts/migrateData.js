import mongoose from 'mongoose';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateData = async () => {
  try {
    console.log('🚀 Starting data migration...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ========== USER MIGRATION ==========
    console.log('👤 Migrating User data...');

    // Update user roles: "owner" → "rentor", "user" → "renter"
    const ownerUpdate = await User.updateMany(
      { role: 'owner' },
      { $set: { role: 'rentor' } }
    );
    console.log(`  ✓ Updated ${ownerUpdate.modifiedCount} owner roles to rentor`);

    const userUpdate = await User.updateMany(
      { role: 'user' },
      { $set: { role: 'renter' } }
    );
    console.log(`  ✓ Updated ${userUpdate.modifiedCount} user roles to renter`);

    // Add new fields to existing users (only if they don't exist)
    const usersUpdated = await User.updateMany(
      { compliance: { $exists: false } },
      {
        $set: {
          compliance: {
            kycVerified: false,
            accreditedInvestor: false,
            driverLicenseVerified: false,
            insuranceVerified: false,
          },
          preferences: {
            language: 'en',
            currency: 'USD',
            notifications: true,
          },
        },
      }
    );
    console.log(`  ✓ Added new fields to ${usersUpdated.modifiedCount} users\n`);

    // ========== CAR MIGRATION ==========
    console.log('🚗 Migrating Car data...');

    // Add new fields to existing cars
    const carsUpdated = await Car.updateMany(
      { status: { $exists: false } },
      {
        $set: {
          status: 'available',
          fundraising: {
            active: false,
            targetAmount: 0,
            currentAmount: 0,
            minInvestment: 1000,
            maxInvestment: 50000,
            expectedROI: 0,
            investorCount: 0,
            investors: [],
          },
          revenue: {
            totalEarned: 0,
            distributed: 0,
            pending: 0,
          },
        },
      }
    );
    console.log(`  ✓ Added new fields to ${carsUpdated.modifiedCount} cars\n`);

    // ========== BOOKING MIGRATION ==========
    console.log('📅 Migrating Booking data...');

    // Add new fields to existing bookings
    const bookingsUpdated = await Booking.updateMany(
      { securityDeposit: { $exists: false } },
      {
        $set: {
          securityDeposit: 0,
          depositReturned: false,
          txHashes: {},
          damageAssessment: {
            hasDamage: false,
            estimatedCost: 0,
            deductedFromDeposit: 0,
          },
        },
      }
    );
    console.log(`  ✓ Added new fields to ${bookingsUpdated.modifiedCount} bookings\n`);

    // ========== SUMMARY ==========
    console.log('📊 Migration Summary:');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Users updated:    ${ownerUpdate.modifiedCount + userUpdate.modifiedCount + usersUpdated.modifiedCount}`);
    console.log(`  Cars updated:     ${carsUpdated.modifiedCount}`);
    console.log(`  Bookings updated: ${bookingsUpdated.modifiedCount}`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Migration completed successfully!');
    console.log('💡 Tip: You can now use the new role values: investor, rentor, renter\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
