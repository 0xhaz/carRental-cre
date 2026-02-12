import mongoose from 'mongoose';
import User from '../models/User.js';
import Car from '../models/Car.js';
import dotenv from 'dotenv';

dotenv.config();

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database state...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}\n`);
    
    // Check users
    const users = await User.find({}).select('name email role walletAddress');
    console.log(`👥 Total Users: ${users.length}\n`);
    
    if (users.length > 0) {
      console.log('Users in database:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      users.forEach(user => {
        console.log(`  📧 ${user.email}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Wallet: ${user.walletAddress || 'null'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });
    } else {
      console.log('⚠️  No users found in database');
    }
    
    // Check role distribution
    console.log('\n📊 Role Distribution:');
    const roleCount = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    roleCount.forEach(r => {
      console.log(`  ${r._id}: ${r.count}`);
    });
    
    // Check cars
    const cars = await Car.find({}).select('brand model owner');
    console.log(`\n🚗 Total Vehicles: ${cars.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();
