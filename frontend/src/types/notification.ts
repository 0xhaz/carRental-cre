/**
 * Notification types for the notification system
 */

export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "payment_received"
  | "payment_due"
  | "review_received"
  | "review_reminder"
  | "investment_confirmed"
  | "revenue_distributed"
  | "campaign_funded"
  | "vehicle_available"
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
