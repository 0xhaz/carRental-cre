import { InvestorType } from './user';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FUNDED = 'funded',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum FundraisingType {
  FULL_FUNDRAISE = 'full_fundraise',
  CO_INVEST = 'co_invest',
}

export interface Milestone {
  _id?: string;
  name: string;
  description: string;
  releasePercentage: number; // % of funds to release
  completed: boolean;
  completedAt?: Date;
}

export interface FundraisingCampaign {
  _id: string;
  vehicle: string; // Vehicle ID
  rentor: string; // User ID

  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  maxInvestment: number;

  investorTypeAllowed: InvestorType[];

  expectedROI: number;
  duration: number; // Days

  fundraisingType: FundraisingType;
  rentorInvestment: number;
  minFundingRequired: number; // Minimum % of targetAmount to proceed (0-100)

  status: CampaignStatus;

  milestones: Milestone[];

  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignWithVehicle extends FundraisingCampaign {
  vehicleDetails: {
    brand: string;
    model: string;
    year: number;
    image: string;
    vin?: string;
  };
}

export interface CampaignFormData {
  vehicleId: string;
  targetAmount: number;
  minInvestment: number;
  maxInvestment: number;
  expectedROI: number;
  duration: number;
  investorTypeAllowed: InvestorType[];
  milestones: Omit<Milestone, '_id' | 'completed' | 'completedAt'>[];
}
