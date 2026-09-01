import { useEffect, useState } from "react";
import {
  Trash2,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  DoorOpen,
  DollarSign,
  MessageSquare,
  Megaphone,
  Wrench,
} from "lucide-react";
import { useNotifications } from "@/lib/useNotifications";
import {
  formatNotificationTime,
  notificationIconMap,
  notificationColorMap,
} from "@/lib/notifications";
import type { NotificationResponse } from "@/lib/notifications";

const iconComponents: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle className="w-4 h-4" />,
  XCircle: <X className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  DoorOpen: <DoorOpen className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
};

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  const filteredNotifications =
    filter === "all"
      ? notifications
      : filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications.filter((n) => n.isRead);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-100 text-blue-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-blue-100 text-blue-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("read")}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === "read"
              ? "bg-blue-100 text-blue-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Read
        </button>
      </div>

      {/* Action Bar */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
          <p className="text-sm text-blue-800">{unreadCount} unread notifications</p>
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32">
            <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications"}
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onMarkAsUnread={markAsUnread}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 text-center">
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all notifications
        </a>
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationResponse;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}: NotificationItemProps) {
  const iconName = notificationIconMap[notification.type];
  const colorClass = notificationColorMap[notification.type];

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        !notification.isRead ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass}`}>
          {iconComponents[iconName] || <AlertCircle className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                {notification.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              {notification.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {notification.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatNotificationTime(notification.createdAt)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {notification.actionUrl && (
                <a
                  href={notification.actionUrl}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {notification.actionLabel || "View"}
                </a>
              )}

              {!notification.isRead && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {notification.isRead && (
                <button
                  onClick={() => onMarkAsUnread(notification.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Mark as unread"
                >
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}

              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
