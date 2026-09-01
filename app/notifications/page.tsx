'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Check, CheckCircle, AlertCircle, Clock, DoorOpen, DollarSign, MessageSquare, Megaphone, Wrench } from 'lucide-react';
import { useNotifications } from '@/lib/useNotifications';
import { formatNotificationTime, notificationIconMap, notificationColorMap } from '@/lib/notifications';
import type { NotificationResponse } from '@/lib/notifications';
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal';

const iconComponents: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  XCircle: <AlertCircle className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  DoorOpen: <DoorOpen className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  AlertCircle: <AlertCircle className="w-5 h-5" />,
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Megaphone: <Megaphone className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
};

export default function NotificationsPage() {
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

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  const filteredNotifications = notifications
    .filter((n) => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'read') return n.isRead;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreferencesOpen(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Read
            </button>
          </div>

          {/* Sort & Actions */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onMarkAsUnread={markAsUnread}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </div>
  );
}

interface NotificationCardProps {
  notification: NotificationResponse;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}: NotificationCardProps) {
  const iconName = notificationIconMap[notification.type];
  const colorClass = notificationColorMap[notification.type];

  return (
    <div
      className={`rounded-lg border transition-all ${
        !notification.isRead
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4 sm:p-6 flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClass}`}>
          {iconComponents[iconName] || <AlertCircle className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                {notification.title}
              </h3>
              <p className="text-gray-600 mt-1">{notification.message}</p>
              {notification.description && (
                <p className="text-sm text-gray-500 mt-2">{notification.description}</p>
              )}

              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs text-gray-400">
                  {formatNotificationTime(notification.createdAt)}
                </span>

                {notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {notification.actionLabel || 'View Details'}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.isRead && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-5 h-5 text-gray-400" />
                </button>
              )}

              {notification.isRead && (
                <button
                  onClick={() => onMarkAsUnread(notification.id)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Mark as unread"
                >
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                </button>
              )}

              <button
                onClick={() => onDelete(notification.id)}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
