export enum InvestmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  LOCKED = 'locked',
  COMPLETED = 'completed',
}

export interface Investment {
  _id: string;
  investor: string; // User ID
  vehicle: string; // Vehicle ID
  amount: number;

  // Token holdings (will be on-chain later)
  assetTokens?: number;
  revenueTokens?: number;

  // Revenue tracking
  totalRevenueEarned: number;
  lastDistribution?: Date;

  // Investment details
  investedAt: Date;
  lockupPeriod?: number; // Days
  lockupEnds?: Date;

  // Status
  status: InvestmentStatus;

  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentWithVehicle extends Investment {
  vehicleDetails: {
    brand: string;
    model: string;
    year: number;
    image: string;
    location: string;
    pricePerDay: number;
  };
}

export interface InvestorMetrics {
  totalInvested: number;
  totalRevenueEarned: number;
  averageROI: number;
  portfolioValue: number;
  activeVehicles: number;
  pendingReturns: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  vehicleId?: string;
}
