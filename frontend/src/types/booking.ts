export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export interface ConditionReport {
  timestamp?: number;
  mileage?: number;
  fuelLevel?: number; // Percentage
  photos?: string[]; // IPFS hashes or URLs
  damageNotes?: string[];
}

export interface DamageAssessment {
  hasDamage: boolean;
  estimatedCost: number;
  deductedFromDeposit: number;
}

export interface TransactionHashes {
  request?: string;
  approve?: string;
  start?: string;
  complete?: string;
}

export interface Booking {
  _id: string;
  car: string; // Vehicle ID
  user: string; // Renter ID
  owner: string; // Rentor ID
  pickupDate: Date;
  returnDate: Date;
  status: BookingStatus;
  price: number;

  // NEW: Deposit information
  securityDeposit?: number;
  depositReturned?: boolean;

  // NEW: Blockchain fields (empty for now)
  onchainBookingId?: number;
  txHashes?: TransactionHashes;

  // NEW: Condition reports
  preCondition?: ConditionReport;
  postCondition?: ConditionReport;

  // NEW: Damage assessment
  damageAssessment?: DamageAssessment;

  createdAt: Date;
  updatedAt: Date;
}

export interface BookingWithDetails extends Booking {
  carDetails: {
    brand: string;
    model: string;
    year: number;
    image: string;
    location: string;
  };
  renterDetails: {
    name: string;
    email: string;
  };
}
