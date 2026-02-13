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

// Token decimals
export const PAYMENT_TOKEN_DECIMALS = 18;

// Rental durations (in days)
export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 90;

// Investment amounts (in tokens)
export const MIN_INVESTMENT_AMOUNT = 100;
export const MAX_INVESTMENT_AMOUNT = 1000000;

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48] as const;

// Date formats
export const DATE_FORMAT = "MMM dd, yyyy";
export const DATE_TIME_FORMAT = "MMM dd, yyyy HH:mm";

// Vehicle status
export const VEHICLE_STATUS = {
  AVAILABLE: "available",
  RENTED: "rented",
  MAINTENANCE: "maintenance",
  FUNDRAISING: "fundraising",
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
