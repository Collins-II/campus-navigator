import { useState, useEffect, useCallback } from "react";
import type {
  NotificationResponse,
  NotificationType,
  NotificationPriority,
} from "@/lib/notifications";

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

export interface UseNotificationsReturn {
  notifications: NotificationResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (filter?: "all" | "unread" | "read") => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      description?: string;
      icon?: string;
      actionUrl?: string;
      actionLabel?: string;
      priority?: NotificationPriority;
    }
  ) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread");
      if (!response.ok) {
        setError("Notification status is temporarily unavailable.");
        return;
      }
      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch {
      setError("Notification status is temporarily unavailable.");
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (filter: "all" | "unread" | "read" = "all") => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/notifications?filter=${filter}&limit=50&skip=0`
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.error || "Unable to load notifications right now.");
          return;
        }
        const data = await response.json();
        setNotifications(data.notifications);
        await fetchUnreadCount();
      } catch {
        setError("Unable to load notifications right now.");
      } finally {
        setLoading(false);
      }
    },
    [fetchUnreadCount]
  );

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (!response.ok) {
        setError(await responseError(response, "Unable to update this notification."));
        return;
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
      setError(null);
      await fetchUnreadCount();
    } catch {
      setError("Unable to update this notification right now.");
    }
  }, [fetchUnreadCount]);

  // Mark as unread
  const markAsUnread = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: false }),
      });
      if (!response.ok) {
        setError(await responseError(response, "Unable to update this notification."));
        return;
      }
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: false, readAt: null } : n
        )
      );
      setError(null);
      await fetchUnreadCount();
    } catch {
      setError("Unable to update this notification right now.");
    }
  }, [fetchUnreadCount]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(await responseError(response, "Unable to delete this notification."));
        return;
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setError(null);
      await fetchUnreadCount();
    } catch {
      setError("Unable to delete this notification right now.");
    }
  }, [fetchUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread", {
        method: "POST",
      });
      if (!response.ok) {
        setError(await responseError(response, "Unable to update notifications."));
        return;
      }
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date(),
        }))
      );
      setUnreadCount(0);
      setError(null);
    } catch {
      setError("Unable to update notifications right now.");
    }
  }, []);

  // Create notification
  const createNotification = useCallback(
    async (
      type: NotificationType,
      title: string,
      message: string,
      options?: {
        description?: string;
        icon?: string;
        actionUrl?: string;
        actionLabel?: string;
        priority?: NotificationPriority;
      }
    ) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title,
            message,
            ...options,
          }),
        });
        if (!response.ok) {
          setError(await responseError(response, "Unable to create this notification."));
          return;
        }
        const newNotification = await response.json();
        setNotifications((prev) => [newNotification, ...prev]);
        setError(null);
        await fetchUnreadCount();
      } catch {
        setError("Unable to create this notification right now.");
      }
    },
    [fetchUnreadCount]
  );

  // Fetch initial data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    createNotification,
  };
};
