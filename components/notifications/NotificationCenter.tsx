import { useEffect, useState } from "react";
import Link from "next/link";
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
  priorityColorMap,
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
    error,
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Updates</p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Notifications</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "You’re all caught up"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-emerald-50 text-emerald-800"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          aria-pressed={filter === "unread"}
          className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
            filter === "unread"
              ? "bg-emerald-50 text-emerald-800"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("read")}
          aria-pressed={filter === "read"}
          className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
            filter === "read"
              ? "bg-emerald-50 text-emerald-800"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Read
        </button>
      </div>

      {/* Action Bar */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5">
          <p className="text-xs font-medium text-emerald-800">{unreadCount} unread</p>
          <button
            type="button"
            onClick={markAllAsRead}
            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Mark all as read
          </button>
        </div>
      )}

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="min-w-0 text-xs leading-relaxed text-amber-900">{error}</p>
          <button
            type="button"
            onClick={() => void fetchNotifications(filter)}
            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Notification List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex h-40 items-center justify-center px-4">
            <p className="text-sm text-slate-500">Loading notifications…</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center px-4 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
              <AlertCircle className="h-5 w-5 text-slate-400" />
            </span>
            <p className="text-sm font-medium text-slate-700">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications"}
            </p>
            <p className="mt-1 text-xs text-slate-500">New campus updates will appear here.</p>
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
      <div className="border-t border-slate-100 px-4 py-2.5 text-center">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-emerald-800 hover:text-emerald-900"
        >
          View all notifications
        </Link>
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
      className={`border-b border-slate-100 px-4 py-3 transition-colors ${
        !notification.isRead ? "bg-emerald-50/60" : "bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          {iconComponents[iconName] || <AlertCircle className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="break-words text-sm font-semibold text-slate-900">
                {notification.title}
              </h3>
              {!notification.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-label="Unread" /> : null}
              {notification.priority !== "normal" ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityColorMap[notification.priority]}`}>
                  {notification.priority}
                </span>
              ) : null}
              </div>
              <p className="mt-1 break-words text-sm leading-relaxed text-slate-600">{notification.message}</p>
              {notification.description && (
                <p className="mt-1 break-words text-xs text-slate-500">
                  {notification.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {formatNotificationTime(notification.createdAt)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {notification.actionUrl && (
                <Link
                  href={notification.actionUrl}
                  className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  {notification.actionLabel || "View"}
                </Link>
              )}

              {!notification.isRead && (
                <button
                  type="button"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700"
                  title="Mark as read"
                  aria-label="Mark as read"
                >
                  <Check className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {notification.isRead && (
                <button
                  type="button"
                  onClick={() => onMarkAsUnread(notification.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700"
                  title="Mark as unread"
                  aria-label="Mark as unread"
                >
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(notification.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                title="Delete"
                aria-label="Delete notification"
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
