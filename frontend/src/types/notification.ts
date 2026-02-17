/**
 * Notification types for the notification system
 */

export type NotificationType =
  | "booking_new"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_reminder"
  | "payment_received"
  | "payment_due"
  | "review_received"
  | "review_reminder"
  | "investment_confirmed"
  | "revenue_distributed"
  | "campaign_funded"
  | "campaign_expired"
  | "campaign_failed"
  | "vehicle_available"
  | "kyc_approved"
  | "kyc_rejected"
  | "kyc_expired"
  | "upgrade_approved"
  | "upgrade_rejected"
  | "upgrade_wallet_created"
  | "upgrade_complete"
  | "investor_downgraded"
  | "token_registration_pending"
  | "token_registration_complete"
  | "system_update";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // Optional link to navigate to
  isRead: boolean;
  createdAt: Date;
  metadata?: {
    bookingId?: string;
    vehicleId?: string;
    investmentId?: string;
    amount?: number;
    [key: string]: any;
  };
}

export interface NotificationGroup {
  date: string; // e.g., "Today", "Yesterday", "This Week"
  notifications: Notification[];
}
