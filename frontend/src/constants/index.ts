/**
 * RegShield Constants
 * Centralized exports for all application constants
 */

// Contract addresses and configuration
export * from "./contracts";

// Chain configuration
export * from "./chains";

// Application constants
export const APP_NAME = "RegShield";
export const APP_DESCRIPTION = "Tokenized Rental Car Platform with ERC-3643 Compliance";

// Native ETH decimals (kept for backward compatibility)
export const PAYMENT_TOKEN_DECIMALS = 18;
export const ETH_DECIMALS = 18;

// Rental durations (in days)
export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 90;
export const MAX_EXTENSIONS = 5;

// Rental duration (in hours)
export const MIN_RENTAL_HOURS = 1;

// Investment amounts (in ETH)
export const INVESTMENT_LIMITS = {
  RETAIL: { min: "0.001", max: "1", lock: "0.01" },
  ACCREDITED: { min: "0.1", max: "10", lock: "0.1" },
  INSTITUTIONAL: { min: "1", max: "unlimited", lock: "1" },
} as const;

// Investor type IDs (matching contract enum)
export const INVESTOR_TYPE_ID = {
  NONE: 0,
  RETAIL: 1,
  ACCREDITED: 2,
  INSTITUTIONAL: 3,
} as const;

// Investor request statuses (matching contract enum)
export const INVESTOR_REQUEST_STATUS = {
  NONE: 0,
  PENDING: 1,
  WALLETCREATED: 2,
  TOKENSLOCKED: 3,
  APPROVED: 4,
  REJECTED: 5,
} as const;

// Booking statuses (matching contract enum)
export const BOOKING_STATUS = {
  REQUESTED: 0,
  PENDING_APPROVAL: 1,
  APPROVED: 2,
  ACTIVE: 3,
  PENDING_RETURN: 4,
  COMPLETED: 5,
  CANCELLED: 6,
  DISPUTED: 7,
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48] as const;

// Date formats
export const DATE_FORMAT = "MMM dd, yyyy";
export const DATE_TIME_FORMAT = "MMM dd, yyyy HH:mm";

// Vehicle status (matching contract VehicleStatus enum)
export const VEHICLE_STATUS = {
  AVAILABLE: "available",
  RENTED: "rented",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
} as const;

// Vehicle status IDs (matching contract enum)
export const VEHICLE_STATUS_ID = {
  Available: 0,
  Rented: 1,
  InMaintenance: 2,
  Retired: 3,
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

// Investor types
export const INVESTOR_TYPES = {
  RETAIL: "retail",
  ACCREDITED: "accredited",
  INSTITUTIONAL: "institutional",
} as const;

export type InvestorType = (typeof INVESTOR_TYPES)[keyof typeof INVESTOR_TYPES];

// Participant types
export const PARTICIPANT_TYPES = {
  RENTER: "renter",
  RENTOR: "rentor",
  INVESTOR: "investor",
} as const;

export type ParticipantType = (typeof PARTICIPANT_TYPES)[keyof typeof PARTICIPANT_TYPES];

// Transaction statuses
export const TRANSACTION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_CONNECTED: "regshield_wallet_connected",
  USER_ROLE: "regshield_user_role",
  THEME: "regshield_theme",
  ONBOARDING_COMPLETED: "regshield_onboarding_completed",
} as const;

// API endpoints (for backend integration later)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const API_ENDPOINTS = {
  VEHICLES: "/vehicles",
  RENTALS: "/rentals",
  INVESTMENTS: "/investments",
  USERS: "/users",
  COMPLIANCE: "/compliance",
} as const;
