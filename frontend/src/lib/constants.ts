/**
 * Application-wide constants
 */

// App Info
export const APP_NAME = "RegShield";
export const APP_DESCRIPTION = "Car Rental & Investment Platform";

// User Roles
export const USER_ROLES = {
  RENTER: "renter",
  RENTOR: "rentor",
  INVESTOR: "investor",
  ADMIN: "admin",
} as const;

// Vehicle Status
export const VEHICLE_STATUS = {
  AVAILABLE: "available",
  RENTED: "rented",
  MAINTENANCE: "maintenance",
  INACTIVE: "inactive",
} as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// Investment Status
export const INVESTMENT_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  LOCKED: "locked",
  COMPLETED: "completed",
} as const;

// Campaign Status
export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  FUNDED: "funded",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

// Investor Types
export const INVESTOR_TYPES = {
  RETAIL: 1,
  INSTITUTIONAL: 2,
  STRATEGIC: 3,
  REGIONAL: 4,
} as const;

// Mock Blockchain Networks
export const MOCK_NETWORKS = [
  { id: 1, name: "Ethereum", chainId: 1, symbol: "ETH" },
  { id: 137, name: "Polygon", chainId: 137, symbol: "MATIC" },
  { id: 56, name: "BSC", chainId: 56, symbol: "BNB" },
] as const;

// Vehicle Categories
export const VEHICLE_CATEGORIES = [
  "Sedan",
  "SUV",
  "Truck",
  "Van",
  "Sports",
  "Luxury",
  "Electric",
] as const;

// Fuel Types
export const FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plug-in Hybrid",
] as const;

// Transmission Types
export const TRANSMISSION_TYPES = ["Automatic", "Manual", "Semi-Automatic"] as const;

// Cities
export const CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
] as const;

// Date/Time
export const DATE_FORMAT = "MMM DD, YYYY";
export const DATETIME_FORMAT = "MMM DD, YYYY HH:mm";

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24, 48];

// Validation
export const MIN_BOOKING_DAYS = 1;
export const MAX_BOOKING_DAYS = 30;
export const MIN_INVESTMENT_AMOUNT = 100;

// UI
export const TOAST_DURATION = 3000; // milliseconds
export const ANIMATION_DURATION = 300; // milliseconds

// API (for future use)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
export const API_TIMEOUT = 30000; // milliseconds
