import mongoose from 'mongoose';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Investment from '../models/Investment.js';
import Campaign from '../models/Campaign.js';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

const clearTestData = async () => {
  try {
    console.log('🗑️  Clearing test data...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Delete test users
    const deletedUsers = await User.deleteMany({
      email: { $in: ['investor@test.com', 'rentor@test.com', 'renter@test.com'] }
    });
    console.log(`✓ Deleted ${deletedUsers.deletedCount} test users`);
    
    // Delete all test data (optional - be careful!)
    const deletedCars = await Car.deleteMany({});
    const deletedInvestments = await Investment.deleteMany({});
    const deletedCampaigns = await Campaign.deleteMany({});
    const deletedBookings = await Booking.deleteMany({});
    
    console.log(`✓ Deleted ${deletedCars.deletedCount} vehicles`);
    console.log(`✓ Deleted ${deletedInvestments.deletedCount} investments`);
    console.log(`✓ Deleted ${deletedCampaigns.deletedCount} campaigns`);
    console.log(`✓ Deleted ${deletedBookings.deletedCount} bookings\n`);
    
    console.log('✅ Test data cleared successfully!');
    console.log('💡 You can now run: node scripts/seedTestData.js\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    process.exit(1);
  }
};

clearTestData();
