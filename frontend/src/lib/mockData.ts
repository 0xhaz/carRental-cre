import type { Vehicle, User, Booking, Investment, FundraisingCampaign, Review, Notification } from "@/src/types";
import {
  VEHICLE_STATUS,
  VEHICLE_CATEGORIES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  CITIES,
  BOOKING_STATUS,
  INVESTMENT_STATUS,
  CAMPAIGN_STATUS,
  INVESTOR_TYPES,
  USER_ROLES,
} from "./constants";
import { generateMockAddress } from "./utils";

/**
 * Mock data generators for development and testing
 */

const BRANDS = ["BMW", "Tesla", "Mercedes", "Toyota", "Honda", "Ford", "Audi", "Lexus"];
const MODELS = ["Model X", "Corolla", "Civic", "F-150", "A4", "RX 350", "X5", "Model 3"];
const FIRST_NAMES = ["John", "Jane", "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"];

/**
 * Generates mock vehicles
 */
export function generateMockVehicles(count: number): Vehicle[] {
  return Array.from({ length: count }, (_, i) => {
    const brand = BRANDS[i % BRANDS.length];
    const model = MODELS[i % MODELS.length];
    const isAvailable = i % 3 !== 0; // ~66% available
    const hasFundraising = i % 4 === 0; // ~25% have fundraising

    return {
      _id: `vehicle-${i + 1}`,
      owner: `owner-${(i % 3) + 1}`,
      brand,
      model,
      name: `${brand} ${model}`,
      year: 2020 + (i % 5),
      vin: `VIN${String(i + 1000).padStart(6, "0")}`,
      category: VEHICLE_CATEGORIES[i % VEHICLE_CATEGORIES.length] as any,
      seating_capacity: [2, 4, 5, 7][i % 4],
      fuel_type: FUEL_TYPES[i % FUEL_TYPES.length] as any,
      transmission: TRANSMISSION_TYPES[i % TRANSMISSION_TYPES.length] as any,
      pricePerDay: 50 + i * 10,
      location: CITIES[i % CITIES.length],
      description: `A reliable ${brand} ${model} perfect for your travel needs. Well-maintained and fully equipped.`,
      image: `/assets/car_image${(i % 4) + 1}.png`,
      isAvailable,
      status: (isAvailable ? VEHICLE_STATUS.AVAILABLE : VEHICLE_STATUS.RENTED) as any,
      vehicleNftId: i + 1000,
      assetTokenAddress: hasFundraising ? generateMockAddress() : undefined,
      revenueTokenAddress: hasFundraising ? generateMockAddress() : undefined,
      fundraising: hasFundraising
        ? {
            active: true,
            targetAmount: 10000 + i * 5000,
            currentAmount: 5000 + i * 2000,
            minInvestment: 100,
            maxInvestment: 5000,
            expectedROI: 12 + (i % 5),
            investorCount: i % 5,
            investors: [],
          }
        : undefined,
      revenue: {
        totalEarned: i * 1000,
        distributed: i * 500,
        pending: i * 500,
      },
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock users
 */
export function generateMockUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const role = [USER_ROLES.RENTER, USER_ROLES.RENTOR, USER_ROLES.INVESTOR][i % 3];

    return {
      _id: `user-${i + 1}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      name: `${firstName} ${lastName}`,
      role: role as any,
      walletAddress: i % 2 === 0 ? generateMockAddress() : undefined,
      onchainIdAddress: i % 2 === 0 ? generateMockAddress() : undefined,
      investorType: role === USER_ROLES.INVESTOR ? ((i % 4) + 1) as any : undefined,
      compliance: {
        kycVerified: i % 2 === 0,
        accreditedInvestor: i % 3 === 0,
        driverLicenseVerified: role === USER_ROLES.RENTER ? i % 2 === 0 : false,
        insuranceVerified: role === USER_ROLES.RENTER ? i % 2 === 0 : false,
      },
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock bookings
 */
export function generateMockBookings(count: number): Booking[] {
  return Array.from({ length: count }, (_, i) => {
    const pickupDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const returnDate = new Date(pickupDate.getTime() + (2 + (i % 5)) * 24 * 60 * 60 * 1000);
    const pricePerDay = 100 + i * 20;
    const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (24 * 60 * 60 * 1000));

    return {
      _id: `booking-${i + 1}`,
      user: `user-${(i % 5) + 1}`,
      car: `vehicle-${(i % 10) + 1}`,
      owner: `owner-${(i % 3) + 1}`,
      pickupDate: pickupDate,
      returnDate: returnDate,
      status: [
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.COMPLETED,
      ][i % 4] as any,
      price: pricePerDay * days,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock investments
 */
export function generateMockInvestments(count: number): Investment[] {
  return Array.from({ length: count }, (_, i) => {
    const amount = 1000 + i * 500;
    const assetTokens = amount / 10; // 10 USD per token
    const revenueTokens = amount / 10;

    return {
      _id: `investment-${i + 1}`,
      investor: `user-${(i % 5) + 1}`,
      vehicle: `vehicle-${(i % 10) + 1}`,
      amount,
      assetTokens,
      revenueTokens,
      totalRevenueEarned: i * 100,
      investedAt: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
      status: [
        INVESTMENT_STATUS.PENDING,
        INVESTMENT_STATUS.ACTIVE,
        INVESTMENT_STATUS.ACTIVE,
        INVESTMENT_STATUS.ACTIVE,
      ][i % 4] as any,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock campaigns
 */
export function generateMockCampaigns(count: number): FundraisingCampaign[] {
  return Array.from({ length: count }, (_, i) => {
    const targetAmount = 20000 + i * 10000;
    const currentAmount = targetAmount * (0.3 + i * 0.1);

    return {
      _id: `campaign-${i + 1}`,
      vehicle: `vehicle-${(i % 10) + 1}`,
      rentor: `owner-${(i % 3) + 1}`,
      targetAmount,
      currentAmount,
      minInvestment: 100,
      maxInvestment: 10000,
      investorTypeAllowed: ["retail", "accredited", "institutional"] as any,
      expectedROI: 10 + i * 2,
      duration: 12 + i * 6,
      status: [
        CAMPAIGN_STATUS.ACTIVE,
        CAMPAIGN_STATUS.ACTIVE,
        CAMPAIGN_STATUS.FUNDED,
        CAMPAIGN_STATUS.DRAFT,
      ][i % 4] as any,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      milestones: [
        {
          name: "Vehicle Purchase",
          description: "Purchase the vehicle",
          releasePercentage: 50,
          completed: true,
          completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        },
        {
          name: "Registration & Insurance",
          description: "Complete registration and insurance",
          releasePercentage: 30,
          completed: false,
        },
        {
          name: "Launch Operations",
          description: "Start rental operations",
          releasePercentage: 20,
          completed: false,
        },
      ],
      investors: [],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock revenue data for charts
 */
export function generateMockRevenueData(months: number = 6) {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - i - 1));

    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.floor(1000 + Math.random() * 2000),
      bookings: Math.floor(5 + Math.random() * 15),
    };
  });
}

/**
 * Generates mock reviews
 */
export function generateMockReviews(count: number): Review[] {
  const comments = [
    "Great experience! The car was in excellent condition and very clean. The owner was very responsive and professional.",
    "Good rental overall. The vehicle performed well and met my expectations. Would rent again.",
    "Average experience. The car was okay, but pickup process could have been smoother.",
    "Excellent service! Everything was perfect from start to finish. Highly recommend!",
    "The vehicle was clean and ran smoothly. Great communication from the owner throughout.",
    "Wonderful car! Exactly as described. Made my trip very comfortable.",
    "Decent rental. No major issues but nothing exceptional either.",
    "Outstanding! The owner went above and beyond to ensure I had a great experience.",
  ];

  return Array.from({ length: count }, (_, i) => {
    const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
    const hasResponse = i % 3 === 0;

    return {
      _id: `review-${i + 1}`,
      booking: `booking-${(i % 20) + 1}`,
      vehicle: `vehicle-${(i % 10) + 1}`,
      renter: `user-${(i % 5) + 1}`,
      rentor: `owner-${(i % 3) + 1}`,
      rating,
      comment: comments[i % comments.length],
      vehicleCondition: rating,
      cleanliness: Math.max(3, rating + Math.floor(Math.random() * 2) - 1),
      communication: Math.max(3, rating + Math.floor(Math.random() * 2) - 1),
      wouldRecommend: rating >= 4,
      response: hasResponse ? "Thank you for your review! We're glad you enjoyed the experience." : undefined,
      responseDate: hasResponse ? new Date(Date.now() - i * 12 * 60 * 60 * 1000) : undefined,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
}

/**
 * Generates mock notifications
 */
export function generateMockNotifications(count: number = 10): Notification[] {
  const templates = [
    {
      type: "booking_confirmed" as const,
      title: "Booking Confirmed",
      message: "Your booking for {vehicle} has been confirmed for {date}.",
      link: "/renter/bookings",
    },
    {
      type: "payment_received" as const,
      title: "Payment Received",
      message: "Payment of ${amount} has been received for your rental.",
      link: "/renter/bookings",
    },
    {
      type: "review_reminder" as const,
      title: "Leave a Review",
      message: "How was your experience with {vehicle}? Leave a review!",
      link: "/renter/bookings",
    },
    {
      type: "investment_confirmed" as const,
      title: "Investment Confirmed",
      message: "Your investment of ${amount} in {vehicle} has been confirmed.",
      link: "/investor/portfolio",
    },
    {
      type: "revenue_distributed" as const,
      title: "Revenue Distributed",
      message: "You received ${amount} in revenue from your investments.",
      link: "/investor/dashboard",
    },
    {
      type: "booking_reminder" as const,
      title: "Upcoming Rental",
      message: "Your rental for {vehicle} starts tomorrow at {time}.",
      link: "/renter/bookings",
    },
    {
      type: "campaign_funded" as const,
      title: "Campaign Fully Funded",
      message: "Your fundraising campaign for {vehicle} is now fully funded!",
      link: "/rentor/fundraising",
    },
    {
      type: "review_received" as const,
      title: "New Review",
      message: "You received a {rating}-star review for {vehicle}.",
      link: "/rentor/vehicles",
    },
  ];

  return Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    const hoursAgo = i * 3; // Stagger notifications
    const isRead = i % 3 === 0; // 1/3 are read

    return {
      _id: `notification-${i + 1}`,
      userId: "current-user-1",
      type: template.type,
      title: template.title,
      message: template.message
        .replace("{vehicle}", `BMW X${(i % 5) + 1}`)
        .replace("{date}", new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString())
        .replace("{amount}", String(100 + i * 50))
        .replace("{time}", "10:00 AM")
        .replace("{rating}", String(4 + (i % 2))),
      link: template.link,
      isRead,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      metadata: {
        vehicleId: `vehicle-${(i % 10) + 1}`,
        amount: 100 + i * 50,
      },
    };
  });
}

/**
 * Single mock user for testing
 */
export const mockCurrentUser: User = {
  _id: "current-user-1",
  email: "test@example.com",
  name: "Test User",
  role: USER_ROLES.RENTER as any,
  walletAddress: generateMockAddress(),
  compliance: {
    kycVerified: true,
    accreditedInvestor: false,
    driverLicenseVerified: true,
    insuranceVerified: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
