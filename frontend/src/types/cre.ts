/**
 * Chainlink CRE (Compute, Read, Execute) Types
 * Type definitions for all 5 CRE receiver contracts
 */

// ═══════════════════════════════════════════════
// Shared / Base Types
// ═══════════════════════════════════════════════

/** Metadata decoded from the Chainlink CRE forwarder */
export interface WorkflowMetadata {
  workflowId: `0x${string}`;
  workflowName: `0x${string}`; // bytes10
  workflowOwner: `0x${string}`;
}

/** Base event emitted by all receivers via ReceiverTemplate */
export interface CREReceiverConfig {
  forwarderAddress: `0x${string}`;
  expectedAuthor: `0x${string}`;
  expectedWorkflowName: `0x${string}`;
  expectedWorkflowId: `0x${string}`;
}

// ═══════════════════════════════════════════════
// PaymentReceiver
// ═══════════════════════════════════════════════

/** Milestone names expected by RegShieldPaymentProtocol */
export type MilestoneName =
  | "VEHICLE_IDENTIFIED"
  | "PURCHASE_VERIFIED"
  | "INSURANCE_OBTAINED"
  | "REGISTRATION_COMPLETED";

/** PaymentReportProcessed event data */
export interface PaymentReportEvent {
  paymentId: bigint;
  milestone: MilestoneName;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

// ═══════════════════════════════════════════════
// ComplianceReceiver
// ═══════════════════════════════════════════════

/** Actions the ComplianceReceiver can route */
export enum ComplianceAction {
  RECORD_INCIDENT = 0,
  BLACKLIST_RENTER = 1,
  REMOVE_BLACKLIST = 2,
  RENEW_REGISTRATION = 3,
  RENEW_INSURANCE = 4,
  RECORD_MAINTENANCE = 5,
  SUSPEND_VEHICLE = 6,
  LIFT_SUSPENSION = 7,
}

export const COMPLIANCE_ACTION_LABELS: Record<ComplianceAction, string> = {
  [ComplianceAction.RECORD_INCIDENT]: "Record Incident",
  [ComplianceAction.BLACKLIST_RENTER]: "Blacklist Renter",
  [ComplianceAction.REMOVE_BLACKLIST]: "Remove Blacklist",
  [ComplianceAction.RENEW_REGISTRATION]: "Renew Registration",
  [ComplianceAction.RENEW_INSURANCE]: "Renew Insurance",
  [ComplianceAction.RECORD_MAINTENANCE]: "Record Maintenance",
  [ComplianceAction.SUSPEND_VEHICLE]: "Suspend Vehicle",
  [ComplianceAction.LIFT_SUSPENSION]: "Lift Suspension",
};

/** ComplianceReportProcessed event data */
export interface ComplianceReportEvent {
  action: ComplianceAction;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

/** Decoded compliance incident data */
export interface ComplianceIncident {
  renter: `0x${string}`;
  vehicleId: bigint;
  incidentType: string;
  timestamp: bigint;
}

/** Vehicle operational compliance status */
export interface VehicleComplianceStatus {
  vehicleId: bigint;
  registrationExpiry: bigint;
  insuranceExpiry: bigint;
  isSuspended: boolean;
  suspensionReason?: string;
}

// ═══════════════════════════════════════════════
// VehicleReceiver
// ═══════════════════════════════════════════════

/** Actions the VehicleReceiver can route */
export enum VehicleAction {
  UPDATE_MILEAGE = 0,
  RECORD_MAINTENANCE = 1,
  RECORD_INCIDENT = 2,
  RESOLVE_INCIDENT = 3,
  UPDATE_METADATA = 4,
}

export const VEHICLE_ACTION_LABELS: Record<VehicleAction, string> = {
  [VehicleAction.UPDATE_MILEAGE]: "Update Mileage",
  [VehicleAction.RECORD_MAINTENANCE]: "Record Maintenance",
  [VehicleAction.RECORD_INCIDENT]: "Record Incident",
  [VehicleAction.RESOLVE_INCIDENT]: "Resolve Incident",
  [VehicleAction.UPDATE_METADATA]: "Update Metadata",
};

/** VehicleReportProcessed event data */
export interface VehicleReportEvent {
  action: VehicleAction;
  tokenId: bigint;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

/** Telematics data from VehicleReceiver mileage updates */
export interface TelemetryData {
  tokenId: bigint;
  mileage: bigint;
  lastUpdated: bigint;
}

/** Maintenance record from VehicleReceiver */
export interface MaintenanceRecord {
  tokenId: bigint;
  description: string;
  cost: bigint;
  timestamp: bigint;
}

/** Vehicle incident from VehicleReceiver */
export interface VehicleIncident {
  tokenId: bigint;
  incidentId?: bigint;
  description: string;
  estimatedCost: bigint;
  actualCost?: bigint;
  bookingId: bigint;
  resolved: boolean;
  timestamp: bigint;
}

// ═══════════════════════════════════════════════
// OnboardingReceiver
// ═══════════════════════════════════════════════

/** Actions the OnboardingReceiver can route */
export enum OnboardingAction {
  APPROVE_INVESTOR = 0,
  REJECT_INVESTOR = 1,
  APPROVE_BOOKING = 2,
  REJECT_BOOKING = 3,
}

export const ONBOARDING_ACTION_LABELS: Record<OnboardingAction, string> = {
  [OnboardingAction.APPROVE_INVESTOR]: "Approve Investor",
  [OnboardingAction.REJECT_INVESTOR]: "Reject Investor",
  [OnboardingAction.APPROVE_BOOKING]: "Approve Booking",
  [OnboardingAction.REJECT_BOOKING]: "Reject Booking",
};

/** OnboardingReportProcessed event data */
export interface OnboardingReportEvent {
  action: OnboardingAction;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

/** Investor onboarding step for tracking workflow progress */
export interface OnboardingStep {
  investor: `0x${string}`;
  action: OnboardingAction;
  reason?: string; // Populated for REJECT_INVESTOR
  timestamp: bigint;
  processedByCRE: boolean;
}

// ═══════════════════════════════════════════════
// CampaignMonitorReceiver
// ═══════════════════════════════════════════════

/** Actions the CampaignMonitorReceiver can process */
export type CampaignMonitorAction = "CAMPAIGN_FAILED" | "CAMPAIGN_CANCELLED";

/** CampaignReportProcessed event data */
export interface CampaignReportEvent {
  vehicleId: bigint;
  action: CampaignMonitorAction;
  refundedCount: bigint;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}

/** Campaign health metrics for monitoring */
export interface CampaignHealth {
  vehicleId: bigint;
  fundingPercentage: number;
  deadline: bigint;
  isAtRisk: boolean; // deadline approaching + underfunded
  totalInvestors: number;
  totalFunded: bigint;
  targetAmount: bigint;
}

// ═══════════════════════════════════════════════
// Aggregated CRE Activity Feed
// ═══════════════════════════════════════════════

export type CREEventType =
  | "payment"
  | "compliance"
  | "vehicle"
  | "onboarding"
  | "campaign";

export interface CREActivityItem {
  type: CREEventType;
  label: string;
  description: string;
  timestamp: bigint;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
}
