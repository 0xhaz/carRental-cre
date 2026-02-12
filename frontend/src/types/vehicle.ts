export enum VehicleStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export interface FundraisingInfo {
  active: boolean;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  maxInvestment: number;
  expectedROI: number;
  investorCount: number;
  investors: string[]; // User IDs (will become wallet addresses)
}

export interface RevenueInfo {
  totalEarned: number;
  distributed: number;
  pending: number;
  lastDistribution?: Date;
}

export interface Vehicle {
  _id: string;

  // Current fields
  owner: string; // User ID (will become wallet address)
  brand: string;
  model: string;
  year: number;
  category: string;
  seating_capacity: number;
  fuel_type: string;
  transmission: string;
  pricePerDay: number;
  location: string;
  description: string;
  image: string;
  isAvailable: boolean;

  // NEW: Additional details
  vin?: string;
  color?: string;
  mileage?: number;

  // NEW: Blockchain fields (empty for now)
  vehicleNftId?: number;
  assetTokenAddress?: string;
  revenueTokenAddress?: string;

  // NEW: Status
  status?: VehicleStatus;

  // NEW: Fundraising
  fundraising?: FundraisingInfo;

  // NEW: Revenue tracking
  revenue?: RevenueInfo;

  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleWithOwner extends Vehicle {
  ownerDetails: {
    name: string;
    email: string;
    image?: string;
    walletAddress?: string;
  };
}

export interface VehicleFormData {
  brand: string;
  model: string;
  year: number;
  category: string;
  seating_capacity: number;
  fuel_type: string;
  transmission: string;
  pricePerDay: number;
  location: string;
  description: string;
  image: string;
  vin?: string;
  color?: string;
  mileage?: number;
}
