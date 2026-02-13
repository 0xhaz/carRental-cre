import { create } from "zustand";
import { Notification } from "@/types";
import { notificationApi } from "@/lib/api";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  markAsRead: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        );
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return { notifications, unreadCount };
      });

      // Call API
      await notificationApi.markAsRead(notificationId);
    } catch (error: any) {
      set({ error: error.message });
      // Reload notifications to revert optimistic update
      await get().loadNotifications();
    }
  },

  markAllAsRead: async () => {
    try {
      // Optimistically update UI
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));

      // Call API
      await notificationApi.markAllAsRead();
    } catch (error: any) {
      set({ error: error.message });
      // Reload notifications to revert optimistic update
      await get().loadNotifications();
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      // Optimistically update UI
      set((state) => {
        const notifications = state.notifications.filter((n) => n._id !== notificationId);
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return { notifications, unreadCount };
      });

      // Call API
      await notificationApi.delete(notificationId);
    } catch (error: any) {
      set({ error: error.message });
      // Reload notifications to revert optimistic update
      await get().loadNotifications();
    }
  },

  loadNotifications: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await notificationApi.getAll();

      set({
        notifications: response.data,
        unreadCount: response.unreadCount,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message,
      });
    }
  },
}));
