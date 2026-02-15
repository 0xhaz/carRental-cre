import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const patch = async () => {
  await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`);
  const db = mongoose.connection.db;

  // Fix KYC record: set investorInfo to accredited/2
  const kycResult = await db.collection('kycs').updateOne(
    {
      'investorInfo.accreditationType': 'retail',
      'upgradeRequest.status': 'approved',
      'upgradeRequest.targetType': 2,
    },
    {
      $set: {
        'investorInfo.accreditationType': 'accredited',
        'investorInfo.investorType': 2,
      },
    }
  );
  console.log('KYC update:', kycResult.modifiedCount, 'record(s) updated');

  // Fix User record: set investorType to 2
  const userResult = await db.collection('users').updateOne(
    { walletAddress: '0x0e128580d848fb51849ab6564467a9ba79b4820c' },
    { $set: { investorType: 2 } }
  );
  console.log('User update:', userResult.modifiedCount, 'record(s) updated');

  // Verify
  const kyc = await db.collection('kycs').findOne({ 'upgradeRequest.targetType': 2 });
  console.log('\nVerify KYC investorInfo:', JSON.stringify(kyc.investorInfo));
  const user = await db.collection('users').findOne({ walletAddress: '0x0e128580d848fb51849ab6564467a9ba79b4820c' });
  console.log('Verify User investorType:', user.investorType);

  await mongoose.disconnect();
  process.exit(0);
};

patch().catch((e) => { console.error(e); process.exit(1); });
