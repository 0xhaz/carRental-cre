export enum UserRole {
  RENTER = 'renter',
  RENTOR = 'rentor',
  INVESTOR = 'investor',
  ADMIN = 'admin',
}

export enum InvestorType {
  RETAIL = 1,
  INSTITUTIONAL = 2,
  STRATEGIC = 3,
  REGIONAL = 4,
}

export interface ComplianceStatus {
  kycVerified: boolean;
  accreditedInvestor: boolean;
  driverLicenseVerified: boolean;
  insuranceVerified: boolean;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;

  // Blockchain fields (empty for now)
  walletAddress?: string;
  onchainIdAddress?: string;

  // Investor-specific
  investorType?: InvestorType;
  whitelistTier?: number;
  maxInvestment?: number;

  // Compliance status (will be on-chain later)
  compliance?: ComplianceStatus;

  // User preferences
  preferences?: UserPreferences;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  // Extended profile for UI
  stats?: {
    totalInvestments?: number;
    totalVehicles?: number;
    totalBookings?: number;
  };
}
