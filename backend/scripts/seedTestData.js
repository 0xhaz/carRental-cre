import mongoose from "mongoose";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Investment from "../models/Investment.js";
import Campaign from "../models/Campaign.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const seedData = async () => {
  try {
    console.log("🌱 Starting data seeding...\n");

    await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`);
    console.log("✅ Connected to MongoDB (car-rental database)\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Car.deleteMany({});
    await Investment.deleteMany({});
    await Campaign.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});
    console.log("  ✓ All collections cleared\n");

    console.log("👤 Creating test users...");

    // Create test investor
    const investor = await User.create({
      name: "John Investor",
      email: "investor@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "investor",
      walletAddress: "0x1234567890123456789012345678901234567890",
      investorType: 1, // Retail
      whitelistTier: 1,
      maxInvestment: 50000,
      compliance: {
        kycVerified: true,
        accreditedInvestor: true,
        driverLicenseVerified: false,
        insuranceVerified: false,
      },
    });
    console.log("  ✓ Created investor: investor@test.com");

    // Create test rentor
    const rentor = await User.create({
      name: "Jane Rentor",
      email: "rentor@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "rentor",
      walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });
    console.log("  ✓ Created rentor: rentor@test.com");

    // Create test renter
    const renter = await User.create({
      name: "Bob Renter",
      email: "renter@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "renter",
      walletAddress: "0x9876543210987654321098765432109876543210",
      compliance: {
        kycVerified: true,
        accreditedInvestor: false,
        driverLicenseVerified: true,
        insuranceVerified: true,
      },
    });
    console.log("  ✓ Created renter: renter@test.com\n");

    console.log("🚗 Creating test vehicles...");

    // Create test vehicle with fundraising
    const vehicle1 = await Car.create({
      owner: rentor._id,
      brand: "Tesla",
      model: "Model 3",
      year: 2024,
      category: "Electric",
      seating_capacity: 5,
      fuel_type: "Electric",
      transmission: "Automatic",
      pricePerDay: 80,
      location: "San Francisco, CA",
      description:
        "Brand new Tesla Model 3 available for investment and rental",
      image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89",
      isAvailable: true,
      vin: "TEST123456789",
      color: "White",
      mileage: 1200,
      status: "available",
      fundraising: {
        active: true,
        targetAmount: 45000,
        currentAmount: 15000,
        minInvestment: 1000,
        maxInvestment: 10000,
        expectedROI: 27,
        investorCount: 3,
        investors: [investor._id],
      },
    });
    console.log("  ✓ Created vehicle: Tesla Model 3 (with active fundraising)");

    // Create another vehicle without fundraising
    const vehicle2 = await Car.create({
      owner: rentor._id,
      brand: "BMW",
      model: "3 Series",
      year: 2023,
      category: "Luxury",
      seating_capacity: 5,
      fuel_type: "Gasoline",
      transmission: "Automatic",
      pricePerDay: 120,
      location: "Los Angeles, CA",
      description: "Luxury BMW 3 Series for premium rental experience",
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e",
      isAvailable: true,
      vin: "TEST987654321",
      color: "Black",
      mileage: 5000,
      status: "available",
    });
    console.log("  ✓ Created vehicle: BMW 3 Series\n");

    console.log("💰 Creating test investment...");

    // Create test investment
    const investment = await Investment.create({
      investor: investor._id,
      vehicle: vehicle1._id,
      amount: 5000,
      status: "active",
      totalRevenueEarned: 250,
      investedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });
    console.log("  ✓ Created investment: $5,000 in Tesla Model 3\n");

    console.log("📋 Creating test campaign...");

    // Create test campaign
    const campaign = await Campaign.create({
      vehicle: vehicle1._id,
      rentor: rentor._id,
      targetAmount: 45000,
      currentAmount: 15000,
      minInvestment: 1000,
      maxInvestment: 10000,
      investorTypeAllowed: [1, 2], // Retail and Institutional
      expectedROI: 27,
      duration: 90,
      status: "active",
      milestones: [
        {
          name: "Vehicle Purchase",
          description: "Complete vehicle purchase",
          releasePercentage: 50,
          completed: true,
          completedAt: new Date(),
        },
        {
          name: "Registration & Insurance",
          description: "Complete registration and obtain insurance",
          releasePercentage: 30,
          completed: false,
        },
        {
          name: "Vehicle Ready",
          description: "Vehicle ready for rental operations",
          releasePercentage: 20,
          completed: false,
        },
      ],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
    console.log("  ✓ Created campaign for Tesla Model 3\n");

    console.log("📅 Creating test bookings...");

    // Completed booking 1 (30 days ago)
    const booking1 = await Booking.create({
      car: vehicle1._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
      price: 240,
      status: "completed",
      securityDeposit: 300,
      depositReturned: true,
      preCondition: {
        mileage: 1200,
        fuelLevel: 100,
        damageNotes: [],
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      postCondition: {
        mileage: 1450,
        fuelLevel: 85,
        damageNotes: [],
        timestamp: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Created completed booking (Tesla Model 3 - 30 days ago)");

    // Completed booking 2 (15 days ago)
    const booking2 = await Booking.create({
      car: vehicle2._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      price: 600,
      status: "completed",
      securityDeposit: 500,
      depositReturned: true,
      preCondition: {
        mileage: 5000,
        fuelLevel: 100,
        damageNotes: [],
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      postCondition: {
        mileage: 5400,
        fuelLevel: 75,
        damageNotes: ["Minor scratch on rear bumper"],
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      damageAssessment: {
        hasDamage: true,
        estimatedCost: 150,
        deductedFromDeposit: 150,
      },
    });
    console.log("  ✓ Created completed booking (BMW 3 Series - 15 days ago)");

    // Active booking (started 2 days ago, ends in 3 days)
    const booking3 = await Booking.create({
      car: vehicle1._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      price: 400,
      status: "active",
      securityDeposit: 300,
      depositReturned: false,
      preCondition: {
        mileage: 1450,
        fuelLevel: 100,
        damageNotes: [],
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Created active booking (Tesla Model 3 - ongoing)");

    // Upcoming booking 1 (starts in 5 days)
    const booking4 = await Booking.create({
      car: vehicle2._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      price: 360,
      status: "confirmed",
      securityDeposit: 500,
      depositReturned: false,
    });
    console.log("  ✓ Created upcoming booking (BMW 3 Series - in 5 days)");

    // Upcoming booking 2 (starts in 12 days)
    const booking5 = await Booking.create({
      car: vehicle1._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      price: 160,
      status: "confirmed",
      securityDeposit: 300,
      depositReturned: false,
    });
    console.log("  ✓ Created upcoming booking (Tesla Model 3 - in 12 days)");

    // Pending booking
    const booking6 = await Booking.create({
      car: vehicle2._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
      price: 360,
      status: "pending",
      securityDeposit: 500,
      depositReturned: false,
    });
    console.log("  ✓ Created pending booking (BMW 3 Series)");

    // Cancelled booking
    const booking7 = await Booking.create({
      car: vehicle1._id,
      user: renter._id,
      owner: rentor._id,
      pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      returnDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      price: 160,
      status: "cancelled",
      securityDeposit: 300,
      depositReturned: true,
    });
    console.log("  ✓ Created cancelled booking (Tesla Model 3)\n");

    console.log("⭐ Creating test reviews...");

    // Review 1 for booking1
    const review1 = await Review.create({
      booking: booking1._id,
      vehicle: vehicle1._id,
      renter: renter._id,
      rentor: rentor._id,
      rating: 5,
      comment:
        "Amazing experience! The Tesla was in perfect condition and the owner was very responsive. Highly recommend!",
      vehicleCondition: 5,
      cleanliness: 5,
      communication: 5,
      wouldRecommend: true,
      response: "Thank you so much! Looking forward to hosting you again!",
      responseDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    });
    console.log("  ✓ Created review for Tesla Model 3 (5 stars)");

    // Review 2 for booking2
    const review2 = await Review.create({
      booking: booking2._id,
      vehicle: vehicle2._id,
      renter: renter._id,
      rentor: rentor._id,
      rating: 4,
      comment:
        "Great luxury car, smooth ride. Minor scratch on pickup but overall good experience.",
      vehicleCondition: 4,
      cleanliness: 5,
      communication: 4,
      wouldRecommend: true,
      createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    });
    console.log("  ✓ Created review for BMW 3 Series (4 stars)\n");

    console.log("🔔 Creating test notifications...");

    // Notifications for renter
    await Notification.create({
      userId: renter._id,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      message: "Your Tesla Model 3 booking has been confirmed!",
      link: `/renter/bookings/${booking3._id}`,
      isRead: false,
      metadata: { bookingId: booking3._id, vehicleId: vehicle1._id },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    });

    await Notification.create({
      userId: renter._id,
      type: "booking_reminder",
      title: "Pickup Reminder",
      message: "Don't forget! Your BMW 3 Series pickup is in 5 days.",
      link: `/renter/bookings/${booking4._id}`,
      isRead: false,
      metadata: { bookingId: booking4._id, vehicleId: vehicle2._id },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    });

    await Notification.create({
      userId: renter._id,
      type: "payment_received",
      title: "Payment Processed",
      message: "Your payment of $240 has been processed successfully.",
      isRead: true,
      metadata: { amount: 240 },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: renter._id,
      type: "review_reminder",
      title: "Leave a Review",
      message: "How was your experience with the Tesla Model 3? Leave a review!",
      link: `/renter/booking/${booking1._id}`,
      isRead: true,
      metadata: { bookingId: booking1._id },
      createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    });

    // Notifications for rentor
    await Notification.create({
      userId: rentor._id,
      type: "booking_confirmed",
      title: "New Booking",
      message: "Your Tesla Model 3 has a new booking request.",
      link: `/rentor/bookings/${booking3._id}`,
      isRead: false,
      metadata: { bookingId: booking3._id, vehicleId: vehicle1._id },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: rentor._id,
      type: "payment_received",
      title: "Payment Received",
      message: "You've received $400 for the Tesla Model 3 rental.",
      isRead: false,
      metadata: { amount: 400, bookingId: booking3._id },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: rentor._id,
      type: "review_received",
      title: "New Review",
      message: "Bob Renter left a 5-star review for your Tesla Model 3!",
      link: `/rentor/vehicles/${vehicle1._id}`,
      isRead: true,
      metadata: { vehicleId: vehicle1._id },
      createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: rentor._id,
      type: "vehicle_available",
      title: "Vehicle Available",
      message: "Your BMW 3 Series is now available for new bookings.",
      isRead: true,
      metadata: { vehicleId: vehicle2._id },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    // Notifications for investor
    await Notification.create({
      userId: investor._id,
      type: "investment_confirmed",
      title: "Investment Confirmed",
      message: "Your $5,000 investment in Tesla Model 3 has been confirmed!",
      link: `/investor/portfolio`,
      isRead: true,
      metadata: { investmentId: investment._id, amount: 5000 },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: investor._id,
      type: "revenue_distributed",
      title: "Revenue Distributed",
      message: "You've earned $25 from your Tesla Model 3 investment this week!",
      link: `/investor/portfolio`,
      isRead: false,
      metadata: { amount: 25, vehicleId: vehicle1._id },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: investor._id,
      type: "campaign_funded",
      title: "Campaign Progress",
      message: "Tesla Model 3 campaign is 33% funded ($15,000 of $45,000).",
      link: `/investor/marketplace`,
      isRead: false,
      metadata: { vehicleId: vehicle1._id, amount: 15000 },
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: investor._id,
      type: "system_update",
      title: "New Investment Opportunities",
      message: "Check out 2 new vehicles available for investment!",
      link: `/investor/marketplace`,
      isRead: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });

    console.log("  ✓ Created 12 notifications across all users\n");

    console.log("📊 Seed Data Summary:");
    console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Users created:         3");
    console.log("  Vehicles created:      2");
    console.log("  Investments created:   1");
    console.log("  Campaigns created:     1");
    console.log("  Bookings created:      7");
    console.log("  Reviews created:       2");
    console.log("  Notifications created: 12");
    console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🔑 Test Credentials:");
    console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Investor: investor@test.com");
    console.log("  Rentor:   rentor@test.com");
    console.log("  Renter:   renter@test.com");
    console.log("  Password: password123 (for all)");
    console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ Seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
