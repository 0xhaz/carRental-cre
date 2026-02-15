import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixIndex = async () => {
  try {
    console.log('🔧 Fixing walletAddress index...\n');
    
    await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`);
    console.log('✅ Connected to MongoDB (car-rental)\n');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Drop the old walletAddress index
    try {
      await usersCollection.dropIndex('walletAddress_1');
      console.log('✓ Dropped old walletAddress index\n');
    } catch (error) {
      console.log('⚠️  Index may not exist, continuing...\n');
    }
    
    // Create new sparse unique index
    await usersCollection.createIndex(
      { walletAddress: 1 }, 
      { unique: true, sparse: true }
    );
    console.log('✓ Created new sparse unique index for walletAddress\n');
    
    console.log('✅ Index fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix index:', error);
    process.exit(1);
  }
};

fixIndex();
