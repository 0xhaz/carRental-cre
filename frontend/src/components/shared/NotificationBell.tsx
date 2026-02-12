"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { useNotificationStore } from "@/src/store";
import { Notification } from "@/src/types";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loadNotifications } =
    useNotificationStore();

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate to link if provided
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const iconMap = {
      booking_confirmed: "✅",
      booking_cancelled: "❌",
      booking_reminder: "⏰",
      payment_received: "💰",
      payment_due: "💳",
      review_received: "⭐",
      review_reminder: "📝",
      investment_confirmed: "💼",
      revenue_distributed: "💵",
      campaign_funded: "🎉",
      vehicle_available: "🚗",
      system_update: "🔔",
    };
    return iconMap[type] || "🔔";
  };

  // Group notifications by time
  const groupedNotifications = (): Array<{ label: string; notifications: Notification[] }> => {
    const now = new Date();
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const older: Notification[] = [];

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.createdAt);
      const hoursDiff = (now.getTime() - notifDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        today.push(notification);
      } else if (hoursDiff < 48) {
        yesterday.push(notification);
      } else if (hoursDiff < 168) {
        // 7 days
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });

    const groups: Array<{ label: string; notifications: Notification[] }> = [];
    if (today.length > 0) groups.push({ label: "Today", notifications: today });
    if (yesterday.length > 0) groups.push({ label: "Yesterday", notifications: yesterday });
    if (thisWeek.length > 0) groups.push({ label: "This Week", notifications: thisWeek });
    if (older.length > 0) groups.push({ label: "Older", notifications: older });

    return groups;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <>
                {groupedNotifications().map((group) => (
                  <div key={group.label}>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        {group.label}
                      </p>
                    </div>
                    {group.notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                          notification.isRead ? "bg-white hover:bg-gray-50" : "bg-blue-50 hover:bg-blue-100"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm text-gray-900">
                                {notification.title}
                              </h4>
                              <button
                                onClick={(e) => handleDelete(e, notification._id)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                              {!notification.isRead && (
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
