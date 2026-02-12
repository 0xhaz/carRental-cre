import apiClient from "./axios";
import { Notification } from "@/src/types";

export const notificationApi = {
  // Get user notifications
  getAll: async (): Promise<{
    success: boolean;
    data: Notification[];
    unreadCount: number;
  }> => {
    const { data } = await apiClient.get("/notifications");
    return data;
  },

  // Mark as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean; data: Notification }> => {
    const { data } = await apiClient.post(`/notifications/mark-read/${notificationId}`);
    return data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post("/notifications/mark-all-read");
    return data;
  },

  // Delete notification
  delete: async (notificationId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/notifications/${notificationId}`);
    return data;
  },
};
